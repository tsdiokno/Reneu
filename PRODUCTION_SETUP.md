# Reneu: Production Setup Guide (Vercel + Supabase)

This guide walks you through deploying **Reneu** to production on **Vercel** with **Supabase PostgreSQL** for multi-user cloud synchronization and authentication.

---

## Architecture: Local-First Stand-Ins with Cloud Multi-User Sync

Reneu employs a **resilient hybrid architecture**:

1. **Offline Stand-Ins (IndexedDB via Dexie)**: 
   - All 66 books of the Bible, personal verse commentaries, syntheses, reading positions, and appearance preferences persist locally in your browser immediately.
   - Operations never block on network requests. If offline or in Airplane Mode, the app operates at 100% functionality with zero lag.
2. **Multi-User Cloud Sync (Supabase PostgreSQL + Auth)**: 
   - Users can operate in Guest Stand-In Mode or sign in with their personal account.
   - Personal notes and syntheses are isolated using PostgreSQL **Row Level Security (RLS)**.
   - Edits made on a mobile device automatically sync with a desktop browser when connected.
3. **Serverless Deployment (Vercel)**: 
   - Global edge CDN for static assets and PWA service workers.
   - Serverless API proxy for Google Gemini thematic reflections.

---

## Multi-User Authentication & Costs Guide

A common question when turning an app into a multi-user platform is:
> *"Should I require standalone credentials (email/password), or use sign-ins from Google, Apple, etc.? Will it incur costs?"*

### 1. Cost Breakdown: Is Supabase Auth Free?

**YES! Supabase Auth is 100% free on the Supabase Free tier for up to 50,000 Monthly Active Users (MAUs).**

| Auth Method | Supabase Fee | Third-Party Fee | Summary & Recommendation |
| :--- | :--- | :--- | :--- |
| **Email & Password** *(Standalone)* | **$0** (Free up to 50k MAUs) | **$0** | **Best for simplicity.** No external accounts, approvals, or domain verifications needed. Completely free. |
| **Google Sign-In** *(OAuth)* | **$0** (Free up to 50k MAUs) | **$0** (Google Cloud OAuth is free) | **Best for UX.** Fast 1-click sign-in without typing passwords. Creating a Google OAuth client in Google Cloud Console is completely free. |
| **Apple Sign-In** *(OAuth)* | **$0** (Free up to 50k MAUs) | **$99 / year** (Apple Developer Program) | **Requires paid membership.** Apple mandates an active Apple Developer Program account ($99/year) to generate Service IDs & private keys. |
| **Guest / Offline Mode** | **$0** | **$0** | Zero account required. Everything stays in local IndexedDB. |

### 2. The Recommended Strategy: Support Both Email + Google

We recommend offering **Email + Password** (standalone) as the primary option, with **Google Sign-In** as a 1-click convenience:
- **Zero Ongoing Cost**: Both are 100% free forever within Supabase's generous 50,000 monthly active users tier.
- **No Paid Apple Developer Requirement**: You don't have to pay Apple's $99/year fee unless you specifically want Apple Sign-in.
- **Universal Access**: Users without Google accounts can register with any email; users with Google accounts can log in with a single click.

---

## Step 1: Set Up Supabase Database & Auth (3 Minutes)

1. **Create a Free Supabase Project**:
   - Go to [supabase.com](https://supabase.com) and create a new project.
   - Choose a project name (e.g. `reneu-bible`) and a strong database password.

2. **Run the Database Schema**:
   - In your Supabase dashboard, click **SQL Editor** in the left sidebar.
   - Click **New Query**.
   - Copy and paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) into the query editor.
   - Click **Run**.
   - This creates:
     - `public.notes` table tied to `user_id UUID REFERENCES auth.users(id)`
     - `public.user_settings` table partitioned by `user_id`
     - Fast lookup indexes on `user_id`, `(book_id, chapter)`, and `updated_at`
     - **Row Level Security (RLS)** policies that enforce strict data isolation between users

