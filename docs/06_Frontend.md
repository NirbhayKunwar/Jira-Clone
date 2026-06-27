# 06 — Frontend Deep Dive

Detailing client components and stores:

* **Zustand Store**: Separates theme configurations (`authStore.js`) and active workspace indexes (`workspaceStore.js`). Redundant DOM mutations have been refactored out.
* **Dashboard Tab Layout**: Coordinates tab switching and handles sub-tabs (Kanban Board, Roadmap Views, Backlog view, Goals, Teams, Settings).
* **Profile settings form**: Direct email updates are blocked; inputs submit user data via verified JWT validation tokens.
