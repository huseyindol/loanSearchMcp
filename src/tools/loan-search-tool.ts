import { z } from "zod";
import { AIService } from "../services/ai-service.js";
import { LoanDataService } from "../services/loan-data-service.js";
import { LoanSearchResult } from "../types/index.js";
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
        parsedParams: { type: 'ihtiyac' as any, amount: 0, termMonths: 0 },
        loans: [],
        totalFound: 0
      };
    }

    Logger.debug('Parse edilen parametreler:', parseResult.params);

    // Kredileri ara
    const loans = this.loanDataService.searchLoans(parseResult.params);
    
    Logger.info(`Kredi arama tamamlandı: ${loans.length} kredi bulundu`);

    return {
      query,
      parsedParams: parseResult.params,
      loans,
      totalFound: loans.length
    };
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

Lütfen farklı kriterlerle tekrar deneyin.`;
    }

    let output = `✅ **${result.totalFound} Kredi Bulundu**

**Arama Kriterleri:**
- Kredi Türü: ${this.loanDataService.getLoanTypeDisplayName(result.parsedParams.type)}
- Tutar: ${this.formatCurrency(result.parsedParams.amount)}
- Vade: ${result.parsedParams.termMonths} ay

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