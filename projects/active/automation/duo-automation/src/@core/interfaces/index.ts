/**
 * 🚀 Enhanced Class and Interface Standards v3.7
 * 
 * Provides standardized naming conventions and structure
 * for all classes and interfaces throughout the codebase.
 * 
 * Features:
 * - Modern TypeScript patterns
 * - Generic interfaces for reusability
 * - Enhanced error handling
 * - Performance optimizations
 * - Security best practices
 * - Comprehensive monitoring
 */

// 🆕 Generic Base Interfaces
export interface IBaseRepository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(options?: IQueryOptions): Promise<T[]>;
  create(data: Partial<T>): Promise<T>;
  update(id: ID, data: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(options?: IQueryOptions): Promise<number>;
}

export interface IBaseService<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  create(data: ICreateRequest<T>): Promise<T>;
  update(id: ID, data: IUpdateRequest<T>): Promise<T>;
  delete(id: ID): Promise<void>;
  search(query: ISearchQuery): Promise<ISearchResult<T>>;
}

export interface ICacheManager<K = string, V = any> {
  get(key: K): Promise<V | null>;
  set(key: K, value: V, ttl?: number): Promise<void>;
  delete(key: K): Promise<boolean>;
  clear(): Promise<void>;
  has(key: K): Promise<boolean>;
  keys(): Promise<K[]>;
  size(): Promise<number>;
}

// 🆕 Enhanced Core Interfaces
export interface IStatusSystem {
  initialize(): Promise<void>;
  getStatus(): Promise<IStatusMetrics>;
  updateStatus(data: IStatusData): Promise<void>;
  addEndpoint(endpoint: IEndpointConfig): Promise<void>;
  removeEndpoint(endpointId: string): Promise<void>;
  getHealthCheck(): Promise<IHealthCheckResult>;
  subscribe(callback: (status: IStatusMetrics) => void): void;
  unsubscribe(callback: (status: IStatusMetrics) => void): void;
}

export interface IPaymentProcessor {
  processPayment(payment: IPaymentRequest): Promise<IPaymentResult>;
  validatePayment(payment: IPaymentRequest): Promise<IValidationResult>;
  refundPayment(paymentId: string, amount?: number): Promise<IRefundResult>;
  getPaymentStatus(paymentId: string): Promise<IPaymentStatus>;
  batchProcess(payments: IPaymentRequest[]): Promise<IPaymentResult[]>;
  estimateFees(payment: IPaymentRequest): Promise<IFeeEstimate>;
  getTransactionHistory(userId?: string): Promise<ITransaction[]>;
}

export interface ILightningNetworkRouter {
  routePayment(amount: number, metadata: IPaymentMetadata): Promise<IRoutingResult>;
  getRoutingRecommendations(amount: number): Promise<IRoutingRecommendations>;
  autoRebalance(): Promise<IRebalanceResult>;
  getNodeInfo(): Promise<INodeInfo>;
  getChannelBalance(): Promise<IChannelBalance>;
  openChannel(peerId: string, amount: number): Promise<IChannelResult>;
  closeChannel(channelId: string): Promise<ICloseChannelResult>;
  getNetworkGraph(): Promise<INetworkGraph>;
}

export interface ITelemetryCollector {
  collectMetrics(): Promise<ITelemetryMetrics>;
  sendAlert(alert: IAlert): Promise<void>;
  configureCollector(config: ICollectorConfig): Promise<void>;
  startCollection(): Promise<void>;
  stopCollection(): Promise<void>;
  getMetricsHistory(timeRange: ITimeRange): Promise<ITelemetryMetrics[]>;
  exportMetrics(format: 'json' | 'csv' | 'prometheus'): Promise<string>;
  addCustomMetric(metric: ICustomMetric): Promise<void>;
}

// 🆕 Enhanced Service Interfaces
export interface IUserService extends IBaseService<IUser, string> {
  authenticate(credentials: IAuthCredentials): Promise<IAuthResult>;
  authorize(user: IUser, resource: string, action: string): Promise<IAuthorizationResult>;
  updatePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>;
  enableTwoFactor(userId: string): Promise<ITwoFactorSetup>;
  verifyTwoFactor(userId: string, code: string): Promise<boolean>;
  getUserSessions(userId: string): Promise<IUserSession[]>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  getUserPermissions(userId: string): Promise<IPermission[]>;
  grantPermission(userId: string, permission: string): Promise<void>;
  revokePermission(userId: string, permission: string): Promise<void>;
}

