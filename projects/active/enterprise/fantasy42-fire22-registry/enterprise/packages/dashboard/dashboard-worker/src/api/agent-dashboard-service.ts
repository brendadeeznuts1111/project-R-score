/**
 * Agent Dashboard Service
 * Aggregates Fantasy402 data for dashboard consumption
 */

import { Fantasy402AgentClient } from './fantasy402-agent-client';

export interface AgentDashboardData {
  agentProfile: {
    customerID: string;
    agentID: string;
    login: string;
    office: string;
    store: string;
    agentType: string;
    active: boolean;
    openDateTime: string;
    openDateTimeUnix: number;
  };
  financialPerformance: {
    currentWeek: {
      profit: number;
      todayProfit: number;
      activePlayers: number;
    };
    lastWeek: {
      profit: number;
    };
    accountSummary: {
      balance: number;
      pendingWagers: number;
      availableBalance: number;
      creditLimit: number;
    };
  };
  accountConfiguration: {
    suspendSportsbook: boolean;
    suspendCasino: boolean;
    denyLiveBetting: boolean;
    allowRoundRobin: boolean;
    allowPropBuilder: boolean;
    denyReports: boolean;
    denyAgentBilling: boolean;
  };
  operationalStatus: {
    newEmailsCount: number;
    tokenStatus: 'Active' | 'Expired' | 'Unknown';
    lastActivityTimestamp: string;
  };
  permissions: {
    canViewReports: boolean;
    canAccessBilling: boolean;
    canManageLines: boolean;
    canAddAccounts: boolean;
    canDeleteBets: boolean;
    isOfficeAccount: boolean;
  };
  customerData: {
    customers: Array<{
      customerID: string;
      active: boolean;
      balance: number;
      creditLimit: number;
      lastLogin?: string;
      suspendSportsbook: boolean;
      office: string;
    }>;
    totalCustomers: number;
    activeCustomers: number;
    suspendedCustomers: number;
  };
  pendingWagers: {
    wagers: Array<{
      ticketNumber: string;
      customerID: string;
      wagerAmount: number;
      potentialPayout: number;
      sport: string;
      gameDescription: string;
      placedAt: string;
      status: string;
    }>;
    totalPendingWagers: number;
    totalPendingAmount: number;
    totalPendingPayout: number;
  };
  recentTransactions: {
    transactions: Array<{
      transactionID: string;
      customerID: string;
      type: 'deposit' | 'withdrawal' | 'wager' | 'payout' | 'adjustment';
      amount: number;
      description: string;
      timestamp: string;
      status: 'pending' | 'completed' | 'cancelled';
    }>;
    totalTransactions: number;
    lastTransactionTime: string;
  };
  webReportsConfig: {
    success: boolean;
    pendingReports: Array<{
      reportID: string;
      reportType: string;
      status: 'pending' | 'processing' | 'ready' | 'failed';
      requestedAt: string;
      estimatedCompletion?: string;
      parameters?: any;
    }>;
    reportConfigs: Array<{
      configID: string;
      reportName: string;
      description: string;
      isEnabled: boolean;
      schedule?: string;
      lastRun?: string;
    }>;
    lastUpdated: string;
    error?: string;
  };
  newUsersInfo: {
    success: boolean;
    newUsers: Array<{
      userID: string;
      username: string;
      registrationDate: string;
      status: 'active' | 'pending' | 'suspended';
      initialDeposit?: number;
      referredBy?: string;
      office?: string;
    }>;
    totalCount: number;
    period: string;
    lastUpdated: string;
    error?: string;
  };
  teaserProfile: {
    success: boolean;
    enabled: boolean;
    profile: {
      profileID?: string;
      profileName?: string;
      description?: string;
      sports?: Array<string>;
      pointSpreads?: Array<{
        sport: string;
        points: number;
        odds: number;
        enabled: boolean;
      }>;
      totalLimits?: Array<{
        sport: string;
        minBet: number;
        maxBet: number;
        maxPayout: number;
      }>;
      configuration?: any;
    };
    settings: {
      allowTeasers?: boolean;
      maxTeams?: number;
      minTeams?: number;
      allowTies?: boolean;
      pushAction?: string;
    };
    lastUpdated: string;
    error?: string;
  };
  customerList: {
    success: boolean;
    customers: Array<{
      customerID: string;
      login: string;
      name: string;
      currentBalance: number;
      availableBalance: number;
      pendingWagerBalance: number;
      creditLimit: number;
      wagerLimit: number;
      active: boolean;
      sportbookActive: boolean;
      casinoActive: boolean;
      suspendSportsbook: boolean;
      phone: string;
      email: string;
      playerNotes: string;
      openDateTime: string;
      lastVerDateTime: string;
      agentID: string;
      masterAgent: string;
    }>;
    totalCount: number;
    lastUpdated: string;
    error?: string;
  };
  errors: Array<{
    endpoint: string;
    error: string;
    timestamp: string;
  }>;
  metadata: {
    fetchedAt: string;
    cacheExpiry: number;
    apiCallCount: number;
  };
}

