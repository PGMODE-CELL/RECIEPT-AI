import { Link } from "react-router";
import { Wallet, Receipt, BarChart3, Shield, Users, Brain, FileText, Landmark, Package, Clock, ArrowRight, Github, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  { icon: Receipt, title: "Receipt Scanning", desc: "AI-powered OCR extracts data from receipts instantly." },
  { icon: FileText, title: "Invoicing", desc: "Create, send, and track invoices with professional templates." },
  { icon: Landmark, title: "Banking", desc: "Connect bank feeds, reconcile transactions, manage cash flow." },
  { icon: BarChart3, title: "Reports", desc: "P&L, balance sheet, trial balance, cash flow — all real-time." },
  { icon: Package, title: "Inventory", desc: "Track stock, manage warehouses, automate reordering." },
  { icon: Users, title: "CRM", desc: "Manage contacts, leads, and customer relationships." },
  { icon: Brain, title: "AI Insights", desc: "Anomaly detection, forecasts, and smart categorizations." },
  { icon: Shield, title: "Audit Trail", desc: "Every change logged. SOC2-ready security." },
  { icon: Clock, title: "Payroll", desc: "Full payroll with tax calculations and compliance." },
];

const rows = [
  ["Open source", "✅ MIT", "✅ Elastic", "✅ MIT", "✅ GPL"],
  ["Self-hosted", "✅", "✅", "✅", "✅"],
  ["FastAPI backend", "✅", "❌ PHP", "❌ PHP", "❌ Flask"],
  ["React frontend", "✅ shadcn/ui", "❌ Flutter", "❌ Vue", "❌ Electron"],
  ["PII encryption", "✅ Fernet", "❌", "❌", "❌"],
  ["Audit logging", "✅ Auto", "❌", "❌", "❌"],
  ["2FA", "✅ TOTP", "✅", "❌", "❌"],
  ["Multi-currency", "✅ 5 currencies", "✅", "✅", "❌"],
  ["Payroll", "✅", "❌", "❌", "❌"],
  ["CI/CD pipeline", "✅", "❌", "❌", "❌"],
  ["Docker Compose", "✅ Full stack", "✅", "✅", "❌"],
  ["Rate limiting", "✅", "✅", "❌", "❌"],
  ["Field-level encryption", "✅", "❌", "❌", "❌"],
  ["Vendor/client portal", "✅", "✅", "❌", "❌"],
  ["Stripe payments", "✅", "✅", "✅", "❌"],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">ReceiptAI</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="https://github.com/PGMODE-CELL/RECIEPT-AI" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <Github className="w-5 h-5" />
            </a>
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium mb-6">
              <Star className="w-4 h-4" />
              Free & Open Source
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 dark:text-white tracking-tight">
              AI-Powered Accounting
              <span className="text-indigo-600"> for Everyone</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              ReceiptAI is a free, open-source accounting and ERP platform. 
              AI-powered receipt scanning, invoicing, payroll, CRM, inventory, and more — no license fees, no hidden costs.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href="https://github.com/PGMODE-CELL/RECIEPT-AI" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="lg" className="text-base">
                  <Github className="mr-2 w-5 h-5" />
                  View on GitHub
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Everything You Need</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">A complete business management platform — 100% free.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-24 bg-white dark:bg-gray-950">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why ReceiptAI?</h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">More features, zero cost — compare for yourself.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-4 pr-8 font-semibold text-gray-900 dark:text-white">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-indigo-600">ReceiptAI</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Invoice Ninja</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Crater</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-500">Frappe Books</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([feature, ...cells]) => (
                  <tr key={feature} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pr-8 text-gray-700 dark:text-gray-300 font-medium">{feature}</td>
                    {cells.map((cell, i) => (
                      <td key={i} className={`text-center py-3 px-4 ${i === 0 ? "text-indigo-600 font-medium" : "text-gray-400"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Ready to Simplify Your Finances?</h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">No credit card. No trial period. Just free, powerful accounting software.</p>
          <div className="mt-10">
            <Link to="/login">
              <Button size="lg" className="text-base">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white">ReceiptAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link to="/terms" className="hover:text-gray-700 dark:hover:text-gray-300">Terms</Link>
              <Link to="/privacy" className="hover:text-gray-700 dark:hover:text-gray-300">Privacy</Link>
              <a href="https://github.com/PGMODE-CELL/RECIEPT-AI" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 dark:hover:text-gray-300">GitHub</a>
            </div>
            <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} ReceiptAI. Free & open-source.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
