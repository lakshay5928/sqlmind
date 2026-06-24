<div align="center">

# ⚡ SQLMind AI

### Intelligent SQL Copilot — Generate, Optimize, Explain, Visualize

**Author: Lakshay Verma**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org)
[![Groq](https://img.shields.io/badge/Groq-Llama_3.3_70B-orange)](https://console.groq.com)
[![SQLite](https://img.shields.io/badge/Database-SQLite-blue)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Free](https://img.shields.io/badge/Cost-100%25_Free-brightgreen)]()

*No login required · No paid APIs · Works offline with Ollama*

</div>

---

## 📋 Table of Contents

- [What is SQLMind AI?](#what-is-sqlmind-ai)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [AI Modes](#ai-modes)
- [User Roles](#user-roles)
- [Schema Import](#schema-import)
- [Security](#security)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)

---

## What is SQLMind AI?

SQLMind AI is a full-stack AI-powered SQL developer tool that combines:

- **Natural Language → SQL** generation (describe in English, get SQL)
- **SQL optimization** with before/after performance metrics
- **Schema-aware queries** (upload your actual database schema)
- **Multi-language explanations** (English + Hindi/Hinglish)
- **Interactive ER Diagrams** for schema visualization
- **Role-based access control** (Admin / Developer / End User)
- **Real analytics dashboard** built from your query history

Think of it as GitHub Copilot + Supabase Studio + Cursor AI, but for SQL — completely free.

---

## Features

### 🧠 AI Engine
| Feature | Description |
|---|---|
| NL → SQL | Describe in plain English, get optimized SQL instantly |
| Schema-Aware | AI knows your actual table names and columns |
| Multi-dialect | PostgreSQL, MySQL, SQLite, Generic SQL |
| English Explanation | Clause-by-clause breakdown in English |
| Hindi Explanation | Same explanation in Hindi/Hinglish |
| Query Optimization | AI rewrites queries for better performance |

### 📊 Analysis
| Feature | Description |
|---|---|
| Health Score | 4-axis: Performance / Security / Readability / Optimization |
| Query Playground | Before/After: Execution Cost, Memory MB, Estimated Rows |
| Smart Index Advisor | Specific CREATE INDEX suggestions with confidence % |
| Complexity Analyzer | Joins, subqueries, aggregations, nesting depth |
| Production Audit | Flags unsafe queries before they go to production |
| SQL Diff View | Line-level diff between original and optimized SQL |

### 🗂️ Schema Features
| Feature | Description |
|---|---|
| Paste SQL | Paste CREATE TABLE statements directly |
| File Upload | Upload `.sql`, `.csv`, `.db`, `.sqlite` files |
| Visual Builder | Build schema with a GUI — no SQL needed |
| ER Diagram | Interactive draggable entity-relationship diagram |
| Sample Queries | Auto-generated queries based on your schema |

### 🔒 Security
| Feature | Description |
|---|---|
| Session Isolation | Each browser session has its own data — no cross-user leakage |
| Rate Limiting | 20 queries/minute per session — prevents API abuse |
| Credit Tracking | Live display of API calls used and remaining |
| Role Permissions | End Users cannot generate UPDATE/DELETE/DROP queries |
| Input Sanitization | All inputs sanitized before processing |
| Security Headers | X-Frame-Options, XSS-Protection, CORS headers |

### 📤 Export & Integration
| Format | Description |
|---|---|
| SQL | Optimized SQL file download |
| Express.js | Ready-to-use Node.js API route |
| FastAPI | Ready-to-use Python API route |
| Markdown | Formatted query report |
| JSON | Structured analysis data |
| PDF | Print-to-PDF report |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        SQLMind AI                            │
├──────────────┬──────────────────────┬───────────────────────┤
│  Left Panel  │    Center Panel      │    Right Panel         │
│              │                      │                        │
│  • History   │  • Monaco Editor     │  • Health Score        │
│  • Schema    │  • NL Input          │  • Query Playground    │
│  • ER Diagram│  • Templates         │  • Explanation (EN+HI) │
│  • Builder   │  • Role/Dialect      │  • Index Advisor       │
│              │  • Notes             │  • Execution Plan      │
│              │                      │  • SQL Diff            │
│              │                      │  • Alt Queries         │
│              │                      │  • AI Chat             │
│              │                      │  • Live EXPLAIN        │
│              │                      │  • Export              │
└──────────────┴──────────────────────┴───────────────────────┘

AI Provider Detection (auto, in priority order):
┌─────────────────────────────────────────────────┐
│  1. Groq API ──── Llama 3.3 70B (fastest, free) │
│  2. Ollama ─────── Local model (offline, free)  │
│  3. Rule Engine ── Deterministic (zero setup)   │
└─────────────────────────────────────────────────┘

Data Flow:
User Input → Session Check → Rate Limit → AI Engine → Analysis → Save to SQLite → Response
```

---

## Quick Start

```bash
# 1. Extract zip and enter folder
cd sqlmind

# 2. Install dependencies
npm install

# 3. Create environment file
# Windows CMD:
copy .env.local.example .env.local
# Mac/Linux:
cp .env.local.example .env.local

# 4. Add your free Groq API key to .env.local
# Get key at: https://console.groq.com (free, no credit card)

# 5. Set up database
npx prisma generate
npx prisma db push

# 6. Start the app
npm run dev
```

Open **http://localhost:3000**

---

## Detailed Setup

### Step 1: Node.js

Make sure you have Node.js 18 or later:
```bash
node --version   # Should be v18+
```
Download: https://nodejs.org

### Step 2: Install Dependencies

```bash
npm install
```

This installs: Next.js, Framer Motion, Monaco Editor, Groq SDK, Prisma, D3, Recharts, and all other dependencies.

### Step 3: Environment Configuration

```bash
# Windows CMD:
copy .env.local.example .env.local

# PowerShell:
Copy-Item .env.local.example .env.local

# Mac/Linux:
cp .env.local.example .env.local
```

Open `.env.local` in any text editor and configure:

```env
# REQUIRED — Get free at https://console.groq.com
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auto-created SQLite database (no setup needed)
DATABASE_URL="file:./dev.db"

# OPTIONAL — Ollama local AI
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.3

# OPTIONAL — Live EXPLAIN (your PostgreSQL/MySQL connection)
LIVE_DB_URL=
```

### Step 4: Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Create SQLite database file (dev.db)
npx prisma db push
```

This creates a `dev.db` file in your project folder — your local SQLite database.

### Step 5: Run

```bash
npm run dev
```

App runs at **http://localhost:3000**

---

## AI Modes

SQLMind AI automatically detects which AI provider is available and uses the best one:

### 1. 🟣 Groq API (Recommended)

**Model:** Llama 3.3 70B Versatile  
**Speed:** ~2-4 seconds per query  
**Cost:** Free (no credit card required)  
**Limits:** 14,400 requests/day · 6,000 tokens/minute  

**Setup:**
1. Go to https://console.groq.com
2. Click "Create API Key"
3. Copy the key (starts with `gsk_`)
4. Paste into `.env.local` as `GROQ_API_KEY=gsk_...`

**What it powers:** NL→SQL generation, English explanation, Hindi explanation, query optimization — all 4 in parallel.

**Credit usage (shown in UI):**
- NL mode: 4 API calls per query (generate + explain EN + explain HI + optimize)
- SQL mode: 2 API calls per query (explain EN + explain HI)
- Rate limit: 20 queries/minute per session (shown live in header)

### 2. 🟢 Ollama (Local, Fully Offline)

**Cost:** Free forever  
**Privacy:** 100% local — no data leaves your machine  
**Speed:** Depends on your hardware (GPU recommended)  

**Setup:**
```bash
# Install Ollama
# Download from https://ollama.ai

# Pull a model (choose one):
ollama pull llama3.3          # Best quality (8B)
ollama pull qwen2.5-coder     # Best for SQL specifically
ollama pull deepseek-r1       # Good reasoning
ollama pull gemma3            # Lightweight

# Start Ollama server
ollama serve
```

The app auto-detects Ollama on `localhost:11434` and switches the AI badge to green.

**To use a specific model**, set in `.env.local`:
```env
OLLAMA_MODEL=qwen2.5-coder
```

### 3. ⚪ Rule Engine (Zero Setup, Always Works)

When no AI provider is available, SQLMind uses a built-in deterministic engine:
- Pattern-matching NL→SQL (handles ~80% of common queries)
- Rule-based health scoring
- Deterministic warnings and index suggestions
- Full playground metrics

This means the app **never breaks** — you always get useful output.

**Detection logic:**
```
If GROQ_API_KEY set and valid → Use Groq
Else if Ollama running on :11434 → Use Ollama  
Else → Use Rule Engine
```

---

## User Roles

Select role in the top navigation bar. Controls what SQL can be generated.

### 👑 Admin
- All SQL operations: SELECT, INSERT, UPDATE, DELETE, ALTER, CREATE, DROP, TRUNCATE
- Can generate any query type
- Use for: Database administrators, senior engineers

### 💻 Developer
- DML operations: SELECT, INSERT, UPDATE, DELETE
- Cannot generate DDL (ALTER TABLE, DROP TABLE, etc.)
- Use for: Application developers, backend engineers

### 👤 End User
- SELECT only (read-only)
- AI refuses to generate UPDATE/DELETE/INSERT queries
- Generates reports and data fetch queries only
- Use for: Business analysts, report users, data consumers

**Security enforcement:**  
If an End User tries to ask "delete all employees", the API returns a permission error — the role restriction is enforced server-side, not just in the UI.

---

## Schema Import

Make your queries schema-aware — AI knows your actual tables and columns.

### Method 1: Paste SQL

Go to Schema tab → Paste mode → Paste your CREATE TABLE statements:

```sql
CREATE TABLE employees (
  employee_id INT PRIMARY KEY,
  first_name VARCHAR(20),
  last_name VARCHAR(25) NOT NULL,
  email VARCHAR(100),
  salary DECIMAL(8,2),
  department_id INT,
  FOREIGN KEY (department_id) REFERENCES departments(department_id)
);
```

Click **Apply Schema** → AI now knows your tables.

### Method 2: Upload File

Supported formats:
- `.sql` — Full SQL dump (handles CREATE TABLE, FOREIGN KEY, INSERT, etc.)
- `.csv` — Auto-infers schema from headers and sample data
- `.db` / `.sqlite` — SQLite database files

Upload your `employee.sql` → Schema auto-parsed → Tables listed with columns.

### Method 3: Visual Builder

Click **Builder** tab → Add tables visually → Set column names, types, PKs, FKs → Click **Apply Schema**.

### After Schema Import

Once schema is loaded:
- NL queries become context-aware: *"show top 5 employees by salary"* generates a proper query using your actual column names
- ER Diagram button appears — click to visualize relationships
- Sample queries auto-suggested based on your tables

---

## Security

### Session Isolation
Each browser session gets a unique session ID (HTTP-only cookie). Your query history is scoped to your session — if two people use the app simultaneously, they cannot see each other's data.

### Rate Limiting
- **20 queries per minute** per session (sliding window)
- Prevents API key exhaustion from a single user
- UI shows real-time remaining quota with a progress bar
- Returns HTTP 429 with `retryAfter` when exceeded

### Role-Based Query Control
Server-side validation enforces role permissions:
- End User + "delete all records" → 403 Forbidden
- Developer + "DROP TABLE" → 403 Forbidden

### Input Sanitization
- Null bytes and control characters stripped
- Input capped at 10,000 characters
- SQL schema context capped at 5,000 characters in DB

### Security Headers (via middleware)
All responses include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

---

## Deployment

### Vercel (Recommended, Free)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "feat: SQLMind AI initial commit"
git remote add origin https://github.com/lakshayverma/sqlmind.git
git push -u origin main

# 2. Deploy on Vercel
# Go to https://vercel.com → New Project → Import GitHub repo
```

Add these environment variables in Vercel dashboard:
```
GROQ_API_KEY = gsk_your_key_here
DATABASE_URL = file:./dev.db
```

Click **Deploy**.

### Production Database

For production with persistent data across deployments, replace SQLite with:

**Option A — Turso (Free SQLite Cloud)**
```bash
npm install @libsql/client
# Sign up at https://turso.tech
# Update DATABASE_URL in Vercel env vars to your Turso URL
```

**Option B — Neon (Free PostgreSQL)**
```bash
# Sign up at https://neon.tech
# Change prisma/schema.prisma: provider = "postgresql"
# Update DATABASE_URL to your Neon connection string
```

---

## Project Structure

```
sqlmind/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (aurora hero)
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Global styles + animations
│   │   ├── workspace/
│   │   │   └── page.tsx               # Main 3-column workspace
│   │   ├── dashboard/
│   │   │   └── page.tsx               # Analytics dashboard
│   │   └── api/
│   │       ├── query/route.ts          # Main query endpoint
│   │       ├── history/route.ts        # Query history CRUD
│   │       ├── analytics/route.ts      # Dashboard metrics
│   │       ├── schema/route.ts         # Schema save/load
│   │       ├── ai-chat/route.ts        # AI chat endpoint
│   │       ├── templates/route.ts      # SQL template library
│   │       ├── versions/route.ts       # Query version history
│   │       └── live-explain-real/      # Live DB EXPLAIN
│   │           └── route.ts
│   ├── components/
│   │   └── workspace/
│   │       ├── LeftPanel.tsx           # History + Schema manager
│   │       ├── CenterPanel.tsx         # Monaco editor + NL input
│   │       ├── RightPanel.tsx          # AI analysis (all tabs)
│   │       ├── ERDiagram.tsx           # Interactive ER diagram
│   │       ├── SQLDiff.tsx             # SQL diff view
│   │       ├── SchemaBuilder.tsx       # Visual schema builder
│   │       └── CreditDisplay.tsx       # API credit tracker
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── provider.ts            # Groq/Ollama/Rules detection
│   │   │   └── engine.ts              # Query processing orchestrator
│   │   ├── sql/
│   │   │   ├── rules.ts               # Deterministic analysis engine
│   │   │   └── schema-parser.ts       # SQL/CSV/DB schema parser
│   │   ├── security/
│   │   │   └── rateLimit.ts           # Rate limiter + session utils
│   │   └── db/
│   │       └── prisma.ts              # Prisma client singleton
│   └── middleware.ts                   # Session cookie + security headers
├── prisma/
│   └── schema.prisma                   # SQLite data model
├── .env.local.example                  # Environment template
└── README.md                           # This file
```

---

## Troubleshooting

### "prisma generate" fails
```bash
# Retry — sometimes it's a temporary network issue
npx prisma generate
npx prisma db push
```

### History/Analytics returns 500
The database wasn't created yet:
```bash
npx prisma generate
npx prisma db push
```

### "copy is not recognized" on Windows
Use these alternatives:
```cmd
# CMD:
copy .env.local.example .env.local

# PowerShell:
Copy-Item .env.local.example .env.local
```

### Queries fail with "Query processing failed"
1. Check `.env.local` exists and has `DATABASE_URL="file:./dev.db"`
2. Run `npx prisma db push`
3. Restart dev server

### Groq API returns 401
- Key must start with `gsk_`
- Get a new key at https://console.groq.com

### Schema upload not parsing FOREIGN KEY
The parser handles MySQL `FOREIGN KEY (col) REFERENCES table (col)` syntax correctly. Make sure your SQL file uses standard CREATE TABLE syntax.

### ER Diagram shows no relationships
FK relationships are detected from `REFERENCES tableName` in column definitions. If you use standalone `FOREIGN KEY` constraint lines, the parser extracts them automatically.

### Port 3000 already in use
```bash
npm run dev -- -p 3001
```

---

## Available Scripts

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run db:push      # Sync Prisma schema to SQLite
npm run db:studio    # Open Prisma Studio (visual DB browser)
```

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Full-stack, Vercel-native, fast |
| Styling | Tailwind CSS + Framer Motion | Utility-first + smooth animations |
| SQL Editor | Monaco Editor | VS Code engine in the browser |
| AI Primary | Groq API — Llama 3.3 70B | Fastest free LLM, 70B quality |
| AI Fallback | Ollama (local) | 100% offline, privacy-first |
| AI Offline | Rule-based engine | Zero-dependency, always works |
| Database | SQLite via Prisma ORM | Zero-config, file-based |
| Charts | Recharts | Composable React charts |
| ER Diagram | Custom SVG + D3 layout | Interactive, draggable |
| Markdown | react-markdown | Render AI explanations |
| Security | Custom middleware | Rate limiting, session isolation |
| Icons | Lucide React | Clean, consistent iconography |
| Notifications | Sonner | Beautiful toast system |

---

## Author

**Lakshay Verma**  

---

*SQLMind AI — Making SQL accessible, understandable, and optimized for every developer.*