3. **Enable Auth Providers in Supabase**:
   - Navigate to **Authentication** -> **Providers** in the Supabase sidebar.
   - **Email**: Enabled by default! (Under *Email Auth*, you can toggle "Confirm email" on or off depending on whether you want immediate login or email verification).
   - **Google (Optional)**:
     1. Open [Google Cloud Console -> Credentials](https://console.cloud.google.com/apis/credentials).
     2. Create an **OAuth 2.0 Client ID** (Web Application).
     3. Add your Supabase Callback URL (found in the Supabase Google Provider panel) to *Authorized redirect URIs*.
     4. Paste the Client ID and Client Secret into Supabase and click Save.

4. **Retrieve API Credentials**:
   - In Supabase, navigate to **Project Settings** (gear icon) -> **API**.
   - Note down:
     - **Project URL** (e.g. `https://xyzproject.supabase.co`)
     - **Project API Keys** -> `anon` / `public` key

---

## Step 2: Deploy to Vercel (3 Minutes)

### Option A: Via Vercel Dashboard (Recommended)

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Go to [vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
3. Import your repository.
4. **Build Settings**:
   - Framework Preset: **Vite**
   - Build Command: `vite build`
   - Output Directory: `dist`
5. **Environment Variables**:
   Under **Environment Variables**, configure the following:

   | Variable | Value | Required? | Description |
   | :--- | :--- | :--- | :--- |
   | `GEMINI_API_KEY` | `AIzaSy...` | Optional in Dev, Recommended in Prod | Server-side Gemini API key for Intelligent Summaries. Users can also enter their own key in Settings (BYOK). |
   | `VITE_SUPABASE_URL` | `https://xyz.supabase.co` | Required for Cloud Sync | Your Supabase Project URL. |
   | `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` | Required for Cloud Sync | Your Supabase public `anon` key. |
   | `VITE_GITHUB_RELEASE_TAG` | `v1.3.0` | Optional | Release tag displayed in **Settings > Application Software Updates**. In local dev it automatically displays `Dev`. |
   | `VITE_GITHUB_REPO` | `your-username/reneu` | Optional | GitHub repository used for client-side release tag lookups. |
   | `SYNTHESIS_ENGINE_MODE` | `live` | Optional | Set to `live` (invokes Gemini models) or `simulated` (local heuristics). Defaults to `live`. |

6. Click **Deploy**. Vercel will bundle the production PWA and configure the `/api` serverless proxy via `vercel.json` and `api/index.ts`.

### Option B: Via Vercel CLI

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Link & deploy preview
vercel

# 3. Set environment variables
vercel env add GEMINI_API_KEY
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_GITHUB_RELEASE_TAG

# 4. Deploy to production
vercel --prod
```

### Option C: Self-Hosted Docker / Node.js Server (Cloud Run, Railway, Render, VPS)

Reneu includes a full-stack Express server (`server.ts`) that serves compiled static assets, registers PWA service workers, enforces security headers, and proxies Gemini API requests.

```bash
# 1. Install production dependencies
npm install

# 2. Build client assets & PWA service worker
npm run build

# 3. Start production server (listens on PORT or 3000)
NODE_ENV=production PORT=3000 npm start
```

*Note: `tsx` is included in `dependencies`, allowing minimal production environments (`npm install --omit=dev`) to execute `npm start` reliably.*

---

## Step 3: Verification & In-App Testing

1. **Verify Cloud Sync in Settings**:
   - Open your deployed application on Vercel.
   - Click the bottom dock **Settings** icon.
   - Scroll to **Multi-User Cloud Sync & Account (Supabase)**.
   - You will see: `Connected (Guest / Stand-in) • Active (Env)`.
   - Click **Test** to run an automated database connectivity handshake.

2. **Test Multi-User Account Creation**:
   - Click **Sign In / Register**.
   - Toggle to **Create Account**.
   - Register a test account with your email and a password.
   - Your account is created, and the badge displays `Private RLS`.
   - Any notes you write are now permanently associated with your unique account.

3. **Verify Gemini API Key & Intelligent Summaries**:
   - In Settings, locate the **Intelligent Summaries** section.
   - In production mode, enter your Google Gemini API Key (`AIzaSy...`) and click **Test Key**.
   - The app runs a lightweight verification handshake with Google Gemini (`gemini-3.8-flash` / `gemini-flash-latest`) and displays a confirmation badge.
   - As notes are drafted or saved, Intelligent Summaries combine reflections into thematic summaries at the top of the All Notes canvas.
   - **Theological Framework Disclosure**: The Intelligent Summaries architecture relies on an authoritative skills prompt grounded in a **broad baptistic-evangelical framework** (inerrancy and supreme authority of Scripture, gospel centrality and the finished work of Christ, personal believer conviction, and Christocentric canonical coherence). It avoids dry academic jargon and sectarian dogmatism, emphasizing clear, warm, scripture-anchored personal reflections.
   - If no custom key is provided in production, the app gracefully explains that a key is required without crashing or throwing errors.

4. **Verify Multi-Device Sync & Isolation**:
   - Open the app on another device (or an incognito window).
   - Sign into the same account; click **Sync Now** to pull your notes down.
   - Now register a second, different account in another window; verify that user B cannot see user A's private notes due to PostgreSQL Row Level Security.

5. **Verify Offline Stand-In Resilience**:
   - Turn off Wi-Fi or enable Airplane Mode.
   - Read chapters, toggle appearance themes, and draft notes.
   - Re-enable Wi-Fi; background sync automatically updates your cloud account without blocking the UI.

6. **Test with Purely Code-Based Simulation Mechanics (Zero UI Overhead)**:
   - **Simulate Logged-Out State**:
     - Via URL: Append `?logged_out=true` (or `?guest=true`) to test guest onboarding, standalone registration prompts, and isolated stand-in storage without wiping actual tokens.
     - Via DevTools Console: Run `window.__SIMULATE_LOGGED_OUT(true)` (and `window.__SIMULATE_LOGGED_OUT(false)` to restore).
     - Via Env: Set `VITE_SIMULATE_LOGGED_OUT="true"`.
   - **Test Log-In Splash Page**:
     - Via URL: Append `?login=true` (or `?auth=login`, `?splash=login`) to trigger the serene Log-In Splash modal immediately.
     - Via DevTools Console: Run `window.__OPEN_LOGIN_SPLASH()` (or `window.__CLOSE_LOGIN_SPLASH()`).
     - In App: Click **Sign In** in the Reader header or **Log-In Splash** in Settings (Section 8).
   - **Simulate Offline Stand-in**:
     - Via URL: Append `?offline=true` to test offline IndexedDB stand-ins without turning off OS Wi-Fi.
     - Via DevTools Console: Run `window.__SIMULATE_OFFLINE(true)`.
     - Via Env: Set `VITE_SIMULATE_OFFLINE="true"`.
   - **Simulate Strict Production Mode**:
     - Via URL: Append `?production=true` or `?dev_mode=false` to verify that Intelligent Summaries strictly enforce the user's Gemini API key (BYOK).
     - Via DevTools Console: Run `window.__TOGGLE_DEV_MODE(false)`.
   - **Reset All Simulations**:
     - Run `window.__RESET_SIMULATIONS()` in DevTools console or remove URL query parameters to immediately restore live production runtime.

7. **Verify Application Software Updates & Version Number**:
   - In Settings, scroll to **Application Software Updates**.
   - In production, verify the version header displays your GitHub release tag (e.g. `v1.3.0`). In dev/simulation environments, it displays `Dev`.
   - Click **Check for Updates** to verify live background service worker negotiation and network connectivity.

---

## Pre-Release Pipeline Checklist

Before pushing a new version or git tag to production, execute this automated pre-flight sequence:

```bash
# 1. Type & Syntax Integrity Check (0 errors expected)
npm run lint

# 2. Dependency Vulnerability Audit (0 vulnerabilities expected)
npm audit

# 3. Production PWA & Asset Compilation
npm run build

# 4. (Optional) Local Full-Stack Production Server Simulation
NODE_ENV=production PORT=3000 npm start
# In a second terminal, verify endpoints:
curl -i http://localhost:3000/api/system/status
```

### Automated Release Workflow (GitHub Releases UI or Git CLI):

#### Option 1: Via GitHub Releases Web UI (Recommended)
1. On GitHub, navigate to your repository -> **Releases** (right sidebar or `/releases`).
2. Click **Draft a new release**.
3. Click **Choose a tag**, type your new version tag (e.g. `v1.3.1`), and select **Create new tag: v1.3.1 on publish**.
4. Fill in the release title and click **Generate release notes** (optional).
5. Click **Publish release**.

**What happens automatically:**
* GitHub immediately publishes the release under `https://api.github.com/repos/{user}/{repo}/releases/latest`.
* [`.github/workflows/release.yml`](./.github/workflows/release.yml) triggers on `release: [published]`, runs typechecking (`npm run lint`), builds the production PWA, and deploys to production.
* When users open the app, Reneu detects the new release tag in **Settings > Application Software Updates** and prompts them to update with zero manual configuration.

#### Option 2: Via Git CLI
```bash
# Push a new version tag to trigger the automated CI/CD pipeline
git tag -a v1.3.1 -m "Release v1.3.1"
git push origin v1.3.1
```

---

## Troubleshooting

- **CORS or Network Error on Supabase**:
  Ensure your project URL includes `https://` and has no trailing slashes or spaces.
- **Notes not persisting in Supabase**:
  Make sure you ran the entire script in `supabase/schema.sql`, particularly the Row Level Security (RLS) policies.
- **Email confirmation required**:
  If users cannot log in immediately after registration, check in Supabase Dashboard under **Authentication -> Providers -> Email** whether "Confirm email" is enabled. If you want instant sign-up without waiting for confirmation emails, turn off "Confirm email".
- **Gemini 403 or Missing Key**:
  In production, users can supply their own free API key directly in **Settings > Intelligent Summaries** (BYOK), or the site administrator can provide a shared server-side `GEMINI_API_KEY` in Vercel's Environment Variables. Test the key directly in Settings with the **Test Key** button.
- **Service Worker Cache on New Release**:
  The PWA utilizes `vite-plugin-pwa` with `autoUpdate` and a dedicated `skipWaiting` controller. When an update is deployed, the user receives an in-app update notification in Settings with an **Update Now** button to refresh seamlessly without losing local Dexie data.
