import React, { useState, useEffect } from "react";
import { Globe, MapPin, Users, TrendingUp, Search } from "lucide-react";

interface GeoLocation {
  ip: string;
  country: string;
  countryCode: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  lastUpdated: number;
}

interface GeoStats {
  totalCountries: number;
  totalLocations: number;
  topCountries: Array<{
    country: string;
    countryCode: string;
    requestCount: number;
    uniqueIPs: number;
    lastRequest: number;
  }>;
}

export const GeolocationPanel: React.FC = () => {
  const [stats, setStats] = useState<GeoStats | null>(null);
  const [locations, setLocations] = useState<GeoLocation[]>([]);
  const [searchType, setSearchType] = useState<"country" | "city">("country");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = "/api/geo";

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/stats`);
      if (!response.ok) throw new Error("Failed to fetch geolocation stats");
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch geolocation data");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setLoading(true);
      const endpoint =
        searchType === "country"
          ? `${API_BASE}/country/${encodeURIComponent(searchQuery)}`
          : `${API_BASE}/city/${encodeURIComponent(searchQuery)}`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const getCountryFlag = (countryCode: string): string => {
    // Convert country code to flag emoji
    return countryCode
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Geographic Distribution</h2>
          <p className="text-sm text-gray-600 mt-1">Monitor traffic by location</p>
        </div>
        <Globe className="w-8 h-8 text-blue-600" />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCountries}</p>
              </div>
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalLocations)}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Top Country</p>
                <p className="text-xl font-bold text-gray-900">
                  {stats.topCountries[0] && (
                    <span>
                      {getCountryFlag(stats.topCountries[0].countryCode)}{" "}
                      {stats.topCountries[0].country}
                    </span>
                  )}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Top Countries Table */}
      {stats && stats.topCountries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Countries by Traffic</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unique IPs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Request
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topCountries.map((country, index) => (
                <tr key={country.countryCode} className={index === 0 ? "bg-blue-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCountryFlag(country.countryCode)}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{country.country}</div>
                        <div className="text-sm text-gray-500">{country.countryCode}</div>
                      </div>
                      {index === 0 && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          #1
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(country.requestCount)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(country.uniqueIPs)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(country.lastRequest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Locations</h3>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`Search by ${searchType}...`}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as "country" | "city")}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="country">By Country</option>
            <option value="city">By City</option>
          </select>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">
              Found {searchResults.length} location{searchResults.length !== 1 ? "s" : ""}
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      IP
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      ISP
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Seen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {searchResults.map((location) => (
                    <tr key={location.ip}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-mono text-gray-900">
                        {location.ip}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <div>
                          <span className="font-medium">{location.city}</span>
                          {location.region && <span>, {location.region}</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getCountryFlag(location.countryCode)} {location.country}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{location.isp || "-"}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(location.lastUpdated)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {searchResults.length === 0 && searchQuery && searchResults !== null && !loading && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>No locations found</p>
          </div>
        )}
      </div>

      {/* World Map Placeholder */}
      {stats && stats.topCountries.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Traffic Distribution</h3>
          <div className="relative h-64 bg-blue-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Globe className="w-16 h-16 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                Interactive map coming soon
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Top {stats.topCountries.length} countries tracked
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
