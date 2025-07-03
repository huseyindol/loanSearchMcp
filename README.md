# Kredi MCP Sunucusu

Türkçe doğal dil işleme ile kredi arama yapan Model Context Protocol (MCP) sunucusu. Google Gemini AI kullanarak kullanıcı sorgularını anlayıp, uygun kredileri bulur.

## 🔧 Gereksinimler

- Node.js 18+
- Google Gemini API Key
- TypeScript

## 📦 Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```

2. **Gemini API Key alın:**
   - [Google AI Studio](https://makersuite.google.com/app/apikey)'ya gidin
   - Yeni API key oluşturun

3. **Environment değişkenini ayarlayın:**
   ```bash
   export GEMINI_API_KEY="your_api_key_here"
   ```

4. **Projeyi build edin:**
   ```bash
   npm run build
   ```

## 🚀 Kullanım

### Sunucuyu Başlatma
```bash
npm start
```

### Debug ve Test
```bash
# MCP Inspector ile visual debug
npm run inspect:debug

# Terminal'de debug logları
npm run debug

# CLI mode ile tool test
npx @modelcontextprotocol/inspector --cli node dist/src/server.js --method tools/call --tool-name search_loans --tool-arg query="5 milyon 48 ay konut kredisi"
```

**🔍 Debug Detayları**: `docs/DEBUG.md` dosyasına bakın.

## 📋 Desteklenen Kredi Türleri

- **🏠 Konut Kredisi**: Ev alma için düşük faizli krediler
- **💰 İhtiyaç Kredisi**: Genel ihtiyaçlar için kısa vadeli krediler  
- **🚗 Taşıt Kredisi**: Araç alma için özel faizli krediler

## 💬 Sorgu Örnekleri

```
"5 milyon 48 ay vade konut kredisi sorgula"
"2milyon 60 ay konut"
"300bin 24ay ihtiyaç kredisi"
"1.5 milyon 36 ay taşıt kredisi"
"500 bin TL 12 ay ihtiyaç"
```

## 🔧 MCP Tools

### `search_loans`
Türkçe doğal dil ile kredi arama yapar.

**Parametreler:**
- `query` (string): Kredi arama sorgusu

**Örnek Kullanım:**
```json
{
  "tool": "search_loans",
  "arguments": {
    "query": "5 milyon 48 ay vade konut kredisi"
  }
}
```

### `loan_help`
Sistem kullanım kılavuzunu gösterir.

## 🏗️ Proje Mimarisi

```
src/
├── types/           # TypeScript interface'leri
├── services/        # AI ve veri servisleri
│   ├── ai-service.ts      # Gemini AI entegrasyonu
│   └── loan-data-service.ts # Mock kredi verisi
├── tools/           # MCP tool implementasyonları
│   └── loan-search-tool.ts
└── server.ts        # Ana MCP sunucu
```

## 🎯 Özellikler

- ✅ Türkçe doğal dil işleme
- ✅ Google Gemini AI entegrasyonu
- ✅ Gerçekçi Türk bankalarından mock data
- ✅ Otomatik kredi hesaplamaları
- ✅ Faiz oranına göre sıralama
- ✅ Güvenli hata yönetimi

## 📈 Geliştirme

Bu proje basit ve genişletilebilir bir mimariyle tasarlanmıştır:

- **AI Servisi**: Farklı AI provider'ları kolayca entegre edilebilir
- **Veri Servisi**: Gerçek API'lere kolayca bağlanabilir
- **MCP Tools**: Yeni özellikler kolayca eklenebilir

## 🔐 Güvenlik

- API anahtarları environment variable'lar ile yönetilir
- Hata mesajları kullanıcı dostu formatta döner
- Input validation ve sanitization uygulanır

## 📞 Destek

Sorularınız için issue açabilir veya dökümantasyonu inceleyebilirsiniz. 