# Konut Kredisi MCP Server

Modern **Model Context Protocol (MCP)** sunucusu - Türkçe doğal dil ile konut kredisi hesaplama ve sorgulama. Gelişmiş **AI Provider Architecture** ile **OpenAI GPT**, **Claude AI** ve diğer yapay zeka modellerini destekler.
bunx @modelcontextprotocol/inspector node dist/src/server.js
5 milyon 48 ay vade konut kredisi sorgula
## 🚀 Temel Özellikler

### 🤖 Multi-AI Provider Architecture
- **🎯 Primary Provider**: OpenAI GPT (Türkçe için optimize)
- **🛡️ Fallback Provider**: Claude AI (karmaşık reasoning için)
- **🔄 Dynamic Switching**: Runtime'da provider değiştirme
- **📊 Auto-Selection**: En iyi provider'ı otomatik seçim
- 🌍 **Multi-Language**: Gelecekte farklı diller için genişletilebilir

### 💬 Doğal Dil İşleme
```bash
# Örnek sorgular:
"2 milyon TL 60 ay vade konut kredisi istiyorum"
"1.5 milyon lira 48 aylık ev kredisi hesapla"
"500 bin TL 5 yıl vadeli ihtiyaç kredisi"
"Araç alımı için 800000 TL 72 ay kredi"
```

### 🏦 Kredi Türleri
- **🏠 Konut Kredisi**: Ev satın alma
- **🚗 Taşıt Kredisi**: Araç finansmanı  
- **💰 İhtiyaç Kredisi**: Genel finansman

## 📦 Kurulum

### 1. Projeyi İndir
```bash
git clone <repository-url>
cd loanSearchMcp
npm install
```

### 2. AI Provider API Anahtarları
```bash
# .env dosyası oluştur
# Tercih ettiğin AI provider'ı kullan (her ikisi de isteğe bağlı)

# OpenAI (Primary - Tavsiye edilen)
export OPENAI_API_KEY="sk-..."

# Claude (Fallback)
export ANTHROPIC_API_KEY="sk-ant-..."

# Model seçimi (isteğe bağlı)
export OPENAI_MODEL="gpt-3.5-turbo"  # veya gpt-4
export CLAUDE_MODEL="claude-3-haiku-20240307"  # veya claude-3-sonnet
```

### 3. Projeyi Build Et
```bash
npm run build
```

## 🎯 AI Provider Configuration

### Provider Seçimi
```typescript
import { NaturalLanguageService, AIProviderType } from './src/services/natural-language.js';

// Otomatik provider seçimi (tavsiye edilen)
NaturalLanguageService.initialize();

// Manuel provider seçimi
NaturalLanguageService.initialize(AIProviderType.OPENAI);
NaturalLanguageService.initialize(AIProviderType.CLAUDE);

// Runtime'da provider değiştirme
NaturalLanguageService.switchProvider(AIProviderType.CLAUDE);
```

### Provider Diagnostics
```typescript
// Tüm provider'ları kontrol et
const diagnostics = await NaturalLanguageService.getAllDiagnostics();
console.log(diagnostics);

// Aktif provider'ı kontrol et
const current = await NaturalLanguageService.getDiagnostics();
console.log(current);
```

## 🛠️ MCP Client Kullanımı

### Claude Desktop Integration
```json
{
  "mcpServers": {
    "loan-search": {
      "command": "node",
      "args": ["./dist/src/server.js"],
      "cwd": "/path/to/loanSearchMcp",
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

### MCP Inspector (Development)
```bash
npx @modelcontextprotocol/inspector ./dist/src/server.js
```

## 🧪 Test ve Debug

### AI Provider Testing
```bash
# Tüm provider'ları test et
node -e "
import('./dist/src/services/natural-language.js').then(async ({ NaturalLanguageService }) => {
  await NaturalLanguageService.runTests();
});"

