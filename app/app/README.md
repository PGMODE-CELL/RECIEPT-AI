# ReceiptAI — Frontend

React 19 + TypeScript + Vite 7 + Tailwind CSS + shadcn/ui frontend for the ReceiptAI accounting platform.

## Tech Stack

- **Framework**: React 19, TypeScript, Vite 7
- **UI**: Tailwind CSS, shadcn/ui, Lucide icons
- **Charts**: Recharts
- **Routing**: React Router v7
- **State**: React Context + custom hooks
- **API**: Direct HTTP calls to FastAPI backend

## Getting Started

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:4200
```

## Build

```bash
npm run build      # Outputs to dist/public/
```

## Structure

```
src/
├── components/    # Reusable UI components (shadcn/ui)
├── pages/         # Route page components (95+ pages)
├── hooks/         # Custom React hooks
├── lib/           # API client, utilities
├── providers/     # React context providers
└── ...
```
