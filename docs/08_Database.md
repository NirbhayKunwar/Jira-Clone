# 08 — Database & Prisma Schema Design

This fullstack application connects to a PostgreSQL relational database.

### ER Diagram Mappings
* **Workspace**: Has template type, key, name, description. cascades to Tasks.
* **User**: Has role, department, location, tasks. onDelete behaves as SetNull.
* **Task**: Mapped to Workspace and User via foreign keys.
* **Goal**: OKR parameters (progress, targetDate, status).
* **Team**: Custom team structure storing member list as JSON string.
