import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_workspace_creation_and_retrieval(async_client: AsyncClient):
    email = "workspace_tester@example.com"
    password = "password123"

    # Signup & Signin
    await async_client.post("/api/auth/signup", json={"name": "WS Owner", "email": email, "password": password})
    signin_res = await async_client.post("/api/auth/signin", json={"email": email, "password": password})
    token = signin_res.json()["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create workspace
    key = "TESTWS"
    ws_res = await async_client.post(
        "/api/workspaces",
        headers=headers,
        json={"name": "Test Workspace", "key": key, "templateType": "kanban"}
    )
    assert ws_res.status_code in [200, 400]

    # Get user workspaces
    get_ws_res = await async_client.get("/api/workspaces", headers=headers)
    assert get_ws_res.status_code == 200
    workspaces = get_ws_res.json()["data"]["workspaces"]
    assert len(workspaces) >= 1