export interface IPaymentService extends IBaseService<IPayment, string> {
  getUserPayments(userId: string, options?: IPaymentQueryOptions): Promise<IPayment[]>;
  getPaymentAnalytics(timeRange: ITimeRange): Promise<IPaymentAnalytics>;
  processBatch(payments: IPaymentRequest[]): Promise<IBatchPaymentResult>;
  disputePayment(paymentId: string, reason: string): Promise<IDisputeResult>;
  refundPayment(paymentId: string, reason?: string, amount?: number): Promise<IRefundResult>;
  getPaymentMethods(userId: string): Promise<IPaymentMethod[]>;
  addPaymentMethod(userId: string, method: ICreatePaymentMethod): Promise<IPaymentMethod>;
  removePaymentMethod(userId: string, methodId: string): Promise<void>;
}

export interface ISecurityService {
  authenticate(credentials: IAuthCredentials): Promise<IAuthResult>;
  authorize(user: IUser, resource: string, action: string): Promise<IAuthorizationResult>;
  encrypt(data: string, key?: string): Promise<IEncryptionResult>;
  decrypt(data: string, key?: string): Promise<IDecryptionResult>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateToken(user: IUser, expiresIn?: number): Promise<string>;
  validateToken(token: string): Promise<ITokenValidation>;
  refreshToken(token: string): Promise<string>;
  revokeToken(token: string): Promise<void>;
  auditLog(action: string, userId: string, details: any): Promise<void>;
  getSecurityEvents(userId?: string, timeRange?: ITimeRange): Promise<ISecurityEvent[]>;
}

export interface IMonitoringService {
  getSystemHealth(): Promise<ISystemHealth>;
  getPerformanceMetrics(): Promise<IPerformanceMetrics>;
  getErrorLogs(options?: ILogQueryOptions): Promise<IErrorLog[]>;
  generateReport(type: IReportType): Promise<IReport>;
  setAlert(config: IAlertConfig): Promise<void>;
  removeAlert(alertId: string): Promise<void>;
  getAlerts(): Promise<IAlert[]>;
  acknowledgeAlert(alertId: string): Promise<void>;
  getMetrics(timeRange: ITimeRange): Promise<IMetricData[]>;
  createDashboard(config: IDashboardConfig): Promise<IDashboard>;
  getDashboards(): Promise<IDashboard[]>;
}

// 🆕 New Service Interfaces
export interface INotificationService {
  sendNotification(notification: INotification): Promise<void>;
  sendBulk(notifications: INotification[]): Promise<IBulkNotificationResult>;
  getUserNotifications(userId: string, options?: INotificationQueryOptions): Promise<INotification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  getNotificationPreferences(userId: string): Promise<INotificationPreferences>;
  updateNotificationPreferences(userId: string, preferences: INotificationPreferences): Promise<void>;
}

export interface IAnalyticsService {
  trackEvent(event: IAnalyticsEvent): Promise<void>;
  trackPageView(page: IPageView): Promise<void>;
  trackUserAction(action: IUserAction): Promise<void>;
  getAnalytics(query: IAnalyticsQuery): Promise<IAnalyticsResult>;
  getRealTimeMetrics(): Promise<IRealTimeMetrics>;
  createReport(config: IReportConfig): Promise<IAnalyticsReport>;
  exportData(query: IExportQuery): Promise<string>;
  getConversionRates(timeRange: ITimeRange): Promise<IConversionData>;
  getUserRetention(timeRange: ITimeRange): Promise<IRetentionData>;
}

export interface IStorageService {
  upload(file: IFileUpload): Promise<IUploadResult>;
  download(fileId: string): Promise<Uint8Array>;
  delete(fileId: string): Promise<void>;
  getFileInfo(fileId: string): Promise<IFileInfo>;
  listFiles(options: IListOptions): Promise<IFileList>;
  generatePresignedUrl(fileId: string, expiresIn?: number): Promise<string>;
  copyFile(sourceId: string, destinationId: string): Promise<void>;
  moveFile(sourceId: string, destinationId: string): Promise<void>;
  getStorageUsage(): Promise<IStorageUsage>;
}

