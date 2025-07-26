#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { LoanSearchTool } from "./tools/loan-search-tool.js";
import { Logger } from "./utils/logger.js";

class LoansMcpHttpServer {
  private app: express.Application;
  private mcpServer: McpServer;
  private loanSearchTool: LoanSearchTool;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  constructor() {
    // Gemini API key'i environment'dan al
    const geminiApiKey = process.env.GEMINI_API_KEY || "dummyKey";
    if (!geminiApiKey) {
      Logger.error("❌ GEMINI_API_KEY environment variable gerekli!");
      process.exit(1);
    }

    // Express app oluştur
    this.app = express();
    this.setupMiddleware();

    // MCP Server'ı oluştur
    this.mcpServer = new McpServer({
      name: "loans-mcp-http-server",
      version: "1.0.0"
    });

    // Loan search tool'u initialize et
    this.loanSearchTool = new LoanSearchTool(geminiApiKey);

    Logger.info("🌐 Kredi MCP HTTP Sunucusu başlatılıyor...");
    this.setupMcpServer();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS - web uygulamalarının erişimi için
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:8080'],
      exposedHeaders: ['mcp-session-id'],
      allowedHeaders: ['Content-Type', 'mcp-session-id'],
      credentials: true
    }));

    this.app.use(express.json());
    this.app.use(express.static('public')); // Static files için
  }

  private setupMcpServer() {
    // Ana kredi arama tool'u
    this.mcpServer.registerTool(
      "search_loans",
      {
        title: "Kredi Arama",
        description: "Türkçe doğal dil ile kredi arama yapar",
        inputSchema: {
          query: z.string().describe("Kredi arama sorgusu")
        }
      },
      async ({ query }: { query: string }) => {
        try {
          Logger.query(`HTTP Kredi sorgusu alındı`, { query });
          
          const result = await this.loanSearchTool.searchLoans(query);
          const formattedResult = this.loanSearchTool.formatSearchResult(result);
          
          Logger.tool("search_loans", { query }, `${result.totalFound} kredi bulundu`);
          
          return {
            content: [{
              type: "text",
              text: formattedResult
            }]
          };
        } catch (error) {
          Logger.error("HTTP Kredi arama hatası:", error);
          return {
            content: [{
              type: "text",
              text: `❌ Hata: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    Logger.info("✅ HTTP MCP tools kaydedildi");
  }

  private setupRoutes() {
    // Ana MCP endpoint
    this.app.post('/mcp', async (req, res) => {
      await this.handleMcpRequest(req, res);
    });

    this.app.get('/mcp', async (req, res) => {
      await this.handleMcpNotifications(req, res);
    });

    this.app.delete('/mcp', async (req, res) => {
      await this.handleMcpTermination(req, res);
    });

    // Basit web arayüzü
    this.app.get('/', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Kredi MCP Sunucusu</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            .container { background: #f5f5f5; padding: 20px; border-radius: 8px; }
            input, button { padding: 10px; margin: 5px; }
            #query { width: 70%; }
            #result { margin-top: 20px; padding: 20px; background: white; border-radius: 8px; }
            .loading { color: #666; }
            .error { color: red; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏦 Kredi MCP Sunucusu</h1>
            <p>Türkçe doğal dil ile kredi arama yapın:</p>
            
            <div>
              <input type="text" id="query" placeholder="5 milyon 48 ay vade konut kredisi sorgula" />
              <button onclick="searchLoans()">🔍 Ara</button>
            </div>
            
            <div id="result"></div>
          </div>

          <script>
            async function searchLoans() {
              const query = document.getElementById('query').value;
              const resultDiv = document.getElementById('result');
              
              if (!query.trim()) {
                resultDiv.innerHTML = '<p class="error">Lütfen bir sorgu girin</p>';
                return;
              }
              
              resultDiv.innerHTML = '<p class="loading">🔄 Aranıyor...</p>';
              
              try {
                const response = await fetch('/api/search', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ query })
                });
                
                const data = await response.json();
                
                if (data.success) {
                  resultDiv.innerHTML = '<pre class="success">' + data.result + '</pre>';
                } else {
                  resultDiv.innerHTML = '<p class="error">❌ ' + data.error + '</p>';
                }
              } catch (error) {
                resultDiv.innerHTML = '<p class="error">❌ Bağlantı hatası: ' + error.message + '</p>';
              }
            }
            
            // Enter tuşu ile arama
            document.getElementById('query').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                searchLoans();
              }
            });
          </script>
        </body>
        </html>
      `);
    });

    // Basit REST API endpoint
    this.app.post('/api/search', async (req, res) => {
      try {
        const { query } = req.body;
        
        if (!query) {
          return res.json({ success: false, error: 'Query gerekli' });
        }

        Logger.info(`REST API sorgusu: ${query}`);
        
        const result = await this.loanSearchTool.searchLoans(query);
        const formattedResult = this.loanSearchTool.formatSearchResult(result);
        
        res.json({ 
          success: true, 
          result: formattedResult,
          data: result 
        });
      } catch (error) {
        Logger.error('REST API hatası:', error);
        res.json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        service: 'Kredi MCP HTTP Server',
        timestamp: new Date().toISOString() 
      });
    });
  }

  private async handleMcpRequest(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    
    try {
      let transport = this.transports[sessionId];
      
      if (!transport) {
        // Yeni session oluştur
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            this.transports[newSessionId] = transport;
            Logger.debug(`Yeni HTTP session: ${newSessionId}`);
          }
        });

        transport.onclose = () => {
          if (transport.sessionId) {
            delete this.transports[transport.sessionId];
            Logger.debug(`HTTP session kapatıldı: ${transport.sessionId}`);
          }
        };

        await this.mcpServer.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      Logger.error('MCP request hatası:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  }

  private async handleMcpNotifications(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = this.transports[sessionId];
    
    if (transport) {
      await transport.handleRequest(req, res);
    } else {
      res.status(400).send('Invalid session ID');
    }
  }

  private async handleMcpTermination(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = this.transports[sessionId];
    
    if (transport) {
      await transport.handleRequest(req, res);
      delete this.transports[sessionId];
    } else {
      res.status(400).send('Invalid session ID');
    }
  }

  async start(port: number = 3000) {
    this.app.listen(port, () => {
      Logger.info(`🚀 Kredi MCP HTTP Sunucusu başlatıldı!`);
      Logger.info(`🌐 Web arayüzü: http://localhost:${port}`);
      Logger.info(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
      Logger.info(`📡 REST API: http://localhost:${port}/api/search`);
    });
  }
}

// HTTP sunucuyu başlat
const httpServer = new LoansMcpHttpServer();
httpServer.start().catch(console.error); 