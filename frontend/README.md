# Frontend — Jira Clone Client Application

This directory houses the React client application for the Jira Clone, a fast, interactive, and premium agile management dashboard.

---

## 🛠️ Technology Stack

* **Framework**: React 19
* **Build System**: Vite 8
* **Styling**: Tailwind CSS v4 (using CSS variables and theme mappings)
* **Icons**: Lucide React
* **State Management**: 
  * **Zustand**: Local session storage and reactive bindings for workspace selections (`workspaceStore.js`) and theme settings (`authStore.js`).
  * **TanStack React Query**: Server state caching, background query refetching, and mutation invalidation hooks (`useTasks.js`, `useUsers.js`).

---

## 📂 Key Components

* **[Dashboard.jsx](src/components/Dashboard.jsx)**: Main operational dashboard. Manages routing tabs for Kanban, Backlog, Gantt Roadmap, OKR Goals, Teams Directory, and Workspace settings.
* **[Auth.jsx](src/components/Auth.jsx)**: Secure authentication page. Renders standard sign-in, signup, password resets, and high-fidelity Google SSO login frames.
* **[ProfileSettings.jsx](src/components/ProfileSettings.jsx)**: Handles user customization (Avatar editing, role/dept updates, and password changes verified by OTP).
* **[WorkspaceSetup.jsx](src/components/WorkspaceSetup.jsx)**: Workspace onboarding view. Guides new users through creating their first template workspace.

---

## ⚡ Active Animations

We use pure vanilla CSS and React state tracking to create smooth, high-fidelity micro-interactions:
* **[SpotlightCard.jsx](src/components/animations/SpotlightCard.jsx)**: Mouse-tracking radial gradient spotlight which shines a customizable theme color behind card content on hover.
* **[TiltedCard.jsx](src/components/animations/TiltedCard.jsx)**: Interactive 3D perspective card tilt that rotates proportional to the mouse cursor offset.

---

## 🔒 Security Integrations

* **Google SSO Token Forwarding**: Rather than decoding user tokens on the client (which could be spoofed), the frontend captures the raw credential token from the Google GSI iframe and securely forwards it to the backend `POST /api/auth/google-signin` route for cryptographic server validation.
* **Secured Axios/Fetch Requests**: Uses the shared `getAuthHeaders()` utility from `src/config/api.js` to attach local storage tokens as a `Bearer <token>` string inside the HTTP headers of all backend CRUD transactions.

---

## 🚀 Available Scripts

Run the following scripts from the `frontend/` directory:

### `npm install`
Installs all dependencies.

### `npm run dev`
Starts the Vite local development server on `http://localhost:5173`.

### `npm run build`
Compiles, minifies, and optimizes all javascript and CSS source files into the production bundle inside the `dist/` folder.

### `npm run lint`
Runs ESLint audits to verify code quality. Returns 0 warnings and 0 errors.

### `npm run preview`
Runs a local web server to preview Vite's production assets.
