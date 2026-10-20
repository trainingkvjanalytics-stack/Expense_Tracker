# My Money Tracker — Personal Expense Tracker Web Application

A full-stack, production-quality personal expense, investment, and debt tracking web application designed primarily for mobile devices, while working seamlessly on desktop and tablet computers.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **shadcn/ui**, **Lucide Icons**, **Recharts**, and **Supabase (PostgreSQL + Auth + RLS)**.

---

## Features

### 1. Dashboard & Visual Analytics
- **Financial Summary Cards**: Real-time tracking of Total Income, Total Expenses, Remaining Available Balance, and Total Portfolio Investments.
- **Monthly Rollover Calculation**: Previous month's closing balance automatically becomes the next month's opening balance.
- **Interactive Expense Donut Chart**: Category-wise expense distribution with center total and drill-down tooltips (excludes investments and lent principal).
- **Weekly Expense Column Chart**: Calendar-week grouped expenditure bars with live date-range filtering.
- **Quick Action Bar**: Instant 1-tap modals for Income, Expense, Lent Money, and Investments.
- **Recent Activities**: Chronological transaction stream with quick details.

### 2. Income & Expense Transactions
- React Hook Form + Zod validated forms with decimal-safe numeric handling.
- Cascading Category and Subcategory selection.
- Multi-account selection (Savings, Current, Cash Wallet) and payment modes (Cash, Card, UPI).
- Indian Rupee (`₹`) formatting.

### 3. Lent Money Management
- Tracks loans given to other individuals with expected repayment dates and overdue indicators.
- **Separation of Concerns**: Lending reduces available cash without being counted as a consumption expense.
- **Full Settlement Dialog**: Confirms receipt, updates bank balance, and archives record with full history intact.
- **Partial Repayments**: Records partial returns, updates outstanding balances, and preserves complete payment logs.

### 4. Investment Tracking
- Track contributions across **SIP** and **One-Time** methods.
- Products supported: Mutual Funds, Stocks, Gold Funds, Fixed Deposits, and custom products.
- Investments reduce liquid cash without distorting consumption expenses.

### 5. Bank Account & Wallet Management
- Multi-account management with live balance calculation from transaction history.
- **Fund Transfers**: Transfer money between your own accounts without affecting income or expense totals.
- Privacy-first: Never asks for bank passwords or credentials.

### 6. Activity Ledger & Audit Trail
- Filter transactions by type, category, date range, bank account, and payment mode.
- Full-text search across descriptions, categories, people, and investments.

### 7. Expense Calendar Heatmap
- 5-level spending intensity gradient calendar.
- Month-level statistics: Total expense, highest-spending day, and daily average.
- Tapping any date opens that day's transaction breakdown.

### 8. Settings & Data Export
- Custom opening balance and starting date.
- CSV Export with customizable date range filters.
- Category & Subcategory manager with color palettes and Lucide icons.

### 9. Progressive Web App (PWA)
- Installable on Android, iOS, and desktop browsers.
- Service worker caching and offline-first capabilities.

---

## Financial Accounting Rules

$$\text{Remaining Balance} = \text{Opening Balance} + \text{Income} + \text{Repayments} - \text{Expenses} - \text{Investments} - \text{Money Lent}$$
$$\text{Monthly Net Income} = \text{Income} - \text{Expenses}$$

- **Income**: Increases destination account and monthly income.
- **Expense**: Decreases source account and increases monthly expenses.
- **Money Lent**: Decreases source account; creates an asset; does not count as regular expense.
- **Lent Repayment**: Increases receiving account; reduces debt; returns principal (not new income).
- **Investment**: Decreases source account; records an asset; does not count as regular expense.
- **Transfer**: Moves funds from source to destination account with net-zero effect on balance.

---

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4, Lucide Icons
- **UI Primitives**: Radix UI / shadcn/ui
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Form Management**: React Hook Form, Zod
- **Notifications**: Sonner toasts
- **Backend / DB**: Supabase (PostgreSQL, Supabase Auth, Row Level Security)
- **Testing**: Vitest

---

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/trainingkvjanalytics-stack/Expense_Tracker.git
cd Expense_Tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Supabase
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-key
```

### 4. Database Setup
Run the consolidated SQL setup script located at `supabase/complete_setup.sql` in your **Supabase Dashboard SQL Editor**:
- Creates all tables (`profiles`, `accounts`, `categories`, `subcategories`, `transactions`, `lent_records`, `lent_repayments`, `investments`, `app_settings`)
- Configures indexes and `updated_at` triggers
- Enables Row Level Security (RLS) with user isolation policies
- Sets up automatic user onboarding and category seeding triggers

### 5. Run Development Server
```bash
npm run dev
```

### 6. Run Automated Tests
```bash
npm test
```

### 7. Build for Production
```bash
npm run build
```

---

## License
MIT License.
