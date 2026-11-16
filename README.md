# Voter-web 🗳️

A modern, high-performance web application designed for voter management, election campaign tracking, family voter grouping, and bulk data operations. Built with Next.js 15, React 19, Tailwind CSS v4, Prisma ORM, and MySQL.

---

## 🚀 Features

- **Authentication & Authorization**
  - Phone number & OTP-based passwordless login.
  - Role-Based Access Control (Admin, Volunteer/User).
  - Secure stateless JWT session cookies.
  - Development OTP bypass and console logging for easy local testing.

- **Voter Management**
  - Search, filter, and paginate through voter records.
  - Tag voters by color codes (`OUR`, `OPPOSITE`, `DOUBTFUL`, `OTHER`).
  - Update contact information, address details, and notes.
  - Bulk voter deletion and management.

- **Family Grouping**
  - Automatic & manual family grouping based on house numbers and relationships.
  - View family members associated with a specific voter.

- **Import & Export**
  - High-concurrency chunked background imports for large voter rolls (CSV/Excel).
  - Batch import tracking and error reporting.
  - Export voter lists to Excel (.xlsx) and PDF with customized formatting.

- **Admin Management**
  - User and volunteer administration.
  - Grant or revoke administrative roles.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Frontend**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Database & ORM**: [MySQL 8.4](https://www.mysql.com/), [Prisma ORM](https://www.prisma.io/)
- **Processing**: [ExcelJS](https://github.com/exceljs/exceljs), [PDFKit](https://pdfkit.org/), [pdf-lib](https://pdf-lib.js.org/)
- **Authentication**: [jose](https://github.com/panva/jose) (JWT)

---

## 📋 Prerequisites

- **Node.js**: `>= 18.18` (Node 20+ recommended)
- **npm**, **yarn**, **pnpm**, or **bun**
- **Docker** & **Docker Compose** (for running MySQL locally, or access to an external MySQL instance)

---

## ⚡ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/kiran037/Voter-web.git
cd Voter-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Review and update the variables in `.env` to match your local or cloud setup (see [Environment Variables Reference](#-environment-variables-reference)).

### 4. Start Local Database (Docker)

If using Docker for local MySQL:

```bash
npm run db:up
```

*This spins up a MySQL 8.4 container on port `3307` with the credentials configured in `docker-compose.yml`.*

To view container logs:
```bash
npm run db:logs
```

### 5. Setup Database Schema & Seed Data

Run Prisma migrations or deploy the schema to your database:

```bash
npm run prisma:deploy
```

Generate Prisma client:
```bash
npm run prisma:generate
```

Seed the default administrator user:
```bash
npm run db:seed
```

*(By default, this creates an admin user with the phone number specified in `SEED_ADMIN_PHONE`)*

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Tip (Local Dev OTP):** In local development, `SMS_PROVIDER="log"` and `OTP_LOG_TO_CONSOLE=true` print OTPs directly to your terminal. You can also use the dev bypass OTP `000000`.

---

## 📖 Environment Variables Reference

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | MySQL connection string | `mysql://root:supersecret@localhost:3307/voterdb` |
| `JWT_SECRET` | Secret key for signing session tokens | 64-character random string |
| `SESSION_COOKIE_NAME` | Name of the session cookie | `session` |
| `SESSION_TTL_HOURS` | Session expiration in hours | `24` |
| `SESSION_COOKIE_DOMAIN`| Domain scope for cookie | Empty for localhost |
| `SMS_PROVIDER` | SMS provider (`log` or `twilio`) | `log` |
| `OTP_LOG_TO_CONSOLE` | Print OTP to terminal output | `true` |
| `OTP_DEV_BYPASS` | Fixed OTP for testing without SMS | `000000` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Optional in dev |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Optional in dev |
| `TWILIO_FROM` | Twilio sender phone number | Optional in dev |
| `SEED_ADMIN_PHONE` | Admin phone for `npm run db:seed` | `+919999999999` |
| `SEED_ADMIN_NAME` | Admin name for `npm run db:seed` | `Admin` |
| `IMPORT_CONCURRENCY` | Concurrent batch worker threads | `12` |
| `IMPORT_CHUNK_SIZE` | Voter rows per insert batch | `300` |
| `IMPORT_MAX_UPLOAD_BYTES`| Max upload size limit (bytes) | `4500000` |

---

## 📜 Available Scripts

| Script | Description |
| :--- | :--- |
| `npm run dev` | Starts development server with Turbopack |
| `npm run build` | Deploys migrations and builds production app |
| `npm run start` | Starts Next.js production server |
| `npm run lint` | Runs ESLint check |
| `npm run typecheck` | Checks TypeScript types without emitting files |
| `npm run db:up` | Starts local MySQL Docker container |
| `npm run db:down` | Stops local MySQL Docker container |
| `npm run db:seed` | Seeds database with initial administrator |
| `npm run prisma:generate` | Generates Prisma client types |
| `npm run prisma:deploy` | Applies pending Prisma migrations |
| `npm run prisma:studio` | Opens Prisma Studio GUI in browser |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
