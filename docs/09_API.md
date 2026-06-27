# 09 — API Specifications

REST Router documentation:

* **GET /api/workspaces**: Fetch active workspaces list.
* **GET /api/tasks?workspaceId=<id>**: Fetch tasks.
* **POST /api/goals**: Create OKR goal record.
* **POST /api/teams**: Create custom team records.
* **DELETE /api/auth/users/:id**: Delete user. Includes self-deletion prevention check.
