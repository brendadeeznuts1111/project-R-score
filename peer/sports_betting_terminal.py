#!/usr/bin/env python3
"""
Sports Betting Terminal

Bloomberg-style terminal dashboard for sportsbook odds, line movement,
arbitrage checks, and Polymarket-style prediction markets.

Primary public data sources this script is designed around:
- The Odds API: live and historical sportsbook odds.
- Polymarket Gamma API: public event and market metadata.
- OddsPortal/OddsHarvester-style history exports.
- linewatch-style movement and disagreement detection.

The default mode uses deterministic demo data so the terminal works without
network access or third-party Python packages. Set ODDS_API_KEY and run with
--live to fetch current odds from The Odds API.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import random
import shutil
import sys
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"
WHITE = "\033[37m"
BG_HEADER = "\033[48;5;17m"
BG_STATUS = "\033[48;5;236m"


SPORTS = {
    "nfl": "NFL",
    "ncaaf": "NCAAF",
    "nba": "NBA",
    "ncaab": "NCAAB",
    "mlb": "MLB",
    "nhl": "NHL",
    "epl": "EPL",
    "ucl": "UCL",
    "tennis": "Tennis",
    "golf": "PGA",
    "mma": "MMA",
    "boxing": "Boxing",
    "polymarket": "Polymarket",
}

ODDS_API_SPORT_KEYS = {
    "nfl": "americanfootball_nfl",
    "ncaaf": "americanfootball_ncaaf",
    "nba": "basketball_nba",
    "ncaab": "basketball_ncaab",
    "mlb": "baseball_mlb",
    "nhl": "icehockey_nhl",
    "epl": "soccer_epl",
    "ucl": "soccer_uefa_champs_league",
    "tennis": "tennis_atp_wimbledon",
    "golf": "golf_pga_championship_winner",
    "mma": "mma_mixed_martial_arts",
    "boxing": "boxing_boxing",
}

BOOKS = [
    "DraftKings",
    "FanDuel",
    "Pinnacle",
    "BetMGM",
    "Caesars",
    "Bovada",
    "BetRivers",
    "ESPN BET",
]


@dataclass
class BookLine:
    book: str
    home_ml: int
    away_ml: int
    spread: float
    spread_price: int
    total: float
    over_price: int
    updated: str


@dataclass
class Movement:
    time: str
    book: str
    market: str
    open_value: str
    current_value: str
    move: str
    signal: str


@dataclass
class Game:
    game_id: str
    sport: str
    league: str
    away: str
    home: str
    starts: str
    lines: list[BookLine] = field(default_factory=list)
    movements: list[Movement] = field(default_factory=list)


@dataclass
class PolyMarket:
    market_id: str
    title: str
    yes: float
    no: float
    volume: int
    move_24h: float
    category: str


def color(text: object, code: str) -> str:
    return f"{code}{text}{RESET}"


def signed(value: int | float, digits: int = 0) -> str:
    if isinstance(value, float) and digits:
        return f"{value:+.{digits}f}"
    return f"{value:+d}" if isinstance(value, int) else f"{value:+.0f}"


def odds_text(value: int) -> str:
    out = signed(value)
    return color(out, GREEN if value > 0 else RED)


def move_color(value: float) -> str:
    if value > 0:
        return GREEN
    if value < 0:
        return RED
    return WHITE


def terminal_width() -> int:
    return max(96, shutil.get_terminal_size((120, 30)).columns)


def strip_ansi(value: str) -> str:
    out = []
    i = 0
    while i < len(value):
        if value[i] == "\033":
            end = value.find("m", i)
            i = len(value) if end == -1 else end + 1
            continue
        out.append(value[i])
        i += 1
    return "".join(out)


def visible_len(value: str) -> int:
    return len(strip_ansi(value))


def pad(value: str, width: int, align: str = "left") -> str:
    size = visible_len(value)
    if size > width:
        raw = strip_ansi(value)
        return raw[: max(0, width - 1)] + ("." if width else "")
    extra = " " * (width - size)
    if align == "right":
        return extra + value
    if align == "center":
        left = len(extra) // 2
        return " " * left + value + " " * (len(extra) - left)
    return value + extra


def clear() -> None:
    print("\033[2J\033[H", end="")


def table(headers: list[str], rows: list[list[str]], widths: list[int]) -> str:
    sep = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
    head = "|" + "|".join(f" {pad(h, w, 'center')} " for h, w in zip(headers, widths)) + "|"
    body = []
    for row in rows:
        body.append("|" + "|".join(f" {pad(c, w)} " for c, w in zip(row, widths)) + "|")
    return "\n".join([sep, head, sep, *body, sep])


def panel(title: str, body: str, width: int | None = None) -> str:
    content_width = max((visible_len(line) for line in body.splitlines()), default=0)
    width = max(width or terminal_width(), content_width + 4)
    inner = width - 4
    title_text = f" {title} "
    top = "+" + title_text + "-" * max(0, inner - len(title_text) + 2) + "+"
    lines = []
    for line in body.splitlines() or [""]:
        lines.append("| " + pad(line, inner) + " |")
    bottom = "+" + "-" * (inner + 2) + "+"
    return "\n".join([top, *lines, bottom])


def header(active: str, live: bool) -> str:
    width = terminal_width()
    now = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    mode = "LIVE" if live else "DEMO"
    title = f" SPORTS BETTING TERMINAL | {SPORTS.get(active, active.upper())} | {mode} | {now} "
    return BG_HEADER + BOLD + pad(title, width) + RESET


def status_bar(message: str) -> str:
    commands = "sports: nfl nba mlb nhl epl ucl tennis | details <id> | refresh | arb | export | sources | q"
    return BG_STATUS + pad(f" {message} :: {commands}", terminal_width()) + RESET


def make_demo_data() -> tuple[dict[str, list[Game]], list[PolyMarket]]:
    random.seed(42)
    fixtures = {
        "nfl": [("kc_phi", "Kansas City", "Philadelphia"), ("buf_dal", "Buffalo", "Dallas")],
        "ncaaf": [("uga_bama", "Georgia", "Alabama"), ("osu_mich", "Ohio State", "Michigan")],
        "nba": [("bos_nyk", "Boston", "New York"), ("lal_den", "LA Lakers", "Denver")],
        "ncaab": [("duke_unc", "Duke", "North Carolina"), ("hou_kan", "Houston", "Kansas")],
        "mlb": [("nyy_bos", "NY Yankees", "Boston"), ("lad_sdg", "LA Dodgers", "San Diego")],
        "nhl": [("tor_bos", "Toronto", "Boston"), ("edm_vgk", "Edmonton", "Vegas")],
        "epl": [("ars_mci", "Arsenal", "Manchester City"), ("liv_che", "Liverpool", "Chelsea")],
        "ucl": [("rma_bay", "Real Madrid", "Bayern Munich"), ("psg_bar", "PSG", "Barcelona")],
        "tennis": [("alc_sin", "Carlos Alcaraz", "Jannik Sinner"), ("iga_ary", "Iga Swiatek", "Aryna Sabalenka")],
        "golf": [("pga_outright", "Scottie Scheffler", "Rory McIlroy")],
        "mma": [("ufc_main", "Makhachev", "Topuria")],
        "boxing": [("boxing_main", "Usyk", "Fury")],
    }
    data: dict[str, list[Game]] = {}
    base_time = dt.datetime.now() + dt.timedelta(hours=6)
    for sport, games in fixtures.items():
        sport_games = []
        for index, (game_id, away, home) in enumerate(games):
            starts = (base_time + dt.timedelta(hours=index * 3)).strftime("%m/%d %H:%M")
            game = Game(game_id, sport, SPORTS[sport], away, home, starts)
            base_home = random.choice([-165, -145, -125, 115, 130, 150])
            if base_home < 0:
                base_away = round(abs(base_home) * 0.7 + 20)
            else:
                base_away = -round(base_home * 0.7 + 45)
            for book in BOOKS:
                drift = random.choice([-12, -8, -5, 0, 4, 7, 11])
                spread = random.choice([-3.5, -2.5, -1.5, 1.5, 2.5, 3.5])
                if base_home > 0:
                    spread *= -1
                total_base = {
                    "nfl": 47.5,
                    "ncaaf": 56.5,
                    "nba": 224.5,
                    "ncaab": 143.5,
                    "mlb": 8.5,
                    "nhl": 6.0,
                    "epl": 2.5,
                    "ucl": 2.5,
                    "tennis": 38.5,
                    "golf": 271.5,
                    "mma": 2.5,
                    "boxing": 8.5,
                }[sport]
                game.lines.append(
                    BookLine(
                        book=book,
                        home_ml=base_home + drift,
                        away_ml=base_away - drift,
                        spread=spread + random.choice([-0.5, 0, 0.5]),
                        spread_price=random.choice([-115, -110, -105, 100]),
                        total=total_base + random.choice([-1.0, -0.5, 0, 0.5, 1.0]),
                        over_price=random.choice([-116, -112, -108, -104, 100]),
                        updated=(dt.datetime.now() - dt.timedelta(minutes=random.randint(1, 24))).strftime("%H:%M"),
                    )
                )
            game.movements = [
                Movement("Open", "Consensus", "Spread", f"{home} -2.5", f"{home} {game.lines[0].spread:+.1f}", "+1.0", "opening"),
                Movement("-90m", "Pinnacle", "Moneyline", signed(base_home - 18), signed(game.lines[2].home_ml), "+18", "sharp"),
                Movement("-42m", "FanDuel", "Total", f"{game.lines[1].total - 1.5:.1f}", f"{game.lines[1].total:.1f}", "+1.5", "steam"),
                Movement("-10m", "DraftKings", "Spread", f"{game.lines[0].spread - 0.5:+.1f}", f"{game.lines[0].spread:+.1f}", "+0.5", "public"),
            ]
            sport_games.append(game)
        data[sport] = sport_games
    polymarkets = [
        PolyMarket("poly_nba_title", "NBA champion", 0.31, 0.69, 8_450_000, 2.4, "Sports"),
        PolyMarket("poly_ucl_winner", "Champions League winner", 0.27, 0.73, 5_210_000, -1.2, "Sports"),
        PolyMarket("poly_super_bowl", "Super Bowl champion", 0.18, 0.82, 11_900_000, 0.8, "Sports"),
        PolyMarket("poly_election", "US presidential election winner", 0.52, 0.48, 72_500_000, -3.1, "Politics"),
        PolyMarket("poly_fed", "Fed cuts rates by September", 0.44, 0.56, 16_300_000, 4.6, "Macro"),
    ]
    return data, polymarkets


def american_to_decimal(odds: int) -> float:
    if odds > 0:
        return 1 + odds / 100
    return 1 + 100 / abs(odds)


def implied_probability(odds: int) -> float:
    if odds > 0:
        return 100 / (odds + 100)
    return abs(odds) / (abs(odds) + 100)


def best_moneyline(game: Game) -> tuple[BookLine, BookLine, float]:
    best_home = max(game.lines, key=lambda line: line.home_ml)
    best_away = max(game.lines, key=lambda line: line.away_ml)
    hold = implied_probability(best_home.home_ml) + implied_probability(best_away.away_ml)
    return best_home, best_away, hold


def render_games(games: list[Game]) -> str:
    rows = []
    for game in games:
        best_home, best_away, hold = best_moneyline(game)
        consensus = game.lines[0]
        signal = "ARB" if hold < 1 else ("LOW HOLD" if hold < 1.025 else "WATCH")
        signal_color = GREEN if hold < 1 else (YELLOW if hold < 1.025 else WHITE)
        rows.append(
            [
                game.game_id,
                game.starts,
                f"{game.away} @ {game.home}",
                f"{best_away.book} {odds_text(best_away.away_ml)}",
                f"{best_home.book} {odds_text(best_home.home_ml)}",
                f"{consensus.spread:+.1f} ({signed(consensus.spread_price)})",
                f"{consensus.total:.1f} ({signed(consensus.over_price)})",
                color(f"{hold * 100:.1f}% {signal}", signal_color),
            ]
        )
    return table(
        ["ID", "Start", "Matchup", "Best Away ML", "Best Home ML", "Spread", "Total", "Signal"],
        rows,
        [14, 11, 28, 22, 22, 16, 16, 16],
    )


def render_game_detail(game: Game) -> str:
    line_rows = []
    for line in game.lines:
        line_rows.append(
            [
                line.book,
                odds_text(line.away_ml),
                odds_text(line.home_ml),
                f"{line.spread:+.1f} {signed(line.spread_price)}",
                f"{line.total:.1f} {signed(line.over_price)}",
                line.updated,
            ]
        )
    movement_rows = []
    for move in game.movements:
        movement_rows.append(
            [
                move.time,
                move.book,
                move.market,
                move.open_value,
                move.current_value,
                color(move.move, move_color(float(move.move.replace("+", "") or 0))),
                move.signal.upper(),
            ]
        )
    lines = table(["Book", "Away ML", "Home ML", "Spread", "Total", "Upd"], line_rows, [14, 10, 10, 15, 15, 7])
    movement = table(["Time", "Book", "Market", "Open", "Current", "Move", "Signal"], movement_rows, [8, 12, 10, 18, 18, 8, 10])
    return f"{game.away} @ {game.home} | {game.league} | start {game.starts}\n\n{lines}\n\n{movement}"


def render_polymarket(markets: list[PolyMarket]) -> str:
    rows = []
    for market in markets:
        rows.append(
            [
                market.market_id,
                market.category,
                market.title,
                f"{market.yes * 100:.0f}c",
                f"{market.no * 100:.0f}c",
                f"${market.volume:,}",
                color(f"{market.move_24h:+.1f}%", move_color(market.move_24h)),
            ]
        )
    return table(["ID", "Cat", "Market", "Yes", "No", "Volume", "24h"], rows, [18, 10, 38, 6, 6, 14, 8])


def render_arbitrage(data: dict[str, list[Game]]) -> str:
    rows = []
    for sport, games in data.items():
        for game in games:
            best_home, best_away, hold = best_moneyline(game)
            edge = (1 - hold) * 100
            if hold < 1.035:
                rows.append(
                    [
                        SPORTS[sport],
                        game.game_id,
                        f"{game.away} @ {game.home}",
                        f"{best_away.book} {signed(best_away.away_ml)}",
                        f"{best_home.book} {signed(best_home.home_ml)}",
                        color(f"{edge:+.2f}%", GREEN if edge > 0 else YELLOW),
                    ]
                )
    rows.sort(key=lambda row: float(strip_ansi(row[-1]).replace("%", "")), reverse=True)
    if not rows:
        return "No low-hold or arbitrage candidates in the current snapshot."
    return table(["Sport", "ID", "Matchup", "Away", "Home", "Edge"], rows[:12], [8, 14, 30, 20, 20, 8])


def mutate_lines(data: dict[str, list[Game]], polymarkets: list[PolyMarket]) -> None:
    for games in data.values():
        for game in games:
            for line in game.lines:
                line.home_ml += random.choice([-6, -3, 0, 2, 5])
                line.away_ml += random.choice([-5, -2, 0, 3, 6])
                line.spread += random.choice([-0.5, 0, 0.5])
                line.total += random.choice([-0.5, 0, 0.5])
                line.updated = dt.datetime.now().strftime("%H:%M")
            watched = game.lines[0]
            game.movements.insert(
                1,
                Movement(
                    dt.datetime.now().strftime("%H:%M"),
                    watched.book,
                    "Moneyline",
                    signed(watched.home_ml - random.choice([-8, -4, 4, 8])),
                    signed(watched.home_ml),
                    signed(random.choice([-8, -4, 4, 8])),
                    random.choice(["steam", "sharp", "public", "book split"]),
                ),
            )
            game.movements = game.movements[:6]
    for market in polymarkets:
        delta = random.choice([-2.0, -1.1, -0.4, 0.5, 1.3, 2.2]) / 100
        market.yes = min(0.95, max(0.05, market.yes + delta))
        market.no = 1 - market.yes
        market.move_24h += delta * 100


def export_csv(data: dict[str, list[Game]], polymarkets: list[PolyMarket], path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        writer.writerow(["type", "sport", "game_id", "book", "away", "home", "away_ml", "home_ml", "spread", "total", "updated"])
        for sport, games in data.items():
            for game in games:
                for line in game.lines:
                    writer.writerow(
                        [
                            "sportsbook",
                            sport,
                            game.game_id,
                            line.book,
                            game.away,
                            game.home,
                            line.away_ml,
                            line.home_ml,
                            line.spread,
                            line.total,
                            line.updated,
                        ]
                    )
        writer.writerow([])
        writer.writerow(["type", "market_id", "category", "title", "yes", "no", "volume", "move_24h"])
        for market in polymarkets:
            writer.writerow(["polymarket", market.market_id, market.category, market.title, market.yes, market.no, market.volume, market.move_24h])


def sources_text() -> str:
    return "\n".join(
        [
            "The Odds API: live and historical odds across major books and sports.",
            "oddshub: Go TUI using The Odds API; useful production reference.",
            "OddsHarvester: OddsPortal scraper for deep historical movement datasets.",
            "Polymarket Gamma/CLOB APIs: prediction-market events, prices, and trading.",
            "linewatch-style trackers: opening/closing movement, steam, sharp, and disagreement flags.",
            "Paid feeds such as Sportradar can replace scraping for production compliance.",
        ]
    )


def help_text() -> str:
    return "\n".join(
        [
            "Commands:",
            "  nfl, nba, mlb, nhl, epl, ucl, tennis, golf, mma, boxing, polymarket",
            "  details <game_id>       show sportsbook comparison and movement history",
            "  refresh                 simulate a live tick and line movement",
            "  arb                     scan best prices for low-hold or arbitrage setups",
            "  export [path]           write the current snapshot to CSV",
            "  sources                 show data-source notes",
            "  help                    show this help",
            "  q                       quit",
        ]
    )


def fetch_json(url: str, timeout: int = 12) -> object:
    req = urllib.request.Request(url, headers={"User-Agent": "sports-betting-terminal/0.1"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def fetch_odds_real(sport: str, api_key: str) -> list[Game]:
    sport_key = ODDS_API_SPORT_KEYS.get(sport)
    if not sport_key:
        raise ValueError(f"No Odds API mapping for {sport}")
    query = urllib.parse.urlencode(
        {
            "apiKey": api_key,
            "regions": "us,uk,eu,au",
            "markets": "h2h,spreads,totals",
            "oddsFormat": "american",
        }
    )
    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds/?{query}"
    payload = fetch_json(url)
    if not isinstance(payload, list):
        raise ValueError("Unexpected Odds API response")
    games: list[Game] = []
    for item in payload[:10]:
        home = item.get("home_team", "Home")
        away = next((team for team in item.get("teams", []) if team != home), item.get("away_team", "Away"))
        starts_raw = item.get("commence_time", "")
        starts = starts_raw.replace("T", " ").replace("Z", "")[5:16] if starts_raw else "TBD"
        game_id = item.get("id", f"{sport}_{len(games)}")[:14]
        game = Game(game_id, sport, SPORTS.get(sport, sport.upper()), away, home, starts)
        for book in item.get("bookmakers", [])[:12]:
            markets = {market.get("key"): market for market in book.get("markets", [])}
            h2h = markets.get("h2h", {}).get("outcomes", [])
            spreads = markets.get("spreads", {}).get("outcomes", [])
            totals = markets.get("totals", {}).get("outcomes", [])
            home_ml = next((o.get("price") for o in h2h if o.get("name") == home), None)
            away_ml = next((o.get("price") for o in h2h if o.get("name") == away), None)
            spread = next((o.get("point") for o in spreads if o.get("name") == home), 0)
            spread_price = next((o.get("price") for o in spreads if o.get("name") == home), -110)
            total = next((o.get("point") for o in totals if o.get("name", "").lower() == "over"), 0)
            over_price = next((o.get("price") for o in totals if o.get("name", "").lower() == "over"), -110)
            if home_ml is None or away_ml is None:
                continue
            game.lines.append(
                BookLine(
                    book=book.get("title", "Book"),
                    home_ml=int(home_ml),
                    away_ml=int(away_ml),
                    spread=float(spread or 0),
                    spread_price=int(spread_price or -110),
                    total=float(total or 0),
                    over_price=int(over_price or -110),
                    updated=book.get("last_update", "")[11:16] or "now",
                )
            )
        if game.lines:
            first = game.lines[0]
            game.movements = [
                Movement("Live", "Consensus", "Moneyline", "n/a", signed(first.home_ml), "0", "live"),
                Movement("Live", first.book, "Spread", "n/a", f"{first.spread:+.1f}", "0", "live"),
            ]
            games.append(game)
    return games


def fetch_polymarket_real() -> list[PolyMarket]:
    url = "https://gamma-api.polymarket.com/markets?closed=false&limit=8&order=volume&ascending=false"
    payload = fetch_json(url)
    if not isinstance(payload, list):
        return []
    markets: list[PolyMarket] = []
    for item in payload:
        outcomes = item.get("outcomes")
        prices = item.get("outcomePrices")
        try:
            parsed_prices = json.loads(prices) if isinstance(prices, str) else prices
        except json.JSONDecodeError:
            parsed_prices = []
        yes = float(parsed_prices[0]) if parsed_prices else 0.5
        markets.append(
            PolyMarket(
                market_id=str(item.get("id", ""))[:18],
                title=str(item.get("question", item.get("title", "Market")))[:80],
                yes=yes,
                no=1 - yes,
                volume=int(float(item.get("volume", 0) or 0)),
                move_24h=float(item.get("oneDayPriceChange", 0) or 0) * 100,
                category=str(item.get("category", "Prediction"))[:10],
            )
        )
        if outcomes and len(markets) >= 8:
            break
    return markets


def find_game(data: dict[str, list[Game]], game_id: str) -> Game | None:
    for games in data.values():
        for game in games:
            if game.game_id == game_id:
                return game
    return None


def render(active: str, data: dict[str, list[Game]], polymarkets: list[PolyMarket], message: str, live: bool) -> None:
    clear()
    print(header(active, live))
    tabs = " ".join(color(f"[{key}]", CYAN if key == active else DIM) for key in SPORTS)
    print(tabs)
    print()
    if active == "polymarket":
        print(panel("Prediction Markets", render_polymarket(polymarkets)))
    else:
        print(panel(f"{SPORTS.get(active, active.upper())} Odds Board", render_games(data.get(active, []))))
        print()
        print(panel("Top Arbitrage / Low-Hold Watch", render_arbitrage(data), terminal_width()))
    print(status_bar(message))


def run_terminal(args: argparse.Namespace) -> int:
    data, polymarkets = make_demo_data()
    live = False
    message = "demo snapshot loaded"

    if args.live:
        api_key = args.api_key or os.getenv("ODDS_API_KEY")
        if api_key:
            try:
                active_games = fetch_odds_real(args.sport, api_key)
                if active_games:
                    data[args.sport] = active_games
                    live = True
                    message = f"live odds loaded for {args.sport}"
            except (urllib.error.URLError, TimeoutError, ValueError) as exc:
                message = f"live odds unavailable: {exc}; using demo data"
        else:
            message = "ODDS_API_KEY missing; using demo data"
        try:
            fetched_poly = fetch_polymarket_real()
            if fetched_poly:
                polymarkets = fetched_poly
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass

    active = args.sport if args.sport in SPORTS else "nfl"
    render(active, data, polymarkets, message, live)
    if args.demo:
        return 0

    while True:
        try:
            command = input(color("\nsbt> ", CYAN)).strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return 0
        if not command:
            render(active, data, polymarkets, message, live)
            continue
        parts = command.split()
        op = parts[0].lower()
        if op in {"q", "quit", "exit"}:
            return 0
        if op in SPORTS:
            active = op
            message = f"switched to {SPORTS[active]}"
            render(active, data, polymarkets, message, live)
        elif op == "details" and len(parts) > 1:
            game = find_game(data, parts[1])
            clear()
            print(header(active, live))
            print(panel(f"Game Detail: {parts[1]}", render_game_detail(game) if game else "Game not found."))
            print(status_bar("detail view"))
        elif op == "refresh":
            mutate_lines(data, polymarkets)
            message = "snapshot refreshed and movements simulated"
            render(active, data, polymarkets, message, live)
        elif op == "arb":
            clear()
            print(header(active, live))
            print(panel("Arbitrage Scanner", render_arbitrage(data)))
            print(status_bar("arbitrage scan complete"))
        elif op == "export":
            path = Path(parts[1]).expanduser() if len(parts) > 1 else Path("sports_betting_snapshot.csv")
            export_csv(data, polymarkets, path)
            message = f"exported {path.resolve()}"
            render(active, data, polymarkets, message, live)
        elif op == "sources":
            clear()
            print(header(active, live))
            print(panel("Sources", sources_text()))
            print(status_bar("source notes"))
        elif op == "help":
            clear()
            print(header(active, live))
            print(panel("Help", help_text()))
            print(status_bar("help"))
        else:
            message = f"unknown command: {command}"
            render(active, data, polymarkets, message, live)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bloomberg-style sports betting terminal")
    parser.add_argument("--demo", action="store_true", help="render one snapshot and exit")
    parser.add_argument("--live", action="store_true", help="try The Odds API and Polymarket before falling back to demo data")
    parser.add_argument("--api-key", help="The Odds API key; defaults to ODDS_API_KEY")
    parser.add_argument("--sport", default="nfl", choices=sorted(SPORTS), help="initial sport tab")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    return run_terminal(parse_args(argv or sys.argv[1:]))


if __name__ == "__main__":
    raise SystemExit(main())
