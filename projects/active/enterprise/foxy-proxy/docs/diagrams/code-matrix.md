# Code Architecture Matrix

## 📊 Complete Component & Service Matrix

| Category                  | #    | Name                      | Type      | Module/Path                         | Dependencies                         | Properties/Methods                                                                          | Status    |
| ------------------------- | ---- | ------------------------- | --------- | ----------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------- | --------- |
| **🏗️ CORE APP**           |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 1.1  | App                       | Component | `/src/App.tsx`                      | React, Router                        | `render()`, `Router setup`                                                                  | ✅ Active |
|                           | 1.2  | main                      | Module    | `/src/main.tsx`                     | React, ReactDOM                      | `render(App)`                                                                               | ✅ Active |
|                           | 1.3  | index.css                 | Styles    | `/src/index.css`                    | None                                 | Utility classes                                                                             | ✅ Active |
| **🎨 LAYOUT COMPONENTS**  |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 2.1  | DashboardLayout           | Component | `/src/components/layout/`           | React, Router                        | `children`, `sidebar`, `header`                                                             | ✅ Active |
|                           | 2.2  | Header                    | Component | `/src/components/layout/`           | React                                | `title`, `actions`                                                                          | ✅ Active |
|                           | 2.3  | Sidebar                   | Component | `/src/components/layout/`           | React, Router                        | `navigation`, `activeRoute`                                                                 | ✅ Active |
| **📄 PAGES**              |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 3.1  | OverviewPage              | Component | `/src/pages/OverviewPage/`          | useProxyData, Charts                 | `dashboard`, `stats`                                                                        | ✅ Active |
|                           | 3.2  | ProxiesPage               | Component | `/src/pages/ProxiesPage/`           | useProxyData, ProxyCard              | `proxyList`, `actions`                                                                      | ✅ Active |
|                           | 3.3  | AnalyticsPage             | Component | `/src/pages/AnalyticsPage/`         | useProxyData, Charts                 | `metrics`, `charts`                                                                         | ✅ Active |
|                           | 3.4  | DuoPlusPage               | Component | `/src/pages/DuoPlusPage/`           | DuoPlusAPI, PhoneCard                | `phones`, `controls`                                                                        | ✅ Active |
|                           | 3.5  | UnifiedManagementPage     | Component | `/src/pages/UnifiedManagementPage/` | ProfileManager, ProxyCard, PhoneCard | `profiles`, `creation`                                                                      | ✅ Active |
|                           | 3.6  | SettingsPage              | Component | `/src/pages/SettingsPage/`          | React                                | `config`, `preferences`                                                                     | ✅ Active |
| **🔧 SHARED COMPONENTS**  |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 4.1  | BunFileUpload             | Component | `/src/components/`                  | React, R2                            | `file`, `upload`, `progress`                                                                | ✅ Active |
|                           | 4.2  | FileUpload                | Component | `/src/components/`                  | React                                | `file`, `upload`                                                                            | ✅ Active |
| **🎣 HOOKS**              |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 5.1  | useProxyData              | Hook      | `/src/hooks/useProxyData/`          | IPFoxyAPI                            | `data`, `loading`, `error`, `refresh`                                                       | ✅ Active |
| **🌐 API SERVICES**       |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 6.1  | IPFoxyAPI                 | Service   | `/src/utils/api.ts`                 | Axios, HTTP                          | `getProxies()`, `getAccount()`, `getAreas()`                                                | ✅ Active |
|                           | 6.2  | DuoPlusAPI                | Class     | `/src/utils/duoplus/duoplus.ts`     | Axios, HTTP                          | `getPhones()`, `startPhone()`, `uploadFile()`, `getLogs()`                                  | ✅ Active |
| **📊 UNIFIED SYSTEM**     |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 7.1  | UnifiedProfileManager     | Class     | `/src/utils/unified/manager.ts`     | Local Storage, Templates             | `createProfile()`, `getProfiles()`, `updateProfile()`, `deleteProfile()`                    | ✅ Active |
|                           | 7.2  | PROFILE_TEMPLATES         | Constant  | `/src/utils/unified/types.ts`       | None                                 | `GAMING`, `STREAMING`, `SCRAPING`, `DEVELOPMENT`                                            | ✅ Active |
|                           | 7.3  | UNIFIED_PROFILE_CONSTANTS | Constant  | `/src/utils/unified/types.ts`       | None                                 | `STATUS`, `PROTOCOL`, `CATEGORY`, `PRIORITY`                                                | ✅ Active |
| **💾 STORAGE SERVICES**   |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 8.1  | R2BaseClient              | Class     | `/src/utils/r2/base.ts`             | AWS SDK                              | `upload()`, `download()`, `list()`, `delete()`                                              | ✅ Active |
|                           | 8.2  | AWSClient                 | Class     | `/src/utils/r2/aws-client.ts`       | AWS SDK, R2BaseClient                | `uploadFile()`, `downloadFile()`, `getPresignedUrl()`                                       | ✅ Active |
|                           | 8.3  | BunClient                 | Class     | `/src/utils/r2/bun-client.ts`       | Bun, R2BaseClient                    | `uploadFile()`, `downloadFile()`, `getFileUrl()`                                            | ✅ Active |
| **🛠️ UTILITY SERVICES**   |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 9.1  | httpClient                | Service   | `/src/utils/api.ts`                 | Axios                                | `get()`, `post()`, `put()`, `delete()`                                                      | ✅ Active |
|                           | 9.2  | errorService              | Service   | `/src/utils/errors.ts`              | None                                 | `handleError()`, `logError()`, `formatError()`                                              | ✅ Active |
|                           | 9.3  | wranglerAuth              | Service   | `/src/utils/wranglerAuth.ts`        | None                                 | `getAuth()`, `setAuth()`, `validateAuth()`                                                  | ✅ Active |
| **📋 TYPES & INTERFACES** |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 10.1 | DashboardData             | Interface | `/src/types/proxy.ts`               | None                                 | `account`, `proxies`, `statistics`                                                          | ✅ Active |
|                           | 10.2 | Proxy                     | Interface | `/src/types/proxy.ts`               | None                                 | `id`, `ip`, `port`, `username`, `password`, `protocol`, `region`                            | ✅ Active |
|                           | 10.3 | OrderInfo                 | Interface | `/src/types/proxy.ts`               | None                                 | `orderId`, `amount`, `status`, `createdAt`                                                  | ✅ Active |
|                           | 10.4 | UnifiedProfile            | Interface | `/src/utils/unified/types.ts`       | None                                 | `id`, `name`, `proxyId`, `phoneId`, `config`, `performance`, `metadata`                     | ✅ Active |
|                           | 10.5 | ProxyConfiguration        | Interface | `/src/utils/unified/types.ts`       | None                                 | `ip`, `port`, `username`, `password`, `protocol`, `region`, `dns`, `whitelist`, `blacklist` | ✅ Active |
|                           | 10.6 | PerformanceMetrics        | Interface | `/src/utils/unified/types.ts`       | None                                 | `responseTime`, `uptime`, `bandwidth`, `requests`, `lastUpdated`                            | ✅ Active |
|                           | 10.7 | ProfileMetadata           | Interface | `/src/utils/unified/types.ts`       | None                                 | `category`, `priority`, `tags`, `description`, `createdAt`                                  | ✅ Active |
|                           | 10.8 | DuoPlusPhone              | Interface | `/src/utils/duoplus/duoplus.ts`     | None                                 | `id`, `name`, `status`, `ip`, `model`, `version`                                            | ✅ Active |
|                           | 10.9 | DuoPlusAccount            | Interface | `/src/utils/duoplus/duoplus.ts`     | None                                 | `id`, `email`, `balance`, `phones`                                                          | ✅ Active |
| **📊 CONSTANTS**          |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 11.1 | API_ENDPOINTS             | Constant  | `/src/utils/constants/api.ts`       | None                                 | `IPFOXY_BASE_URL`, `DUOPLUS_BASE_URL`                                                       | ✅ Active |
|                           | 11.2 | R2_CONFIG                 | Constant  | `/src/utils/constants/r2.ts`        | None                                 | `BUCKET_NAME`, `REGION`, `ENDPOINT`                                                         | ✅ Active |
|                           | 11.3 | ERROR_CODES               | Constant  | `/src/utils/errors.ts`              | None                                 | `NETWORK_ERROR`, `AUTH_ERROR`, `VALIDATION_ERROR`                                           | ✅ Active |
| **🧪 TEST UTILITIES**     |      |                           |           |                                     |                                      |                                                                                             |           |
|                           | 12.1 | mockData                  | Service   | `/src/utils/mockData.ts`            | None                                 | `mockProxies`, `mockPhones`, `mockProfiles`                                                 | ✅ Active |
|                           | 12.2 | testSetup                 | Module    | `/src/test/setup.ts`                | Vitest, jsdom                        | `DOM mocks`, `global setup`                                                                 | ✅ Active |

