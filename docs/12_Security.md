# 12 — Security Hardening

Mitigating major vulnerabilities:
* **SQL Injection**: Prevented by Prisma's parameterization under the hood.
* **IDOR**: Checked by mapping updateProfile keys directly from JWT decodes.
* **Brute-force/Spam**: Blocked by strict custom IP rate limiting middleware.
* **Credential Enumeration**: Unified error responses prevent account existence maps.
