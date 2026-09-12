import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, Response

@pytest.mark.asyncio
async def test_google_signin_non_existing_user_returns_403(async_client: AsyncClient):
    mock_payload = {
        "sub": "google-sub-pytest-9999",
        "email": "nonexistent_fastapi_user@example.com",
        "email_verified": True,
        "name": "Nonexistent User",
        "picture": "https://example.com/avatar.png",
        "iss": "https://accounts.google.com",
        "aud": "mock-google-client-id.apps.googleusercontent.com"
    }

    mock_resp = AsyncMock(spec=Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_payload

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        response = await async_client.post(
            "/api/auth/google-signin",
            json={"credential": "mock-google-id-token"}
        )

        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False
        assert data["code"] == "ACCOUNT_NOT_FOUND"
        assert data["message"] == "No account exists with this email. Please sign up before using Google Sign-In."