export interface IEmailService {
  sendEmail(email: IEmail): Promise<IEmailResult>;
  sendTemplate(templateId: string, data: any, recipients: string[]): Promise<IEmailResult>;
  sendBulk(emails: IEmail[]): Promise<IBulkEmailResult>;
  getEmailStatus(emailId: string): Promise<IEmailStatus>;
  getTemplates(): Promise<IEmailTemplate[]>;
  createTemplate(template: ICreateEmailTemplate): Promise<IEmailTemplate>;
  updateTemplate(templateId: string, template: IUpdateEmailTemplate): Promise<IEmailTemplate>;
  deleteTemplate(templateId: string): Promise<void>;
  getEmailAnalytics(timeRange: ITimeRange): Promise<IEmailAnalytics>;
}

// 🆕 Supporting Types
export interface IQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface ISearchQuery {
  query: string;
  fields?: string[];
  filters?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface ISearchResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export type ICreateRequest<T> = {
  [K in keyof T]?: T[K];
};

export type IUpdateRequest<T> = {
  [K in keyof T]?: T[K];
};

export interface ITimeRange {
  start: Date;
  end: Date;
}

// 🆕 Enhanced Data Transfer Objects (DTOs)
export interface IStatusMetrics {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  uptime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
}

export interface IPaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  metadata: IPaymentMetadata;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
  expiresIn?: number;
}

export interface IPaymentResult {
  success: boolean;
  paymentId: string;
  transactionId?: string;
  error?: string;
  processedAt: Date;
  status: PaymentStatus;
  fees: number;
  netAmount: number;
  estimatedDelivery?: Date;
}

export interface IPaymentMetadata {
  userId?: string;
  questId?: string;
  familyId?: string;
  savingsOptIn?: boolean;
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface IRoutingResult {
  strategy: string;
  destination: string;
  estimatedYield: number;
  fees: number;
  risk: 'low' | 'medium' | 'high';
  estimatedTime: number;
  confidence: number;
  channels: string[];
}

export interface ITelemetryMetrics {
  totalVolume: number;
  totalFees: number;
  averagePaymentSize: number;
  successRate: number;
  channelUtilization: number;
  savingsYield: number;
  activeUsers: number;
  errorRate: number;
  responseTime: number;
  throughput: number;
  customMetrics?: Record<string, number>;
}

export interface IUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLoginAt?: Date;
  profile: IUserProfile;
  settings: IUserSettings;
  permissions: string[];
  twoFactorEnabled: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface IUserProfile {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  timezone: string;
  language: string;
  currency: string;
}

export interface IUserSettings {
  notifications: INotificationSettings;
  privacy: IPrivacySettings;
  security: ISecuritySettings;
  preferences: IUserPreferences;
}

export interface IAuthCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
  captchaToken?: string;
  deviceFingerprint?: string;
}

export interface IAuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: IUser;
  error?: string;
  expiresAt?: Date;
  requiresTwoFactor?: boolean;
  sessionDuration?: number;
}

// 🆕 Enhanced Enums
export enum PaymentMethod {
  BITCOIN = 'BTC',
  BITCOIN_LIGHTNING = 'BTC_LN',
  CASHAPP = 'CASHAPP',
  USDC = 'USDC',
  VENMO = 'VENMO',
  PAYPAL = 'PAYPAL',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD'
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  DEVELOPER = 'developer',
  SUPPORT = 'support',
  ANALYST = 'analyst',
  SUPER_ADMIN = 'super_admin'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed'
}

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
  WEBHOOK = 'webhook'
}

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum MonitoringSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// 🆕 Additional interfaces
export interface IEndpointConfig {
  id: string;
  url: string;
  method: string;
  timeout: number;
  expectedStatus: number;
  headers?: Record<string, string>;
}

export interface IStatusData {
  endpoint: string;
  status: string;
  responseTime: number;
}

export interface IHealthCheckResult {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  endpoints: IEndpointHealth[];
  timestamp: Date;
}

