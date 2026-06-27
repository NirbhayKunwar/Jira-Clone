# 16 — Code Walkthrough of Key Files

### `rateLimiter.js`
```javascript
const rateLimitStore = {};
export const rateLimiter = (windowMs, maxRequests) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const key = ip + ':' + req.path;
    const now = Date.now();
    // Validate request count and update rateLimitStore
    next();
  }
}
```
