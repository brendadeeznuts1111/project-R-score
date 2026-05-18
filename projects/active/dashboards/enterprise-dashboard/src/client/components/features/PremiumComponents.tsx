import { feature } from "bun:bundle";

/**
 * Premium Billing Panel
 * Only included in premium builds - provides billing, team seats, and Cash App priority
 */
export function PremiumBillingPanel() {
  if (!feature("PREMIUM")) {
    return null;
  }

  return (
    <div className="premium-billing-panel p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-purple-400">◆</span>
          Premium Billing
        </h2>
        <span className="px-3 py-1 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
          PREMIUM
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-purple-300 mb-2">Current Plan</h3>
            <p className="text-2xl font-bold text-white">Enterprise</p>
            <p className="text-sm text-purple-400">$299/month · Renews Jan 22, 2027</p>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-green-300 mb-2">Cash App Balance</h3>
            <p className="text-2xl font-bold text-white">$4,250.00</p>
            <p className="text-sm text-green-400">Available for payments</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-blue-300 mb-2">Team Seats</h3>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold text-white">12</span>
              <span className="text-sm text-blue-400 mb-1">/ 15 seats used</span>
            </div>
            <div className="mt-2 h-2 bg-blue-500/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: "80%" }}
              />
            </div>
          </div>

          <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <h3 className="text-sm font-medium text-orange-300 mb-2">Priority Queue</h3>
            <p className="text-2xl font-bold text-white">#3</p>
            <p className="text-sm text-orange-400">Cash App priority position</p>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-purple-500/20">
        <h3 className="text-sm font-medium text-purple-300 mb-4">Recent Transactions</h3>
        <div className="space-y-2">
          {[
            { desc: "API Credits", amount: -49.99, date: "Jan 20" },
            { desc: "Team seat upgrade", amount: -149.0, date: "Jan 18" },
            { desc: "Cash App refund", amount: 25.0, date: "Jan 15" },
          ].map((tx, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 bg-purple-500/5 rounded-lg"
            >
              <div>
                <p className="text-sm text-white">{tx.desc}</p>
                <p className="text-xs text-purple-400">{tx.date}</p>
              </div>
              <span
                className={`text-sm font-medium ${
                  tx.amount >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {tx.amount >= 0 ? "+" : ""}${tx.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Team Management Panel
 * Team seat management for premium subscribers
 */
export function TeamManagementPanel() {
  if (!feature("PREMIUM")) {
    return null;
  }

  const members = [
    { name: "Ashley Chen", email: "ashley@company.com", role: "Admin", status: "active" },
    { name: "Marcus Johnson", email: "marcus@company.com", role: "Editor", status: "active" },
    { name: "Sarah Williams", email: "sarah@company.com", role: "Viewer", status: "pending" },
    { name: "David Kim", email: "david@company.com", role: "Editor", status: "active" },
  ];

  return (
    <div className="team-management-panel p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <span className="text-purple-400">◆</span>
          Team Management
        </h2>
        <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
          Invite Member
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-purple-400 border-b border-purple-500/20">
              <th className="pb-3 font-medium">Member</th>
              <th className="pb-3 font-medium">Role</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-500/10">
            {members.map((member, i) => (
              <tr key={i} className="text-sm">
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center text-purple-400 font-medium">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <p className="text-white font-medium">{member.name}</p>
                      <p className="text-purple-400 text-xs">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3">
                  <span className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded">
                    {member.role}
                  </span>
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      member.status === "active"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {member.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <button className="text-purple-400 hover:text-purple-300 text-sm">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Cash App Priority Status
 * Shows Cash App payment priority status
 */
export function CashAppPriorityStatus() {
  if (!feature("PREMIUM")) {
    return null;
  }

  return (
    <div className="cash-app-priority p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
          <span className="text-green-400 text-xl">$</span>
        </div>
        <div>
          <h3 className="text-white font-semibold">Cash App Priority</h3>
          <p className="text-sm text-green-400">Premium payment queue</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-green-500/10 rounded-lg">
          <p className="text-2xl font-bold text-white">#3</p>
          <p className="text-xs text-green-400">Queue Position</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <p className="text-2xl font-bold text-white">~2min</p>
          <p className="text-xs text-green-400">Est. Wait</p>
        </div>
        <div className="p-3 bg-green-500/10 rounded-lg">
          <p className="text-2xl font-bold text-white">$0</p>
          <p className="text-xs text-green-400">Processing Fee</p>
        </div>
      </div>
    </div>
  );
}
