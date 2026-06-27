# Backend — Jira Clone REST API Server

This directory contains the Node.js + Express REST API server, backed by a PostgreSQL database and Prisma Client ORM.

---

## 🛠️ Tech Stack

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database client**: Prisma Client ORM
* **Database**: PostgreSQL (relational database)
* **Auth Cryptography**: JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`)

---

## 🔒 Middlewares & Security

* **[authMiddleware.js](middleware/authMiddleware.js)**: Reads authorization Bearer headers, cryptographically validates the token against the `JWT_SECRET` variable, and attaches the validated session user payload to `req.user`.
* **[rateLimiter.js](middleware/rateLimiter.js)**: Custom in-memory IP request monitoring middleware. Limits client requests to **10 requests per 15 minutes** on sensitive endpoints.
* **IDOR Protection**: Profiles are resolved exclusively from verified tokens on `req.user.email` to block parameter tampering.
* **Unified Auth error handling**: Keeps error outputs generic (`Invalid email or password`) to prevent account enumeration.

---

## 📊 Database Models & Migration

The relational database tables are mapped via Prisma inside [schema.prisma](prisma/schema.prisma):
* **Workspace**: Has template preferences, project keys, and cascaded task relationships.
* **User**: Stores hashed credentials, roles, departments, locations, and user assignments.
* **Task**: Tracks priorities, backlog/review statuses, assignee relationships, and workspace groupings.
* **Goal**: OKR objectives tracking table.
* **Team**: Collaboration teams table storing JSON-mapped lists of user IDs.

Sync schema models directly to PostgreSQL using:
```bash
npx prisma db push --skip-generate
```

---

## 🛣️ API Endpoints

### 1. Authentication (`/api/auth`)
* `POST /api/auth/signup` — Registers a user, hashes passwords with bcrypt, and issues a JWT.
* `POST /api/auth/signin` — Authenticates user credentials and issues a JWT.
* `POST /api/auth/google-signin` — Exchanges a Google raw ID token for an authenticated user JWT via Google API token validation.
* `POST /api/auth/send-otp` — Sends reset OTPs (mocked to console if SMTP is missing).
* `POST /api/auth/change-password` — Resets password with valid OTP.
* `PUT /api/auth/profile` — Modifies active user profiles (JWT protected).
* `GET /api/auth/users` — Lists workspace team users.

### 2. Workspaces (`/api/workspaces`)
* `GET /api/workspaces` — Lists all workspaces.
* `POST /api/workspaces` — Creates a workspace.
* `GET /api/workspaces/:id` — Details a workspace.
* `DELETE /api/workspaces/:id` — Deletes a workspace and cascades tasks.

### 3. Tasks (`/api/tasks`)
* `GET /api/tasks?workspaceId=<id>` — Gets tasks in a workspace.
* `POST /api/tasks` — Creates a task.
* `PUT /api/tasks/:id` — Modifies task priorities, assignments, or epics.
* `DELETE /api/tasks/:id` — Deletes a task.

### 4. Goals & Teams (`/api/goals`, `/api/teams`)
* `GET /api/goals`, `POST /api/goals`, `PUT /api/goals/:id`, `DELETE /api/goals/:id` — Goals OKR CRUD.
* `GET /api/teams`, `POST /api/teams`, `PUT /api/teams/:id`, `DELETE /api/teams/:id` — Custom department teams CRUD.

---

## ⚡ Available Scripts

Run from the `backend/` directory:

### `npm install`
Installs backend package requirements.

### `npm run dev`
Starts the local development REST API server on `http://localhost:5000` with hot-reloading using `nodemon`.

### `npm start`
Starts the server in production mode using native `node`.
