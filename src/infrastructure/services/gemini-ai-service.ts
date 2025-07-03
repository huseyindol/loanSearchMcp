import { GoogleGenAI } from '@google/genai';
import { AIService } from '../../application/interfaces/ai-service.js';
import { QueryParseResult } from '../../application/dtos/query-parse-result.js';
import { Logger } from '../../utils/logger.js';

/**
 * Gemini AI Service Implementation
 * Concrete implementation using Google's Gemini API
 */
export class GeminiAIService implements AIService {
  private genai: GoogleGenAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenAI({ apiKey });
  }

  async parseQuery(query: string): Promise<QueryParseResult> {
    try {
      Logger.debug('Parsing query with Gemini AI', { query });

      const prompt = this.createParsingPrompt(query);
      
      const response = await this.genai.models.generateContent({
        model: 'gemini-2.0-flash-001',
        contents: prompt,
        config: {
          temperature: 0.1, // Düşük temperature ile tutarlı sonuçlar
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text || '{}');
      
      if (result.success && result.type && result.amount && result.termMonths) {
        Logger.debug('Query parsed successfully', { 
          query, 
          result: { 
            type: result.type, 
            amount: result.amount, 
            termMonths: result.termMonths 
          } 
        });

        return {
          success: true,
          type: result.type,
          amount: result.amount,
          termMonths: result.termMonths,
          currency: result.currency || 'TRY',
          confidence: result.confidence || 0.9
        };
      }

      Logger.warn('Query parsing failed', { query, result });
      return {
        success: false,
        error: result.error || 'Sorgu anlaşılamadı'
      };

    } catch (error) {
      Logger.error('AI service error', { query, error });
      return {
        success: false,
        error: 'AI servisi ile iletişim hatası'
      };
    }
  }

  private createParsingPrompt(query: string): string {
    return `Türkçe kredi sorgu metnini analiz et ve JSON formatında yanıtla.

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

Sorgu: "${query}"

Yanıt formatı (sadece JSON):
{
  "success": true/false,
  "type": "ihtiyac"|"konut"|"tasit",
  "amount": sayısal_tutar,
  "termMonths": ay_cinsinden_vade,
  "currency": "TRY",
  "confidence": 0.0-1.0,
  "error": "hata_mesajı_varsa"
}

Örnekler:
- "5 milyon 48 ay vade konut kredisi" → {"success": true, "type": "konut", "amount": 5000000, "termMonths": 48, "currency": "TRY", "confidence": 0.95}
- "2milyon 60 ay konut" → {"success": true, "type": "konut", "amount": 2000000, "termMonths": 60, "currency": "TRY", "confidence": 0.9}
- "300bin 24ay ihtiyaç" → {"success": true, "type": "ihtiyac", "amount": 300000, "termMonths": 24, "currency": "TRY", "confidence": 0.85}`;
  }
} 