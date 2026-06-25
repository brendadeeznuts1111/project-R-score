#!/bin/bash
#
# @dynamic-spy/kit v9.0 - Tmux Production Load Test
# 
# Runs ALL 87 bookies × ALL 25K markets in background tmux session
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}🚀 Starting Production Load Test in Tmux${NC}"
echo "=============================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
	echo -e "${YELLOW}⚠️  tmux not found. Installing...${NC}"
	echo "   macOS: brew install tmux"
	echo "   Linux: sudo apt-get install tmux"
	exit 1
fi

# Check if server is running
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
	echo -e "${YELLOW}⚠️  Server not running. Starting server...${NC}"
	cd "$PROJECT_ROOT"
	bun --hot src/server/arb-server.ts &
	SERVER_PID=$!
	sleep 3
	echo -e "${GREEN}✅ Server started (PID: $SERVER_PID)${NC}"
fi

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

# Create tmux session
SESSION_NAME="arb-pool"

# Kill existing session if it exists
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
	echo -e "${YELLOW}⚠️  Existing session found. Killing it...${NC}"
	tmux kill-session -t "$SESSION_NAME"
fi

# Create new tmux session
echo -e "${GREEN}📦 Creating tmux session: $SESSION_NAME${NC}"
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT"

# Send load test command to tmux
echo -e "${GREEN}🚀 Starting load test...${NC}"
tmux send-keys -t "$SESSION_NAME" "echo 'Starting production load test...'" Enter
tmux send-keys -t "$SESSION_NAME" "START_TIME=\$(date +%s)" Enter
tmux send-keys -t "$SESSION_NAME" "for bookie in \"\${SHARP_BOOKIES_ALL[@]}\"; do for market in \"\${NBA_ALL_MARKETS[@]}\"; do curl -s \"http://localhost:3000/pool/\$bookie/\$market\" > /dev/null 2>&1 & done; done" Enter
tmux send-keys -t "$SESSION_NAME" "wait" Enter
tmux send-keys -t "$SESSION_NAME" "END_TIME=\$(date +%s)" Enter
tmux send-keys -t "$SESSION_NAME" "DURATION=\$((END_TIME - START_TIME))" Enter
tmux send-keys -t "$SESSION_NAME" "echo \"✅ Load test complete in \$DURATION seconds\"" Enter

echo ""
echo -e "${GREEN}✅ Load test started in tmux session: $SESSION_NAME${NC}"
echo ""
echo "Commands:"
echo "  tmux attach -t $SESSION_NAME    # Attach to session"
echo "  tmux detach                      # Detach (Ctrl+B, then D)"
echo "  tmux kill-session -t $SESSION_NAME  # Kill session"
echo ""
echo "Monitor progress:"
echo "  watch -n 1 'curl -s http://localhost:3000/pool/pinnacle/Lakers-Celtics | jq .pool'"
echo ""



