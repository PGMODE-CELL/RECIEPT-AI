import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  decimal,
  int,
  json,
  date,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

// ─── Users ──────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

// ─── Company Profile ────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  legalName: varchar("legalName", { length: 255 }),
  taxId: varchar("taxId", { length: 100 }),
  registrationNumber: varchar("registrationNumber", { length: 100 }),
  industry: varchar("industry", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  website: varchar("website", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postalCode", { length: 20 }),
  fiscalYearStart: date("fiscalYearStart"),
  baseCurrency: varchar("baseCurrency", { length: 3 }).default("USD").notNull(),
  logo: text("logo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt:timestamp("updatedAt").defaultNow().notNull(),
});

// ─── Chart of Accounts ──────────────────────────────────────────
export const accounts = mysqlTable(
  "accounts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", [
      "asset",
      "liability",
      "equity",
      "income",
      "expense",
    ]).notNull(),
    subType: varchar("subType", { length: 100 }),
    parentId: bigint("parentId", { mode: "number", unsigned: true }),
    isBankAccount: boolean("isBankAccount").default(false),
    bankName: varchar("bankName", { length: 255 }),
    bankAccountNumber: varchar("bankAccountNumber", { length: 100 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    openingBalance: decimal("openingBalance", { precision: 15, scale: 2 }).default("0.00"),
    currentBalance: decimal("currentBalance", { precision: 15, scale: 2 }).default("0.00"),
    isActive: boolean("isActive").default(true),
    description: text("description"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_account_user").on(table.userId)]
);

// ─── Contacts (Customers, Vendors, Employees) ───────────────────
export const contacts = mysqlTable(
  "contacts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["customer", "vendor", "employee", "both"]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    companyName: varchar("companyName", { length: 255 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 50 }),
    taxId: varchar("taxId", { length: 100 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 100 }),
    country: varchar("country", { length: 100 }),
    postalCode: varchar("postalCode", { length: 20 }),
    paymentTerms: int("paymentTerms").default(30),
    currency: varchar("currency", { length: 3 }).default("USD"),
    creditLimit: decimal("creditLimit", { precision: 15, scale: 2 }).default("0.00"),
    balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
    isActive: boolean("isActive").default(true),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_contact_user").on(table.userId)]
);

// ─── Products / Services ────────────────────────────────────────
export const products = mysqlTable(
  "products",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    sku: varchar("sku", { length: 100 }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    type: mysqlEnum("type", ["product", "service"]).default("product").notNull(),
    category: varchar("category", { length: 100 }),
    unit: varchar("unit", { length: 50 }).default("pcs"),
    costPrice: decimal("costPrice", { precision: 15, scale: 2 }).default("0.00"),
    salePrice: decimal("salePrice", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    quantityOnHand: decimal("quantityOnHand", { precision: 15, scale: 2 }).default("0.00"),
    reorderLevel: decimal("reorderLevel", { precision: 15, scale: 2 }).default("0.00"),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_product_user").on(table.userId)]
);

// ─── Tax Rates ──────────────────────────────────────────────────
export const taxRates = mysqlTable("taxRates", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  type: mysqlEnum("type", ["vat", "gst", "sales_tax", "withholding", "custom"]).notNull(),
  country: varchar("country", { length: 100 }),
  region: varchar("region", { length: 100 }),
  isCompound: boolean("isCompound").default(false),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─── Invoices ───────────────────────────────────────────────────
export const invoices = mysqlTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    invoiceNumber: varchar("invoiceNumber", { length: 100 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    issueDate: date("issueDate").notNull(),
    dueDate: date("dueDate").notNull(),
    status: mysqlEnum("status", ["draft", "sent", "viewed", "paid", "partial", "overdue", "cancelled"])
      .default("draft")
      .notNull(),
    subTotal: decimal("subTotal", { precision: 15, scale: 2 }).default("0.00"),
    taxTotal: decimal("taxTotal", { precision: 15, scale: 2 }).default("0.00"),
    discountTotal: decimal("discountTotal", { precision: 15, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
    amountPaid: decimal("amountPaid", { precision: 15, scale: 2 }).default("0.00"),
    amountDue: decimal("amountDue", { precision: 15, scale: 2 }).default("0.00"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    notes: text("notes"),
    terms: text("terms"),
    footer: text("footer"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_invoice_user").on(table.userId),
    index("idx_invoice_contact").on(table.contactId),
    index("idx_invoice_status").on(table.status),
  ]
);

// ─── Invoice Line Items ─────────────────────────────────────────
export const invoiceItems = mysqlTable(
  "invoiceItems",
  {
    id: serial("id").primaryKey(),
    invoiceId: bigint("invoiceId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).default("0.00"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0.00"),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  },
  (table) => [index("idx_ii_invoice").on(table.invoiceId)]
);

// ─── Bills ──────────────────────────────────────────────────────
export const bills = mysqlTable(
  "bills",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    billNumber: varchar("billNumber", { length: 100 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    billDate: date("billDate").notNull(),
    dueDate: date("dueDate").notNull(),
    status: mysqlEnum("status", ["draft", "received", "approved", "partial", "paid", "overdue", "cancelled"])
      .default("draft")
      .notNull(),
    subTotal: decimal("subTotal", { precision: 15, scale: 2 }).default("0.00"),
    taxTotal: decimal("taxTotal", { precision: 15, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
    amountPaid: decimal("amountPaid", { precision: 15, scale: 2 }).default("0.00"),
    amountDue: decimal("amountDue", { precision: 15, scale: 2 }).default("0.00"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_bill_user").on(table.userId),
    index("idx_bill_status").on(table.status),
  ]
);

// ─── Bill Line Items ────────────────────────────────────────────
export const billItems = mysqlTable(
  "billItems",
  {
    id: serial("id").primaryKey(),
    billId: bigint("billId", { mode: "number", unsigned: true }).notNull(),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  },
  (table) => [index("idx_bi_bill").on(table.billId)]
);

// ─── Journal Entries ────────────────────────────────────────────
export const journalEntries = mysqlTable(
  "journalEntries",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    entryNumber: varchar("entryNumber", { length: 100 }).notNull(),
    date: date("date").notNull(),
    reference: varchar("reference", { length: 255 }),
    description: text("description").notNull(),
    isReversing: boolean("isReversing").default(false),
    reversingEntryId: bigint("reversingEntryId", { mode: "number", unsigned: true }),
    isPosted: boolean("isPosted").default(false),
    totalDebits: decimal("totalDebits", { precision: 15, scale: 2 }).default("0.00"),
    totalCredits: decimal("totalCredits", { precision: 15, scale: 2 }).default("0.00"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_je_user").on(table.userId)]
);

// ─── Journal Entry Lines ────────────────────────────────────────
export const journalEntryLines = mysqlTable(
  "journalEntryLines",
  {
    id: serial("id").primaryKey(),
    journalEntryId: bigint("journalEntryId", { mode: "number", unsigned: true }).notNull(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    description: text("description"),
    debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
    credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
    contactId: bigint("contactId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_jl_entry").on(table.journalEntryId),
    index("idx_jl_account").on(table.accountId),
  ]
);

// ─── Transactions ───────────────────────────────────────────────
export const transactions = mysqlTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    date: date("date").notNull(),
    description: text("description").notNull(),
    type: mysqlEnum("type", [
      "income",
      "expense",
      "transfer",
      "invoice_payment",
      "bill_payment",
      "journal",
      "adjustment",
      "deposit",
      "withdrawal",
    ]).notNull(),
    reference: varchar("reference", { length: 255 }),
    debit: decimal("debit", { precision: 15, scale: 2 }).default("0.00"),
    credit: decimal("credit", { precision: 15, scale: 2 }).default("0.00"),
    runningBalance: decimal("runningBalance", { precision: 15, scale: 2 }).default("0.00"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    sourceType: mysqlEnum("sourceType", ["invoice", "bill", "journal", "manual", "bank", "receipt"]),
    sourceId: bigint("sourceId", { mode: "number", unsigned: true }),
    contactId: bigint("contactId", { mode: "number", unsigned: true }),
    isReconciled: boolean("isReconciled").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("idx_txn_user").on(table.userId),
    index("idx_txn_account").on(table.accountId),
    index("idx_txn_date").on(table.date),
  ]
);

// ─── Receipts ───────────────────────────────────────────────────
export const receipts = mysqlTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    ocrText: text("ocrText"),
    vendorName: varchar("vendorName", { length: 255 }),
    vendorAddress: text("vendorAddress"),
    receiptDate: date("receiptDate"),
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("USD"),
    category: varchar("category", { length: 100 }),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    items: json("items"),
    status: mysqlEnum("status", ["pending", "processed", "error"]).default("pending"),
    processedToBill: boolean("processedToBill").default(false),
    billId: bigint("billId", { mode: "number", unsigned: true }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_receipt_user").on(table.userId)]
);

// ─── Projects ───────────────────────────────────────────────────
export const projects = mysqlTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["active", "completed", "on_hold", "cancelled"]).default("active").notNull(),
    startDate: date("startDate"),
    endDate: date("endDate"),
    budget: decimal("budget", { precision: 15, scale: 2 }).default("0.00"),
    actualCost: decimal("actualCost", { precision: 15, scale: 2 }).default("0.00"),
    contactId: bigint("contactId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_project_user").on(table.userId)]
);

// ─── Tasks ──────────────────────────────────────────────────────
export const tasks = mysqlTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    projectId: bigint("projectId", { mode: "number", unsigned: true }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["todo", "in_progress", "review", "done"]).default("todo").notNull(),
    priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
    dueDate: date("dueDate"),
    estimatedHours: decimal("estimatedHours", { precision: 8, scale: 2 }),
    actualHours: decimal("actualHours", { precision: 8, scale: 2 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_task_user").on(table.userId)]
);

// ─── Employees ──────────────────────────────────────────────────
export const employees = mysqlTable(
  "employees",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    employeeCode: varchar("employeeCode", { length: 50 }).notNull(),
    firstName: varchar("firstName", { length: 100 }).notNull(),
    lastName: varchar("lastName", { length: 100 }).notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 50 }),
    hireDate: date("hireDate"),
    department: varchar("department", { length: 100 }),
    designation: varchar("designation", { length: 100 }),
    salary: decimal("salary", { precision: 15, scale: 2 }).default("0.00"),
    payFrequency: mysqlEnum("payFrequency", ["weekly", "biweekly", "monthly", "quarterly"]).default("monthly"),
    status: mysqlEnum("status", ["active", "inactive", "terminated", "on_leave"]).default("active"),
    bankName: varchar("bankName", { length: 255 }),
    bankAccount: varchar("bankAccount", { length: 100 }),
    taxCode: varchar("taxCode", { length: 50 }),
    address: text("address"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_employee_user").on(table.userId)]
);

// ─── Payroll Runs ───────────────────────────────────────────────
export const payrollRuns = mysqlTable(
  "payrollRuns",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    periodStart: date("periodStart").notNull(),
    periodEnd: date("periodEnd").notNull(),
    payDate: date("payDate").notNull(),
    status: mysqlEnum("status", ["draft", "processing", "completed"]).default("draft"),
    totalGross: decimal("totalGross", { precision: 15, scale: 2 }).default("0.00"),
    totalTax: decimal("totalTax", { precision: 15, scale: 2 }).default("0.00"),
    totalDeductions: decimal("totalDeductions", { precision: 15, scale: 2 }).default("0.00"),
    totalNet: decimal("totalNet", { precision: 15, scale: 2 }).default("0.00"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_pr_user").on(table.userId)]
);

// ─── Payslips ───────────────────────────────────────────────────
export const payslips = mysqlTable(
  "payslips",
  {
    id: serial("id").primaryKey(),
    payrollRunId: bigint("payrollRunId", { mode: "number", unsigned: true }).notNull(),
    employeeId: bigint("employeeId", { mode: "number", unsigned: true }).notNull(),
    grossPay: decimal("grossPay", { precision: 15, scale: 2 }).default("0.00"),
    taxDeduction: decimal("taxDeduction", { precision: 15, scale: 2 }).default("0.00"),
    otherDeductions: decimal("otherDeductions", { precision: 15, scale: 2 }).default("0.00"),
    netPay: decimal("netPay", { precision: 15, scale: 2 }).default("0.00"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_ps_run").on(table.payrollRunId)]
);

// ─── Documents ──────────────────────────────────────────────────
export const documents = mysqlTable(
  "documents",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    fileUrl: text("fileUrl").notNull(),
    fileType: varchar("fileType", { length: 50 }),
    fileSize: int("fileSize"),
    category: varchar("category", { length: 100 }),
    tags: json("tags"),
    description: text("description"),
    relatedType: mysqlEnum("relatedType", ["invoice", "bill", "contact", "receipt", "employee", "project", "general"]),
    relatedId: bigint("relatedId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_doc_user").on(table.userId)]
);

// ─── Currencies ─────────────────────────────────────────────────
export const currencies = mysqlTable("currencies", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 3 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  symbol: varchar("symbol", { length: 10 }),
  exchangeRate: decimal("exchangeRate", { precision: 15, scale: 6 }).default("1.000000"),
  isActive: boolean("isActive").default(true),
});

// ─── Audit Log ──────────────────────────────────────────────────
export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: bigint("entityId", { mode: "number", unsigned: true }),
    oldValues: json("oldValues"),
    newValues: json("newValues"),
    ipAddress: varchar("ipAddress", { length: 50 }),
    userAgent: text("userAgent"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_audit_user").on(table.userId)]
);

// ─── Budgets ───────────────────────────────────────────────────
export const budgets = mysqlTable(
  "budgets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    period: mysqlEnum("period", ["monthly", "quarterly", "yearly"]).default("monthly").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00").notNull(),
    spent: decimal("spent", { precision: 15, scale: 2 }).default("0.00").notNull(),
    startDate: date("startDate").notNull(),
    endDate: date("endDate").notNull(),
    isActive: boolean("isActive").default(true),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_budget_user").on(table.userId)]
);

// ─── Fixed Assets ──────────────────────────────────────────────
export const fixedAssets = mysqlTable(
  "fixedAssets",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    assetCode: varchar("assetCode", { length: 50 }).notNull(),
    categoryId: bigint("categoryId", { mode: "number", unsigned: true }),
    purchaseDate: date("purchaseDate").notNull(),
    purchasePrice: decimal("purchasePrice", { precision: 15, scale: 2 }).notNull(),
    salvageValue: decimal("salvageValue", { precision: 15, scale: 2 }).default("0.00"),
    usefulLife: int("usefulLife").notNull(), // in months
    depreciationMethod: mysqlEnum("depreciationMethod", ["straight_line", "declining_balance", "double_declining"]).default("straight_line").notNull(),
    accumulatedDepreciation: decimal("accumulatedDepreciation", { precision: 15, scale: 2 }).default("0.00"),
    currentValue: decimal("currentValue", { precision: 15, scale: 2 }).notNull(),
    location: varchar("location", { length: 255 }),
    status: mysqlEnum("status", ["active", "fully_depreciated", "sold", "disposed"]).default("active").notNull(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }),
    depreciationAccountId: bigint("depreciationAccountId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_asset_user").on(table.userId)]
);

// ─── Recurring Templates ──────────────────────────────────────
export const recurringTemplates = mysqlTable(
  "recurringTemplates",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["invoice", "bill"]).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    frequency: mysqlEnum("frequency", ["weekly", "biweekly", "monthly", "quarterly", "yearly"]).default("monthly").notNull(),
    nextDate: date("nextDate").notNull(),
    endDate: date("endDate"),
    totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).default("0.00"),
    status: mysqlEnum("status", ["active", "paused", "completed"]).default("active").notNull(),
    lastGenerated: date("lastGenerated"),
    templateData: json("templateData"), // stores line items etc
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_recurring_user").on(table.userId)]
);

// ─── Bank Reconciliation ──────────────────────────────────────
export const bankReconciliations = mysqlTable(
  "bankReconciliations",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    accountId: bigint("accountId", { mode: "number", unsigned: true }).notNull(),
    statementDate: date("statementDate").notNull(),
    statementBalance: decimal("statementBalance", { precision: 15, scale: 2 }).notNull(),
    endingBalance: decimal("endingBalance", { precision: 15, scale: 2 }).notNull(),
    status: mysqlEnum("status", ["draft", "reconciled", "void"]).default("draft").notNull(),
    notes: text("notes"),
    reconciledAt: timestamp("reconciledAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_recon_user").on(table.userId)]
);

// ─── Approval Workflows ───────────────────────────────────────
export const approvals = mysqlTable(
  "approvals",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    entityId: bigint("entityId", { mode: "number", unsigned: true }).notNull(),
    status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
    requestedBy: bigint("requestedBy", { mode: "number", unsigned: true }).notNull(),
    approvedBy: bigint("approvedBy", { mode: "number", unsigned: true }),
    comments: text("comments"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_approval_user").on(table.userId)]
);

// ─── Custom Fields ────────────────────────────────────────────
export const customFields = mysqlTable(
  "customFields",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    entityType: varchar("entityType", { length: 100 }).notNull(),
    fieldName: varchar("fieldName", { length: 100 }).notNull(),
    fieldType: varchar("fieldType", { length: 50 }).default("text").notNull(),
    isRequired: boolean("isRequired").default(false),
    options: json("options"), // for dropdown/radio
    defaultValue: varchar("defaultValue", { length: 255 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_cf_user").on(table.userId)]
);

// ─── Stock Movements ──────────────────────────────────────────
export const stockMovements = mysqlTable(
  "stockMovements",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
    type: mysqlEnum("type", ["purchase", "sale", "adjustment", "transfer", "return"]).notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).notNull(),
    unitCost: decimal("unitCost", { precision: 15, scale: 2 }),
    reference: varchar("reference", { length: 255 }),
    sourceType: varchar("sourceType", { length: 50 }),
    sourceId: bigint("sourceId", { mode: "number", unsigned: true }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_stock_user").on(table.userId)]
);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Product = typeof products.$inferSelect;
export type TaxRate = typeof taxRates.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Currency = typeof currencies.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type FixedAsset = typeof fixedAssets.$inferSelect;
export type RecurringTemplate = typeof recurringTemplates.$inferSelect;
export type BankReconciliation = typeof bankReconciliations.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type CustomField = typeof customFields.$inferSelect;
export type StockMovement = typeof stockMovements.$inferSelect;
export type CreditNote = typeof creditNotes.$inferSelect;
export type CreditNoteItem = typeof creditNoteItems.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type Quotation = typeof quotations.$inferSelect;
export type QuotationItem = typeof quotationItems.$inferSelect;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type ExpenseClaim = typeof expenseClaims.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type CrmLead = typeof crmLeads.$inferSelect;
export type CrmActivity = typeof crmActivities.$inferSelect;
export type BillOfMaterial = typeof billOfMaterials.$inferSelect;
export type BomItem = typeof bomItems.$inferSelect;
export type WorkOrder = typeof workOrders.$inferSelect;
export type CostCenter = typeof costCenters.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// ─── Credit Notes ─────────────────────────────────────────────
export const creditNotes = mysqlTable(
  "creditNotes",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    creditNoteNumber: varchar("creditNoteNumber", { length: 100 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    invoiceId: bigint("invoiceId", { mode: "number", unsigned: true }),
    issueDate: date("issueDate").notNull(),
    status: mysqlEnum("status", ["draft", "issued", "applied", "cancelled"]).default("draft").notNull(),
    subTotal: decimal("subTotal", { precision: 15, scale: 2 }).default("0.00"),
    taxTotal: decimal("taxTotal", { precision: 15, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
    amountApplied: decimal("amountApplied", { precision: 15, scale: 2 }).default("0.00"),
    reason: text("reason"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_cn_user").on(table.userId)]
);

// ─── Credit Note Items ────────────────────────────────────────
export const creditNoteItems = mysqlTable(
  "creditNoteItems",
  {
    id: serial("id").primaryKey(),
    creditNoteId: bigint("creditNoteId", { mode: "number", unsigned: true }).notNull(),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  },
  (table) => [index("idx_cni_cn").on(table.creditNoteId)]
);

// ─── Purchase Orders ──────────────────────────────────────────
export const purchaseOrders = mysqlTable(
  "purchaseOrders",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    orderNumber: varchar("orderNumber", { length: 100 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    orderDate: date("orderDate").notNull(),
    expectedDate: date("expectedDate"),
    status: mysqlEnum("status", ["draft", "sent", "confirmed", "received", "cancelled"]).default("draft").notNull(),
    subTotal: decimal("subTotal", { precision: 15, scale: 2 }).default("0.00"),
    taxTotal: decimal("taxTotal", { precision: 15, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
    notes: text("notes"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("idx_po_user").on(table.userId)]
);

// ─── Purchase Order Items ─────────────────────────────────────
export const purchaseOrderItems = mysqlTable(
  "purchaseOrderItems",
  {
    id: serial("id").primaryKey(),
    purchaseOrderId: bigint("purchaseOrderId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  },
  (table) => [index("idx_poi_po").on(table.purchaseOrderId)]
);

// ─── Quotations ───────────────────────────────────────────────
export const quotations = mysqlTable(
  "quotations",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    quoteNumber: varchar("quoteNumber", { length: 100 }).notNull(),
    contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
    quoteDate: date("quoteDate").notNull(),
    validUntil: date("validUntil"),
    status: mysqlEnum("status", ["draft", "sent", "accepted", "rejected", "expired", "converted"]).default("draft").notNull(),
    subTotal: decimal("subTotal", { precision: 15, scale: 2 }).default("0.00"),
    taxTotal: decimal("taxTotal", { precision: 15, scale: 2 }).default("0.00"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0.00"),
    notes: text("notes"),
    terms: text("terms"),
    currency: varchar("currency", { length: 3 }).default("USD"),
    convertedInvoiceId: bigint("convertedInvoiceId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_quote_user").on(table.userId)]
);

// ─── Quotation Items ──────────────────────────────────────────
export const quotationItems = mysqlTable(
  "quotationItems",
  {
    id: serial("id").primaryKey(),
    quotationId: bigint("quotationId", { mode: "number", unsigned: true }).notNull(),
    productId: bigint("productId", { mode: "number", unsigned: true }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).default("0.00"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0.00"),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00"),
    taxAmount: decimal("taxAmount", { precision: 15, scale: 2 }).default("0.00"),
    amount: decimal("amount", { precision: 15, scale: 2 }).default("0.00"),
  },
  (table) => [index("idx_qi_quote").on(table.quotationId)]
);

// ─── Time Entries ─────────────────────────────────────────────
export const timeEntries = mysqlTable(
  "timeEntries",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    projectId: bigint("projectId", { mode: "number", unsigned: true }),
    taskId: bigint("taskId", { mode: "number", unsigned: true }),
    contactId: bigint("contactId", { mode: "number", unsigned: true }),
    description: text("description"),
    date: date("date").notNull(),
    startTime: varchar("startTime", { length: 10 }),
    endTime: varchar("endTime", { length: 10 }),
    hours: decimal("hours", { precision: 8, scale: 2 }).notNull(),
    rate: decimal("rate", { precision: 15, scale: 2 }).default("0.00"),
    isBillable: boolean("isBillable").default(true),
    isBilled: boolean("isBilled").default(false),
    invoiceId: bigint("invoiceId", { mode: "number", unsigned: true }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_time_user").on(table.userId)]
);

// ─── Expense Claims ───────────────────────────────────────────
export const expenseClaims = mysqlTable(
  "expenseClaims",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    employeeId: bigint("employeeId", { mode: "number", unsigned: true }),
    claimNumber: varchar("claimNumber", { length: 100 }).notNull(),
    date: date("date").notNull(),
    category: varchar("category", { length: 100 }),
    description: text("description"),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("USD"),
    status: mysqlEnum("status", ["draft", "submitted", "approved", "rejected", "paid"]).default("draft").notNull(),
    receiptUrl: text("receiptUrl"),
    approvedBy: bigint("approvedBy", { mode: "number", unsigned: true }),
    approvedAt: timestamp("approvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_expense_user").on(table.userId)]
);

// ─── Notifications ────────────────────────────────────────────
export const notifications = mysqlTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    entityType: varchar("entityType", { length: 100 }),
    entityId: bigint("entityId", { mode: "number", unsigned: true }),
    isRead: boolean("isRead").default(false),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("idx_notif_user").on(table.userId)]
);

// ─── CRM Leads ────────────────────────────────────────────────
export const crmLeads = mysqlTable("crmLeads", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  source: varchar("source", { length: 100 }),
  status: mysqlEnum("status", ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]).default("new").notNull(),
  value: decimal("value", { precision: 15, scale: 2 }).default("0.00"),
  assignee: varchar("assignee", { length: 255 }),
  notes: text("notes"),
  expectedCloseDate: date("expectedCloseDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("idx_lead_user").on(table.userId)]);

// ─── CRM Activities ───────────────────────────────────────────
export const crmActivities = mysqlTable("crmActivities", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  leadId: bigint("leadId", { mode: "number", unsigned: true }),
  type: mysqlEnum("type", ["call", "email", "meeting", "task", "note"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: date("dueDate"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_act_user").on(table.userId)]);

// ─── Manufacturing - Bill of Materials ────────────────────────
export const billOfMaterials = mysqlTable("billOfMaterials", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
  status: mysqlEnum("status", ["draft", "active", "obsolete"]).default("draft").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_bom_user").on(table.userId)]);

// ─── Manufacturing - BOM Items ────────────────────────────────
export const bomItems = mysqlTable("bomItems", {
  id: serial("id").primaryKey(),
  bomId: bigint("bomId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }).default("0.00"),
}, (table) => [index("idx_bomi_bom").on(table.bomId)]);

// ─── Manufacturing - Work Orders ──────────────────────────────
export const workOrders = mysqlTable("workOrders", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  orderNumber: varchar("orderNumber", { length: 100 }).notNull(),
  bomId: bigint("bomId", { mode: "number", unsigned: true }).notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).default("1.00"),
  status: mysqlEnum("status", ["draft", "planned", "in_progress", "completed", "cancelled"]).default("draft").notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }).default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_wo_user").on(table.userId)]);

// ─── Cost Centers ─────────────────────────────────────────────
export const costCenters = mysqlTable("costCenters", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: bigint("parentId", { mode: "number", unsigned: true }),
  budget: decimal("budget", { precision: 15, scale: 2 }).default("0.00"),
  spent: decimal("spent", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_cc_user").on(table.userId)]);

// ─── Email Templates ──────────────────────────────────────────
export const emailTemplates = mysqlTable("emailTemplates", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_et_user").on(table.userId)]);

// ─── Multi-Company ─────────────────────────────────────────────
export const companyEntities = mysqlTable("companyEntities", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  parentId: bigint("parentId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_ce_user").on(table.userId)]);

// ─── Period Close ──────────────────────────────────────────────
export const periodCloses = mysqlTable("periodCloses", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  periodStart: date("periodStart").notNull(),
  periodEnd: date("periodEnd").notNull(),
  status: mysqlEnum("status", ["open", "closed", "reopened"]).default("open").notNull(),
  closedBy: bigint("closedBy", { mode: "number", unsigned: true }),
  closedAt: timestamp("closedAt"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_pc_user").on(table.userId)]);

// ─── Revenue Recognition ──────────────────────────────────────
export const revenueSchedules = mysqlTable("revenueSchedules", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  invoiceId: bigint("invoiceId", { mode: "number", unsigned: true }),
  contactId: bigint("contactId", { mode: "number", unsigned: true }).notNull(),
  totalAmount: decimal("totalAmount", { precision: 15, scale: 2 }).notNull(),
  recognized: decimal("recognized", { precision: 15, scale: 2 }).default("0.00"),
  method: mysqlEnum("method", ["straight_line", "percentage_completion", "milestone", "custom"]).default("straight_line").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["active", "completed", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_rs_user").on(table.userId)]);

// ─── Lease Accounting ──────────────────────────────────────────
export const leases = mysqlTable("leases", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactId: bigint("contactId", { mode: "number", unsigned: true }),
  leaseType: mysqlEnum("leaseType", ["operating", "finance"]).default("operating").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  monthlyPayment: decimal("monthlyPayment", { precision: 15, scale: 2 }).notNull(),
  totalPayments: decimal("totalPayments", { precision: 15, scale: 2 }),
  discountRate: decimal("discountRate", { precision: 5, scale: 2 }).default("0.00"),
  rightOfUseAsset: decimal("rightOfUseAsset", { precision: 15, scale: 2 }).default("0.00"),
  leaseLiability: decimal("leaseLiability", { precision: 15, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["active", "expired", "terminated"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_lease_user").on(table.userId)]);

// ─── Inventory Lots ────────────────────────────────────────────
export const inventoryLots = mysqlTable("inventoryLots", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  lotNumber: varchar("lotNumber", { length: 100 }).notNull(),
  serialNumber: varchar("serialNumber", { length: 100 }),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).default("0.00"),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }).default("0.00"),
  manufacturingDate: date("manufacturingDate"),
  expiryDate: date("expiryDate"),
  status: mysqlEnum("status", ["available", "reserved", "sold", "expired"]).default("available").notNull(),
  location: varchar("location", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_il_user").on(table.userId)]);

// ─── Job Costing ───────────────────────────────────────────────
export const jobs = mysqlTable("jobs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  projectId: bigint("projectId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 50 }),
  estimatedCost: decimal("estimatedCost", { precision: 15, scale: 2 }).default("0.00"),
  actualCost: decimal("actualCost", { precision: 15, scale: 2 }).default("0.00"),
  wipAmount: decimal("wipAmount", { precision: 15, scale: 2 }).default("0.00"),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "closed"]).default("open").notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_job_user").on(table.userId)]);

// ─── Webhooks ──────────────────────────────────────────────────
export const webhooks = mysqlTable("webhooks", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  events: json("events"),
  secret: varchar("secret", { length: 255 }),
  isActive: boolean("isActive").default(true),
  lastTriggered: timestamp("lastTriggered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_wh_user").on(table.userId)]);

// ─── Document Versions ────────────────────────────────────────
export const documentVersions = mysqlTable("documentVersions", {
  id: serial("id").primaryKey(),
  documentId: bigint("documentId", { mode: "number", unsigned: true }).notNull(),
  version: int("version").notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileSize: int("fileSize"),
  uploadedBy: bigint("uploadedBy", { mode: "number", unsigned: true }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_dv_doc").on(table.documentId)]);

// ─── Inventory Valuation ──────────────────────────────────────
export const inventoryValuations = mysqlTable("inventoryValuations", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  productId: bigint("productId", { mode: "number", unsigned: true }).notNull(),
  method: mysqlEnum("method", ["fifo", "lifo", "weighted_average"]).default("fifo").notNull(),
  quantity: decimal("quantity", { precision: 15, scale: 2 }).default("0.00"),
  unitCost: decimal("unitCost", { precision: 15, scale: 2 }).default("0.00"),
  totalValue: decimal("totalValue", { precision: 15, scale: 2 }).default("0.00"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (table) => [index("idx_iv_user").on(table.userId)]);

// ─── Bank Rules ────────────────────────────────────────────────
export const bankRules = mysqlTable("bankRules", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  matchType: mysqlEnum("matchType", ["contains", "exact", "regex", "amount"]).notNull(),
  matchValue: varchar("matchValue", { length: 255 }).notNull(),
  actionType: mysqlEnum("actionType", ["categorize", "assign_account", "skip"]).notNull(),
  actionValue: varchar("actionValue", { length: 255 }),
  accountId: bigint("accountId", { mode: "number", unsigned: true }),
  priority: int("priority").default(0),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_br_user").on(table.userId)]);

// ─── Fiscal Periods ───────────────────────────────────────────
export const fiscalPeriods = mysqlTable("fiscalPeriods", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  status: mysqlEnum("status", ["future", "open", "closed"]).default("future").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_fp_user").on(table.userId)]);

// ─── Tax Rules ─────────────────────────────────────────────────
export const taxRules = mysqlTable("taxRules", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  taxType: varchar("taxType", { length: 50 }).notNull(),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(),
  appliesTo: varchar("appliesTo", { length: 100 }),
  accountId: bigint("accountId", { mode: "number", unsigned: true }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("idx_tr_user").on(table.userId)]);

// Types
export type CompanyEntity = typeof companyEntities.$inferSelect;
export type PeriodClose = typeof periodCloses.$inferSelect;
export type RevenueSchedule = typeof revenueSchedules.$inferSelect;
export type Lease = typeof leases.$inferSelect;
export type InventoryLot = typeof inventoryLots.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type Webhook = typeof webhooks.$inferSelect;
export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InventoryValuation = typeof inventoryValuations.$inferSelect;
export type BankRule = typeof bankRules.$inferSelect;
export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type TaxRule = typeof taxRules.$inferSelect;
