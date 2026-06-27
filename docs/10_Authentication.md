# 10 — Authentication Flow

Detailed sign-in lifecycle:

* **Google SSO**: Raw ID tokens are forwarded to `/api/auth/google-signin` and verified using Node native fetch query to Google TokenInfo servers, yielding secure app JWTs.
* **Session tracking**: Bearer token is cached in local storage.
* **OTP change password**: Generates OTP code, stores code in backend memory cache, and updates profile after validation.
