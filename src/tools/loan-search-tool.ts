import { z } from "zod";
import https from "https";
import { URL } from "url";
import { AIService } from "../services/ai-service.js";
import { LoanDataService } from "../services/loan-data-service.js";
import { LoanSearchResult, LoanDetail, LoanType } from "../types/index.js";
import { Logger } from "../utils/logger.js";

export class LoanSearchTool {
  private aiService: AIService;
  private loanDataService: LoanDataService;

  constructor(geminiApiKey: string) {
    this.aiService = new AIService(geminiApiKey);
    this.loanDataService = new LoanDataService();
  }

  // MCP Tool Schema
  static getToolDefinition() {
    return {
      name: "search_loans",
      description: "Türkçe kredi sorgu metni ile kredi arama yapar. Konut, ihtiyaç ve taşıt kredilerini destekler.",
      inputSchema: {
        query: z.string().describe("Kredi arama sorgusu - örnek: '5 milyon 48 ay vade konut kredisi sorgula'")
      }
    };
  }

  // Ana kredi arama fonksiyonu
  async searchLoans(query: string): Promise<LoanSearchResult> {
    Logger.debug(`Kredi sorgusu işleniyor: "${query}"`);

    // AI ile sorguyu parse et
    const parseResult = await this.aiService.parseQuery(query);
    
    if (!parseResult.success || !parseResult.params) {
      Logger.warn(`Sorgu parse edilemedi: ${parseResult.error}`);
      return {
        query,
        parsedParams: { type: 'ihtiyac' as any, amount: 0, termMonths: 0, inventory: 'ihtiyaç - 100000', cash: 0 },
        loans: [],
        totalFound: 0
      };
    }

    Logger.debug('Parse edilen parametreler:', parseResult.params);

    try {
      // External API'ye GET isteği gönder
      const apiUrl = `https://gatewayapi.test-gateways/pages/housingloan/list?Amount=${parseResult.params.amount}&Maturity=${parseResult.params.termMonths}`;
      Logger.debug(`API isteği gönderiliyor: ${apiUrl}`);
      
      // Use https module instead of fetch to handle self-signed certificates
      const data = await this.makeHttpsRequest(apiUrl);
      const apiResponse = JSON.parse(data);
      
      Logger.debug(`API yanıtı alındı: ${apiResponse.products?.length || 0} ürün bulundu`);

      // Products array'ini LoanDetail formatına dönüştür
      const loans = this.transformProductsToLoans(apiResponse.products || [], parseResult.params.type);
      
      Logger.info(`Kredi arama tamamlandı: ${loans.length} kredi bulundu`);

      return {
        query,
        parsedParams: parseResult.params,
        loans,
        totalFound: loans.length
      };
    } catch (error) {
      Logger.error('API isteği sırasında hata:', error);
      // Hata durumunda boş sonuç döndür
      return {
        query,
        parsedParams: parseResult.params,
        loans: [],
        totalFound: 0
      };
    }
  }

  // HTTPS isteği yapan yardımcı metod
  private makeHttpsRequest(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'accept': 'text/plain',
          'Device': '1'
        },
        // Self-signed certificate'ları kabul et
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  // API response'daki products'ı LoanDetail formatına dönüştür
  private transformProductsToLoans(products: any[], loanType: LoanType): LoanDetail[] {
    return products.map((product, index) => {
      const loanDetail: LoanDetail = {
        id: product.id?.toString() || `loan-${index}`,
        bankName: product.bank?.name || 'Bilinmeyen Banka',
        type: loanType,
        interestRate: product.interestRate || 0,
        monthlyPayment: product.monthlyInstallment || 0,
        totalPayment: product.totalAmount || 0,
        minAmount: product.amount || 0,
        maxAmount: product.amount || 0,
        maxTermMonths: product.maturity || 0,
        eligibilityNote: product.loanRateText || product.name || 'Detaylı bilgi için bankaya başvurunuz',
      };
      return loanDetail;
    }).sort((a, b) => a.interestRate - b.interestRate); // Faiz oranına göre sırala
  }

  // Sonuçları formatla
  formatSearchResult(result: LoanSearchResult): string {
    if (result.totalFound === 0) {
      return `❌ **Sonuç Bulunamadı**

Aradığınız kriterlere uygun kredi bulunamadı.

**Arama Kriterleri:**
- Kredi Türü: ${this.loanDataService.getLoanTypeDisplayName(result.parsedParams.type)}
- Tutar: ${this.formatCurrency(result.parsedParams.amount)}
- Vade: ${result.parsedParams.termMonths} ay
- Envanter: ${result.parsedParams.inventory}
- Nakit: ${this.formatCurrency(result.parsedParams.cash)}

Lütfen farklı kriterlerle tekrar deneyin.`;
    }

    let output = `✅ **${result.totalFound} Kredi Bulundu**

**Arama Kriterleri:**
- Kredi Türü: ${this.loanDataService.getLoanTypeDisplayName(result.parsedParams.type)}
- Tutar: ${this.formatCurrency(result.parsedParams.amount)}
- Vade: ${result.parsedParams.termMonths} ay
- Envanter: ${result.parsedParams.inventory}
- Nakit: ${this.formatCurrency(result.parsedParams.cash)}
---

**Bulunan Krediler:**

`;

    result.loans.forEach((loan, index) => {
      output += `**${index + 1}. ${loan.bankName}**
🏦 Banka: ${loan.bankName}
📊 Faiz Oranı: %${loan.interestRate}
💰 Aylık Ödeme: ${this.formatCurrency(loan.monthlyPayment)}
💳 Toplam Ödeme: ${this.formatCurrency(loan.totalPayment)}
ℹ️ ${loan.eligibilityNote}

`;
    });

    output += `
💡 **Not:** Faiz oranları değişkenlik gösterebilir. Güncel bilgiler için ilgili bankaya başvurunuz.`;

    return output;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
} 