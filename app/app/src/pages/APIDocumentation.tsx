import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE"
  path: string
  description: string
  params?: { name: string; type: string; required: boolean; description: string }[]
}

interface ApiModule {
  name: string
  description: string
  endpoints: Endpoint[]
}

const apiModules: ApiModule[] = [
  {
    name: "Users",
    description: "User authentication and profile management",
    endpoints: [
      { method: "GET", path: "/api/user/me", description: "Get current authenticated user profile" },
      { method: "PUT", path: "/api/user/me", description: "Update current user profile" },
      { method: "POST", path: "/api/auth/login", description: "Authenticate user and return session token", params: [{ name: "email", type: "string", required: true, description: "User email address" }, { name: "password", type: "string", required: true, description: "User password" }] },
      { method: "POST", path: "/api/auth/register", description: "Register a new user account", params: [{ name: "email", type: "string", required: true, description: "Email address" }, { name: "password", type: "string", required: true, description: "Password (min 8 chars)" }, { name: "name", type: "string", required: true, description: "Full name" }] },
      { method: "POST", path: "/api/auth/logout", description: "Invalidate current session" },
    ],
  },
  {
    name: "Invoices",
    description: "Create, update, and manage invoices",
    endpoints: [
      { method: "GET", path: "/api/invoices", description: "List all invoices with pagination" },
      { method: "GET", path: "/api/invoices/:id", description: "Get invoice by ID", params: [{ name: "id", type: "string", required: true, description: "Invoice ID" }] },
      { method: "POST", path: "/api/invoices", description: "Create a new invoice", params: [{ name: "clientId", type: "string", required: true, description: "Client ID" }, { name: "items", type: "array", required: true, description: "Line items array" }, { name: "dueDate", type: "string", required: true, description: "Due date (ISO 8601)" }] },
      { method: "PUT", path: "/api/invoices/:id", description: "Update an existing invoice", params: [{ name: "id", type: "string", required: true, description: "Invoice ID" }, { name: "status", type: "string", required: false, description: "Invoice status" }] },
      { method: "DELETE", path: "/api/invoices/:id", description: "Delete an invoice", params: [{ name: "id", type: "string", required: true, description: "Invoice ID" }] },
      { method: "POST", path: "/api/invoices/:id/send", description: "Send invoice to client via email", params: [{ name: "id", type: "string", required: true, description: "Invoice ID" }] },
      { method: "POST", path: "/api/invoices/:id/duplicate", description: "Duplicate an existing invoice", params: [{ name: "id", type: "string", required: true, description: "Invoice ID to duplicate" }] },
    ],
  },
  {
    name: "Clients",
    description: "Manage client contacts and details",
    endpoints: [
      { method: "GET", path: "/api/clients", description: "List all clients" },
      { method: "GET", path: "/api/clients/:id", description: "Get client by ID", params: [{ name: "id", type: "string", required: true, description: "Client ID" }] },
      { method: "POST", path: "/api/clients", description: "Create a new client", params: [{ name: "name", type: "string", required: true, description: "Client name" }, { name: "email", type: "string", required: true, description: "Client email" }, { name: "company", type: "string", required: false, description: "Company name" }] },
      { method: "PUT", path: "/api/clients/:id", description: "Update client details", params: [{ name: "id", type: "string", required: true, description: "Client ID" }] },
      { method: "DELETE", path: "/api/clients/:id", description: "Delete a client", params: [{ name: "id", type: "string", required: true, description: "Client ID" }] },
    ],
  },
  {
    name: "Transactions",
    description: "Track income, expenses, and bank feeds",
    endpoints: [
      { method: "GET", path: "/api/transactions", description: "List all transactions with filters" },
      { method: "POST", path: "/api/transactions", description: "Create a new transaction", params: [{ name: "amount", type: "number", required: true, description: "Transaction amount" }, { name: "type", type: "string", required: true, description: "income or expense" }, { name: "category", type: "string", required: true, description: "Transaction category" }, { name: "description", type: "string", required: true, description: "Transaction description" }] },
      { method: "PUT", path: "/api/transactions/:id", description: "Update a transaction", params: [{ name: "id", type: "string", required: true, description: "Transaction ID" }] },
      { method: "DELETE", path: "/api/transactions/:id", description: "Delete a transaction", params: [{ name: "id", type: "string", required: true, description: "Transaction ID" }] },
      { method: "POST", path: "/api/transactions/import", description: "Import transactions from bank feed CSV/OFX", params: [{ name: "file", type: "file", required: true, description: "CSV or OFX file" }, { name: "mapping", type: "object", required: true, description: "Column mapping configuration" }] },
    ],
  },
  {
    name: "Payments",
    description: "Process and track payments",
    endpoints: [
      { method: "GET", path: "/api/payments", description: "List all payments" },
      { method: "POST", path: "/api/payments/create-link", description: "Generate a payment link for an invoice", params: [{ name: "invoiceId", type: "string", required: true, description: "Invoice ID" }, { name: "gateway", type: "string", required: true, description: "stripe or paypal" }] },
      { method: "GET", path: "/api/payments/:id/status", description: "Check payment status", params: [{ name: "id", type: "string", required: true, description: "Payment ID" }] },
      { method: "POST", path: "/api/payments/webhook/stripe", description: "Stripe webhook endpoint (internal)" },
      { method: "POST", path: "/api/payments/webhook/paypal", description: "PayPal webhook endpoint (internal)" },
    ],
  },
  {
    name: "Reports",
    description: "Generate financial reports",
    endpoints: [
      { method: "GET", path: "/api/reports/profit-loss", description: "Generate Profit & Loss report", params: [{ name: "startDate", type: "string", required: true, description: "Start date (ISO 8601)" }, { name: "endDate", type: "string", required: true, description: "End date (ISO 8601)" }] },
      { method: "GET", path: "/api/reports/cash-flow", description: "Generate Cash Flow report" },
      { method: "GET", path: "/api/reports/tax-summary", description: "Generate Tax Summary report" },
      { method: "GET", path: "/api/reports/expense-categories", description: "Get expenses breakdown by category" },
      { method: "GET", path: "/api/reports/export", description: "Export report as CSV/PDF", params: [{ name: "type", type: "string", required: true, description: "Report type" }, { name: "format", type: "string", required: true, description: "csv or pdf" }] },
    ],
  },
  {
    name: "Templates",
    description: "Manage invoice and email templates",
    endpoints: [
      { method: "GET", path: "/api/templates", description: "List all invoice templates" },
      { method: "GET", path: "/api/templates/:id", description: "Get template by ID", params: [{ name: "id", type: "string", required: true, description: "Template ID" }] },
      { method: "POST", path: "/api/templates", description: "Create a custom template", params: [{ name: "name", type: "string", required: true, description: "Template name" }, { name: "layout", type: "string", required: true, description: "Template layout" }, { name: "config", type: "object", required: true, description: "Template configuration" }] },
      { method: "PUT", path: "/api/templates/:id", description: "Update a template", params: [{ name: "id", type: "string", required: true, description: "Template ID" }] },
      { method: "DELETE", path: "/api/templates/:id", description: "Delete a custom template", params: [{ name: "id", type: "string", required: true, description: "Template ID" }] },
    ],
  },
]

