# FastAPI Async & Real-Time Engine

This directory contains the high-throughput Python FastAPI microservice, responsible for asynchronous read-path optimization and real-time WebSocket delta broadcasting (`ws_manager.py`).

---

## 🛠️ Tech Stack & Architecture

* **Framework**: FastAPI 0.115
* **ASGI Server**: Uvicorn 0.30
* **Async MongoDB Driver**: Motor 3.6
* **Data Validation**: Pydantic V2 (`ConfigDict` schemas with `populate_by_name = True`)
* **Real-Time Layer**: Native FastAPI WebSockets (`/ws/{workspaceId}`)
* **Test Suite**: Pytest + `pytest-asyncio` (`pytest`)

---

## 🔒 Shared Security & Configuration

* **Unified Database Target**: Connects to the same MongoDB Atlas cluster and database name (`jira_clone`) as the Node.js Express server.
* **Shared JWT Verification**: Uses the matching 32+ byte `JWT_SECRET` key to validate active tokens issued by Express.
* **ORM Index Collision Resolution**: `_safe_create_index()` checks index definitions (`users_email_key`), ensuring all MongoDB covered indexes build safely without throwing `Code 85` conflicts.

---

## 🛣️ API Endpoints & WebSockets

### REST Read Engine (`/fastapi/tasks`)
* `GET /fastapi/tasks?workspaceId=<id>` — Fast-path async task query via Motor driver.

### Real-Time WebSocket Gateway (`/ws/{workspaceId}`)
* `WS /ws/{workspaceId}` — WebSocket endpoint broadcasting JSON micro-deltas (`MOVE_TASK`, `UPDATE_TASK`) to connected workspace clients.

---

## ⚡ Available Scripts

Run from the `backend_fastapi/` directory:

### Virtualenv Setup
```bash
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### `python -m uvicorn app.main:app --port 8000 --reload`
Starts FastAPI server on `http://localhost:8000`.

### `pytest`
Runs Pytest integration test suite (**5 passed out of 5**).
