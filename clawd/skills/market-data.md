---
name: market-data
description: Fetch market data, crypto prices, stock quotes, and trading signals
metadata: {"clawdbot":{"emoji":"📈","os":["darwin","linux"]}}
---

# Market Data Skill

Fetch real-time and historical market data for stocks, crypto, and forex.

## Quick Commands

| Request | Action |
|---------|--------|
| "BTC price" | Current Bitcoin price |
| "ETH price" | Current Ethereum price |
| "AAPL stock" | Apple stock quote |
| "SPY today" | S&P 500 ETF performance |
| "crypto prices" | Top 10 crypto by market cap |
| "market status" | US market open/closed |

## Cryptocurrency

### CoinGecko API (Free, no key required)
```bash
# Bitcoin price
curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd,eur&include_24hr_change=true"

# Multiple coins
curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true"

# Top 10 by market cap
curl -s "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10"

# Specific coin details
curl -s "https://api.coingecko.com/api/v3/coins/bitcoin"
```

### Binance API (Free)
```bash
# Current price
curl -s "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"

# 24h stats
curl -s "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT"

# Recent trades
curl -s "https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=10"

# Klines (candlesticks)
curl -s "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24"
```

### Price Formatting
```bash
# Format with jq
curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true" | \
  jq -r '"BTC: $\(.bitcoin.usd | tostring) (\(.bitcoin.usd_24h_change | . * 100 | round / 100)%)"'
```

## Stocks

### Yahoo Finance (Unofficial)
```bash
# Quote
curl -s "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d"

# Multiple symbols
curl -s "https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,GOOGL,MSFT"
```

### Alpha Vantage (Free tier with API key)
```bash
AV_KEY="your-api-key"

# Quote
curl -s "https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=$AV_KEY"

# Daily prices
curl -s "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&apikey=$AV_KEY"
```

### Finnhub (Free tier)
```bash
FINNHUB_KEY="your-api-key"

# Quote
curl -s "https://finnhub.io/api/v1/quote?symbol=AAPL&token=$FINNHUB_KEY"

# Company profile
curl -s "https://finnhub.io/api/v1/stock/profile2?symbol=AAPL&token=$FINNHUB_KEY"
```

## Market Status

### Check if US markets are open
```bash
# Simple time-based check
check_market_hours() {
  local hour=$(TZ="America/New_York" date +%H)
  local dow=$(date +%u)  # 1=Mon, 7=Sun

  if [ "$dow" -ge 6 ]; then
    echo "closed (weekend)"
  elif [ "$hour" -ge 9 ] && [ "$hour" -lt 16 ]; then
    echo "open"
  elif [ "$hour" -ge 4 ] && [ "$hour" -lt 9 ]; then
    echo "pre-market"
  elif [ "$hour" -ge 16 ] && [ "$hour" -lt 20 ]; then
    echo "after-hours"
  else
    echo "closed"
  fi
}
```

## Price Alerts

### Simple alert script
```bash
#!/usr/bin/env bun
// Check BTC price against threshold
const threshold = 100000;
const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
const data = await res.json();
const price = data.bitcoin.usd;

if (price > threshold) {
  console.log(`ALERT: BTC above ${threshold}! Current: $${price}`);
}
```

### Cron integration
```bash
# Add to cb-cron
cb-cron add btc-alert "5m" "bun ~/clawd/scripts/check-btc.ts"
```

## Response Format

### Single Asset
```
[Symbol] [Name]
Price: $XX,XXX.XX
24h Change: +X.XX% (+$XXX)
24h High/Low: $XX,XXX / $XX,XXX
Volume: $X.XXB
Market Cap: $X.XXT
```

### Multiple Assets (Table)
```
Symbol    Price        24h Change
─────────────────────────────────
BTC      $97,234.56   +2.34%
ETH      $3,456.78    -1.23%
SOL      $234.56      +5.67%
```

### Market Summary
```
US Markets: [Open/Closed]
Time: 2:30 PM ET

SPY: $XXX.XX (+X.XX%)
QQQ: $XXX.XX (+X.XX%)
DIA: $XXX.XX (+X.XX%)

BTC: $XX,XXX (+X.XX%)
ETH: $X,XXX (+X.XX%)
```

## Example Interactions

**User:** "What's BTC at?"
```
Bitcoin (BTC)
Price: $97,234.56
24h Change: +2.34% (+$2,234)
24h Range: $94,500 - $98,100
Volume: $42.3B
```

**User:** "Check AAPL"
```
Apple Inc. (AAPL)
Price: $234.56
Change: +$3.45 (+1.49%)
Day Range: $231.20 - $235.80
Volume: 52.3M
Market Cap: $3.62T
```

**User:** "Crypto prices"
```
Top Cryptocurrencies by Market Cap

#  Symbol   Price         24h      Market Cap
───────────────────────────────────────────────
1  BTC     $97,234.56    +2.3%    $1.91T
2  ETH     $3,456.78     -1.2%    $416B
3  BNB     $678.90       +0.8%    $98B
4  SOL     $234.56       +5.6%    $112B
5  XRP     $2.34         +3.2%    $134B
```

**User:** "Is the market open?"
```
US Market Status: OPEN
Current Time: 2:30 PM ET

Hours:
  Pre-market: 4:00 AM - 9:30 AM ET
  Regular: 9:30 AM - 4:00 PM ET
  After-hours: 4:00 PM - 8:00 PM ET
```

## Environment Variables

```bash
export ALPHA_VANTAGE_KEY="your-key"
export FINNHUB_KEY="your-key"
export COINGECKO_KEY="your-key"  # Optional, for higher rate limits
```

## Triggers

Respond to:
- "[symbol] price", "price of [symbol]"
- "BTC", "ETH", "SOL" (crypto shortcuts)
- "AAPL", "GOOGL", "TSLA" (stock tickers)
- "crypto prices", "top crypto"
- "market status", "is market open"
- "stock market today"
- "set price alert for [symbol] at [price]"
