# Jira Clone — Fullstack Agile Project Management Platform

Welcome to the Jira Clone! This project is a premium, high-fidelity replica of Jira's core agile features, backed by a robust PostgreSQL relational database, Prisma ORM, Express.js REST server, and a fully reactive frontend styled with Tailwind CSS v4.

---

## 🚀 Key Features & Capabilities

### 1. Product Management Boards
* **Kanban Board**: Fully interactive drag-and-drop column layout (To Do, In Progress, Done) with real-time query searching and visual indicator pills.
* **Roadmap (Gantt Chart)**: Visual timeline planner mapping development Epics over a 6-month timeline with color-coded horizontal progress spans.
* **Backlog Manager**: Detailed item lists sorted by prioritization metrics and epic assignments.

### 2. Collaboration & OKRs
* **Goals Dashboard**: OKR-style objectives tracker featuring interactive progress sliders (mouse/touch responsive) and live status badges (`On Track`, `At Risk`, `Off Track`).
* **Teams Directory**: Custom team workspace builder allowing you to group registered employees, assign task scopes, and track aggregated team workloads.
* **Workspace Management**: Collaborative multi-workspace selector. Initialize workspaces with templates (Scrum or Kanban), manage custom project keys, and track history.

### 3. User & Settings Customization
* **4 Curated Theme Colorways**: Toggle between `Atlassian Blue`, `Emerald Forest`, `Cyberpunk Neon`, and `Sunset Amber` themes.
* **Reactive Dark Mode**: High-contrast, accessibility-compliant dark theme setting with reactive DOM element variables.
* **Profile Settings**: Dynamic profile detail editor (Name, Role, Department, Location) and password resets secured by OTP.

---

## 🔒 Security Architecture

The platform has been audited and secured against major OWASP Top 10 vulnerabilities:
* **Cryptographic SSO Validation**: Google Sign-In verified securely via Google's `tokeninfo` cryptographic APIs to prevent token-forging exploits.
* **Strict Rate Limiting**: Customized in-memory IP request monitoring limiting authentication route submissions (signin, signup, otp, google-signin) to **10 requests per 15 minutes**.
* **IDOR Prevention**: Profile updates read identification directly from decoded JWT payloads (`req.user.email`) instead of trusting body parameters.
* **Unified Error Messages**: Account credential warnings unified to prevent account/email existence enumeration scans.
* **Input Safety**: Strict type checks (`isNaN` parameter validation) implemented on all backend controller path parsing handlers.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Libraries |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite 8 | Tailwind CSS v4, Lucide Icons, Zustand, TanStack React Query |
| **Backend** | Node.js + Express.js | JSON Web Tokens (`jsonwebtoken`), bcryptjs, Nodemailer |
| **Database** | PostgreSQL | Prisma Client ORM, Relational Foreign Key Cascades |

---

## 📂 Project Structure

```
Jira-Clone/
├── README.md               # Master documentation (this file)
├── .gitignore              # Root Git exclusions list (.env, node_modules, dist)
├── frontend/               # React client application
│   ├── src/
│   │   ├── components/     # UI Views (Dashboard, Auth, ProfileSettings, etc.)
│   │   ├── config/         # Shared API configuration & auth headers utility
│   │   ├── hooks/          # TanStack React Query hooks (useTasks, useUsers)
│   │   ├── store/          # Zustand global state (authStore, workspaceStore)
│   │   └── App.jsx         # Main routing and global layout
│   └── package.json        # Frontend scripts and dependency versions
└── backend/                # REST API backend application
    ├── config/             # DB pools, Prisma initialization & pool config
    ├── controllers/        # Controllers (auth, tasks, workspaces, goals, teams)
    ├── middleware/         # Custom auth verify and rate limiting middleware
    ├── routes/             # Router tables (auth, tasks, workspaces, goals, teams)
    └── package.json        # Backend scripts and dependencies
```

---

## ⚡ Getting Started

### 1. Environment Configuration

Create a `.env` file in the `backend/` directory:
```env
PORT=5000
DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<db_name>?schema=public"
JWT_SECRET="your_secure_jwt_secret_key"

# (Optional) Real Email Reset SMTP Setup
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-gmail-app-password"
```

### 2. Frontend Setup & Run
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   *The frontend runs at `http://localhost:5173/`.*

### 3. Backend Setup & Run
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express API server (runs auto Prisma database push on launch):
   ```bash
   npm run dev
   ```
   *The backend runs at `http://localhost:5000/`.*