export interface IEndpointHealth {
  endpoint: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  lastChecked: Date;
  error?: string;
}

export interface IPaymentStatus {
  id: string;
  status: PaymentStatus;
  updatedAt: Date;
  estimatedCompletion?: Date;
}

export interface IFeeEstimate {
  processingFee: number;
  networkFee: number;
  totalFee: number;
  estimatedTime: number;
}

export interface ITransaction {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  completedAt?: Date;
  metadata: IPaymentMetadata;
}

export interface INodeInfo {
  nodeId: string;
  alias: string;
  color: string;
  numChannels: number;
  capacity: number;
  version: string;
  blockHeight: number;
  network: string;
}

export interface IChannelBalance {
  localBalance: number;
  remoteBalance: number;
  unsettledBalance: number;
  totalCapacity: number;
}

export interface IChannelResult {
  channelId: string;
  fundingTxid: string;
  capacity: number;
  status: 'opening' | 'open' | 'closing' | 'closed';
}

export interface ICloseChannelResult {
  channelId: string;
  closingTxid: string;
  settledBalance: number;
  timeLockedBalance: number;
}

export interface INetworkGraph {
  nodes: INetworkNode[];
  edges: INetworkEdge[];
}

export interface INetworkNode {
  id: string;
  alias: string;
  color: string;
  addresses: string[];
}

export interface INetworkEdge {
  channelId: string;
  source: string;
  target: string;
  capacity: number;
}

export interface ICustomMetric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  value: number;
  labels?: Record<string, string>;
}