export default function APIDocumentation() {
  const [expandedModule, setExpandedModule] = useState<string | null>("Users")
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeys] = useState([
    { id: "key1", name: "Production", key: "sk_live_abc...xyz", created: "2026-01-15", lastUsed: "2026-05-31" },
    { id: "key2", name: "Development", key: "sk_test_def...uvw", created: "2026-03-20", lastUsed: "2026-05-30" },
  ])

  const methodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800"
      case "POST": return "bg-blue-100 text-blue-800"
      case "PUT": return "bg-amber-100 text-amber-800"
      case "DELETE": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const copyEndpoint = (path: string) => {
    navigator.clipboard.writeText(`https://api.yourapp.com${path}`)
    toast.success("Endpoint copied to clipboard")
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Documentation</h1>
          <p className="text-gray-600 mt-2">RESTful API reference for integrating with the accounting platform</p>
          <div className="flex gap-2 mt-4">
            <Badge>v2.0</Badge>
            <Badge variant="outline">Base URL: https://api.yourapp.com</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Include your API key in requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-gray-900 text-green-400 text-xs font-mono break-all">
                  Authorization: Bearer YOUR_API_KEY
                </div>
                <div>
                  <Input
                    type={showApiKey ? "text" : "password"}
                    placeholder="Enter API key for testing"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => setShowApiKey(!showApiKey)}>
                  {showApiKey ? "Hide" : "Show"} Key
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage your API keys</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{key.name}</span>
                      <Badge variant="outline" className="text-xs">{key.key}</Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <p>Created: {key.created}</p>
                      <p>Last used: {key.lastUsed}</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full" onClick={() => toast.success("API key generated")}>
                  Generate New Key
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Badge className={`${methodColor("GET")} text-xs`}>GET</Badge>
                  <span className="text-gray-600">Read resource</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${methodColor("POST")} text-xs`}>POST</Badge>
                  <span className="text-gray-600">Create resource</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${methodColor("PUT")} text-xs`}>PUT</Badge>
                  <span className="text-gray-600">Update resource</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${methodColor("DELETE")} text-xs`}>DELETE</Badge>
                  <span className="text-gray-600">Delete resource</span>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-gray-500">Rate limit: 1000 req/min</p>
                  <p className="text-gray-500">Max payload: 10MB</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-4">
            {apiModules.map((module) => (
              <Card key={module.name}>
                <button
                  onClick={() => setExpandedModule(expandedModule === module.name ? null : module.name)}
                  className="w-full"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{module.name}</CardTitle>
                        <CardDescription>{module.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{module.endpoints.length} endpoints</Badge>
                        <span className="text-gray-400">{expandedModule === module.name ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </CardHeader>
                </button>
                {expandedModule === module.name && (
                  <CardContent>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Method</TableHead>
                            <TableHead className="w-[300px]">Path</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-20"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {module.endpoints.map((ep) => (
                            <TableRow key={ep.path + ep.method}>
                              <TableCell>
                                <Badge className={methodColor(ep.method)}>{ep.method}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{ep.path}</TableCell>
                              <TableCell>
                                <p className="text-sm">{ep.description}</p>
                                {ep.params && ep.params.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {ep.params.map((p) => (
                                      <div key={p.name} className="flex items-center gap-2 text-xs text-gray-500">
                                        <code className="bg-gray-100 px-1 rounded">{p.name}</code>
                                        <span className="text-gray-400">{p.type}</span>
                                        {p.required && <Badge variant="destructive" className="text-[10px] px-1 py-0">required</Badge>}
                                        <span>{p.description}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => copyEndpoint(ep.path)}>
                                  Copy
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
