# Receipt AI Ultimate

**The simplest yet most powerful accounting software in the world.**

Built for everyone — from individuals tracking personal expenses to enterprises managing millions. No accounting knowledge required. AI handles the complexity. You just click buttons.

---

## What Makes This Different

### For Regular People (No Accounting Knowledge)
- **"Money In"** — When you get paid, click this. Pick a category. Done.
- **"Money Out"** — When you spend, click this. Pick a category. Done.
- **AI explains everything** in plain English: "You made $5,000 and spent $3,000. You kept $2,000."
- **No jargon** — We never say "debit/credit" or "journal entry" unless you want to see them.

### For Accountants & CAs
- **Full double-entry bookkeeping** behind the scenes
- **Complete audit trail** — every transaction tracked
- **Trial balance, P&L, Balance Sheet** — all calculated correctly
- **Multi-country tax support** — US, India, UK, China, UAE, and more

### For Enterprises & Banks
- **Bank-grade security** — 2FA, session management, request signing
- **GDPR compliant** — data export, erasure, audit logs
- **Role-based access control** — Owner, Admin, Accountant, Bookkeeper, Viewer
- **Webhook integrations** — event-driven architecture
- **Load tested** — handles 1000+ concurrent users
- **Cloud deployment ready** — Docker, Kubernetes, Terraform AWS

---

## Features

| Feature | Simple Mode | Advanced Mode |
|---------|-------------|---------------|
| Record income | "Money In" button | Manual journal entry |
| Record expense | "Money Out" button | Manual journal entry |
| Receipt scanning | Upload photo, AI extracts | OCR with 3 backends |
| Invoicing | Create & send PDF | Full AR workflow |
| Bills | Record what you owe | Full AP workflow |
| Reports | Plain English summary | Full financial statements |
| Tax | Auto-configured by country | Custom rates per region |
| Payroll | Coming soon | Full payslip generation |
| Inventory | Coming soon | FIFO/weighted average |

---

## Quick Start (2 Minutes)

```bash
# 1. Download and extract
unzip receipt-ai-ultimate.zip
cd receipt-ai-ultimate

# 2. Start everything
docker-compose up -d

# 3. Open browser
http://localhost

# 4. Register → Setup Wizard → Start using!
```

---

## Countries Supported

| Country | Currency | Tax | Fiscal Year |
|---------|----------|-----|-------------|
| 🇺🇸 United States | USD | Sales Tax (6-8%) | Dec 31 |
| 🇮🇳 India | INR | GST (5/12/18/28%) | Mar 31 |
| 🇬🇧 United Kingdom | GBP | VAT (20/5/0%) | Mar 31 |
| 🇨🇳 China | CNY | 增值税 (13/9/6/3%) | Dec 31 |
| 🇦🇪 UAE | AED | VAT (5%) | Dec 31 |
| 🇩🇪 Germany | EUR | MwSt (19/7%) | Dec 31 |
| 🇫🇷 France | EUR | TVA (20/10/5.5%) | Dec 31 |
| 🇯🇵 Japan | JPY | 消費税 (10/8%) | Mar 31 |
| 🇦🇺 Australia | AUD | GST (10%) | Jun 30 |
| 🇨🇦 Canada | CAD | GST/HST (5-13%) | Dec 31 |
| 🇸🇬 Singapore | SGD | GST (9%) | Mar 31 |
| 🇧🇷 Brazil | BRL | ICMS/IPI (10-18%) | Dec 31 |
| 🇲🇽 Mexico | MXN | IVA (16/8%) | Dec 31 |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | FastAPI + SQLAlchemy + SQLite/PostgreSQL |
| Frontend | React 18 + Tailwind CSS + Recharts |
| AI OCR | Tesseract + Google Vision + AWS Textract |
| Mobile | React Native + Expo |
| Deployment | Docker + Kubernetes + Terraform |
| Security | JWT + 2FA + HMAC + AES-256 |

---

## License

**MIT License** — Free forever. No restrictions. Use for personal, commercial, or enterprise.

**Built with ❤️ for the world.**
