#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { LoanSearchTool } from "./tools/loan-search-tool.js";
import { Logger } from "./utils/logger.js";

class LoansMcpServer {
  private server: McpServer;
  private loanSearchTool: LoanSearchTool;

  constructor() {
    // Gemini API key'i environment'dan al
    const geminiApiKey = process.env.GEMINI_API_KEY || "dummyKey";
    if (!geminiApiKey) {
      Logger.error("❌ GEMINI_API_KEY environment variable gerekli!");
      Logger.error("Kullanım: GEMINI_API_KEY=your_key_here npm start");
      process.exit(1);
    }

    // MCP Server'ı oluştur
    this.server = new McpServer({
      name: "loans-mcp-server",
      version: "1.0.0"
    });

    // Loan search tool'u initialize et
    this.loanSearchTool = new LoanSearchTool(geminiApiKey);

    Logger.info("🏦 Kredi MCP Sunucusu başlatılıyor...");
    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Ana kredi arama tool'u
    this.server.registerTool(
      "search_loans",
      {
        title: "Kredi Arama",
        description: "Türkçe doğal dil ile kredi arama yapar. Konut, ihtiyaç ve taşıt kredilerini destekler.",
        inputSchema: {
          query: z.string().describe("Kredi arama sorgusu - örnek: '5 milyon 48 ay vade konut kredisi sorgula'")
        }
      },
      async ({ query }: { query: string }) => {
        try {
          Logger.query(`Kredi sorgusu alındı`, { query });
          
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
          Logger.error("Kredi arama hatası:", error);
          return {
            content: [{
              type: "text",
              text: `❌ **Hata Oluştu**

Kredi arama sırasında bir hata oluştu: ${error instanceof Error ? error.message : String(error)}

Lütfen tekrar deneyin veya sorgunuzu farklı şekilde ifade edin.`
            }],
            isError: true
          };
        }
      }
    );

    // Yardım tool'u
    this.server.registerTool(
      "loan_help",
      {
        title: "Kredi Yardım",
        description: "Kredi arama sisteminin nasıl kullanılacağı hakkında bilgi verir",
        inputSchema: {}
      },
      async () => {
        return {
          content: [{
            type: "text",
            text: `🏦 **Kredi Arama Sistemi Kullanım Kılavuzu**

**Desteklenen Kredi Türleri:**
- 🏠 **Konut Kredisi**: Ev alma için
- 💰 **İhtiyaç Kredisi**: Genel ihtiyaçlar için  
- 🚗 **Taşıt Kredisi**: Araç alma için

**Sorgu Örnekleri:**
- "5 milyon 48 ay vade konut kredisi sorgula"
- "2milyon 60 ay konut"
- "300bin 24ay ihtiyaç kredisi"
- "1.5 milyon 36 ay taşıt kredisi"
- "500 bin TL 12 ay ihtiyaç"

**Tutar Formatları:**
- Milyon: "5 milyon", "5m", "5M"
- Bin: "300 bin", "300k", "300K"
- Direkt: "500000"

**Vade Formatları:**
- Ay: "48 ay", "48ay", "48 aylık"
- Yıl: "4 yıl", "4 sene" (otomatik 48 ay'a çevrilir)

**Kullanım:**
\`search_loans\` tool'unu kullanarak doğal Türkçe ile sorgu yapın. AI sistemi sorgunuzu analiz edip en uygun kredileri bulacaktır.`
          }]
        };
      }
    );

    Logger.info("✅ MCP tools kaydedildi");
  }

  private setupResources() {
    // Sistem durumu resource'u
    this.server.registerResource(
      "system_status",
      "system://status",
      {
        title: "Sistem Durumu",
        description: "Kredi MCP sisteminin durumu",
        mimeType: "text/plain"
      },
      async () => {
        const status = {
          service: "Kredi MCP Sunucusu",
          version: "1.0.0",
          status: "Aktif",
          supportedLoanTypes: ["Konut", "İhtiyaç", "Taşıt"],
          aiProvider: "Google Gemini",
          lastUpdated: new Date().toLocaleString('tr-TR')
        };

        return {
          contents: [{
            uri: "system://status",
            text: JSON.stringify(status, null, 2)
          }]
        };
      }
    );

    Logger.info("✅ MCP resources kaydedildi");
  }

  async start() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      Logger.info("🚀 Kredi MCP Sunucusu başarıyla başlatıldı!");
      Logger.info("💡 Kullanımı için 'loan_help' tool'unu çağırın");
      
    } catch (error) {
      Logger.error("❌ Sunucu başlatma hatası:", error);
      process.exit(1);
    }
  }
}

// Sunucuyu başlat
const server = new LoansMcpServer();
server.start().catch(console.error); 