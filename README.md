# ⚡ ShockLens

> **Institutional-Grade Autonomous Portfolio Resilience & Macroeconomic Transmission Engine**  
> *Built for Srujana Hackathon 2026*

ShockLens is an institutional-grade portfolio resilience and risk engineering platform designed for equity investors. Rather than relying on lagging backward-looking statistical correlations (VaR, static historical betas), ShockLens models **real-time structural macroeconomic causality**—connecting geopolitical disruptions, central bank policy shifts, currency swings, and commodity shocks directly to individual stock holdings, earnings elasticities, and personalized financial milestones.

---

## 🌟 Key Features

### 🌐 1. Market Nexus (Autonomous Macro Shock Transmission)
- **Live Macro Barometer**: Continuously tracks real-time spot benchmarks:
  - **Brent Crude Oil** (`CL=F`) – Energy baseline & freight impact
  - **USD / INR Spot** (`INR=X`) – Import bill drain & FX translation
  - **US 10-Year Treasury Yield** (`^TNX`) – Global cost of capital & discount rate reset
  - **Nifty 50 & Bank Nifty** (`^NSEI`, `^NSEBANK`) – Domestic tape momentum
- **4-Stage Causal Transmission Graph**:
  $$\text{Live Trigger} \longrightarrow \text{Macro Factor} \longrightarrow \text{Sector Elasticity} \longrightarrow \text{Holding Impact (₹)}$$
- **Holdings Impact Attribution**: Granular breakdown of each portfolio holding showing sectoral sensitivities, estimated percentage returns, and monetary gain/loss in ₹.
- **Natural Hedging Detection**: Automatically surfaces counter-cyclical positions within the portfolio (e.g., export-driven IT and upstream energy buffering auto/paint compression).

### 🎯 2. Financial Goals & Dynamic Holdings Audit
- **Goal Feasibility Engine**: Calculates the required compound annual growth rate (CAGR) needed to meet targeted financial deadlines and amounts.
- **Underperformer Audit**: Automatically flags portfolio holdings dragging down target timelines based on rolling 1-year momentum, annualized volatility, and maximum drawdown.
- **Dynamic Screener & Replacement Basket**: Evaluates a live universe of liquid NSE equities across diverse sectors to curate optimal, personalized replacement compounders.
- **Integrated Dump & Add Execution**: Seamlessly remove lagging positions and reallocate capital into recommended picks directly synchronized with the portfolio.

### 🔄 3. Stock Switch & Comparative Analyzer
- **Direct Side-by-Side Diagnostics**: Real-time comparative analysis between an existing position and a prospective target replacement.
- **Metric-by-Metric Attribution**: Live evaluation of:
  - 1-Year Trailing Returns & 6-Month Momentum
  - 52-Week Range & Volatility Profiles
  - Fundamental Risk Metrics & Equivalent Share Allocations

### 📡 4. Event Horizon Radar
- **Forward-Looking Event Calendar**: Proactively models upcoming macroeconomic events (FOMC rate decisions, RBI policy announcements, OPEC+ ministerial reviews, and CPI prints).
- **Pre-Event Portfolio Impact Prediction**: Forecasts estimated ₹ headwinds or tailwinds on specific asset allocations *before* events take place, moving risk management from reactive to predictive.

### 💼 5. Portfolio Manager & Dynamic Branding
- **Multi-Portfolio Tracking**: Create and manage multiple distinct investment portfolios.
- **Dynamic Stock Logos**: Instant high-fidelity corporate brand logos embedded beside tickers and names across every view.
- **Multi-Asset Allocation Analytics**: Visual asset exposure charts across equities, cash, fixed income, and commodities.

---

## 🏗️ System Architecture

ShockLens is built as an end-to-end TypeScript monorepo with high modularity and deterministic mathematical modeling:

```
Srujana_Hackathon2026_ShockLens/
├── apps/
│   ├── backend/        # Express.js REST API, Prisma ORM, Macro Engine
│   └── frontend/       # React 18, Vite, Tailwind CSS, Recharts, Framer Motion
└── packages/
    └── shared/         # Shared TypeScript interfaces, types, and validation schemas
```

### Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI, TanStack React Query, Recharts, Framer Motion, Lucide Icons
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL (Supabase), Pino Logging
- **Market Data Feeds**: Yahoo Finance API integration, NSE / BSE equity quotes & global commodity futures
- **Testing**: Vitest, Playwright E2E

---

## 📊 Analytical Methodology

ShockLens replaces black-box deep learning with **deterministic econometric mechanics**:

1. **Macro Factor Deviation**:
   $$\Delta M_t = \frac{P_{\text{current}} - P_{\text{neutral}}}{P_{\text{neutral}}}$$
2. **Multi-Stage Transmission Shock**:
   $$S_{\text{macro}} = \sum_{i} w_i \cdot \Delta M_i + \text{TapeShock}$$
3. **Holding Return & Monetary Impact**:
   $$\text{Est. Return } (\%) = S_{\text{macro}} \times \beta_{\text{sector}}$$
   $$\text{Monetary Impact } (₹) = \text{Holding Value} \times \frac{\text{Est. Return}}{100}$$

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL Database** (e.g., Supabase or local instance)

---

### 1. Clone the Repository
```bash
git clone https://github.com/darshankreddy7507/Srujana_Hackathon2026_ShockLens.git
cd Srujana_Hackathon2026_ShockLens
```

---

### 2. Install Dependencies
```bash
npm install
```

---

### 3. Configure Environment Variables

#### Backend (`apps/backend/.env`):
```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
SESSION_SECRET="your-super-secret-session-key"
CORS_ORIGIN="http://localhost:5173"
```

#### Frontend (`apps/frontend/.env.local`):
```env
VITE_API_URL="http://localhost:4000/api"
```

---

### 4. Database Setup & Migration
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:migrate

# (Optional) Seed initial data
npm run db:seed
```

---

### 5. Run Development Servers
Start both backend (port `4000`) and frontend (port `5173`) concurrently:

```bash
npm run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:4000](http://localhost:4000)

---

## 🧪 Testing & Build

```bash
# Run unit & integration tests
npm test

# Build all workspaces
npm run build
```

---

## 🛡️ License

This project is licensed under the [MIT License](LICENSE).
