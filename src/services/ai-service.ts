import { GoogleGenAI } from '@google/genai';
import { LoanType, ParsedQuery, LoanSearchParams } from '../types/index.js';
import { Logger } from '../utils/logger.js';

export class AIService {
  private genai: GoogleGenAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenAI({apiKey});
  }

  async parseQuery(query: string): Promise<ParsedQuery> {
    try {
      const prompt = this.createParsingPrompt(query);
      
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: {
          temperature: 0.1, // Düşük temperature ile tutarlı sonuçlar
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.success && result.type && result.amount && result.termMonths && result.inventory && result.cash) {
        return {
          success: true,
          params: {
            type: result.type as LoanType,
            amount: result.amount,
            termMonths: result.termMonths,
            inventory: result.inventory,
            cash: result.cash
          }
        };
      }

      return {
        success: false,
        error: result.error || 'Sorgu anlaşılamadı'
      };

    } catch (error) {
      Logger.error('AI parsing error:', error);
      return {
        success: false,
        error: 'AI servisi ile iletişim hatası'
      };
    }
  }

  private createParsingPrompt(query: string): string {
    return `Türkçe doğal dil ile kredi sorgu metnini analiz et ve JSON formatında yanıtla. 
    Elinden çıkarmak istediği bir envanter varsa onunda araştırmasını yap ortalama bir fiyatı ile onu kredi tutarından düşür.
    Nakit bilgisi varsa onu kredi tutarından düşür.
    Kredi tutarını belirlerken nakit bilgisi ve envanter bilgilerini de göz önünde bulundur.

Kredi türleri:
- ihtiyac: İhtiyaç kredisi
- konut: Konut kredisi 
- tasit: Taşıt kredisi

Tutar ifadeleri:
- milyon, m, M → milyon çarpanı
- bin, k, K → bin çarpanı
- sayısal değerler → direkt tutar

Vade ifadeleri:
- ay, ay vade, aylık → ay cinsinden
- yıl, sene → 12 ile çarp

Envanter ifadeleri:
- ev, konut, apartman, daire, villa, site, 
- araba, otomobil, bisiklet, motor, scooter, 
- telefon, tablet, bilgisayar, laptop, 
- envanter markası


Sorgu: "${query}"

Yanıt formatı (sadece JSON):
{
  "success": true/false,
  "type": "ihtiyac"|"konut"|"tasit",
  "amount": sayısal_tutar,
  "termMonths": ay_cinsinden_vade,
  "inventory": "envanter_adı ve envanter_tutarı",
  "cash": sayısal_nakit_tutarı,
  "error": "hata_mesajı_varsa"
}

Örnekler:
- "5 milyon 48 ay vade konut kredisi" → {"success": true, "type": "konut", "amount": 5000000, "termMonths": 48, "inventory": "konut - 2000000", "cash": 100000}
- "2milyon 60 ay konut" → {"success": true, "type": "konut", "amount": 2000000, "termMonths": 60, "inventory": "villa - 2000000", "cash": 100000}
- "300bin 24ay ihtiyaç" → {"success": true, "type": "ihtiyac", "amount": 300000, "termMonths": 24, "inventory": "otomobil - 100000", "cash": 100000}`;
  }
} 