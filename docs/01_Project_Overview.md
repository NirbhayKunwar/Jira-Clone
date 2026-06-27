# 01 — Project Overview

This project is a high-fidelity full-stack Jira clone built to solve team-based Agile coordination requirements.

### Key Requirements
* **Functional**: Kanban columns, drag-and-drop actions, Backlog sorting, roadmaps Gantt charting, OKR progress trackers, custom department teams directories.
* **Non-Functional**: JWT security routing, strict request rate limiters, sub-second client paints, PostgreSQL data integrity cascades.

### High-level Request Lifecycle
1. Client actions trigger fetch queries with Bearer authentication headers.
2. Express Router receives the request.
3. Middlewares verify rate limits and validate JWT authentication.
4. Business controllers access database views using Prisma.
5. Response is parsed and returned to components to trigger local state changes.
