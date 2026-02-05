/**
 * @dynamic-spy/kit v9.0 - Production Bookies List
 * 
 * ALL 87 sharp bookies for production arbitrage
 */

export const SHARP_BOOKIES_ALL = [
	// Tier 1: Premium Sharp Books (10)
	'pinnacle', 'sbobet', 'betfair', 'fonbet', 'bet365',
	'betmgm', 'draftkings', 'fanduel', 'williamhill', 'betway',
	
	// Tier 2: Major Books (10)
	'betvictor', 'ladbrokes', 'coral', 'unibet', 'betfred',
	'888sport', 'betsson', 'leovegas', 'betrivers', 'caesars',
	
	// Tier 3: Regional Sharp Books (10)
	'marathonbet', 'betano', 'stake', '1xbet', 'parimatch',
	'betclic', 'betmotion', 'betboo', 'cloudbet', 'bitstarz',
	
	// Tier 4: Crypto Books (10)
	'fortunejack', 'betcoin', 'nitrogensports', 'betking', 'betfury',
	'roobet', 'stakeus', 'bovada', 'mybookie', 'betonline',
	
	// Tier 5: Asian Books (10)
	'dafabet', '188bet', '12bet', 'w88', 'fun88',
	'betwayasia', 'sboasia', 'm88', 'vwin', 'betwaycn',
	
	// Tier 6: European Books (10)
	'betwayeu', 'unibeteu', 'bet365eu', 'betfaireu', 'williamhilleu',
	'ladbrokeseu', 'coraleu', 'betvictoreu', 'betfredeu', '888sporteu',
	
	// Tier 7: US Books (10)
	'betmgmus', 'draftkingsus', 'fanduelus', 'caesarsus', 'betriversus',
	'pointsbet', 'wynnbet', 'barstool', 'foxbet', 'bet365us',
	
	// Tier 8: Additional Books (10)
	'betwayau', 'betssoneu', 'leovegaseu', 'betmotionau', 'betbooeu',
	'betanobr', 'betclicfr', 'betwayza', 'betfairau', 'pinnacleau',
	
	// Tier 9: Final Books (7)
	'sbobetasia', 'fonbetru', 'bet365asia', 'betmgmca', 'draftkingsca',
	'fanduelca', 'williamhillau'
] as const;

export const SHARP_BOOKIES_COUNT = SHARP_BOOKIES_ALL.length;

export function getAllBookies(): readonly string[] {
	return SHARP_BOOKIES_ALL;
}

export function getBookieTier(bookie: string): number {
	const index = SHARP_BOOKIES_ALL.indexOf(bookie);
	if (index === -1) return 0;
	if (index < 10) return 1;
	if (index < 20) return 2;
	if (index < 30) return 3;
	if (index < 40) return 4;
	if (index < 50) return 5;
	if (index < 60) return 6;
	if (index < 70) return 7;
	if (index < 80) return 8;
	return 9;
}

