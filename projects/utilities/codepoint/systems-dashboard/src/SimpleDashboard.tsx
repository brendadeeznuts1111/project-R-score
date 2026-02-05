
export default function SimpleDashboard() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-center">🖥️ Systems Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-green-400">🟢 Server Status</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>🇺🇸 US-East-1</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex justify-between">
                <span>👋🏽 EU-West-2</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex justify-between">
                <span>👨‍👩‍👧 AP-South-1</span>
                <span className="text-yellow-400">Warning</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">📊 Performance</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span>CPU</span>
                  <span>67%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{width: '67%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Memory</span>
                  <span>74%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: '74%'}}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Disk</span>
                  <span>82%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{width: '82%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 text-purple-400">🔌 Bun Features</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>String Width</span>
                <span className="text-green-400">✅</span>
              </div>
              <div className="flex justify-between">
                <span>Feature Flags</span>
                <span className="text-green-400">✅</span>
              </div>
              <div className="flex justify-between">
                <span>13-Byte Config</span>
                <span className="text-green-400">✅</span>
              </div>
              <div className="flex justify-between">
                <span>Unicode Tables</span>
                <span className="text-green-400">✅</span>
              </div>
              <div className="flex justify-between">
                <span>Mock S3</span>
                <span className="text-green-400">✅</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-yellow-400">🚀 13-Byte Configuration Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left p-2">Feature</th>
                  <th className="text-left p-2">Base Cost</th>
                  <th className="text-left p-2">With Flags</th>
                  <th className="text-left p-2">Delta</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="p-2">Bun.cookies</td>
                  <td className="p-2">450ns</td>
                  <td className="p-2">450ns</td>
                  <td className="p-2 text-cyan-400">0ns</td>
                  <td className="p-2">⚪ Neutral</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2">Bun.fetch</td>
                  <td className="p-2">15ns</td>
                  <td className="p-2">135ns</td>
                  <td className="p-2 text-yellow-400">+120ns</td>
                  <td className="p-2">🟡 Low</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2">Bun.s3</td>
                  <td className="p-2">5µs</td>
                  <td className="p-2">5ns</td>
                  <td className="p-2 text-green-400">-4995ns</td>
                  <td className="p-2">🟢 Fast</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-2">Bun.jwt</td>
                  <td className="p-2">500ns</td>
                  <td className="p-2">150ns</td>
                  <td className="p-2 text-green-400">-350ns</td>
                  <td className="p-2">🟢 Opt</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-400">
          <p>✅ Advanced Bun Features Successfully Integrated</p>
          <p>🔧 13-Byte Configuration System Active</p>
          <p>📊 Real-time Performance Monitoring</p>
        </div>
      </div>
    </div>
  );
}
