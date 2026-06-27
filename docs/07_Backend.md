# 07 — Backend Deep Dive

Detailing the Express REST API pipeline:

* **Controller handlers**: Validation checks (e.g. NaN integer validation) reject bad parameters with 400 Bad Request before database access.
* **Security Middleware**: rateLimiter is applied strictly to auth routes to prevent credential stuffing.
* **Middleware order in routing**:
  ```javascript
  router.put('/profile', verifyToken, updateProfile);
  ```
