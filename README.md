# ShockLens 📊

<div align="center">

[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://shocklens.vercel.app)
[![Tests](https://img.shields.io/badge/Verified_Tests-61%2F61_Passing-brightgreen?style=for-the-badge)](#testing)

**See the Shock. Understand the Impact. Plan Your Next Move.**

Portfolio resilience analysis, macroeconomic shock transmission, stock comparisons, financial goal tracking, and explainable investment scenarios.

[Live Demo](https://shocklens.vercel.app) • [Features](#key-features) • [Quick Start](#quick-start) • [Architecture](#architecture-and-data-flow) • [API Reference](#api-reference) • [Tests](#testing)

</div>

---

## Overview

A change in oil prices, interest rates, exchange rates, or market sentiment can affect different holdings in very different ways. ShockLens helps users explore these connections and understand what a market shock could mean for their portfolio and financial goals.

The application combines portfolio management, shared calculation logic, external market data, and scenario modeling. Its analysis presents estimated impacts alongside transmission paths, assumptions, and data freshness information.

**Live application:** [shocklens.vercel.app](https://shocklens.vercel.app)
**Source code:** [Srujana_hackathon2026_ShockLens](https://github.com/darshankreddy7507/Srujana_hackathon2026_ShockLens)

---

## Key Features

### 1. 📁 Portfolio and Holdings Manager

- Create and manage multiple portfolios.
- Add, edit, and remove holdings with asset class, sector, currency, and liquidity information.
- Import holdings from CSV using a downloadable template.
- Review portfolio composition and exposure across investments.

### 2. 🌐 Market Nexus / Financial Butterfly Effect

- Track macro indicators such as crude oil, USD/INR, NIFTY 50, NIFTY Bank, gold, and US Treasury yields.
- Explore how a trigger propagates through macro factors, sectors, and individual holdings.
- Review estimated percentage and monetary impacts, sector breakdowns, and potential hedging benefits.
- Inspect explanations, assumptions, confidence information, and data freshness notices.

### 3. 🧪 Scenario Lab

- Apply hypothetical market shocks to a portfolio.
- Analyze exposure and compare alternative allocations.
- Explore how changes in market conditions could affect portfolio value and financial goals.
- Keep scenario estimates distinct from actual trade execution.

### 4. 🔄 Stock Switch Analyzer

- Compare an existing stock with a potential replacement.
- Review historical returns, momentum, volatility, and 52-week price ranges.
- Compare normalized price histories and estimated share allocations.
- Read the reasoning behind a suggested switch or hold decision.

### 5. 🎯 Financial Goals

- Create goals with target amounts, deadlines, and contribution information.
- Estimate the returns needed to reach a target.
- Review holdings against goal requirements.
- Explore investment recommendations and portfolio adjustments.

### 6. 💬 PortfolioIQ Copilot

- Ask natural-language questions about stocks, macroeconomic events, and portfolio scenarios.
- Request historical performance rankings and comparisons across stocks.
- Explore investing concepts such as RSI, beta, and drawdown.
- Receive structured analysis and supporting source information where available.

### 7. 📄 Reports and Exports

- Save analysis reports for later review.
- Access report details and download endpoints.
- Export reports through the frontend's PDF generation tools.

### 8. 🔐 Accounts and Authentication

- Open Demo Guest Access from the login page to explore a sample portfolio without an account. Guest data includes static fixtures; some analysis actions still require the API.
- Register and sign in using Express email/password authentication.
- Store password hashes with bcrypt and sessions in PostgreSQL.
- Optionally enable Supabase Auth with bearer-token verification and app-profile linking.
- Protect application pages and scope portfolio operations to the authenticated user.

---

## Architecture and Data Flow

```mermaid
flowchart TD
    User[User] --> Frontend[React + Vite Frontend]
    Frontend -->|JSON requests /api| Backend[Express API]
    Frontend -->|Optional authentication| Auth[Supabase Auth]
    Auth -->|Access token| Frontend
    Backend -->|Verify bearer token when supplied| Auth
    Backend --> Prisma[Prisma ORM]
    Prisma --> DB[(Supabase PostgreSQL)]
    Backend --> Shared[Shared Schemas and Calculations]
    Backend --> Market[External Market Data]
    Backend --> Analysis[Scenario and Portfolio Analysis]
    Analysis --> Shared
    Analysis --> Market
```

**Local development:** Vite serves the frontend on port `5173` and proxies `/api` requests to Express on port `4000`.

**Production:** Vercel serves the frontend's static build and routes `/api/*` to the Express serverless entry point. PostgreSQL stores users, sessions, portfolios, holdings, goals, and analysis records.

### Analysis Model

The model traces a causal path from a market trigger to portfolio impact:

```text
Market Trigger
    → Macroeconomic Factor
        → Sector Transmission
            → Holding Return Estimate
                → Portfolio Monetary Impact
```

For a holding, the monetary impact is derived from its value and modeled percentage return:

$$
\text{Estimated Holding Impact} =
\text{Holding Value} \times
\frac{\text{Estimated Return (\%)}}{100}
$$

These outputs are scenario estimates. They depend on model assumptions and available data.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router |
| Styling and components | Tailwind CSS, Radix UI, Lucide |
| Charts and motion | Recharts, Framer Motion |
| Data fetching and forms | TanStack React Query, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript |
| Database | Supabase PostgreSQL, Prisma ORM |
| Authentication | Express Session, bcrypt, optional Supabase Auth |
| Logging and middleware | Pino, Helmet, CORS, Express Rate Limit |
| Report export | jsPDF, html2canvas |
| Market data | Yahoo Finance endpoints |
| Testing | Vitest |
| Hosting | Vercel |

---

## Quick Start

### 1. Prerequisites

- Node.js 24 and npm.
- Git to clone the repository.
- A reachable PostgreSQL database, such as a Supabase project.

The project has been built and run on Node.js 24.

### 2. Clone and Install

```bash
git clone https://github.com/darshankreddy7507/Srujana_hackathon2026_ShockLens.git
cd Srujana_hackathon2026_ShockLens
npm install --include=dev
```

Run all commands from the repository root containing the workspace `package.json`. If using the downloaded archive, open its inner project folder.

On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

### 3. Configure the Backend

Copy `apps/backend/.env.example` to `apps/backend/.env`:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/postgres
SESSION_SECRET=replace-with-a-long-random-secret
PORT=4000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173
```

Use your provider's database connection string, including the required connection parameters.

For Express authentication, leave the Supabase Auth key fields empty. Supabase PostgreSQL can be used independently of Supabase Auth.

### 4. Optional: Enable Supabase Auth

Copy `apps/frontend/.env.example` to `apps/frontend/.env.local`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Add the corresponding backend variables to `apps/backend/.env`:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
```

Use the URL and key from the **same project** on both sides. Add these redirect URLs in Supabase Auth settings:

- `http://localhost:5173/auth/callback`
- `http://127.0.0.1:5173/auth/callback`
- `https://shocklens.vercel.app/auth/callback` for the deployed application.

Never put a service-role key, database password, or session secret in a `VITE_*` variable. Those variables are included in the browser bundle.

See [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for email confirmation and account-linking details.

### 5. Generate Prisma Client and Prepare the Database

```bash
npm run db:generate
npm run db:push --workspace=apps/backend
npm run build --workspace=packages/shared
```

Use `db:push` for a new development database. Review schema changes before applying them to an existing database; production changes should follow a reviewed migration process.

Run `db:generate` again after moving the project between operating systems or changing the Prisma schema.

### 6. Launch the Application

```bash
npm run dev
```

| Service | Local URL |
| --- | --- |
| Frontend | [localhost:5173](http://localhost:5173) |
| API health | [localhost:4000/api/health](http://localhost:4000/api/health) |

Register an account, create a portfolio, add holdings, and explore the analysis pages.

---

## API Reference

The API uses the `/api` prefix. Account-specific routes require an authenticated session or a verified Supabase bearer token when Supabase Auth is configured.

### Authentication

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register an Express email/password account |
| `POST` | `/api/auth/login` | Sign in and establish a session |
| `POST` | `/api/auth/logout` | End the Express session |
| `GET` | `/api/auth/me` | Read the authenticated user's profile |
| `PATCH` | `/api/auth/profile` | Update supported profile fields |

When Supabase Auth is enabled, frontend registration and sign-in use the Supabase SDK; the API verifies the access token and links the app profile.

### Portfolios and Holdings

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET / POST` | `/api/portfolios` | List or create portfolios |
| `GET / PATCH / DELETE` | `/api/portfolios/:id` | Read, update, or delete a portfolio |
| `POST` | `/api/portfolios/:id/holdings` | Add a holding |
| `PATCH / DELETE` | `/api/holdings/:id` | Update or delete a holding |
| `POST` | `/api/portfolios/:id/import` | Import a holdings CSV |
| `GET` | `/api/portfolios/csv-template/download` | Download the CSV template |

### Goals and Scenario Analysis

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET / POST` | `/api/goals` | List or create financial goals |
| `PATCH / DELETE` | `/api/goals/:id` | Update or delete a goal |
| `POST` | `/api/goals/recommend-investments` | Generate goal-oriented investment analysis |
| `POST` | `/api/analysis/exposure` | Analyze portfolio exposure |
| `POST` | `/api/analysis/scenario` | Run a portfolio scenario |
| `POST` | `/api/analysis/compare` | Compare alternative allocations |

### Market Intelligence and Copilot

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/stocks/search?q=TCS` | Search stocks |
| `GET` | `/api/stocks/quote/:symbol` | Fetch stock data |
| `POST` | `/api/stocks/compare-and-switch` | Compare a potential stock switch |
| `GET` | `/api/butterfly/baselines` | Read macroeconomic baselines |
| `GET` | `/api/butterfly/realtime-analysis` | Generate macro transmission analysis |
| `POST` | `/api/butterfly/simulate` | Simulate a macroeconomic shock |
| `POST` | `/api/butterfly/shock-immunity` | Explore modeled hedge allocations |
| `POST` | `/api/copilot/chat` | Ask PortfolioIQ Copilot a question |

### Reports and Health

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET / POST` | `/api/reports` | List or create reports |
| `GET` | `/api/reports/:id` | Read a saved report |
| `GET` | `/api/reports/:id/download` | Download a saved report |
| `GET` | `/api/health` | Check API availability |

---

## Testing

Run the shared and backend suites:

```bash
npm test
```

Run either workspace separately:

```bash
npm test --workspace=packages/shared
npm test --workspace=apps/backend
```

The last verified run passed **61 tests**:

| Suite | Verified result |
| --- | --- |
| Shared calculations | 46 passed |
| Backend intent routing, research, and Copilot behavior | 15 passed |

Some backend tests call external market-data providers and require internet access. The badge records the verified run; it is not a live CI status.

Build all workspaces:

```bash
npm run build
```

The build runs shared code first, then the API, then the frontend.

---

## Project Structure

```text
ShockLens/
├── api/
│   └── index.ts                 # Vercel API entry point
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   └── schema.prisma    # PostgreSQL models
│   │   ├── src/
│   │   │   ├── __tests__/       # Backend tests
│   │   │   ├── middleware/      # Authentication and validation
│   │   │   ├── routes/          # REST endpoints
│   │   │   ├── services/        # Market and portfolio analysis
│   │   │   ├── app.ts           # Express application
│   │   │   ├── db.ts            # Prisma client
│   │   │   └── index.ts         # Local API server
│   │   └── .env.example
│   └── frontend/
│       ├── src/
│       │   ├── components/      # Reusable UI
│       │   ├── lib/             # API and Supabase clients
│       │   ├── pages/           # Public and protected pages
│       │   └── App.tsx          # Application routing
│       ├── .env.example
│       └── vite.config.ts       # Development API proxy
├── packages/
│   └── shared/
│       └── src/                 # Types, schemas, calculations, tests
├── package.json                 # npm workspace commands
├── vercel.json                  # Production build and routing
├── .vercelignore                # Deployment exclusions
├── SUPABASE_SETUP.md             # Supabase Auth guide
└── README.md
```

---

## Deployment on Vercel

**Production URL:** [shocklens.vercel.app](https://shocklens.vercel.app)

Deploy from the repository root. The included configuration:

1. Installs dependencies with `--include=dev` so build tools remain available.
2. Generates Prisma Client for the deployment platform.
3. Builds shared code, backend, and frontend.
4. Serves `apps/frontend/dist` and routes API requests to `api/index.ts`.

Configure server-side production variables in Vercel:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Secret for signing Express sessions |
| `NODE_ENV` | Set to `production` |

For Supabase Auth, also configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. Frontend environment changes require a new build.

```bash
npx vercel login
npx vercel link
npx vercel deploy --prod
```

Link to a project in a Vercel team you can access.

### Deployment Verification

- `/` serves the homepage.
- `/app/butterfly` serves the React application, with account access enforced by the frontend.
- `/api/health` returns JSON with `"status": "ok"`.
- `/api/auth/me` returns `401` when signed out.

**Current Auth status:** The deployed application uses the Express authentication fallback. Supabase Auth still needs the correct publishable/anon key for the configured project.

---

## Security and Data Handling

- Passwords for Express accounts are hashed with bcrypt.
- Production session cookies use HTTP-only and secure settings.
- Account-specific portfolio operations check the authenticated user's identity.
- Request validation uses shared Zod schemas.
- The API includes rate limiting, CORS configuration, and Helmet headers.
- Keep database passwords, session secrets, and service-role keys out of source control and browser variables.

The optional `npm run db:seed` command is intended for disposable demo databases. It deletes existing demo records and clears cached analysis records before inserting fictional data.

---

## Limitations

- External market data can be delayed, rate-limited, or unavailable.
- Some macro indicators use explicitly marked fallback baselines when provider requests fail.
- Scenario outcomes depend on model assumptions and are not guaranteed returns.
- Recommendations and hedge allocations do not execute trades.
- ShockLens is an educational portfolio analysis project, not personalized financial advice.

---

## Contributing

1. Fork the repository.
2. Create a focused feature branch.
3. Make changes without committing credentials or generated files.
4. Run `npm run build` and `npm test`.
5. Open a pull request describing the behavior changed and validation performed.

---

<div align="center">

**ShockLens** — *Understand the ripple before it reaches your portfolio.*

[Open the App](https://shocklens.vercel.app) • [Browse the Code](https://github.com/darshankreddy7507/Srujana_hackathon2026_ShockLens)

</div>
