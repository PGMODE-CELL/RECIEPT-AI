import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { trpc } from "@/providers/trpc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface TemplateField {
  companyName: string
  logoUrl: string
  footerText: string
  colorScheme: string
}

interface Template {
  id: string
  name: string
  description: string
  layout: string
}

// TODO: Replace with trpc.invoiceTemplate.list.useQuery() when backend endpoint exists
const templates: Template[] = [
  { id: "professional", name: "Professional", description: "Clean and corporate design", layout: "sidebar" },
  { id: "modern", name: "Modern", description: "Bold colors with large headers", layout: "header" },
  { id: "minimal", name: "Minimal", description: "Simple and whitespace-focused", layout: "centered" },
  { id: "classic", name: "Classic", description: "Traditional invoice layout", layout: "traditional" },
]

const colorSchemes = [
  { id: "blue", label: "Blue", primary: "#2563eb", secondary: "#eff6ff" },
  { id: "green", label: "Green", primary: "#16a34a", secondary: "#f0fdf4" },
  { id: "purple", label: "Purple", primary: "#9333ea", secondary: "#faf5ff" },
  { id: "red", label: "Red", primary: "#dc2626", secondary: "#fef2f2" },
  { id: "slate", label: "Slate", primary: "#475569", secondary: "#f8fafc" },
]

const sampleInvoice = {
  invoiceNumber: "INV-2026-0042",
  date: "May 31, 2026",
  dueDate: "June 30, 2026",
  billTo: "Acme Corp",
  billToAddress: "123 Business Ave, Suite 100\nSan Francisco, CA 94105",
  items: [
    { description: "Web Development Services", quantity: 40, rate: 150, amount: 6000 },
    { description: "UI/UX Design Consultation", quantity: 20, rate: 120, amount: 2400 },
    { description: "Project Management", quantity: 10, rate: 100, amount: 1000 },
  ],
  subtotal: 9400,
  tax: 752,
  total: 10152,
}

