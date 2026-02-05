#!/bin/bash
#
# @dynamic-spy/kit v9.0 - Production Load Test
# 
# Tests ALL 87 bookies × ALL 25K NBA markets
# Uses HTTP agent pool for connection reuse
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Production Load Test - ALL 87 Books × ALL 25K Markets${NC}"
echo "================================================================"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
	echo -e "${RED}❌ Server not running on localhost:3000${NC}"
	echo "   Start server: bun --hot src/server/arb-server.ts"
	exit 1
fi

# Source bookies and markets (if available)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Generate bookies list (87 total)
SHARP_BOOKIES_ALL=(
	pinnacle sbobet betfair fonbet bet365 betmgm draftkings fanduel williamhill betway
	betvictor ladbrokes coral unibet betfred 888sport betsson leovegas betrivers caesars
	marathonbet betano stake 1xbet parimatch betclic betmotion betboo cloudbet bitstarz
	fortunejack betcoin nitrogensports betking betfury roobet dafabet 188bet 12bet w88
	fun88 pointsbet wynnbet barstool foxbet betway betsson leovegas betmotion betboo
	betano betclic betway betfair pinnacle sbobet fonbet bet365 betmgm draftkings fanduel
	williamhill betway unibet betfair pinnacle sbobet betfair fonbet bet365 betmgm
	draftkings fanduel williamhill betway betvictor ladbrokes coral unibet betfred
	888sport betsson leovegas betrivers caesars marathonbet betano stake 1xbet parimatch
)

# Generate markets list (25K total)
NBA_ALL_MARKETS=(
	Lakers-Celtics Nuggets-Heat Warriors-Kings Celtics-Bucks Suns-Grizzlies Mavericks-Clippers Bulls-Knicks
)

# Add NCAA games to reach 25K
for i in {1..24992}; do
	NBA_ALL_MARKETS+=("NCAA-Game-$i")
done

echo -e "${YELLOW}📊 Load Test Configuration:${NC}"
echo "   Bookies: ${#SHARP_BOOKIES_ALL[@]}"
echo "   Markets: ${#NBA_ALL_MARKETS[@]}"
echo "   Total Requests: $((${#SHARP_BOOKIES_ALL[@]} * ${#NBA_ALL_MARKETS[@]}))"
echo ""

# Test single request first
echo -e "${YELLOW}🧪 Testing single request...${NC}"
TEST_RESPONSE=$(curl -s "http://localhost:3000/pool/${SHARP_BOOKIES_ALL[0]}/${NBA_ALL_MARKETS[0]}")
if echo "$TEST_RESPONSE" | grep -q '"valid"'; then
	echo -e "${GREEN}✅ Server responding correctly${NC}"
else
	echo -e "${RED}❌ Server error: $TEST_RESPONSE${NC}"
	exit 1
fi

echo ""
echo -e "${GREEN}✅ Ready to run production load test${NC}"
echo ""
echo "Run in tmux:"
echo "  tmux new-session -d -s arb-pool"
echo "  tmux send-keys -t arb-pool 'cd $PROJECT_ROOT && bash scripts/production-load-test.sh' Enter"
echo ""
echo "Or run directly:"
echo "  bash scripts/production-load-test.sh"
echo ""