---

## 🏗️ **Service Dependencies Matrix**

| Service                   | Depends On                       | Provides To                              | Integration Type |
| ------------------------- | -------------------------------- | ---------------------------------------- | ---------------- |
| **IPFoxyAPI**             | httpClient, API_ENDPOINTS        | useProxyData, OverviewPage, ProxiesPage  | REST API         |
| **DuoPlusAPI**            | httpClient, API_ENDPOINTS        | DuoPlusPage, UnifiedManagementPage       | REST API         |
| **UnifiedProfileManager** | Local Storage, PROFILE_TEMPLATES | UnifiedManagementPage, AnalyticsPage     | Local State      |
| **AWSClient**             | R2BaseClient, R2_CONFIG          | BunFileUpload, FileUpload                | Cloud Storage    |
| **BunClient**             | R2BaseClient, R2_CONFIG          | BunFileUpload, FileUpload                | Cloud Storage    |
| **useProxyData**          | IPFoxyAPI, mockData              | OverviewPage, ProxiesPage, AnalyticsPage | React Hook       |
| **errorService**          | None                             | All Services, Components                 | Utility          |

---

## 🎯 **Component Property Matrix**

| #   | Component                 | Key Props            | State Management        | Side Effects                      | Used By         |
| --- | ------------------------- | -------------------- | ----------------------- | --------------------------------- | --------------- |
| 2.1 | **DashboardLayout**       | `children`           | Local (sidebar state)   | Router navigation                 | App.tsx         |
| 2.2 | **Header**                | `title`, `user`      | Local                   | None                              | DashboardLayout |
| 2.3 | **Sidebar**               | `activeRoute`        | Local (active item)     | Router navigation                 | DashboardLayout |
| 3.1 | **OverviewPage**          | None                 | useProxyData            | API calls                         | Router          |
| 3.2 | **ProxiesPage**           | None                 | useProxyData            | API calls, CRUD operations        | Router          |
| 3.3 | **AnalyticsPage**         | None                 | useProxyData            | API calls, chart rendering        | Router          |
| 3.4 | **DuoPlusPage**           | None                 | Local (phone list)      | API calls, file operations        | Router          |
| 3.5 | **UnifiedManagementPage** | None                 | Local (profiles)        | Profile CRUD, template operations | Router          |
| 4.1 | **BunFileUpload**         | `onUpload`, `accept` | Local (upload progress) | R2 upload                         | Multiple pages  |
| 4.2 | **FileUpload**            | `onUpload`, `accept` | Local (upload progress) | File handling                     | Multiple pages  |

