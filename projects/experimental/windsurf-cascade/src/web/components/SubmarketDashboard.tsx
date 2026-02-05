import React, { useState, useEffect } from 'react';
import { SubmarketNodes, ArbitragePath } from '../../../.root/governance/integrations/types/submarket-schema';

// === Component Props ===
interface SubmarketDashboardProps {
  submarketNodes: SubmarketNodes;
  arbitragePaths: ArbitragePath[];
  realTimeUpdates?: boolean;
}

interface MarketMetrics {
  efficiency: number;
  liquidity: number;
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  profit: number;
}

// === Main Dashboard Component ===
export const SubmarketDashboard: React.FC<SubmarketDashboardProps> = ({
  submarketNodes,
  arbitragePaths,
  realTimeUpdates = true
}) => {
  const [metrics, setMetrics] = useState<MarketMetrics>({
    efficiency: 0,
    liquidity: 0,
    risk: 'MEDIUM',
    profit: 0
  });
  const [selectedPath, setSelectedPath] = useState<ArbitragePath | null>(null);

  // Calculate real-time metrics
  useEffect(() => {
    const calculateMetrics = () => {
      const efficiency = submarketNodes.primaryMarket.efficiency;
      const liquidity = submarketNodes.primaryMarket.liquidityScore;
      const risk = calculateRiskLevel(submarketNodes);
      const profit = arbitragePaths.reduce((sum, path) => sum + path.estimatedProfit, 0);

      setMetrics({ efficiency, liquidity, risk, profit });
    };

    calculateMetrics();
    
    if (realTimeUpdates) {
      const interval = setInterval(calculateMetrics, 2000);
      return () => clearInterval(interval);
    }
  }, [submarketNodes, arbitragePaths, realTimeUpdates]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          🎯 Submarket Analysis Dashboard
        </h1>
        <p className="text-gray-400">Real-time arbitrage opportunity detection and market analysis</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Market Efficiency"
          value={`${metrics.efficiency}%`}
          trend={getTrend(metrics.efficiency)}
          color="blue"
        />
        <MetricCard
          title="Liquidity Score"
          value={`${metrics.liquidity}%`}
          trend={getTrend(metrics.liquidity)}
          color="green"
        />
        <RiskCard risk={metrics.risk} />
        <MetricCard
          title="Total Profit Potential"
          value={`${metrics.profit.toFixed(2)}%`}
          trend="up"
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Primary Market Analysis */}
        <PrimaryMarketCard market={submarketNodes.primaryMarket} />
        
        {/* Arbitrage Paths */}
        <ArbitragePathsCard
          paths={arbitragePaths}
          selectedPath={selectedPath}
          onPathSelect={setSelectedPath}
        />
      </div>

      {/* Secondary Markets */}
      <div className="mt-8">
        <SecondaryMarketsCard markets={submarketNodes.secondaryMarkets} />
      </div>

      {/* Selected Path Details */}
      {selectedPath && (
        <div className="mt-8">
          <PathDetailsCard path={selectedPath} />
        </div>
      )}
    </div>
  );
};

// === Metric Card Component ===
interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'stable';
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600'
  };

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium opacity-90">{title}</h3>
        <span className="text-lg">{trendIcons[trend]}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

