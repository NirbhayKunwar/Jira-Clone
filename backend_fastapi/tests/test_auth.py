import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"

@pytest.mark.asyncio
async def test_user_signup_and_signin_flow(async_client: AsyncClient):
    email = "pytest_fastapi_user@example.com"
    password = "securePassword123"

    # Signup
    signup_resp = await async_client.post(
        "/api/auth/signup",
        json={"name": "FastAPI Tester", "email": email, "password": password}
    )
    assert signup_resp.status_code in [200, 400] # 400 if already exists in MongoDB
    
    # Signin
    signin_resp = await async_client.post(
        "/api/auth/signin",
        json={"email": email, "password": password}
    )
    assert signin_resp.status_code == 200
    res_data = signin_resp.json()
    assert res_data["success"] is True
    assert "token" in res_data["data"]
    assert res_data["data"]["user"]["email"] == email