export interface IPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface IUserSession {
  id: string;
  userId: string;
  device: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface ITwoFactorSetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface ITokenValidation {
  valid: boolean;
  userId?: string;
  expiresAt?: Date;
  scopes?: string[];
  error?: string;
}

export interface ISecurityEvent {
  id: string;
  userId?: string;
  type: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: MonitoringSeverity;
  metadata?: any;
}

export interface INotification {
  id?: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  readAt?: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface IAnalyticsEvent {
  name: string;
  userId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

export interface IPageView {
  url: string;
  userId?: string;
  title: string;
  referrer?: string;
  timestamp: Date;
  sessionId?: string;
}

export interface IUserAction {
  action: string;
  userId?: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId?: string;
}

export interface IFileUpload {
  filename: string;
  contentType: string;
  size: number;
  data: Uint8Array;
  metadata?: Record<string, any>;
}

export interface IUploadResult {
  fileId: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

export interface IFileInfo {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  uploadedAt: Date;
  url: string;
  metadata?: Record<string, any>;
}

export interface IFileList {
  files: IFileInfo[];
  total: number;
  page: number;
  totalPages: number;
}

export interface IEmail {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  body: string;
  html?: string;
  attachments?: IEmailAttachment[];
  templateId?: string;
  templateData?: Record<string, any>;
}

export interface IEmailAttachment {
  filename: string;
  content: Uint8Array;
  contentType: string;
}

export interface IValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
  data?: any;
}

export interface IRefundResult {
  success: boolean;
  refundId: string;
  amount: number;
  reason?: string;
  error?: string;
  processedAt: Date;
}

export interface IRoutingRecommendations {
  recommended: IRoutingResult;
  alternatives: IRoutingResult[];
  analysis: {
    bestYield: number;
    lowestRisk: IRoutingResult;
    fastest: IRoutingResult;
    cheapest: IRoutingResult;
  };
}

export interface IRebalanceResult {
  rebalanced: boolean;
  amount: number;
  fromStrategy: string;
  toStrategy: string;
  estimatedGain: number;
  transactions: string[];
}

export interface IAlert {
  id: string;
  type: string;
  severity: MonitoringSeverity;
  message: string;
  timestamp: Date;
  data?: any;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface ICollectorConfig {
  interval: number;
  metrics: string[];
  alerts: IAlertConfig[];
  retention: IRetentionConfig;
}

export interface IRetentionConfig {
  metrics: number; // days
  logs: number; // days
  alerts: number; // days
}

export interface IAlertConfig {
  id: string;
  name: string;
  type: string;
  threshold: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
  enabled: boolean;
  channels: string[];
  cooldown: number;
}

export interface ICreateUserRequest {
  email: string;
  username: string;
  password: string;
  role: UserRole;
  profile?: Partial<IUserProfile>;
  settings?: Partial<IUserSettings>;
}

export interface IUpdateUserRequest {
  email?: string;
  username?: string;
  role?: UserRole;
  isActive?: boolean;
  profile?: Partial<IUserProfile>;
  settings?: Partial<IUserSettings>;
}

export interface ICreatePaymentRequest {
  amount: number;
  currency: string;
  method: PaymentMethod;
  metadata: IPaymentMetadata;
  description?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface IUpdatePaymentRequest {
  status?: PaymentStatus;
  metadata?: IPaymentMetadata;
  description?: string;
}

export interface IPayment {
  id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  metadata: IPaymentMetadata;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  fees: number;
  netAmount: number;
  transactionId?: string;
  refundId?: string;
}

export interface IAuthorizationResult {
  authorized: boolean;
  permissions: string[];
  error?: string;
  expiresAt?: Date;
}

export interface IEncryptionResult {
  success: boolean;
  encryptedData: string;
  algorithm: string;
  keyId?: string;
  error?: string;
}

export interface IDecryptionResult {
  success: boolean;
  decryptedData: string;
  algorithm: string;
  keyId?: string;
  error?: string;
}

export interface ISystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  memory: number;
  cpu: number;
  disk: number;
  network: INetworkStatus;
  database: IDatabaseStatus;
  cache: ICacheStatus;
}

export interface INetworkStatus {
  latency: number;
  bandwidth: number;
  packetLoss: number;
}

export interface IDatabaseStatus {
  connections: number;
  queryTime: number;
  cacheHitRate: number;
}

export interface ICacheStatus {
  hitRate: number;
  memoryUsage: number;
  evictionRate: number;
}

export interface IPerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  concurrency: number;
  memoryUsage: number;
  cpuUsage: number;
  diskIO: number;
  networkIO: number;
}

export interface IErrorLog {
  id: string;
  message: string;
  stack: string;
  timestamp: Date;
  severity: MonitoringSeverity;
  context: any;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

export interface IReportType {
  type: string;
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface IReport {
  id: string;
  type: IReportType;
  data: any;
  generatedAt: Date;
  downloadUrl: string;
  expiresAt: Date;
}

export interface IDatabase {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any[]>;
  transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T>;
  health(): Promise<IDatabaseStatus>;
}

export interface IAlertManager {
  sendAlert(alert: IAlert): Promise<void>;
  configureAlerts(configs: IAlertConfig[]): Promise<void>;
  getActiveAlerts(): Promise<IAlert[]>;
  acknowledgeAlert(alertId: string, userId: string): Promise<void>;
  resolveAlert(alertId: string, userId: string): Promise<void>;
}

export interface IValidationRule {
  name: string;
  validate: (value: any) => boolean | Promise<boolean>;
  message: string;
  async?: boolean;
}

export interface ISecurityConfig {
  encryptionAlgorithm: string;
  sessionTimeout: number;
  maxLoginAttempts: number;
  twoFactorEnabled: boolean;
  passwordPolicy: IPasswordPolicy;
  jwtConfig: IJWTConfig;
}

export interface IPasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSymbols: boolean;
  preventReuse: number;
}

export interface IJWTConfig {
  secret: string;
  expiresIn: number;
  refreshExpiresIn: number;
  algorithm: string;
}

export interface IMetricData {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface IDashboardConfig {
  refreshInterval: number;
  timeRange: ITimeRange;
  filters: Record<string, any>;
}

export interface IDashboard {
  id: string;
  name: string;
  description: string;
  widgets: IDashboardWidget[];
  config: IDashboardConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDashboardWidget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

export interface IPaymentQueryOptions extends IQueryOptions {
  userId?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  dateRange?: ITimeRange;
  minAmount?: number;
  maxAmount?: number;
}

export interface INotificationQueryOptions extends IQueryOptions {
  type?: NotificationType;
  read?: boolean;
  dateRange?: ITimeRange;
}

export interface ILogQueryOptions extends IQueryOptions {
  severity?: MonitoringSeverity;
  dateRange?: ITimeRange;
  search?: string;
}

export interface IListOptions extends IQueryOptions {
  prefix?: string;
  recursive?: boolean;
}

export interface IAnalyticsQuery {
  metrics: string[];
  dimensions: string[];
  filters?: Record<string, any>;
  timeRange: ITimeRange;
  granularity?: 'minute' | 'hour' | 'day' | 'week' | 'month';
}

export interface IAnalyticsResult {
  data: any[];
  total: number;
  timeRange: ITimeRange;
  metrics: string[];
  dimensions: string[];
}

export interface IRealTimeMetrics {
  activeUsers: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
  timestamp: Date;
}

export interface IReportConfig {
  name: string;
  type: string;
  metrics: string[];
  timeRange: ITimeRange;
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  schedule?: IReportSchedule;
}

export interface IReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  enabled: boolean;
}

export interface IAnalyticsReport {
  id: string;
  config: IReportConfig;
  data: any;
  generatedAt: Date;
  downloadUrl: string;
}

export interface IExportQuery {
  format: 'json' | 'csv' | 'xlsx';
  timeRange: ITimeRange;
  filters?: Record<string, any>;
  fields?: string[];
}

export interface IConversionData {
  totalConversions: number;
  conversionRate: number;
  bySource: Record<string, number>;
  byCampaign: Record<string, number>;
  timeSeries: Array<{ date: string; conversions: number; rate: number }>;
}

export interface IRetentionData {
  cohort: string;
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

export interface INotificationSettings {
  email: boolean;
  sms: boolean;
  push: boolean;
  inApp: boolean;
  marketing: boolean;
  security: boolean;
  updates: boolean;
}

export interface IPrivacySettings {
  profileVisibility: 'public' | 'friends' | 'private';
  showEmail: boolean;
  showPhone: boolean;
  allowSearch: boolean;
  dataSharing: boolean;
}

export interface ISecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  loginNotifications: boolean;
  deviceManagement: boolean;
  apiAccess: boolean;
}

export interface IUserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface INotificationPreferences {
  email: INotificationChannelPreferences;
  sms: INotificationChannelPreferences;
  push: INotificationChannelPreferences;
  inApp: INotificationChannelPreferences;
}

export interface INotificationChannelPreferences {
  enabled: boolean;
  types: string[];
  quietHours?: {
    start: string;
    end: string;
  };
}

export interface IStorageUsage {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  percentage: number;
  byType: Record<string, number>;
}

export interface IEmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateEmailTemplate {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface IUpdateEmailTemplate {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: string[];
}

export interface IEmailAnalytics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  timeRange: ITimeRange;
}

export interface IEmailStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  events: IEmailEvent[];
  sentAt: Date;
}

export interface IEmailEvent {
  type: string;
  timestamp: Date;
  data?: any;
}

export interface IPaymentAnalytics {
  totalVolume: number;
  totalTransactions: number;
  averageTransactionValue: number;
  successRate: number;
  byMethod: Record<PaymentMethod, IPaymentMethodAnalytics>;
  byStatus: Record<PaymentStatus, number>;
  timeSeries: Array<{ date: string; volume: number; transactions: number }>;
}

export interface IPaymentMethodAnalytics {
  volume: number;
  transactions: number;
  successRate: number;
  averageValue: number;
}

export interface IPaymentMethod {
  id: string;
  type: PaymentMethod;
  provider: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface ICreatePaymentMethod {
  type: PaymentMethod;
  provider: string;
  token?: string;
  lastFour?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault?: boolean;
}

export interface IBatchPaymentResult {
  total: number;
  successful: number;
  failed: number;
  results: IPaymentResult[];
  errors: string[];
}

export interface IDisputeResult {
  disputeId: string;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface IBulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
}

export interface IEmailResult {
  messageId: string;
  status: 'sent' | 'queued' | 'failed';
  error?: string;
  sentAt: Date;
}

export interface IBulkEmailResult {
  total: number;
  successful: number;
  failed: number;
  results: IEmailResult[];
  errors: string[];
}

// 🆕 Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type EventHandler<T = any> = (data: T) => void;

export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

// 🆕 Error Types
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: string[] = [],
    public warnings: string[] = []
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string, public resource?: string, public action?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public paymentId?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public endpoint?: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public configKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
