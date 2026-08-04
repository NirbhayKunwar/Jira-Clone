import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_task_creation_and_atomic_claim(async_client: AsyncClient):
    email = "task_tester@example.com"
    password = "password123"

    # Signup & Signin
    await async_client.post("/api/auth/signup", json={"name": "Task Tester", "email": email, "password": password})
    signin_res = await async_client.post("/api/auth/signin", json={"email": email, "password": password})
    token = signin_res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    key = "TASKWS"
    ws_res = await async_client.post(
        "/api/workspaces",
        headers=headers,
        json={"name": "Task Test Workspace", "key": key, "templateType": "kanban"}
    )
    ws_data = ws_res.json()
    if ws_res.status_code == 200:
        workspace_id = ws_data["data"]["workspace"]["id"]
    else:
        workspaces = (await async_client.get("/api/workspaces", headers=headers)).json()["data"]["workspaces"]
        workspace_id = workspaces[0]["id"]

    # Create unassigned task
    task_res = await async_client.post(
        "/api/tasks",
        headers=headers,
        json={
            "title": "Unassigned Task Test",
            "desc": "Testing atomic self assignment",
            "assignee": "",
            "assigneeId": None,
            "workspaceId": workspace_id
        }
    )
    assert task_res.status_code == 200
    task_id = task_res.json()["data"]["task"]["id"]

    # Claim task
    claim_res = await async_client.put(f"/api/tasks/{task_id}/claim", headers=headers)
    assert claim_res.status_code == 200
    claimed_data = claim_res.json()["data"]
    assert claimed_data["assignee"] == "Task Tester"

    # Claim again -> should return 409 Conflict
    conflict_res = await async_client.put(f"/api/tasks/{task_id}/claim", headers=headers)
    assert conflict_res.status_code == 409
    assert conflict_res.json()["code"] == "TASK_ALREADY_ASSIGNED"