# Provider diagnostics
node -e "
import('./dist/src/services/natural-language.js').then(async ({ NaturalLanguageService }) => {
  const diagnostics = await NaturalLanguageService.getAllDiagnostics();
  console.log(JSON.stringify(diagnostics, null, 2));
});"
```

### Örnek Sorgular
```bash
# Türkçe doğal dil testleri
node -e "
import('./dist/src/services/natural-language.js').then(async ({ NaturalLanguageService }) => {
  NaturalLanguageService.switchProvider('mock'); // Test için
  
  const queries = [
    '2 milyon TL 60 ay konut kredisi',
    '500 bin lira ihtiyaç kredisi 5 yıl',
    'Araç için 1.5 milyon 72 ay taşıt kredisi'
  ];
  
  for (const query of queries) {
    const result = await NaturalLanguageService.parseQuery(query);
    console.log({
      query,
      creditType: result.creditType,
      amount: result.amount,
      term: result.term,
      confidence: result.confidence
    });
  }
});"
```

## 🏗️ Mimari

### AI Provider Architecture
```
┌─────────────────────────────────────────┐
│            Natural Language             │
│              Service                    │
├─────────────────────────────────────────┤
│         AI Provider Factory             │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   OpenAI    │  │     Claude      │   │
│  │  Provider   │  │    Provider     │   │
│  └─────────────┘  └─────────────────┘   │
├─────────────────────────────────────────┤
│           Base AI Provider              │
└─────────────────────────────────────────┘
```

### Provider Selection Logic
1. **🎯 Primary**: OpenAI (Türkçe için optimize)
2. **🛡️ Fallback**: Claude (primary başarısız olursa)
3. **🔧 Mock**: Test ve development için
4. **🚀 Auto-Selection**: API key varlığına göre otomatik

## 🌟 Özellikler

### ✅ Yapılan İyileştirmeler
- 🤖 **Multi-AI Provider**: OpenAI + Claude + Mock
- 🔄 **Dynamic Switching**: Runtime provider değişimi
- 📊 **Smart Diagnostics**: Detaylı hata analizi ve öneriler
- 🛡️ **Fallback System**: Primary başarısız olursa otomatik fallback
- 🌍 **Multi-Language Ready**: Gelecekte farklı diller için hazır
- ⚡ **Performance**: Caching ve optimized request handling
- 🧪 **Comprehensive Testing**: Tüm provider'lar için test suite

### 🎯 AI Provider Advantages
| Provider | Avantajlar | Kullanım Alanı |
|----------|------------|----------------|
| **OpenAI** | ✅ Hızlı yanıt<br/>✅ Türkçe desteği<br/>✅ Structured output | Primary parser |
| **Claude** | ✅ Complex reasoning<br/>✅ Yüksek doğruluk<br/>✅ Context understanding | Fallback & complex queries |
| **Mock** | ✅ Always available<br/>✅ No API costs<br/>✅ Testing | Development & testing |

## 🔧 Development

### Yeni AI Provider Ekleme
```typescript
// 1. Provider interface implement et
class MyAIProvider extends BaseAIProvider {
  get providerType(): AIProviderType {
    return AIProviderType.MY_AI;
  }
  
  async parseQuery(text: string): Promise<AIProviderResponse> {
    // Implementation
  }
}

// 2. Factory'ye ekle
// provider-factory.ts'de case ekle

// 3. Types'a ekle
// types/index.ts'de enum'a ekle
```

### Environment Variables
```bash
# AI Provider API Keys
OPENAI_API_KEY=sk-...                    # OpenAI API
ANTHROPIC_API_KEY=sk-ant-...            # Claude API

# Model Configuration (Optional)
OPENAI_MODEL=gpt-3.5-turbo              # OpenAI model
CLAUDE_MODEL=claude-3-haiku-20240307    # Claude model

# Debug
LOG_LEVEL=debug                         # Log level
MOCK_DATA_ENABLED=false                 # Mock data usage
```

## 📈 Performance

### Token Usage Optimization
- **🎯 OpenAI**: ~800 tokens/query (fast & economical)
- **🛡️ Claude**: ~800 tokens/query (high accuracy)
- **📊 Structured Output**: JSON prefill techniques
- **⚡ Caching**: Provider instance caching

### Response Times
- **OpenAI**: ~500-1500ms
- **Claude**: ~800-2000ms  
- **Mock**: ~1ms (instant)

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Add** new AI provider or improve existing ones
4. **Test** thoroughly with multiple providers
5. **Commit** changes (`git commit -m 'Add amazing feature'`)
6. **Push** to branch (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

## 📄 License

MIT License - detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🆘 Support

### Common Issues

**Q: Hangi AI provider'ı kullanmalıyım?**
A: OpenAI Türkçe için daha iyi, Claude karmaşık reasoning için. Sistem otomatik seçim yapar.

**Q: API key hatası alıyorum?**
A: `getAllDiagnostics()` ile provider durumlarını kontrol edin.

**Q: Provider switching çalışmıyor?**
A: `switchProvider()` kullanın ve yeni provider'ın configured olduğunu kontrol edin.

### Error Codes
- `AUTHENTICATION_ERROR`: API key problemi
- `BILLING_ERROR`: Claude kredi sorunu  
- `RATE_LIMIT_ERROR`: Rate limit aşımı
- `MODEL_NOT_FOUND`: Geçersiz model
- `CONNECTION_ERROR`: Network problemi

### Debug Commands
```bash
# Provider status
node -e "import('./dist/src/services/natural-language.js').then(async ({NaturalLanguageService}) => console.log(await NaturalLanguageService.getAllDiagnostics()))"

# Test parsing
node -e "import('./dist/src/services/natural-language.js').then(async ({NaturalLanguageService}) => { NaturalLanguageService.switchProvider('mock'); console.log(await NaturalLanguageService.parseQuery('test kredi')) })"
```

---

**Made with ❤️ for modern AI-powered financial applications** 