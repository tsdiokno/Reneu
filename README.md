# Reneu

> A distraction-free, local-first web application for reading the Bible, taking verse-by-verse study notes, and surfacing insights across your reflections with Intelligent Summaries.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Storage](https://img.shields.io/badge/Storage-IndexedDB%20%2F%20Dexie-orange.svg)](https://dexie.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

Reneu is designed for focused scripture reading and thoughtful personal study. Rather than cluttering the text with social feeds, gamified streaks, or intrusive overlays, Reneu gives you a quiet, typography-first canvas with responsive note-taking and intelligent synthesis.

---

## Core Features

- **Typography & Reading Experience**: Calibrated page tones (*Parchment*, *Pure White*, *Obsidian*), adjustable font sizes, line heights, and serif/sans typographic controls designed for extended reading sessions.
- **Inline Verse Notes & Commentary**: Click or tap any verse to open a linked editor. Record verse observations, cross-references, personal prayers, or standalone reflection notes.
- **Intelligent Summaries**: As your study notes accumulate, Reneu identifies recurring themes, connected ideas, and cross-references across your journal, creating concise summaries with direct verse citations.
- **Local-First & Offline PWA**: Built using IndexedDB (Dexie) and progressive web app service workers. Reading, note editing, and search function with zero latency—even without an internet connection.
- **Multi-Device Cloud Sync (Optional)**: Connect an optional Supabase backend to synchronize notes across desktop and mobile devices, protected by PostgreSQL Row Level Security (RLS).
- **Curated Reading Plans**: Built-in canonical, chronological, New Testament, and wisdom literature reading plans with flexible scheduling and progress tracking.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite 6
- **Local Storage**: Dexie (IndexedDB)
- **Offline / PWA**: Workbox, `vite-plugin-pwa`
- **Backend / API**: Express 5, `@google/genai` (Gemini API proxy for Intelligent Summaries)
- **Database & Auth (Optional)**: Supabase (PostgreSQL with Row Level Security)

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/reneu.git
cd reneu

# Install dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:3000` in your browser.

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Express full-stack dev server with Vite middleware |
| `npm run build` | Compiles client assets and generates PWA service workers in `dist/` |
| `npm start` | Launches the production server (`NODE_ENV=production`) |
| `npm run lint` | Runs TypeScript typechecks (`tsc --noEmit`) |
| `npm run preview` | Previews the compiled production build locally |

---

## Production Deployment

Detailed deployment guides for Vercel serverless, self-hosted Docker / Node.js containers (Cloud Run, Railway, Render), and Supabase database configuration are available in [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md).

---

## License

MIT