// === Risk Card Component ===
interface RiskCardProps {
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

const RiskCard: React.FC<RiskCardProps> = ({ risk }) => {
  const riskConfig = {
    LOW: { color: 'from-green-500 to-green-600', icon: '🟢', label: 'Low Risk' },
    MEDIUM: { color: 'from-yellow-500 to-yellow-600', icon: '🟡', label: 'Medium Risk' },
    HIGH: { color: 'from-red-500 to-red-600', icon: '🔴', label: 'High Risk' }
  };

  const config = riskConfig[risk];

  return (
    <div className={`bg-gradient-to-br ${config.color} p-6 rounded-xl shadow-lg`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium opacity-90">Risk Level</h3>
        <span className="text-lg">{config.icon}</span>
      </div>
      <div className="text-2xl font-bold">{config.label}</div>
    </div>
  );
};

// === Primary Market Card ===
interface PrimaryMarketCardProps {
  market: SubmarketNodes['primaryMarket'];
}

const PrimaryMarketCard: React.FC<PrimaryMarketCardProps> = ({ market }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🏛️</span>
        Primary Market: {market.nodeId}
      </h2>
      
      <div className="space-y-4">
        <ProgressBar
          label="Market Depth"
          value={market.marketDepth}
          max={200000}
          unit="$"
          color="blue"
        />
        <ProgressBar
          label="Liquidity Score"
          value={market.liquidityScore}
          max={100}
          unit="%"
          color="green"
        />
        <ProgressBar
          label="Efficiency"
          value={market.efficiency}
          max={100}
          unit="%"
          color="purple"
        />
        <ProgressBar
          label="Competition Level"
          value={market.competitionLevel}
          max={100}
          unit="%"
          color="orange"
        />
      </div>
    </div>
  );
};

// === Arbitrage Paths Card ===
interface ArbitragePathsCardProps {
  paths: ArbitragePath[];
  selectedPath: ArbitragePath | null;
  onPathSelect: (path: ArbitragePath) => void;
}

const ArbitragePathsCard: React.FC<ArbitragePathsCardProps> = ({
  paths,
  selectedPath,
  onPathSelect
}) => {
  const sortedPaths = [...paths].sort((a, b) => b.estimatedProfit - a.estimatedProfit);

  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🎯</span>
        Arbitrage Opportunities
      </h2>
      
      <div className="space-y-3">
        {sortedPaths.slice(0, 5).map((path: ArbitragePath, index: number) => (
          <div
            key={path.pathId}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedPath?.pathId === path.pathId
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-700 hover:border-gray-600 hover:bg-gray-700/50'
            }`}
            onClick={() => onPathSelect(path)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-sm">{path.pathId}</span>
              <PathActionBadge path={path} />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Profit:</span>
                <span className="ml-2 font-medium text-green-400">
                  {(path.estimatedProfit * 100).toFixed(2)}%
                </span>
              </div>
              <div>
                <span className="text-gray-400">Risk:</span>
                <span className="ml-2 font-medium text-yellow-400">
                  {path.riskScore?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Complexity:</span>
                <span className="ml-2 font-medium text-blue-400">
                  {path.executionComplexity || 0}/10
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {paths.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No arbitrage opportunities found
        </div>
      )}
    </div>
  );
};

// === Secondary Markets Card ===
interface SecondaryMarketsCardProps {
  markets: SubmarketNodes['secondaryMarkets'];
}

const SecondaryMarketsCard: React.FC<SecondaryMarketsCardProps> = ({ markets }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🌐</span>
        Secondary Markets
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {markets.map((market, index) => (
          <div key={market.nodeId} className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-medium mb-3 text-sm">{market.nodeId}</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Depth:</span>
                <span>${(market.marketDepth / 1000).toFixed(0)}k</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Liquidity:</span>
                <span>{market.liquidityScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Correlation:</span>
                <span>{(market.correlationStrength * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// === Path Details Card ===
interface PathDetailsCardProps {
  path: ArbitragePath;
}

const PathDetailsCard: React.FC<PathDetailsCardProps> = ({ path }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <span className="mr-2">🔍</span>
        Path Details: {path.pathId}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium text-blue-400">Performance Metrics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Profit:</span>
              <span className="font-medium text-green-400">
                ${(path.estimatedProfit * 1000).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Score:</span>
              <span className="font-medium text-yellow-400">
                {path.riskScore?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Execution Complexity:</span>
              <span className="font-medium text-blue-400">
                {path.executionComplexity || 0}/10
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium text-purple-400">Execution Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Liquidity Required:</span>
              <span className="font-medium">
                ${path.liquidityRequirement || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Time to Execution:</span>
              <span className="font-medium text-orange-400">
                {path.timeToExecution || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Path Type:</span>
              <span className="font-medium text-cyan-400">
                {path.pathType || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// === Helper Components ===
interface ProgressBarProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ label, value, max, unit, color }) => {
  const percentage = (value / max) * 100;
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-400">{label}</span>
        <span>{unit === '$' ? unit : ''}{value.toLocaleString()}{unit !== '$' ? unit : ''}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const PathActionBadge: React.FC<{ path: ArbitragePath }> = ({ path }) => {
  const getAction = () => {
    if (path.estimatedProfit > 0.03 && (path.riskScore || 0) < 15) {
      return { text: 'EXECUTE', color: 'bg-green-500' };
    } else if (path.estimatedProfit > 0.02 && (path.riskScore || 0) < 25) {
      return { text: 'REVIEW', color: 'bg-yellow-500' };
    } else {
      return { text: 'HOLD', color: 'bg-red-500' };
    }
  };

  const action = getAction();

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${action.color} text-white`}>
      {action.text}
    </span>
  );
};

// === Helper Functions ===
const getTrend = (value: number): 'up' | 'down' | 'stable' => {
  // Mock trend calculation - in real implementation would compare with historical data
  return value > 75 ? 'up' : value > 50 ? 'stable' : 'down';
};

const calculateRiskLevel = (nodes: SubmarketNodes): 'LOW' | 'MEDIUM' | 'HIGH' => {
  const avgCompetition = (nodes.primaryMarket.competitionLevel + 
    nodes.secondaryMarkets.reduce((sum: number, m: SubmarketNodes['secondaryMarkets'][0]) => sum + 50, 0) / nodes.secondaryMarkets.length) / 2;
  
  if (avgCompetition > 70) return 'HIGH';
  if (avgCompetition > 40) return 'MEDIUM';
  return 'LOW';
};

export default SubmarketDashboard;
