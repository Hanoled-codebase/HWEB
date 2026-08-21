# HWEB - Unified Frontend

HWEB is the unified frontend interface for the Hanoled ecosystem. It consolidates the user interfaces of **Hanoled**, **HCBT** (Computer Based Testing), and **HCORE** into a single, cohesive Next.js web application.

## 🚀 Overview

This project serves as the central hub for all user interactions, streamlining the experience for students, teachers, parents, and administrators across the Hanoled platform.

### Key Features
- **Unified Authentication:** Centralized login and registration flow powered by the HCORE Identity backend.
- **Role-Based Dashboards:** Context-aware dashboards tailored for Owners, Admins, Teachers, Parents, and Students.
- **Organization Management:** Seamlessly switch between different schools and organizational contexts.
- **Integrated CBT:** Direct access to the Computer Based Testing modules without leaving the ecosystem.

## 🛠 Tech Stack
- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Components:** [shadcn/ui](https://ui.shadcn.com/) & Radix UI
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching:** Custom API wrapper with automatic token refresh (`apiFetch`)

## 📂 Project Structure

- `/app` - Next.js App Router pages and layouts.
  - `/(auth)` - Authentication pages (Login, Register).
  - `/(marketing)` - Public landing pages.
  - `/dashboard` - Protected organization dashboards.
  - `/cbt` - Computer Based Testing interface.
- `/components` - Reusable React components organized by domain.
- `/hooks` - Custom React hooks (e.g., `useAuth`, `useOrganization`).
- `/lib` - Utility functions, validation schemas, and API configuration.
- `/store` - Zustand state stores.

## ⚙️ Getting Started

### Prerequisites
Make sure you have Node.js installed and the **HCORE backend** running locally (typically on port `4000`).

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Hanoled-codebase/HWEB.git
   cd HWEB
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/v1
   ```

### Running Locally
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🚧 Migration Notes
We are currently in an active migration phase, porting features from the legacy `Hanoled` and `HCBT` backends into the unified `HCORE` architecture. 
- **Identity & Auth:** Fully migrated and routed to `HCORE`.
- **Feature Modules:** Specific feature endpoints (like students and spreadsheets) are currently being migrated and may fail gracefully in the UI until their respective logic is fully ported to `HCORE` or routed via a proxy.

---
*Built for the Hanoled ecosystem.*
