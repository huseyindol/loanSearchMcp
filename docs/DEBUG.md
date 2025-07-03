# 🔍 Debug Kılavuzu

MCP sunucunuzda debug yapmak için birkaç farklı yöntem mevcuttur.

## 🚨 Önemli: Neden console.log Görünmüyor?

MCP protokolü `stdout`'u kendisi için kullanır. Bu yüzden:
- ❌ `console.log()` görünmez
- ✅ `console.error()` görünür (stderr'e yazılır)

Bu projede özel `Logger` sınıfı kullanıyoruz.

## 🔧 Debug Yöntemleri

### 1. Terminal'de Stderr Logları

```bash
# Normal başlatma - sadece hatalar görünür
npm start

# Debug modunda çalıştırma - tüm loglar görünür
npm run debug
```

Logları görmek için stderr'i file'a yönlendirebilirsiniz:
```bash
npm start 2> debug.log
# Başka terminal'de:
tail -f debug.log
```

### 2. MCP Inspector ile Visual Debug

```bash
# Inspector ile başlat
npm run inspect

# Otomatik build + inspect
npm run inspect:debug
```

Inspector açıldığında:
1. http://localhost:6274 'e gidin
2. **Transport**: "stdio" seçin  
3. **Server Command**: `node`
4. **Server Args**: `dist/src/server.js`
5. **Connect** butonuna tıklayın

### 3. Log Seviyeleri

Projemizde 4 log seviyesi var:

```typescript
Logger.debug("Detaylı debug bilgisi");    // [DEBUG]
Logger.info("Genel bilgi");               // [INFO] 
Logger.warn("Uyarı mesajı");              // [WARN]
Logger.error("Hata mesajı");              // [ERROR]

// Özel log tipleri:
Logger.query("sorgu", result);           // [QUERY]
Logger.tool("tool_name", args, result);  // [TOOL]
```

### 4. Inspector'da Tool Test Etme

1. Inspector'da **Tools** sekmesine gidin
2. `search_loans` tool'unu seçin
3. Query input'una test sorgunuzu yazın:
   ```
   5 milyon 48 ay vade konut kredisi sorgula
   ```
4. **Call Tool** butonuna tıklayın
5. Sol panelde stderr loglarını görebilirsiniz

### 5. CLI Mode ile Debug

```bash
# CLI mode'da tool çağırma
npx @modelcontextprotocol/inspector --cli node dist/src/server.js --method tools/call --tool-name search_loans --tool-arg query="300bin 24ay ihtiyaç kredisi"

# Tool listesi
npx @modelcontextprotocol/inspector --cli node dist/src/server.js --method tools/list
```

## 📊 Log Örnekleri

Başarılı bir sorgu şöyle görünür:

```
[INFO] 2024-01-10T10:30:00.000Z - 🏦 Kredi MCP Sunucusu başlatılıyor...
[INFO] 2024-01-10T10:30:00.100Z - ✅ MCP tools kaydedildi
[INFO] 2024-01-10T10:30:00.200Z - ✅ MCP resources kaydedildi
[INFO] 2024-01-10T10:30:00.300Z - 🚀 Kredi MCP Sunucusu başarıyla başlatıldı!
[QUERY] 2024-01-10T10:30:05.000Z - "5 milyon 48 ay vade konut kredisi sorgula" {...}
[DEBUG] 2024-01-10T10:30:05.100Z - Parse edilen parametreler: {"type":"konut","amount":5000000,"termMonths":48}
[INFO] 2024-01-10T10:30:05.200Z - Kredi arama tamamlandı: 4 kredi bulundu
[TOOL] 2024-01-10T10:30:05.300Z - search_loans {"args":{"query":"5 milyon 48 ay vade konut kredisi sorgula"},"result":"4 kredi bulundu"}
```

## 🐛 Yaygın Debug Sorunları

### Problem: Hiç log görünmüyor
**Çözüm**: stderr'i kontrol edin:
```bash
node dist/src/server.js 2>&1
```

### Problem: AI parse etmiyor  
**Çözüm**: Gemini API key'i kontrol edin:
```bash
echo $GEMINI_API_KEY
```

### Problem: Inspector bağlanmıyor
**Çözüm**: Port conflict'i kontrol edin:
```bash
# Farklı port kullanın
CLIENT_PORT=8080 SERVER_PORT=9000 npm run inspect
```

## 📝 Debug İpuçları

1. **Logları filtreleyin**:
   ```bash
   npm start 2>&1 | grep "QUERY"
   ```

2. **JSON logları pretty print**:
   ```bash
   npm start 2>&1 | grep "QUERY" | jq '.'
   ```

3. **Canlı log takibi**:
   ```bash
   npm start 2> debug.log &
   tail -f debug.log | grep -E "\[ERROR\]|\[WARN\]"
   ```

4. **Tool response'ları kontrol edin**:
   Inspector'da **Network** sekmesini açık tutun.

Bu debug yöntemleri ile MCP sunucunuzun her adımını izleyebilir ve sorunları kolayca tespit edebilirsiniz. 