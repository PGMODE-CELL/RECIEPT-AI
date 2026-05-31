import { relations } from "drizzle-orm";
import {
  users, companies, accounts, contacts, products, taxRates,
  invoices, invoiceItems, bills, billItems,
  journalEntries, journalEntryLines, transactions,
  receipts, projects, tasks, employees, payrollRuns, payslips,
  documents, currencies, auditLogs,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.id], references: [companies.userId] }),
  accounts: many(accounts),
  contacts: many(contacts),
  products: many(products),
  invoices: many(invoices),
  bills: many(bills),
  journalEntries: many(journalEntries),
  transactions: many(transactions),
  receipts: many(receipts),
  projects: many(projects),
  tasks: many(tasks),
  employees: many(employees),
  payrollRuns: many(payrollRuns),
  documents: many(documents),
  auditLogs: many(auditLogs),
}));

export const companiesRelations = relations(companies, ({ one }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
  parent: one(accounts, { fields: [accounts.parentId], references: [accounts.id], relationName: "accountHierarchy" }),
  children: many(accounts, { relationName: "accountHierarchy" }),
  transactions: many(transactions),
  journalEntryLines: many(journalEntryLines),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  user: one(users, { fields: [contacts.userId], references: [users.id] }),
  invoices: many(invoices),
  bills: many(bills),
  projects: many(projects),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  invoiceItems: many(invoiceItems),
}));

export const taxRatesRelations = relations(taxRates, ({ one }) => ({
  user: one(users, { fields: [taxRates.userId], references: [users.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  contact: one(contacts, { fields: [invoices.contactId], references: [contacts.id] }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  user: one(users, { fields: [bills.userId], references: [users.id] }),
  contact: one(contacts, { fields: [bills.contactId], references: [contacts.id] }),
  items: many(billItems),
}));

export const billItemsRelations = relations(billItems, ({ one }) => ({
  bill: one(bills, { fields: [billItems.billId], references: [bills.id] }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
  lines: many(journalEntryLines),
  reversingEntry: one(journalEntries, { fields: [journalEntries.reversingEntryId], references: [journalEntries.id], relationName: "reversals" }),
}));

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, { fields: [journalEntryLines.journalEntryId], references: [journalEntries.id] }),
  account: one(accounts, { fields: [journalEntryLines.accountId], references: [accounts.id] }),
  contact: one(contacts, { fields: [journalEntryLines.contactId], references: [contacts.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, { fields: [transactions.userId], references: [users.id] }),
  account: one(accounts, { fields: [transactions.accountId], references: [accounts.id] }),
  contact: one(contacts, { fields: [transactions.contactId], references: [contacts.id] }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  user: one(users, { fields: [receipts.userId], references: [users.id] }),
  bill: one(bills, { fields: [receipts.billId], references: [bills.id] }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  contact: one(contacts, { fields: [projects.contactId], references: [contacts.id] }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
}));

export const employeesRelations = relations(employees, ({ one, many }) => ({
  user: one(users, { fields: [employees.userId], references: [users.id] }),
  payslips: many(payslips),
}));

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  user: one(users, { fields: [payrollRuns.userId], references: [users.id] }),
  payslips: many(payslips),
}));

export const payslipsRelations = relations(payslips, ({ one }) => ({
  payrollRun: one(payrollRuns, { fields: [payslips.payrollRunId], references: [payrollRuns.id] }),
  employee: one(employees, { fields: [payslips.employeeId], references: [employees.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, { fields: [documents.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));
