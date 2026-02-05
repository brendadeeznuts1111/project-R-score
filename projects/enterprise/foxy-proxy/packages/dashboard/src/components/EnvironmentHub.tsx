import React from "react";
import { ExternalLink, Rocket, Shield, TestTube, Globe } from "lucide-react";

interface Environment {
  name: string;
  url: string;
  type: "dev" | "staging" | "prod";
  icon: typeof Rocket;
  description: string;
}

export const EnvironmentHub: React.FC = () => {
  const environments: Environment[] = [
    {
      name: "Development",
      url:
        import.meta.env.VITE_R2_DEV_PUBLIC_URL ||
        "https://dev.foxy-proxy.storage/dashboard/dist/index.html",
      type: "dev",
      icon: TestTube,
      description: "Active development and experimental features."
    },
    {
      name: "Staging",
      url:
        import.meta.env.VITE_R2_STAGING_PUBLIC_URL ||
        "https://staging.foxy-proxy.storage/dashboard/dist/index.html",
      type: "staging",
      icon: Shield,
      description: "Pre-production testing and QA environment."
    },
    {
      name: "Production",
      url:
        import.meta.env.VITE_R2_PROD_PUBLIC_URL ||
        "https://dashboard.foxy-proxy.storage/dashboard/dist/index.html",
      type: "prod",
      icon: Rocket,
      description: "Live production environment for users."
    }
  ];

  const currentHost = window.location.hostname;
  const isLocalhost = currentHost === "localhost" || currentHost === "127.0.0.1";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" />
            Deployment Environments
          </h3>
          <p className="text-sm text-gray-500">Track progress across R2 buckets</p>
        </div>
        {isLocalhost && (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Running Locally
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {environments.map((env) => {
          const Icon = env.icon;
          const isActive = window.location.href.includes(env.url);

          return (
            <div
              key={env.type}
              className={`p-6 hover:bg-gray-50 transition-colors ${isActive ? "bg-primary-50/30" : ""}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-2 rounded-lg ${
                    env.type === "prod"
                      ? "bg-green-100 text-green-600"
                      : env.type === "staging"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-blue-100 text-blue-600"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                {isActive && (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary-600 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-primary-600"></span>
                    ACTIVE
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-gray-900 mb-1">{env.name}</h4>
              <p className="text-sm text-gray-600 mb-4 h-10">{env.description}</p>
              <a
                href={env.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
              >
                View Progress
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};
