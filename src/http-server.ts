#!/usr/bin/env node

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { LoanSearchTool } from "./presentation/mcp/loan-search-tool.js";
import { LoanSearchController } from "./presentation/controllers/loan-search-controller.js";
import { Logger } from "./utils/logger.js";

class LoansMcpHttpServer {
  private app: express.Application;
  private mcpServer: McpServer;
  private loanSearchTool: LoanSearchTool;
  private loanController: LoanSearchController;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  constructor() {
    // Environment variables kontrolü
    const geminiApiKey = process.env.GEMINI_API_KEY;
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

    // Controllers ve tools'ları initialize et
    this.loanSearchTool = new LoanSearchTool();
    this.loanController = new LoanSearchController();

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
          
          const result = await this.loanSearchTool.handle({ query });
          const parsedResult = JSON.parse(result);
          
          Logger.tool("search_loans", { query }, `${parsedResult.totalFound || 0} kredi bulundu`);
          
          return {
            content: [{
              type: "text",
              text: this.formatForMcp(parsedResult)
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

  private formatForMcp(result: any): string {
    if (!result.success) {
      return `❌ **Hata**: ${result.error}`;
    }

    const { parsedParams, loans, totalFound, summary } = result;
    
    let output = `🏦 **Kredi Arama Sonuçları**

**Sorgu**: ${result.query}
**Kredi Türü**: ${parsedParams.typeDisplayName}
**Tutar**: ${parsedParams.formattedAmount}
**Vade**: ${parsedParams.formattedTerm}

**Özet**: ${summary}

`;

    if (totalFound > 0) {
      output += `**Bulunan Krediler** (${totalFound} adet):\n\n`;
      
      loans.forEach((loan: any, index: number) => {
        output += `**${index + 1}. ${loan.bankName}**
- Faiz Oranı: ${loan.formattedInterestRate}
- Aylık Ödeme: ${loan.formattedMonthlyPayment}
- Toplam Ödeme: ${loan.formattedTotalPayment}
- Toplam Faiz: ${loan.formattedTotalInterest}
- ${loan.eligibilityNote}

`;
      });
    }

    return output;
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

    // REST API endpoints
    this.app.post('/api/search', (req, res) => this.loanController.search(req, res));
    this.app.get('/api/health', (req, res) => this.loanController.health(req, res));

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
                  resultDiv.innerHTML = '<div class="success"><h3>Arama Sonuçları:</h3><p><strong>Sorgu:</strong> ' + data.query + '</p><p><strong>Bulunan Kredi Sayısı:</strong> ' + data.totalFound + '</p><p><strong>Özet:</strong> ' + data.summary + '</p></div>';
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
  }

  private async handleMcpRequest(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string || randomUUID();
    
    if (!this.transports[sessionId]) {
      this.transports[sessionId] = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID()
      });
      await this.mcpServer.connect(this.transports[sessionId]);
    }

    const transport = this.transports[sessionId];
    
    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      Logger.error("MCP request error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async handleMcpNotifications(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = this.transports[sessionId];
    
    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      Logger.error("MCP notification error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async handleMcpTermination(req: express.Request, res: express.Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const transport = this.transports[sessionId];
    
    if (transport) {
      await transport.close();
      delete this.transports[sessionId];
    }

    res.status(200).json({ success: true });
  }

  async start(port: number = 3000) {
    this.app.listen(port, () => {
      Logger.info(`🌐 HTTP Server ${port} portunda çalışıyor`);
      Logger.info(`🔗 Web arayüzü: http://localhost:${port}`);
      Logger.info(`🔗 API endpoint: http://localhost:${port}/api/search`);
      Logger.info(`🔗 MCP endpoint: http://localhost:${port}/mcp`);
    });
  }
}

// Sunucuyu başlat
const server = new LoansMcpHttpServer();
server.start().catch(console.error); 