---

## 📋 **Interface Property Details**

### **Core Business Types**

```typescript
// Proxy Management
interface Proxy {
  id: string; // Unique identifier
  ip: string; // IP address
  port: number; // Port number
  username: string; // Authentication username
  password: string; // Authentication password
  protocol: "HTTP" | "HTTPS" | "SOCKS5"; // Protocol type
  region: string; // Geographic region
  status: "active" | "inactive"; // Current status
  createdAt: Date; // Creation timestamp
}

// Unified Profile System
interface UnifiedProfile {
  id: string; // Profile ID
  name: string; // Display name
  proxyId: string; // Associated proxy ID
  phoneId: string; // Associated phone ID
  config: ProxyConfiguration; // Proxy settings
  performance: PerformanceMetrics; // Performance data
  metadata: ProfileMetadata; // Profile information
  status: "ACTIVE" | "INACTIVE" | "CONFIGURING" | "ERROR";
}

// Phone Management
interface DuoPlusPhone {
  id: string; // Phone ID
  name: string; // Display name
  status: "online" | "offline" | "starting" | "stopping";
  ip: string; // Phone IP
  model: string; // Device model
  version: string; // OS version
  createdAt: Date; // Creation time
  lastActive: Date; // Last activity
}
```

### **Configuration Types**

