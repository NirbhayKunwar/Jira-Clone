# 03 — Folder Structure & File Analysis

This project separation maintains backend REST routers and frontend React client views.

### File Maps
* **`frontend/src/components/Dashboard.jsx`**: Core UI dashboard coordinating views and state management.
* **`frontend/src/store/authStore.js`**: Manages theme parameters and login sessions.
* **`frontend/src/config/api.js`**: Configures Shared API URLs and auth headers.
* **`backend/controllers/authController.js`**: Coordinates registrations, signIn logic, and Google token validation checks.
* **`backend/middleware/rateLimiter.js`**: Express IP rate tracking limits.
* **`backend/config/db.js`**: Auto-synchronizes database tables on start.
