/**
 * @dynamic-spy/kit v3.4 - Sportsbook Proxy Configurations
 * 
 * Geo-specific proxy headers and configurations
 */

export interface ProxyConfig {
	url: string;
	headers: Record<string, string>;
}

export const PROXY_CONFIG: Record<string, { proxy: ProxyConfig }> = {
	pinnacle: {
		proxy: {
			url: 'http://vip-proxy.asia:8080',
			headers: { 'X-VIP': 'diamond', 'X-Geo': 'global' }
		}
	},
	fonbet: {
		proxy: {
			url: 'http://ru-proxy.moscow:8080',
			headers: { 'X-RU': 'true', 'X-Language': 'ru' }
		}
	},
	betmgm: {
		proxy: {
			url: 'http://us-proxy.nyc:8080',
			headers: { 'X-US': 'true', 'X-State': 'NJ' }
		}
	},
	draftkings: {
		proxy: {
			url: 'http://us-proxy.nyc:8080',
			headers: { 'X-US': 'true' }
		}
	},
	fanduel: {
		proxy: {
			url: 'http://us-proxy.nyc:8080',
			headers: { 'X-US': 'true' }
		}
	},
	bet365: {
		proxy: {
			url: 'http://uk-proxy.london:8080',
			headers: { 'X-UK': 'true' }
		}
	},
	williamhill: {
		proxy: {
			url: 'http://uk-proxy.london:8080',
			headers: { 'X-UK': 'true' }
		}
	},
	sbobet: {
		proxy: {
			url: 'http://asia-proxy.singapore:8080',
			headers: { 'X-Asia': 'true' }
		}
	},
	betfair: {
		proxy: {
			url: 'http://uk-proxy.london:8080',
			headers: { 'X-Exchange': 'true' }
		}
	},
	betway: {
		proxy: {
			url: 'http://global-proxy.eu:8080',
			headers: { 'X-Global': 'true' }
		}
	}
};



