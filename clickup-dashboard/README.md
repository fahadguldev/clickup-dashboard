# ClickUp Dashboard

A project management dashboard built with **Next.js 14**, **Tailwind CSS**, and **shadcn/ui**. Pulls real-time data from the ClickUp API to display project health, team capacity, and delivery risks.

## Getting Started

### Prerequisites

- Node.js 18+
- A ClickUp API token ([generate one here](https://app.clickup.com/settings/apps))

### Setup

```bash
npm install
```

Create a `.env.local` file in the project root:

```
CLICK_UP_API=pk_your_clickup_api_token
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

### CEO — Attention
- Overall status, progress, and task counts
- Items requiring attention (stalled projects, overdue tasks, overloaded members)
- Project health cards with progress bars
- Team capacity overview
- Delivery risks (overdue, stagnant, zero-progress)

### Delivery — Why
- All projects sorted by health status
- Click any project to drill down into its tasks

### Operations — What
- Full task table with filters (space, project, member, status, search)
- Shows up to 300 matching tasks

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [ClickUp API v2](https://clickup.com/api/clickupreference/operation/GetAuthorizedTeams/)
