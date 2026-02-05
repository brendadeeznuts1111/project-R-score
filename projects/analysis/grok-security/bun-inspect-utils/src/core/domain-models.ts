/**
 * [ENFORCEMENT][DOMAIN][MODELS][META:{VERSION:1.0.0}][#REF:suggestions,patterns]{BUN-NATIVE}
 * Domain-specific column patterns for intelligent suggestions
 */

/**
 * Domain-specific column patterns
 */
export interface DomainModel {
  name: string;
  displayName: string;
  columns: string[];
  keywords: string[];
}

export const DOMAIN_MODELS: DomainModel[] = [
  {
    name: "user-management",
    displayName: "User Management",
    columns: [
      "name",
      "email",
      "role",
      "department",
      "status",
      "lastLogin",
      "manager",
      "location",
      "phone",
      "hireDate",
      "permissions",
      "avatar",
      "timezone",
    ],
    keywords: [
      "user",
      "users",
      "employee",
      "employee",
      "member",
      "profile",
      "account",
      "auth",
    ],
  },
  {
    name: "e-commerce",
    displayName: "E-Commerce",
    columns: [
      "productName",
      "sku",
      "category",
      "price",
      "stock",
      "supplier",
      "brand",
      "description",
      "rating",
      "reviews",
      "dimensions",
      "weight",
      "images",
      "variants",
    ],
    keywords: [
      "product",
      "products",
      "inventory",
      "catalog",
      "item",
      "items",
      "merchandise",
      "sale",
    ],
  },
  {
    name: "analytics",
    displayName: "Analytics",
    columns: [
      "metric",
      "value",
      "period",
      "category",
      "source",
      "trend",
      "benchmark",
      "target",
      "actual",
      "variance",
      "insight",
      "segment",
      "cohort",
    ],
    keywords: [
      "analytics",
      "metrics",
      "kpi",
      "dashboard",
      "report",
      "statistics",
      "data",
      "insights",
    ],
  },
  {
    name: "crm",
    displayName: "CRM",
    columns: [
      "company",
      "contact",
      "email",
      "phone",
      "stage",
      "value",
      "lastContact",
      "nextAction",
      "owner",
      "source",
      "priority",
      "industry",
      "employees",
      "revenue",
    ],
    keywords: [
      "customer",
      "customers",
      "lead",
      "leads",
      "opportunity",
      "deal",
      "deals",
      "pipeline",
      "crm",
    ],
  },
  {
    name: "content",
    displayName: "Content Management",
    columns: [
      "title",
      "slug",
      "author",
      "status",
      "publishedAt",
      "updatedAt",
      "category",
      "tags",
      "excerpt",
      "content",
      "featuredImage",
      "views",
      "seoTitle",
      "seoDescription",
    ],
    keywords: [
      "article",
      "articles",
      "post",
      "posts",
      "page",
      "pages",
      "content",
      "blog",
      "news",
    ],
  },
  {
    name: "orders",
    displayName: "Order Management",
    columns: [
      "orderId",
      "customer",
      "items",
      "total",
      "status",
      "date",
      "payment",
      "shipping",
      "billing",
      "discount",
      "tax",
      "tracking",
      "notes",
    ],
    keywords: [
      "order",
      "orders",
      "transaction",
      "transactions",
      "purchase",
      "purchases",
      "checkout",
    ],
  },
  {
    name: "tasks",
    displayName: "Task Management",
    columns: [
      "title",
      "description",
      "status",
      "priority",
      "assignee",
      "dueDate",
      "createdAt",
      "updatedAt",
      "project",
      "tags",
      "comments",
      "attachments",
      "estimatedHours",
      "actualHours",
    ],
    keywords: [
      "task",
      "tasks",
      "todo",
      "tickets",
      "issue",
      "issues",
      "project",
      "sprint",
    ],
  },
  {
    name: "finance",
    displayName: "Finance",
    columns: [
      "account",
      "amount",
      "type",
      "category",
      "description",
      "date",
      "status",
      "reference",
      "balance",
      "currency",
      "exchangeRate",
      "taxAmount",
    ],
    keywords: [
      "invoice",
      "invoices",
      "payment",
      "payments",
      "expense",
      "expenses",
      "budget",
      "transaction",
    ],
  },
];

/**
 * Generic columns that don't count toward meaningful column count
 * Note: All entries are lowercase for case-insensitive comparison
 */
export const GENERIC_COLUMNS = [
  "id",
  "index",
  "timestamp",
  "createdat",
  "created_at",
  "updatedat",
  "updated_at",
  "uuid",
  "guid",
  "_id",
  "pk",
  "primarykey",
  "deletedat",
  "deleted_at",
  "version",
];

/**
 * Sensitive patterns to exclude from suggestions
 */
export const SENSITIVE_PATTERNS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "apikey",
  "auth",
  "credential",
  "private",
  "key",
  "signature",
  "cardNumber",
  "cvv",
  "ssn",
];

/**
 * Detect domain from file path or context
 */
export function detectDomain(
  filePath: string,
  functionContext?: string
): string {
  const searchText = `${filePath} ${functionContext ?? ""}`.toLowerCase();

  let bestMatch: DomainModel | null = null;
  let highestScore = 0;

  for (const model of DOMAIN_MODELS) {
    let score = 0;

    // Check keywords in file path
    for (const keyword of model.keywords) {
      if (searchText.includes(keyword)) {
        score += 2;
      }
    }

    // Bonus for exact domain name match
    if (searchText.includes(model.name)) {
      score += 5;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = model;
    }
  }

  return bestMatch?.name ?? "general";
}

/**
 * Get columns for a specific domain
 */
export function getDomainColumns(domain: string): string[] {
  const model = DOMAIN_MODELS.find((m) => m.name === domain);
  return model?.columns ?? [];
}

/**
 * Check if column is generic
 */
export function isGenericColumn(column: string): boolean {
  return GENERIC_COLUMNS.includes(column.toLowerCase());
}

/**
 * Check if column matches sensitive pattern
 */
export function isSensitiveColumn(column: string): boolean {
  const lower = column.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}
