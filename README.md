# HWEB - Unified Frontend

HWEB is the unified frontend interface for the Hanoled ecosystem. It consolidates the user interfaces of **Hanoled**, **HCBT** (Computer Based Testing), and **HCORE** into a single, cohesive Next.js web application.

## Overview

This project serves as the central hub for all user interactions, streamlining the experience for students, teachers, parents, and administrators across the Hanoled platform.

### Key Features
- **Unified Authentication:** Centralized login and registration flow powered by the HCORE Identity backend.
- **Role-Based Dashboards:** Context-aware dashboards tailored for Owners, Admins, Teachers, Parents, and Students.
- **Organization Management:** Seamlessly switch between different schools and organizational contexts.
- **Integrated CBT:** Direct access to the Computer Based Testing modules without leaving the ecosystem.
- **Teacher Subject Scoping:** Teachers see only their assigned subjects and can only create exams for those subjects.

## Tech Stack
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) & Radix UI
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching:** Custom API wrapper with automatic token refresh (`apiFetch`)

## Project Structure

```
Hweb/
├── app/
│   ├── (auth)/              # Authentication pages (signin, signup)
│   ├── (marketing)/         # Public landing pages
│   ├── cbt/
│   │   ├── admin/           # CBT admin dashboard (role-driven UI)
│   │   ├── student/         # Student exam interface
│   │   └── layout.tsx       # CBT layout with auth check
│   ├── dashboard/
│   │   ├── school/[slug]/   # School-specific dashboards
│   │   └── layout.tsx       # Subscription check + product routing
│   └── welcome/             # Welcome hub with platform cards
├── components/              # Reusable React components
├── hooks/                   # Custom React hooks (useAuth, useOrganization)
├── lib/
│   ├── api.ts               # Shared API client with 401→refresh→signin chain
│   ├── api-cbt.ts           # CBT-specific API calls
│   └── api-hsms.ts          # HSMS-specific API calls
├── services/                # Service layer
└── store/                   # Zustand state stores
```

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_HCORE_URL` | HCORE backend API URL | `http://localhost:4000` |
| `NEXT_PUBLIC_HSMS_URL` | HSMS backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_HCBT_URL` | HCBT backend API URL | `http://localhost:4002` |

### Optional

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `186668766929-xxx.apps.googleusercontent.com` |
| `NEXT_PUBLIC_CBT_API_URL` | Alternative CBT API URL | `https://cbt-api.hanoled.com` |

### For Deployed/Production

Replace `localhost` URLs with your actual backend domains:

```env
NEXT_PUBLIC_HCORE_URL=https://hcore.yourdomain.com
NEXT_PUBLIC_HSMS_URL=https://hanoled.yourdomain.com
NEXT_PUBLIC_HCBT_URL=https://hcbt.yourdomain.com
```

## Getting Started

### Prerequisites
- Node.js 18+
- HCORE backend running on port 4000
- HSMS backend running on port 3001 (optional)
- HCBT backend running on port 4002 (optional)

### Installation

```bash
git clone https://github.com/Hanoled-codebase/HWEB.git
cd HWEB
npm install
```

### Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your backend URLs
```

### Run Locally

```bash
npm run dev
# Opens on http://localhost:3000
```

## Test Credentials

### Greenfield Academy

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@greenfield.edu.ng` | `Admin@2026` |
| Teacher | `adebayo.okafor@greenfield.edu.ng` | `Teacher@2026` |
| Student | Use admission number (e.g. `GRF/2026/001`) | Same as admission number |

## CBT Admin Dashboard

The CBT admin page (`/cbt/admin`) provides a role-driven interface:

- **Admin users**: See all exams, can publish/assign exams, full subject access
- **Teacher users**: See only assigned subject exams, can create drafts only, subject selector shows assigned subjects only

### Features by Role

| Feature | Admin | Teacher |
|---------|-------|---------|
| View exams | All org exams | Assigned subjects only |
| Create exam | Any status | Draft only, assigned subjects |
| Publish exam | ✅ | ❌ (shows "awaiting admin approval") |
| Assign exam | ✅ | ❌ |
| View subjects | All 8 subjects | Assigned subjects only |

## Migration Notes

We are currently in an active migration phase, porting features from the legacy `Hanoled` and `HCBT` backends into the unified `HCORE` architecture.
- **Identity & Auth:** Fully migrated and routed to `HCORE`.
- **CBT Admin:** Role-driven UI with subject scoping via HCORE teaching assignments.
- **Offline Access:** HCBT offline sync capabilities are actively being integrated.
- **Feature Modules:** Specific feature endpoints (like students and spreadsheets) are currently being migrated and may fail gracefully in the UI until their respective logic is fully ported to `HCORE` or routed via a proxy.

## Related Services

| Service | Repo | Port | Description |
|---------|------|------|-------------|
| **HCORE** | [Hanoled-codebase/HCORE](https://github.com/Hanoled-codebase/HCORE) | 4000 | Central identity & platform hub |
| **HSMS** | [xamorite/Hanoled](https://github.com/xamorite/Hanoled) | 3001 | School Management System |
| **HCBT** | [Hanoled-codebase/HCBT](https://github.com/Hanoled-codebase/HCBT) | 4002 | Computer-Based Testing Engine |

---

*Built for the Hanoled ecosystem.*
