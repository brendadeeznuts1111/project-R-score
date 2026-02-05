import React, { useState, useEffect } from 'react';
import { BUSINESS_CONFIG, TIME_CONSTANTS } from '../../../core/src/constants';

interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  exchange1: string;
  exchange2: string;
  price1: number;
  price2: number;
  profit: number;
  confidence: number;
  timestamp: number;
}

interface ArbitrageTableProps { }

export const ArbitrageTable: React.FC<ArbitrageTableProps> = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    minEdge: 0,
    maxAge: TIME_CONSTANTS.INTERVALS.FIVE_MINUTES,
    exchanges: [] as string[]
  });

  useEffect(() => {
    // Simulate fetching arbitrage opportunities
    fetchOpportunities();

    const interval = setInterval(fetchOpportunities, BUSINESS_CONFIG.ARBITRAGE.DEFAULT_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [filter]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);

      // Simulate API call
      const mockOpportunities: ArbitrageOpportunity[] = [
        {
          id: '1',
          symbol: 'AAPL',
          exchange1: 'NYSE',
          exchange2: 'NASDAQ',
          price1: 150.25,
          price2: 150.35,
          profit: 0.10,
          confidence: 0.85,
          timestamp: Date.now()
        },
        {
          id: '2',
          symbol: 'GOOGL',
          exchange1: 'NASDAQ',
          exchange2: 'LSE',
          price1: 2800.50,
          price2: 2801.20,
          profit: 0.70,
          confidence: 0.92,
          timestamp: Date.now() - TIME_CONSTANTS.INTERVALS.TEN_SECONDS
        }
      ];

      // Apply filters
      const filtered = mockOpportunities.filter((opp: ArbitrageOpportunity) => {
        const age = Date.now() - opp.timestamp;
        return opp.profit >= filter.minEdge &&
          age <= filter.maxAge &&
          (filter.exchanges.length === 0 ||
            filter.exchanges.includes(opp.exchange1) ||
            filter.exchanges.includes(opp.exchange2));
      });

      setOpportunities(filtered.sort((a: ArbitrageOpportunity, b: ArbitrageOpportunity) => b.profit - a.profit));
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatProfit = (profit: number) => {
    const className = profit > 0 ? 'profit-positive' : 'profit-negative';
    return (
      <span className={className}>
        {formatPrice(profit)}
      </span>
    );
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#10b981'; // green
    if (confidence >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div className="arbitrage-table">
      <div className="table-header">
        <h3>Arbitrage Opportunities</h3>
        <div className="filters">
          <div className="filter-group">
            <label>Min Edge:</label>
            <input
              type="number"
              step="0.01"
              value={filter.minEdge}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter((prev) => ({ ...prev, minEdge: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="filter-group">
            <label>Max Age (sec):</label>
            <input
              type="number"
              value={filter.maxAge / TIME_CONSTANTS.MILLISECONDS_PER_SECOND}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter((prev) => ({ ...prev, maxAge: (parseFloat(e.target.value) || 0) * TIME_CONSTANTS.MILLISECONDS_PER_SECOND }))}
            />
          </div>
          <button onClick={fetchOpportunities} className="refresh">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading opportunities...</div>
      ) : opportunities.length === 0 ? (
        <div className="no-opportunities">
          No arbitrage opportunities found
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Exchange 1</th>
                <th>Price 1</th>
                <th>Exchange 2</th>
                <th>Price 2</th>
                <th>Profit</th>
                <th>Confidence</th>
                <th>Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp: ArbitrageOpportunity) => (
                <tr key={opp.id}>
                  <td className="symbol">{opp.symbol}</td>
                  <td className="exchange">{opp.exchange1}</td>
                  <td className="price">{formatPrice(opp.price1)}</td>
                  <td className="exchange">{opp.exchange2}</td>
                  <td className="price">{formatPrice(opp.price2)}</td>
                  <td className="profit">{formatProfit(opp.profit)}</td>
                  <td className="confidence">
                    <div className="confidence-bar">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${opp.confidence * 100}%`,
                          backgroundColor: getConfidenceColor(opp.confidence)
                        }}
                      />
                      <span className="confidence-text">
                        {(opp.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="time">{formatTime(opp.timestamp)}</td>
                  <td className="actions">
                    <button className="execute-btn">
                      Execute
                    </button>
                    <button className="details-btn">
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="table-footer">
        <div className="summary">
          <span className="opportunity-count">
            {opportunities.length} opportunities
          </span>
          <span className="total-profit">
            Total Potential: {formatPrice(opportunities.reduce((sum: number, opp: ArbitrageOpportunity) => sum + opp.profit, 0))}
          </span>
        </div>
      </div>
    </div>
  );
};
