import React, { useState, useEffect } from "react";

import { ipfoxyManager } from "../utils/ipfoxy/manager";
import type { IPFoxyProxyConfig, IPFoxyAccount } from "../utils/ipfoxy/manager";

interface IPFoxyConfigPanelProps {
  duoPlusPhoneId?: string;
  onProxyConfigured?: (proxy: IPFoxyProxyConfig) => void;
}

export const IPFoxyConfigPanel: React.FC<IPFoxyConfigPanelProps> = ({
  duoPlusPhoneId,
  onProxyConfigured
}) => {
  const [account, setAccount] = useState<IPFoxyAccount | null>(null);
  const [proxies, setProxies] = useState<IPFoxyProxyConfig[]>([]);
  const [selectedProxy, setSelectedProxy] = useState<IPFoxyProxyConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "purchase" | "configure" | "validate">(
    "overview"
  );
  const [purchaseForm, setPurchaseForm] = useState({
    type: "static_ipv4" as IPFoxyProxyConfig["type"],
    country: "US",
    quantity: 1,
    duration: 30
  });

  useEffect(() => {
    loadAccountInfo();
    loadProxies();
  }, []);

  const loadAccountInfo = async () => {
    try {
      setLoading(true);
      const accountInfo = await ipfoxyManager.getAccountInfo();
      setAccount(accountInfo);
    } catch (error) {
      console.error("Failed to load account info:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProxies = async () => {
    try {
      setLoading(true);
      const proxyList = await ipfoxyManager.listProxies();
      setProxies(proxyList);
    } catch (error) {
      console.error("Failed to load proxies:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateProxy = async (proxy: IPFoxyProxyConfig) => {
    try {
      setLoading(true);
      const result = await ipfoxyManager.validateProxy(proxy);

      alert(
        "Proxy Validation Result:\n" +
          `Valid: ${result.valid ? "Yes" : "No"}\n` +
          `Response Time: ${result.responseTime || "N/A"}ms\n` +
          `IP: ${result.ip || "N/A"}\n` +
          `Country: ${result.country || "N/A"}\n` +
          `Error: ${result.error || "None"}`
      );
    } catch (error) {
      alert(`Validation failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const configureForDuoPlus = async (proxy: IPFoxyProxyConfig) => {
    if (!duoPlusPhoneId) {
      alert("Please select a DuoPlus phone first");
      return;
    }

    try {
      setLoading(true);
      await ipfoxyManager.configureForDuoPlus(proxy, duoPlusPhoneId);

      if (onProxyConfigured) {
        onProxyConfigured(proxy);
      }

      alert("Proxy configured successfully for DuoPlus!");
    } catch (error) {
      alert(`Configuration failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const purchaseProxy = async () => {
    try {
      setLoading(true);

      if (purchaseForm.type === "dynamic_residential") {
        await ipfoxyManager.purchaseDynamicProxy({
          country: purchaseForm.country,
          quantity: purchaseForm.quantity,
          duration: purchaseForm.duration,
          rotationCycle: 30
        });
      } else {
        await ipfoxyManager.purchaseStaticProxy({
          type: purchaseForm.type,
          country: purchaseForm.country,
          quantity: purchaseForm.quantity,
          duration: purchaseForm.duration
        });
      }

      alert("Proxy purchased successfully!");
      await loadProxies();
      await loadAccountInfo();
    } catch (error) {
      alert(`Purchase failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">IPFoxy Account Overview</h3>
        {account ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Email:</span> {account.email}
            </div>
            <div>
              <span className="font-medium">Balance:</span> {account.balance} {account.currency}
            </div>
            <div>
              <span className="font-medium">Active Proxies:</span> {account.activeProxies}
            </div>
            <div>
              <span className="font-medium">Total Proxies:</span> {account.totalProxies}
            </div>
          </div>
        ) : (
          <p className="text-blue-700">Loading account information...</p>
        )}
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => window.open("https://www.ipfoxy.com/?r=lk_duoplus", "_blank")}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Visit IPFoxy Website
          </button>
          <button
            onClick={loadProxies}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Refresh Proxies
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Proxy Types Guide</h3>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Static IPv4:</strong> Data center IPs, good for general use
          </div>
          <div>
            <strong>Static IPv6:</strong> Affordable, works on major platforms
          </div>
          <div>
            <strong>Static ISP:</strong> Residential IPs, best for social media
          </div>
          <div>
            <strong>Dynamic Residential:</strong> Rotating IPs, ideal for scraping
          </div>
        </div>
      </div>
    </div>
  );

  const PurchaseTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Purchase New Proxy</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Proxy Type</label>
          <select
            value={purchaseForm.type}
            onChange={(e) =>
              setPurchaseForm({
                ...purchaseForm,
                type: e.target.value as IPFoxyProxyConfig["type"]
              })
            }
            className="w-full px-3 py-2 border rounded"
          >
            <option value="static_ipv4">Static IPv4</option>
            <option value="static_ipv6">Static IPv6</option>
            <option value="static_isp">Static ISP Residential</option>
            <option value="dynamic_residential">Dynamic Residential</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Country</label>
          <select
            value={purchaseForm.country}
            onChange={(e) => setPurchaseForm({ ...purchaseForm, country: e.target.value })}
            className="w-full px-3 py-2 border rounded"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
            <option value="JP">Japan</option>
            <option value="SG">Singapore</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Quantity</label>
          <input
            type="number"
            min="1"
            max="100"
            value={purchaseForm.quantity}
            onChange={(e) =>
              setPurchaseForm({ ...purchaseForm, quantity: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Duration (days)</label>
          <input
            type="number"
            min="1"
            max="365"
            value={purchaseForm.duration}
            onChange={(e) =>
              setPurchaseForm({ ...purchaseForm, duration: parseInt(e.target.value) })
            }
            className="w-full px-3 py-2 border rounded"
          />
        </div>
      </div>

      <button
        onClick={purchaseProxy}
        className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        disabled={loading}
      >
        {loading ? "Purchasing..." : "Purchase Proxy"}
      </button>

      <div className="bg-gray-50 p-4 rounded">
        <h4 className="font-medium mb-2">Recommended Configuration</h4>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Social Media:</strong> Static ISP Residential
          </div>
          <div>
            <strong>Web Scraping:</strong> Dynamic Residential
          </div>
          <div>
            <strong>Gaming:</strong> Static IPv4
          </div>
          <div>
            <strong>General Use:</strong> Static IPv4
          </div>
        </div>
      </div>
    </div>
  );

  const ConfigureTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Configure Proxy for DuoPlus</h3>

      {duoPlusPhoneId ? (
        <div className="bg-green-50 p-4 rounded">
          <p className="text-green-800">Target Phone: {duoPlusPhoneId}</p>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded">
          <p className="text-yellow-800">Please select a DuoPlus phone first</p>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="font-medium">Available Proxies ({proxies.length})</h4>
        {proxies.length === 0 ? (
          <p className="text-gray-500">No proxies available. Purchase a proxy first.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {proxies.map((proxy) => (
              <div
                key={proxy.id}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedProxy?.id === proxy.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => setSelectedProxy(proxy)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{proxy.type.replace("_", " ").toUpperCase()}</div>
                    <div className="text-sm text-gray-600">
                      {proxy.host}:{proxy.port} ({proxy.country})
                    </div>
                    <div className="text-xs text-gray-500">
                      Status: {proxy.status} | Created:{" "}
                      {new Date(proxy.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 text-xs rounded ${
                      proxy.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {proxy.protocol}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProxy && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded">
            <h4 className="font-medium mb-2">Selected Proxy Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Type:</strong> {selectedProxy.type}
              </div>
              <div>
                <strong>Protocol:</strong> {selectedProxy.protocol}
              </div>
              <div>
                <strong>Host:</strong> {selectedProxy.host}
              </div>
              <div>
                <strong>Port:</strong> {selectedProxy.port}
              </div>
              <div>
                <strong>Country:</strong> {selectedProxy.country}
              </div>
              <div>
                <strong>Status:</strong> {selectedProxy.status}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => validateProxy(selectedProxy)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              Validate Proxy
            </button>
            <button
              onClick={() => configureForDuoPlus(selectedProxy)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              disabled={loading || !duoPlusPhoneId}
            >
              Configure for DuoPlus
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const ValidateTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Validate Proxies</h3>

      <button
        onClick={() => {
          const results = proxies.map((proxy) => ipfoxyManager.validateProxy(proxy));
          alert("Batch validation started. Check console for results.");
          Promise.all(results).then(console.log);
        }}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={loading || proxies.length === 0}
      >
        Validate All Proxies
      </button>

      <div className="bg-gray-50 p-4 rounded">
        <h4 className="font-medium mb-2">Validation Information</h4>
        <div className="space-y-2 text-sm">
          <div>• Tests connectivity and response time</div>
          <div>• Verifies IP address and location</div>
          <div>• Checks SOCKS5 protocol support</div>
          <div>• Only SOCKS5 proxies work with DuoPlus</div>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded">
        <h4 className="font-medium mb-2">Troubleshooting</h4>
        <div className="space-y-2 text-sm">
          <div>
            <strong>Connection Failed:</strong> Check proxy credentials and network
          </div>
          <div>
            <strong>High Response Time:</strong> Try different proxy location
          </div>
          <div>
            <strong>Wrong Protocol:</strong> Ensure SOCKS5 is selected
          </div>
          <div>
            <strong>Expired Proxy:</strong> Purchase new proxy or renew existing
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">IPFoxy Proxy Configuration</h2>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${account ? "bg-green-500" : "bg-red-500"}`}></div>
          <span className="text-sm">{account ? "Connected" : "Not Connected"}</span>
        </div>
      </div>

      <div className="flex space-x-1 mb-6 border-b">
        {[
          { id: "overview", label: "Overview" },
          { id: "purchase", label: "Purchase" },
          { id: "configure", label: "Configure" },
          { id: "validate", label: "Validate" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() =>
              setActiveTab(tab.id as "overview" | "purchase" | "configure" | "validate")
            }
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "purchase" && <PurchaseTab />}
        {activeTab === "configure" && <ConfigureTab />}
        {activeTab === "validate" && <ValidateTab />}
      </div>

      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
};
