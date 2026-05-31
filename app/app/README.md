# LedgerAI - Full-Stack Accounting Software

A modern, full-featured accounting and ERP application built with React, TypeScript, tRPC, and Drizzle ORM.

## Features

### Financial Management
- **Invoices** - Create, send, and track customer invoices with line items, taxes, and payments
- **Bills & Expenses** - Manage vendor bills with multi-line items and payment tracking
- **Banking** - Track bank accounts, transactions, and balances
- **Receipts** - Upload and categorize receipts for expense tracking

### Accounting
- **Chart of Accounts** - Full GL account management with hierarchy support
- **Journal Entries** - Double-entry bookkeeping with balanced entry validation
- **Reports** - P&L, Balance Sheet, Cash Flow, Tax Summary, Aged Receivables/Payables

### Business Operations
- **Contacts** - Manage customers, vendors, and their statements
- **Products & Services** - Inventory and service catalog with pricing
- **Projects** - Track projects with tasks, budgets, and timelines
- **Employees** - HR management with employee records
- **Payroll** - Run payroll with automatic tax calculations
- **Documents** - File storage and management

### System
- **Dashboard** - KPIs, quick stats, recent activity, and revenue charts
- **Settings** - Company profile, tax rates, and currency management
- **Authentication** - OAuth integration with role-based access control
- **Dark Mode** - Full dark mode support

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS, shadcn/ui
- **Backend**: tRPC, Hono, Drizzle ORM
- **Database**: MySQL (PlanetScale compatible)
- **Auth**: OAuth 2.0 with JWT sessions
- **State**: React Query + tRPC

## Getting Started

### Prerequisites
- Node.js 20+
- MySQL database

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and fill in:

```env
APP_ID=your_app_id
APP_SECRET=your_app_secret
DATABASE_URL=mysql://user:pass@host:port/db
KIMI_AUTH_URL=https://auth.kimi.com
KIMI_OPEN_URL=https://open.kimi.com
VITE_KIMI_AUTH_URL=https://auth.kimi.com
VITE_APP_ID=your_app_id
```

### Database Setup

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## Project Structure

```
app/
├── api/                    # Backend (tRPC routers)
│   ├── kimi/              # Auth integration
│   ├── lib/               # Utilities
│   ├── queries/           # DB queries
│   ├── middleware.ts      # Auth middleware
│   ├── router.ts          # Main router
│   └── *.ts               # Feature routers
├── contracts/             # Shared types/constants
├── db/                    # Database schema & migrations
│   ├── schema.ts          # Drizzle schema
│   ├── relations.ts       # Table relations
│   └── seed.ts            # Seed data
└── src/                   # Frontend (React)
    ├── components/        # Reusable components
    ├── hooks/             # Custom hooks
    ├── pages/             # Page components
    └── providers/         # Context providers
```

## License

Private - All rights reserved.
