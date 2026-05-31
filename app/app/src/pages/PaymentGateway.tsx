import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface GatewayConfig {
  stripe: {
    apiKey: string
    webhookUrl: string
    enabled: boolean
  }
  paypal: {
    clientId: string
    secret: string
    enabled: boolean
  }
}

interface PaymentLink {
  id: string
  invoiceNumber: string
  amount: number
  status: "pending" | "paid" | "expired" | "failed"
  url: string
  createdAt: string
}

const sampleLinks: PaymentLink[] = [
  { id: "1", invoiceNumber: "INV-2026-0038", amount: 2500, status: "paid", url: "https://pay.stripe.com/abc123", createdAt: "2026-05-28" },
  { id: "2", invoiceNumber: "INV-2026-0039", amount: 4200, status: "pending", url: "https://pay.stripe.com/def456", createdAt: "2026-05-29" },
  { id: "3", invoiceNumber: "INV-2026-0040", amount: 1800, status: "expired", url: "https://pay.stripe.com/ghi789", createdAt: "2026-05-15" },
  { id: "4", invoiceNumber: "INV-2026-0041", amount: 3300, status: "pending", url: "https://paypal.me/acme/3300", createdAt: "2026-05-30" },
]

export default function PaymentGateway() {
  const [config, setConfig] = useState<GatewayConfig>({
    stripe: { apiKey: "", webhookUrl: "", enabled: true },
    paypal: { clientId: "", secret: "", enabled: false },
  })
  const [links] = useState<PaymentLink[]>(sampleLinks)
  const [testingStripe, setTestingStripe] = useState(false)
  const [testingPaypal, setTestingPaypal] = useState(false)
  const [newLinkInvoice, setNewLinkInvoice] = useState("")
  const [newLinkAmount, setNewLinkAmount] = useState("")
  const [newLinkGateway, setNewLinkGateway] = useState<"stripe" | "paypal">("stripe")

  const testStripe = () => {
    if (!config.stripe.apiKey) {
      toast.error("Enter a Stripe API key first")
      return
    }
    setTestingStripe(true)
    setTimeout(() => {
      setTestingStripe(false)
      if (config.stripe.apiKey.startsWith("sk_test_") || config.stripe.apiKey.startsWith("sk_live_")) {
        toast.success("Stripe connection successful")
      } else {
        toast.error("Invalid Stripe API key format")
      }
    }, 1500)
  }

  const testPaypal = () => {
    if (!config.paypal.clientId) {
      toast.error("Enter a PayPal Client ID first")
      return
    }
    setTestingPaypal(true)
    setTimeout(() => {
      setTestingPaypal(false)
      toast.success("PayPal connection verified")
    }, 1500)
  }

  const generateLink = () => {
    if (!newLinkInvoice || !newLinkAmount) {
      toast.error("Enter invoice number and amount")
      return
    }
    toast.success(`Payment link generated for ${newLinkInvoice}`)
    setNewLinkInvoice("")
    setNewLinkAmount("")
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "paid": return "default"
      case "pending": return "secondary"
      case "expired": return "outline"
      case "failed": return "destructive"
      default: return "outline"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Gateway Settings</h1>
          <p className="text-gray-600 mt-2">Configure payment providers and generate payment links for invoices</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-purple-600">Stripe</span>
                    {config.stripe.enabled ? <Badge>Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
                  </CardTitle>
                  <CardDescription>Accept credit cards and payments via Stripe</CardDescription>
                </div>
                <Switch checked={config.stripe.enabled} onCheckedChange={(v) => setConfig({ ...config, stripe: { ...config.stripe, enabled: v } })} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="stripeKey">API Secret Key</Label>
                <Input
                  id="stripeKey"
                  type="password"
                  placeholder="sk_test_... or sk_live_..."
                  value={config.stripe.apiKey}
                  onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, apiKey: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="stripeWebhook">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="stripeWebhook"
                    placeholder="https://yourapp.com/api/webhooks/stripe"
                    value={config.stripe.webhookUrl}
                    onChange={(e) => setConfig({ ...config, stripe: { ...config.stripe, webhookUrl: e.target.value } })}
                  />
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(config.stripe.webhookUrl); toast.success("Copied") }}>Copy</Button>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 text-xs font-mono text-gray-600">
                Events: payment_intent.succeeded, payment_intent.failed, invoice.paid, invoice.payment_failed
              </div>
              <Button onClick={testStripe} disabled={testingStripe} className="w-full">
                {testingStripe ? "Testing..." : "Test Connection"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-blue-600">PayPal</span>
                    {config.paypal.enabled ? <Badge>Enabled</Badge> : <Badge variant="outline">Disabled</Badge>}
                  </CardTitle>
                  <CardDescription>Accept PayPal and card payments</CardDescription>
                </div>
                <Switch checked={config.paypal.enabled} onCheckedChange={(v) => setConfig({ ...config, paypal: { ...config.paypal, enabled: v } })} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paypalClientId">Client ID</Label>
                <Input
                  id="paypalClientId"
                  placeholder="PayPal Client ID"
                  value={config.paypal.clientId}
                  onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, clientId: e.target.value } })}
                />
              </div>
              <div>
                <Label htmlFor="paypalSecret">Client Secret</Label>
                <Input
                  id="paypalSecret"
                  type="password"
                  placeholder="PayPal Client Secret"
                  value={config.paypal.secret}
                  onChange={(e) => setConfig({ ...config, paypal: { ...config.paypal, secret: e.target.value } })}
                />
              </div>
              <div className="p-3 rounded-lg bg-gray-50 text-xs font-mono text-gray-600">
                Sandbox: https://api-m.sandbox.paypal.com | Live: https://api-m.paypal.com
              </div>
              <Button onClick={testPaypal} disabled={testingPaypal} className="w-full">
                {testingPaypal ? "Testing..." : "Test Connection"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Generate Payment Link</CardTitle>
              <CardDescription>Create a payment link for an invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Invoice Number</Label>
                <Input placeholder="INV-2026-0042" value={newLinkInvoice} onChange={(e) => setNewLinkInvoice(e.target.value)} />
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" placeholder="1000.00" value={newLinkAmount} onChange={(e) => setNewLinkAmount(e.target.value)} />
              </div>
              <div>
                <Label>Payment Gateway</Label>
                <div className="flex gap-2">
                  <Button variant={newLinkGateway === "stripe" ? "default" : "outline"} size="sm" onClick={() => setNewLinkGateway("stripe")}>Stripe</Button>
                  <Button variant={newLinkGateway === "paypal" ? "default" : "outline"} size="sm" onClick={() => setNewLinkGateway("paypal")}>PayPal</Button>
                </div>
              </div>
              <Button onClick={generateLink} className="w-full">Generate Link</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Payment Links & Status</CardTitle>
              <CardDescription>Track payment status for generated links</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-sm">{link.invoiceNumber}</span>
                        <Badge variant={statusColor(link.status)}>{link.status}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm font-medium">${link.amount.toLocaleString()}</span>
                        <span className="text-xs text-gray-500">{link.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(link.url); toast.success("Link copied") }}>
                        Copy Link
                      </Button>
                      {link.status === "pending" && (
                        <Button variant="outline" size="sm" onClick={() => toast.success("Reminder sent")}>
                          Send Reminder
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
