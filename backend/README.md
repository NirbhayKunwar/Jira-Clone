# Node.js / Express Backend — Single Write Authority API

This directory contains the primary Node.js + Express REST API server, configured as the **Single Write Authority** for CRUD operations, authentication, team invitations, and Optimistic Concurrency Control (OCC).

---

## 🛠️ Tech Stack & Architecture

* **Runtime**: Node.js v20
* **Framework**: Express.js 4.19
* **Database Client**: Prisma Client ORM 5.18
* **Database**: MongoDB Atlas (`jira_clone` database)
* **Auth Cryptography**: JSON Web Tokens (`jsonwebtoken`), bcrypt password hashing (`bcryptjs`)
* **Logging**: Pino JSON structured logging (`config/logger.js`)
* **Test Suite**: Vitest (`npm test`)

---

## 🔒 Security & Middleware

* **[authMiddleware.js](middleware/authMiddleware.js)**: Validates Bearer authorization headers against the 32+ byte RFC 7518 compliant `JWT_SECRET`.
* **[rateLimiter.js](middleware/rateLimiter.js)**: Limits client requests to **10 requests per 15 minutes** on sensitive authentication endpoints.
* **IDOR Protection**: Resolves user context directly from verified tokens (`req.user.email`), blocking parameter tampering.
* **Optimistic Concurrency Control (OCC)**: Enforces `version` increment checks to prevent race conditions during concurrent task updates.

---

## 🗄️ Database Models (`prisma/schema.prisma`)

MongoDB collections mapped via Prisma ORM:
* **Workspace**: Multi-tenant workspace container with covered indexes (`key`, `owner_id`).
* **User**: Credential storage, Google OAuth binding (`google_id`), and token versioning (`tokenVersion`).
* **Task**: Prioritization, Kanban status columns, covered indexes `@@index([workspaceId, status, priority])` and `@@index([workspaceId, deleted, createdAt])`.
* **Notification**: In-app notifications feed with `read`, `type`, `userId`, `workspaceId`.
* **AuditLog**: Chronological administrative and task activity event trail.

---

## 🛣️ Primary API Endpoints

### Authentication (`/api/auth`)
* `POST /api/auth/signup` — Registers a user, hashes password with bcrypt, and returns JWT token.
* `POST /api/auth/signin` — Authenticates credentials and returns JWT token.
* `POST /api/auth/google-signin` — Validates Google OAuth2 raw credential token and authenticates.

### Workspaces (`/api/workspaces`)
* `GET /api/workspaces` — Lists workspaces for authenticated user.
* `POST /api/workspaces` — Creates workspace and assigns `OWNER` role.

### Tasks (`/api/tasks`)
* `GET /api/tasks?workspaceId=<id>` — Fetches tasks scoped to active workspace.
* `POST /api/tasks` — Creates new task.
* `PUT /api/tasks/:id` — Modifies task status, priority, or assignee (`assigneeId`).
* `DELETE /api/tasks/:id` — Soft-deletes task.

### Notifications & Activity (`/api/notifications`, `/api/workspaces/:workspaceId/activity`)
* `GET /api/notifications` — Fetches user notifications for workspace and account.
* `PATCH /api/notifications/:id/read` — Marks single notification as read.
* `PATCH /api/notifications/read-all` — Marks all notifications as read.
* `GET /api/workspaces/:workspaceId/activity` — Fetches workspace activity feed.

---

## ⚡ Available Scripts

Run from the `backend/` directory:

### `npm install`
Installs backend Node.js packages.

### `npm run dev`
Starts Express API server on `http://localhost:5000` with hot-reloading (`nodemon`).

### `npm test`
Runs Vitest unit & integration test suite (**31 passed out of 31**).