```typescript
// Proxy Configuration
interface ProxyConfiguration {
  ip: string; // Proxy IP
  port: number; // Proxy port
  username: string; // Auth username
  password: string; // Auth password
  protocol: "HTTP" | "HTTPS" | "SOCKS5";
  region: string; // Geographic region
  dns: string[]; // DNS servers
  whitelist: string[]; // Whitelist domains
  blacklist: string[]; // Blacklist domains
}

// Performance Metrics
interface PerformanceMetrics {
  responseTime: number; // Response time in ms
  uptime: number; // Uptime percentage
  bandwidth: number; // Bandwidth in Mbps
  requests: number; // Total requests
  lastUpdated: Date; // Last update time
}

// Profile Metadata
interface ProfileMetadata {
  category: "GAMING" | "STREAMING" | "SCRAPING" | "GENERAL" | "DEVELOPMENT";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  tags: string[]; // Search tags
  description: string; // Profile description
  createdAt: Date; // Creation time
  updatedAt: Date; // Last update time
}
```

---

## 🔄 **Data Flow Matrix**

| Data Source           | Processing Layer             | Storage       | Consumers                                | Update Frequency    |
| --------------------- | ---------------------------- | ------------- | ---------------------------------------- | ------------------- |
| **IPFoxy API**        | IPFoxyAPI → useProxyData     | React State   | OverviewPage, ProxiesPage, AnalyticsPage | On demand + refresh |
| **DuoPlus API**       | DuoPlusAPI → Component State | React State   | DuoPlusPage, UnifiedManagementPage       | On demand + refresh |
| **User Actions**      | Component Handlers           | Local Storage | UnifiedProfileManager                    | Real-time           |
| **Profile Templates** | UnifiedProfileManager        | Local Storage | UnifiedManagementPage                    | Static              |
| **File Uploads**      | R2 Clients                   | Cloudflare R2 | FileUpload Components                    | On upload           |
| **Performance Data**  | Analytics Service            | Local Storage | AnalyticsPage, UnifiedManagementPage     | Periodic            |

---

## 🎯 **Key Insights**

### **Architecture Strengths**

- ✅ **Clear separation** between UI, business logic, and data layers
- ✅ **Type safety** with comprehensive TypeScript interfaces
- ✅ **Modular design** with well-defined service boundaries
- ✅ **Reusable components** with proper prop interfaces
- ✅ **Consistent error handling** across all services

### **Areas for Improvement**

- 🔧 **Deep import paths** - Some services require 3-4 level imports
- 🔧 **Scattered related code** - Proxy logic spread across utils/hooks/pages
- 🔧 **Mixed concerns** - Some components handle business logic
- 🔧 **Limited reusability** - Shared utilities could be better organized

### **Refactoring Opportunities**

- 🚀 **Feature-based grouping** - Co-locate related components/hooks/services
- 🚀 **Shared service layer** - Extract common patterns into reusable services
- 🚀 **Simplified imports** - Reduce nesting and improve discoverability
- 🚀 **Better state management** - Consider centralized state for complex features
