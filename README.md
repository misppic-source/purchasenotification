# Raw Material Arrival Control & Purchase Notification

Web application for planning raw-material arrivals, reporting deliveries, approving receipts, and managing purchase notifications.

## Requirements

- Node.js 20.19+ or 22.12+
- A private, persistent disk for the runtime JSON database

## Local setup

1. Install dependencies:

   ```sh
   npm install --legacy-peer-deps
   ```

2. Copy `.env.example` to `.env` and replace the placeholder values. Set a unique `JWT_SECRET` of at least 32 characters and a unique `BOOTSTRAP_ADMIN_PASSWORD` of at least 12 characters. The bootstrap email and password are used only when the database is first created.

3. Start the application:

   ```sh
   npm run dev
   ```

   Open <http://localhost:3000>. The first startup creates an empty database and the configured PPIC administrator. Sign in and use **User Accounts** to create purchase-team accounts.

Use `npm run build` to build the frontend. Set `GEMINI_API_KEY` to enable the AI assistant; it is optional for the other application features.

## Data and deployment

Application records are stored in `data/rm_database.json`. This directory is intentionally excluded from Git because it contains user and purchasing data. Back it up securely and persist it on a private disk in production; do not serve it as a public artifact. Keep `.env` and production secrets out of source control. Use HTTPS and a private, access-controlled deployment for real company data.