interface CacheEntry {
  data: AgentDashboardData;
  expires: number;
}

export class AgentDashboardService {
  private static cache = new Map<string, CacheEntry>();
  private static readonly CACHE_DURATION = 30 * 1000; // 30 seconds

  constructor(
    private username: string,
    private password: string
  ) {}

  /**
   * Get comprehensive agent dashboard data with caching
   */
  async getDashboardData(): Promise<AgentDashboardData> {
    const cacheKey = `agent-dashboard:${this.username}`;

    // Check cache first
    const cached = AgentDashboardService.cache.get(cacheKey);
    if (cached && Date.now() < cached.expires) {
      return cached.data;
    }

    const startTime = Date.now();
    let client = new Fantasy402AgentClient(this.username, this.password);
    let apiCallCount = 0;

    // Initialize the result structure
    const result: AgentDashboardData = {
      agentProfile: {
        customerID: '',
        agentID: '',
        login: '',
        office: '',
        store: '',
        agentType: 'U',
        active: false,
        openDateTime: '',
        openDateTimeUnix: 0,
      },
      financialPerformance: {
        currentWeek: {
          profit: 0,
          todayProfit: 0,
          activePlayers: 0,
        },
        lastWeek: {
          profit: 0,
        },
        accountSummary: {
          balance: 0,
          pendingWagers: 0,
          availableBalance: 0,
          creditLimit: 0,
        },
      },
      accountConfiguration: {
        suspendSportsbook: false,
        suspendCasino: false,
        denyLiveBetting: false,
        allowRoundRobin: false,
        allowPropBuilder: false,
        denyReports: false,
        denyAgentBilling: false,
      },
      operationalStatus: {
        newEmailsCount: 0,
        tokenStatus: 'Unknown',
        lastActivityTimestamp: new Date().toISOString(),
      },
      permissions: {
        canViewReports: false,
        canAccessBilling: false,
        canManageLines: false,
        canAddAccounts: false,
        canDeleteBets: false,
        isOfficeAccount: false,
      },
      customerData: {
        customers: [],
        totalCustomers: 0,
        activeCustomers: 0,
        suspendedCustomers: 0,
      },
      pendingWagers: {
        wagers: [],
        totalPendingWagers: 0,
        totalPendingAmount: 0,
        totalPendingPayout: 0,
      },
      recentTransactions: {
        transactions: [],
        totalTransactions: 0,
        lastTransactionTime: '',
      },
      webReportsConfig: {
        success: false,
        pendingReports: [],
        reportConfigs: [],
        lastUpdated: new Date().toISOString(),
        error: undefined,
      },
      newUsersInfo: {
        success: false,
        newUsers: [],
        totalCount: 0,
        period: '7 days',
        lastUpdated: new Date().toISOString(),
        error: undefined,
      },
      teaserProfile: {
        success: false,
        enabled: false,
        profile: {
          profileID: '',
          profileName: '',
          description: '',
          sports: [],
          pointSpreads: [],
          totalLimits: [],
          configuration: {},
        },
        settings: {
          allowTeasers: false,
          maxTeams: 0,
          minTeams: 0,
          allowTies: false,
          pushAction: '',
        },
        lastUpdated: new Date().toISOString(),
        error: undefined,
      },
      customerList: {
        success: false,
        customers: [],
        totalCount: 0,
        lastUpdated: new Date().toISOString(),
        error: undefined,
      },
      errors: [],
      metadata: {
        fetchedAt: new Date().toISOString(),
        cacheExpiry: Date.now() + AgentDashboardService.CACHE_DURATION,
        apiCallCount: 0,
      },
    };

    try {
      // Initialize client with enhanced debugging

      const initialized = await client.initialize();
      apiCallCount++;

      if (!initialized) {
        throw new Error('Failed to initialize Fantasy402 client');
      }

      // Get comprehensive account information using the rich endpoint
      // Defensive programming: Check for client state corruption
      if (typeof client.getAccountInfoOwner !== 'function') {
        console.error('❌ Client state corrupted, getAccountInfoOwner method is undefined');

        // Recreate client and reinitialize
        client = new Fantasy402AgentClient(this.username, this.password);
        const reinitResult = await client.initialize();
        apiCallCount++;

        if (!reinitResult) {
          throw new Error('Failed to reinitialize Fantasy402 client after corruption');
        }
      }

      try {
        const detailedAccountInfo = await client.getAccountInfoOwner();
        apiCallCount++;

        // Populate agent profile with comprehensive data
        result.agentProfile = {
          customerID: detailedAccountInfo.customerID || '',
          agentID: detailedAccountInfo.customerID || '',
          login: detailedAccountInfo.login || '',
          office: detailedAccountInfo.office || '',
          store: detailedAccountInfo.store || '',
          agentType: detailedAccountInfo.agentType || 'U',
          active: detailedAccountInfo.active || false,
          openDateTime: detailedAccountInfo.openDateTime || '',
          openDateTimeUnix: detailedAccountInfo.openDateTimeUnix || 0,
        };

        // Populate financial performance account summary
        result.financialPerformance.accountSummary = {
          balance: detailedAccountInfo.currentBalance || 0,
          pendingWagers: detailedAccountInfo.pendingWagerBalance || 0,
          availableBalance: detailedAccountInfo.availableBalance || 0,
          creditLimit: detailedAccountInfo.creditLimit || 0,
        };

        // Populate account configuration
        result.accountConfiguration = {
          suspendSportsbook: detailedAccountInfo.suspendSportsbook || false,
          suspendCasino: detailedAccountInfo.suspendCasino || false,
          denyLiveBetting: detailedAccountInfo.denyLiveBetting || false,
          allowRoundRobin: detailedAccountInfo.allowRoundRobin || false,
          allowPropBuilder: detailedAccountInfo.allowPropBuilder || false,
          denyReports: detailedAccountInfo.denyReports || false,
          denyAgentBilling: detailedAccountInfo.denyAgentBilling || false,
        };

        // Populate permissions from detailed account info
        result.permissions = {
          canViewReports: !detailedAccountInfo.denyReports,
          canAccessBilling: !detailedAccountInfo.denyAgentBilling,
          canManageLines: detailedAccountInfo.manageLinesFlag || false,
          canAddAccounts: detailedAccountInfo.addNewAccountFlag || false,
          canDeleteBets: detailedAccountInfo.permitDeleteBets || false,
          isOfficeAccount: detailedAccountInfo.agentType === 'O', // Office type
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check for specific client corruption error
        if (errorMessage.includes('is not a function')) {
          console.error('❌ Client method corruption detected during execution');

          result.errors.push({
            endpoint: 'getAccountInfoOwner',
            error: `Client corruption detected: ${errorMessage}`,
            timestamp: new Date().toISOString(),
          });
        } else {
          result.errors.push({
            endpoint: 'getAccountInfoOwner',
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });
        }

        // Fallback to basic account info and permissions
        const accountInfo = client.getAccountInfo();
        const permissions = client.getPermissions();

        if (accountInfo) {
          result.agentProfile.customerID = accountInfo.customerID || '';
          result.agentProfile.agentID = accountInfo.customerID || '';
          result.agentProfile.office = accountInfo.office || '';
          result.agentProfile.store = accountInfo.store || '';
          result.agentProfile.active = accountInfo.active || false;

          result.financialPerformance.accountSummary.balance = accountInfo.balance || 0;
          result.financialPerformance.accountSummary.pendingWagers = accountInfo.pendingWagers || 0;
          result.financialPerformance.accountSummary.availableBalance =
            accountInfo.availableBalance || 0;
        }

        if (permissions) {
          result.permissions.canViewReports = permissions.canViewReports || false;
          result.permissions.canAccessBilling = permissions.canAccessBilling || false;
          result.permissions.canManageLines = permissions.canManageLines || false;
          result.permissions.canAddAccounts = permissions.canAddAccounts || false;
          result.permissions.canDeleteBets = permissions.canDeleteBets || false;
          result.permissions.isOfficeAccount = permissions.isOffice || false;
        }
      }

      // Fetch current week figures using the optimized lite endpoint
      try {
        const currentWeek = await client.getWeeklyFigureByAgentLite();
        apiCallCount++;

        result.financialPerformance.currentWeek = {
          profit: currentWeek.thisWeek || 0,
          todayProfit: currentWeek.today || 0,
          activePlayers: currentWeek.active || 0,
        };
      } catch (error) {
        result.errors.push({
          endpoint: 'getWeeklyFigureByAgentLite',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Fallback to regular weekly figures endpoint
        try {
          const fallback = await client.getWeeklyFigures({ week: '0' });
          apiCallCount++;

          if (fallback?.LIST?.ARRAY?.[0]) {
            const data = fallback.LIST.ARRAY[0];
            result.financialPerformance.currentWeek = {
              profit: data.ThisWeek || 0,
              todayProfit: data.Today || 0,
              activePlayers: data.Active || 0,
            };
          }
        } catch (fallbackError) {
          result.errors.push({
            endpoint: 'getWeeklyFigures-fallback',
            error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Fetch last week figures
      try {
        const lastWeek = await client.getWeeklyFigures({ week: '-1' });
        apiCallCount++;

        if (lastWeek?.LIST?.ARRAY?.[0]) {
          result.financialPerformance.lastWeek.profit = lastWeek.LIST.ARRAY[0].ThisWeek || 0;
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getWeeklyFigures-lastWeek',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch email count
      try {
        const emailCount = await client.getNewEmailsCount();
        apiCallCount++;
        result.operationalStatus.newEmailsCount = emailCount;
      } catch (error) {
        result.errors.push({
          endpoint: 'getNewEmailsCount',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Check token status
      try {
        const renewed = await client.renewToken();
        apiCallCount++;
        result.operationalStatus.tokenStatus = renewed ? 'Active' : 'Expired';
      } catch (error) {
        result.operationalStatus.tokenStatus = 'Expired';
        result.errors.push({
          endpoint: 'renewToken',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch customer data
      try {
        const customersResponse = await client.getCustomers(50); // Get up to 50 customers
        apiCallCount++;

        if (customersResponse && customersResponse.customers) {
          result.customerData.customers = customersResponse.customers.map((customer: any) => ({
            customerID: customer.customerID || customer.agentID || 'Unknown',
            active: customer.active !== false && customer.status !== 'Suspended',
            balance: parseFloat(customer.balance || customer.currentBalance || '0'),
            creditLimit: parseFloat(customer.creditLimit || '0'),
            lastLogin: customer.lastLogin || customer.lastLoginDate,
            suspendSportsbook: customer.suspendSportsbook === true || customer.suspend === true,
            office: customer.office || result.agentProfile.office,
          }));

          result.customerData.totalCustomers = result.customerData.customers.length;
          result.customerData.activeCustomers = result.customerData.customers.filter(
            c => c.active
          ).length;
          result.customerData.suspendedCustomers = result.customerData.customers.filter(
            c => c.suspendSportsbook
          ).length;
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getCustomers',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch pending wagers
      try {
        const wagersResponse = await client.getLiveWagers();
        apiCallCount++;

        if (wagersResponse && wagersResponse.wagers) {
          result.pendingWagers.wagers = wagersResponse.wagers.map((wager: any) => ({
            ticketNumber: wager.ticketNumber || wager.id || 'N/A',
            customerID: wager.customerID || wager.agentID || 'Unknown',
            wagerAmount: parseFloat(wager.wagerAmount || wager.amount || '0'),
            potentialPayout: parseFloat(wager.potentialPayout || wager.payout || '0'),
            sport: wager.sport || wager.game || 'Unknown',
            gameDescription: wager.gameDescription || wager.description || 'N/A',
            placedAt: wager.placedAt || wager.timestamp || new Date().toISOString(),
            status: wager.status || 'pending',
          }));

          result.pendingWagers.totalPendingWagers = result.pendingWagers.wagers.length;
          result.pendingWagers.totalPendingAmount = result.pendingWagers.wagers.reduce(
            (sum, w) => sum + w.wagerAmount,
            0
          );
          result.pendingWagers.totalPendingPayout = result.pendingWagers.wagers.reduce(
            (sum, w) => sum + w.potentialPayout,
            0
          );
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getLiveWagers',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch recent transactions
      try {
        const transactionsResponse = await client.getTransactions({ limit: 20 });
        apiCallCount++;

        if (transactionsResponse && transactionsResponse.transactions) {
          result.recentTransactions.transactions = transactionsResponse.transactions.map(
            (txn: any) => ({
              transactionID: txn.transactionID || txn.id || 'N/A',
              customerID: txn.customerID || txn.agentID || 'Unknown',
              type: txn.type || (txn.amount > 0 ? 'deposit' : 'withdrawal'),
              amount: Math.abs(parseFloat(txn.amount || '0')),
              description: txn.description || txn.memo || 'Transaction',
              timestamp: txn.timestamp || txn.date || new Date().toISOString(),
              status: txn.status || 'completed',
            })
          );

          result.recentTransactions.totalTransactions =
            result.recentTransactions.transactions.length;
          result.recentTransactions.lastTransactionTime =
            result.recentTransactions.transactions.length > 0
              ? result.recentTransactions.transactions[0].timestamp
              : '';
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getTransactions',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }

      // Fetch web reports configuration
      try {
        const webReportsResponse = await client.getPendingWebReportsConfig();
        apiCallCount++;

        if (webReportsResponse) {
          result.webReportsConfig = {
            success: webReportsResponse.success || false,
            pendingReports: (webReportsResponse.pendingReports || []).map((report: any) => ({
              reportID: report.reportID || report.id || 'N/A',
              reportType: report.reportType || report.type || 'Unknown',
              status: report.status || 'pending',
              requestedAt: report.requestedAt || report.timestamp || new Date().toISOString(),
              estimatedCompletion: report.estimatedCompletion || report.eta,
              parameters: report.parameters || report.params,
            })),
            reportConfigs: (webReportsResponse.reportConfigs || []).map((config: any) => ({
              configID: config.configID || config.id || 'N/A',
              reportName: config.reportName || config.name || 'Unknown Report',
              description: config.description || 'No description available',
              isEnabled: config.isEnabled !== false && config.enabled !== false,
              schedule: config.schedule || config.frequency,
              lastRun: config.lastRun || config.lastExecuted,
            })),
            lastUpdated: webReportsResponse.lastUpdated || new Date().toISOString(),
            error: webReportsResponse.error,
          };
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getPendingWebReportsConfig',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Set error state for web reports config
        result.webReportsConfig.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Fetch new users information (last 7 days)
      try {
        const newUsersResponse = await client.getNewUsers(7);
        apiCallCount++;

        if (newUsersResponse) {
          result.newUsersInfo = {
            success: newUsersResponse.success || false,
            newUsers: (newUsersResponse.newUsers || []).map((user: any) => ({
              userID: user.userID || user.id || user.customerID || 'N/A',
              username: user.username || user.login || user.name || 'Unknown',
              registrationDate:
                user.registrationDate ||
                user.createdAt ||
                user.openDateTime ||
                new Date().toISOString(),
              status:
                user.status ||
                (user.active === false ? 'suspended' : user.active === true ? 'active' : 'pending'),
              initialDeposit: parseFloat(
                user.initialDeposit || user.firstDeposit || user.deposit || '0'
              ),
              referredBy: user.referredBy || user.referrer || user.agentID,
              office: user.office || result.agentProfile.office,
            })),
            totalCount: newUsersResponse.totalCount || 0,
            period: newUsersResponse.period || '7 days',
            lastUpdated: newUsersResponse.lastUpdated || new Date().toISOString(),
            error: newUsersResponse.error,
          };
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getNewUsers',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Set error state for new users info
        result.newUsersInfo.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Fetch teaser profile configuration
      try {
        const teaserResponse = await client.getTeaserProfile();
        apiCallCount++;

        if (teaserResponse) {
          result.teaserProfile = {
            success: teaserResponse.success || false,
            enabled: teaserResponse.enabled || false,
            profile: {
              profileID:
                teaserResponse.teaserProfile?.profileID ||
                teaserResponse.teaserProfile?.id ||
                'N/A',
              profileName:
                teaserResponse.teaserProfile?.profileName ||
                teaserResponse.teaserProfile?.name ||
                'Default',
              description:
                teaserResponse.teaserProfile?.description || 'Teaser betting profile configuration',
              sports: teaserResponse.teaserProfile?.sports || [],
              pointSpreads: (teaserResponse.teaserProfile?.pointSpreads || []).map(
                (spread: any) => ({
                  sport: spread.sport || spread.game || 'Unknown',
                  points: parseFloat(spread.points || spread.line || '0'),
                  odds: parseFloat(spread.odds || spread.payout || '0'),
                  enabled: spread.enabled !== false && spread.active !== false,
                })
              ),
              totalLimits: (
                teaserResponse.teaserProfile?.limits ||
                teaserResponse.limits ||
                []
              ).map((limit: any) => ({
                sport: limit.sport || limit.game || 'Unknown',
                minBet: parseFloat(limit.minBet || limit.minimum || '0'),
                maxBet: parseFloat(limit.maxBet || limit.maximum || '0'),
                maxPayout: parseFloat(limit.maxPayout || limit.payout || '0'),
              })),
              configuration:
                teaserResponse.teaserProfile?.configuration || teaserResponse.data || {},
            },
            settings: {
              allowTeasers:
                teaserResponse.settings?.allowTeasers !== false &&
                teaserResponse.settings?.enabled !== false,
              maxTeams: parseInt(
                teaserResponse.settings?.maxTeams || teaserResponse.settings?.maximumTeams || '0'
              ),
              minTeams: parseInt(
                teaserResponse.settings?.minTeams || teaserResponse.settings?.minimumTeams || '2'
              ),
              allowTies:
                teaserResponse.settings?.allowTies !== false &&
                teaserResponse.settings?.ties !== false,
              pushAction:
                teaserResponse.settings?.pushAction || teaserResponse.settings?.push || 'loss',
            },
            lastUpdated: teaserResponse.lastUpdated || new Date().toISOString(),
            error: teaserResponse.error,
          };
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getTeaserProfile',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Set error state for teaser profile
        result.teaserProfile.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Fetch comprehensive customer list
      try {
        const customerListResponse = await client.getListAgenstByAgent();
        apiCallCount++;

        if (customerListResponse && customerListResponse.success) {
          result.customerList = {
            success: true,
            customers: customerListResponse.customers || [],
            totalCount: customerListResponse.totalCount || 0,
            lastUpdated: customerListResponse.lastUpdated || new Date().toISOString(),
            error: customerListResponse.error,
          };
        } else {
          result.customerList.error = customerListResponse?.error || 'Failed to load customer list';
        }
      } catch (error) {
        result.errors.push({
          endpoint: 'getListAgenstByAgent',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });

        // Set error state for customer list
        result.customerList.error = error instanceof Error ? error.message : 'Unknown error';
      }

      // Log activity
      try {
        await client.writeLog(`Dashboard access - ${new Date().toISOString()}`);
        apiCallCount++;
        result.operationalStatus.lastActivityTimestamp = new Date().toISOString();
      } catch (error) {
        result.errors.push({
          endpoint: 'writeLog',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      result.errors.push({
        endpoint: 'client-initialization',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    }

    // Update metadata
    result.metadata = {
      fetchedAt: new Date().toISOString(),
      cacheExpiry: Date.now() + AgentDashboardService.CACHE_DURATION,
      apiCallCount,
    };

    // Cache the result
    AgentDashboardService.cache.set(cacheKey, {
      data: result,
      expires: Date.now() + AgentDashboardService.CACHE_DURATION,
    });

    const fetchTime = Date.now() - startTime;

    return result;
  }

  /**
   * Clear cache for specific agent or all agents
   */
  static clearCache(username?: string): void {
    if (username) {
      const cacheKey = `agent-dashboard:${username}`;
      AgentDashboardService.cache.delete(cacheKey);
    } else {
      AgentDashboardService.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of AgentDashboardService.cache.entries()) {
      if (now < entry.expires) {
        activeEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      totalEntries: AgentDashboardService.cache.size,
      activeEntries,
      expiredEntries,
      cacheHitRate: activeEntries / Math.max(AgentDashboardService.cache.size, 1),
    };
  }
}