export default function InvoiceTemplates() {
  const [activeTemplate, setActiveTemplate] = useState("professional")
  const [fields, setFields] = useState<TemplateField>({
    companyName: "Acme Inc.",
    logoUrl: "",
    footerText: "Thank you for your business!",
    colorScheme: "blue",
  })

  useEffect(() => {
    const saved = localStorage.getItem("invoiceTemplateConfig")
    if (saved) {
      const parsed = JSON.parse(saved)
      setActiveTemplate(parsed.activeTemplate || "professional")
      setFields(parsed.fields || fields)
    }
  }, [])

  const saveConfig = () => {
    localStorage.setItem("invoiceTemplateConfig", JSON.stringify({ activeTemplate, fields }))
    toast.success("Template configuration saved")
  }

  const loadConfig = () => {
    const saved = localStorage.getItem("invoiceTemplateConfig")
    if (saved) {
      const parsed = JSON.parse(saved)
      setActiveTemplate(parsed.activeTemplate || "professional")
      setFields(parsed.fields || fields)
      toast.success("Template configuration loaded")
    } else {
      toast.error("No saved configuration found")
    }
  }

  const resetConfig = () => {
    setActiveTemplate("professional")
    setFields({ companyName: "Acme Inc.", logoUrl: "", footerText: "Thank you for your business!", colorScheme: "blue" })
    toast.info("Template reset to defaults")
  }

  const currentColor = colorSchemes.find((c) => c.id === fields.colorScheme) || colorSchemes[0]
  const currentTemplate = templates.find((t) => t.id === activeTemplate) || templates[0]

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoice Templates</h1>
          <p className="text-gray-600 mt-2">Customize and preview invoice templates for your business</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Choose Template</CardTitle>
                <CardDescription>Select a template style</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setActiveTemplate(template.id)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      activeTemplate === template.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{template.name}</p>
                        <p className="text-sm text-gray-500">{template.description}</p>
                      </div>
                      {activeTemplate === template.id && <Badge>Active</Badge>}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customize</CardTitle>
                <CardDescription>Personalize your template</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={fields.companyName}
                    onChange={(e) => setFields({ ...fields, companyName: e.target.value })}
                    placeholder="Your company name"
                  />
                </div>
                <div>
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={fields.logoUrl}
                    onChange={(e) => setFields({ ...fields, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <Label htmlFor="footerText">Footer Text</Label>
                  <Input
                    id="footerText"
                    value={fields.footerText}
                    onChange={(e) => setFields({ ...fields, footerText: e.target.value })}
                    placeholder="Thank you for your business!"
                  />
                </div>
                <div>
                  <Label>Color Scheme</Label>
                  <Select value={fields.colorScheme} onValueChange={(v) => setFields({ ...fields, colorScheme: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorSchemes.map((scheme) => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: scheme.primary }} />
                            {scheme.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={saveConfig} className="flex-1">Save</Button>
                  <Button variant="outline" onClick={loadConfig} className="flex-1">Load</Button>
                  <Button variant="ghost" onClick={resetConfig}>Reset</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Live Preview</CardTitle>
                    <CardDescription>
                      {currentTemplate.name} template with {currentColor.label} color scheme
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{currentTemplate.layout} layout</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className="border rounded-lg overflow-hidden shadow-lg bg-white"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {currentTemplate.layout === "sidebar" && (
                    <div className="flex min-h-[700px]">
                      <div className="w-48 p-6 text-white" style={{ backgroundColor: currentColor.primary }}>
                        <div className="mb-8">
                          {fields.logoUrl ? (
                            <img src={fields.logoUrl} alt="Logo" className="w-16 h-16 rounded" />
                          ) : (
                            <div className="w-16 h-16 rounded bg-white/20 flex items-center justify-center text-xl font-bold">
                              {fields.companyName.charAt(0)}
                            </div>
                          )}
                          <h2 className="text-lg font-bold mt-3">{fields.companyName}</h2>
                        </div>
                        <div className="space-y-2 text-sm opacity-90">
                          <p className="font-semibold">Bill To</p>
                          <p>{sampleInvoice.billTo}</p>
                          <p className="whitespace-pre-line">{sampleInvoice.billToAddress}</p>
                        </div>
                      </div>
                      <div className="flex-1 p-8">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <h1 className="text-3xl font-bold" style={{ color: currentColor.primary }}>INVOICE</h1>
                            <p className="text-gray-600 mt-1">{sampleInvoice.invoiceNumber}</p>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <p>Date: {sampleInvoice.date}</p>
                            <p>Due: {sampleInvoice.dueDate}</p>
                          </div>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ backgroundColor: currentColor.secondary }}>
                              <th className="p-3 text-left">Description</th>
                              <th className="p-3 text-right">Qty</th>
                              <th className="p-3 text-right">Rate</th>
                              <th className="p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sampleInvoice.items.map((item, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-3">{item.description}</td>
                                <td className="p-3 text-right">{item.quantity}</td>
                                <td className="p-3 text-right">${item.rate}</td>
                                <td className="p-3 text-right">${item.amount.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-6 flex justify-end">
                          <div className="w-64 text-sm space-y-2">
                            <div className="flex justify-between"><span>Subtotal</span><span>${sampleInvoice.subtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span>Tax (8%)</span><span>${sampleInvoice.tax.toLocaleString()}</span></div>
                            <div className="flex justify-between font-bold text-lg border-t pt-2" style={{ color: currentColor.primary }}>
                              <span>Total</span><span>${sampleInvoice.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                        {fields.footerText && (
                          <div className="mt-12 pt-4 border-t text-center text-sm text-gray-500">{fields.footerText}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentTemplate.layout === "header" && (
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-8 pb-6 border-b" style={{ borderColor: currentColor.primary }}>
                        <div>
                          {fields.logoUrl && <img src={fields.logoUrl} alt="Logo" className="h-12 mb-3" />}
                          <h2 className="text-2xl font-bold" style={{ color: currentColor.primary }}>{fields.companyName}</h2>
                        </div>
                        <div className="text-right">
                          <h1 className="text-4xl font-black" style={{ color: currentColor.primary }}>INVOICE</h1>
                          <p className="text-lg font-semibold text-gray-700 mt-1">{sampleInvoice.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="flex justify-between mb-8">
                        <div className="text-sm">
                          <p className="font-semibold mb-1">Bill To:</p>
                          <p className="font-semibold">{sampleInvoice.billTo}</p>
                          <p className="text-gray-600 whitespace-pre-line">{sampleInvoice.billToAddress}</p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex gap-4 justify-end">
                            <div><p className="text-gray-500">Date</p><p className="font-semibold">{sampleInvoice.date}</p></div>
                            <div><p className="text-gray-500">Due Date</p><p className="font-semibold">{sampleInvoice.dueDate}</p></div>
                          </div>
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white" style={{ backgroundColor: currentColor.primary }}>
                            <th className="p-3 text-left">Description</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Rate</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleInvoice.items.map((item, i) => (
                            <tr key={i} className="border-t" style={{ backgroundColor: i % 2 === 0 ? currentColor.secondary : "white" }}>
                              <td className="p-3">{item.description}</td>
                              <td className="p-3 text-right">{item.quantity}</td>
                              <td className="p-3 text-right">${item.rate}</td>
                              <td className="p-3 text-right font-semibold">${item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-8 flex justify-end">
                        <div className="w-72 space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>${sampleInvoice.subtotal.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-600">Tax (8%)</span><span>${sampleInvoice.tax.toLocaleString()}</span></div>
                          <div className="flex justify-between font-bold text-xl border-t-2 pt-3 mt-3" style={{ color: currentColor.primary, borderColor: currentColor.primary }}>
                            <span>Total Due</span><span>${sampleInvoice.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {fields.footerText && (
                        <div className="mt-12 p-4 rounded text-center text-sm text-white" style={{ backgroundColor: currentColor.primary }}>{fields.footerText}</div>
                      )}
                    </div>
                  )}

                  {currentTemplate.layout === "centered" && (
                    <div className="p-10">
                      <div className="text-center mb-10">
                        {fields.logoUrl && <img src={fields.logoUrl} alt="Logo" className="h-14 mx-auto mb-3" />}
                        <h2 className="text-xl font-semibold">{fields.companyName}</h2>
                        <h1 className="text-5xl font-light mt-6 tracking-widest" style={{ color: currentColor.primary }}>INVOICE</h1>
                        <div className="flex justify-center gap-8 mt-4 text-sm text-gray-500">
                          <span>{sampleInvoice.invoiceNumber}</span>
                          <span>Date: {sampleInvoice.date}</span>
                          <span>Due: {sampleInvoice.dueDate}</span>
                        </div>
                      </div>
                      <div className="text-center mb-8 p-4 rounded" style={{ backgroundColor: currentColor.secondary }}>
                        <p className="text-sm text-gray-500 mb-1">Invoice To</p>
                        <p className="font-semibold">{sampleInvoice.billTo}</p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{sampleInvoice.billToAddress}</p>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2" style={{ borderColor: currentColor.primary }}>
                            <th className="p-3 text-center">Description</th>
                            <th className="p-3 text-center">Qty</th>
                            <th className="p-3 text-center">Rate</th>
                            <th className="p-3 text-center">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleInvoice.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="p-3 text-center">{item.description}</td>
                              <td className="p-3 text-center">{item.quantity}</td>
                              <td className="p-3 text-center">${item.rate}</td>
                              <td className="p-3 text-center">${item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-8 flex justify-center">
                        <div className="w-80 text-sm space-y-2">
                          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>${sampleInvoice.subtotal.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Tax (8%)</span><span>${sampleInvoice.tax.toLocaleString()}</span></div>
                          <div className="flex justify-between font-bold text-lg border-t-2 pt-3 mt-3" style={{ color: currentColor.primary, borderColor: currentColor.primary }}>
                            <span>Total</span><span>${sampleInvoice.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {fields.footerText && (
                        <div className="mt-12 text-center text-sm text-gray-400 italic">{fields.footerText}</div>
                      )}
                    </div>
                  )}

                  {currentTemplate.layout === "traditional" && (
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          {fields.logoUrl && <img src={fields.logoUrl} alt="Logo" className="h-10 mb-2" />}
                          <h2 className="text-lg font-bold">{fields.companyName}</h2>
                          <p className="text-xs text-gray-500">123 Company St, City, State 12345</p>
                        </div>
                        <div className="text-right">
                          <h1 className="text-3xl font-bold" style={{ color: currentColor.primary }}>INVOICE</h1>
                          <p className="text-sm text-gray-600">{sampleInvoice.invoiceNumber}</p>
                        </div>
                      </div>
                      <hr className="mb-6" style={{ borderColor: currentColor.primary }} />
                      <div className="flex justify-between mb-6">
                        <div className="text-sm">
                          <p><span className="font-semibold">Bill To:</span> {sampleInvoice.billTo}</p>
                          <p className="whitespace-pre-line text-gray-600">{sampleInvoice.billToAddress}</p>
                        </div>
                        <div className="text-sm text-right">
                          <p><span className="font-semibold">Invoice Date:</span> {sampleInvoice.date}</p>
                          <p><span className="font-semibold">Due Date:</span> {sampleInvoice.dueDate}</p>
                        </div>
                      </div>
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            <th className="p-2 text-left border-b-2" style={{ borderColor: currentColor.primary }}>Description</th>
                            <th className="p-2 text-center border-b-2" style={{ borderColor: currentColor.primary }}>Qty</th>
                            <th className="p-2 text-right border-b-2" style={{ borderColor: currentColor.primary }}>Rate</th>
                            <th className="p-2 text-right border-b-2" style={{ borderColor: currentColor.primary }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sampleInvoice.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-200">
                              <td className="p-2">{item.description}</td>
                              <td className="p-2 text-center">{item.quantity}</td>
                              <td className="p-2 text-right">${item.rate}</td>
                              <td className="p-2 text-right">${item.amount.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-6 flex justify-end">
                        <div className="w-56 text-sm">
                          <div className="flex justify-between py-1"><span>Subtotal</span><span>${sampleInvoice.subtotal.toLocaleString()}</span></div>
                          <div className="flex justify-between py-1"><span>Tax (8%)</span><span>${sampleInvoice.tax.toLocaleString()}</span></div>
                          <div className="flex justify-between py-2 border-t-2 font-bold mt-1" style={{ borderColor: currentColor.primary }}>
                            <span>Total</span><span>${sampleInvoice.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      {fields.footerText && (
                        <div className="mt-10 pt-4 border-t text-xs text-gray-400 text-center">{fields.footerText}</div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
