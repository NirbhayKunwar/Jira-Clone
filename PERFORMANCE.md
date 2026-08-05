# PERFORMANCE STANDARDS & BUDGET

This document defines the official Performance Standards, Empirical Protocol, and Performance Budget for the Jira Clone repository. All developers, subagents, and contributors working on this project MUST adhere strictly to these rules.

---

## Performance Protocol

Before applying any optimization to this repository:

1. **Measure**: Capture baseline performance using profiling tools before writing any code.
2. **Identify Bottleneck**: Locate the exact component, query, endpoint, or network waterfall causing latency.
3. **Explain Root Cause**: Document why the code is slow using empirical evidence (logs, traces, profiler output).
4. **Implement**: Apply targeted, minimal code changes to resolve the root cause.
5. **Measure Again**: Re-profile under identical test conditions to quantify the improvement.
6. **Keep Only Measurable Improvements**: If a change yields no measurable benefit or introduces complexity without latency reduction, **revert it immediately**.

---

## Rules of Engagement

### NEVER
- ❌ **Add database indexes without `explain()` executionStats evidence**.
- ❌ **Wrap components in `React.memo` without React DevTools Profiler evidence**.
- ❌ **Apply `Cache-Control` headers to mutable endpoints** (`/api/tasks`, `/api/notifications`) without a real-time invalidation mechanism.
- ❌ **Optimize based on assumptions, intuition, or hypothetical scenarios**.
- ❌ **Claim absolute benchmark numbers or Lighthouse scores without empirical measurement**.
- ❌ **Duplicate compression layers** if a reverse proxy or CDN edge already handles payload compression.

### ALWAYS
- ✅ **Use Chrome DevTools Performance & Network tabs** to trace network waterfalls and main-thread execution.
- ✅ **Use React DevTools Profiler** to measure component render counts, commit durations, and prop reference stability.
- ✅ **Use Prisma query logging / MongoDB `explain("executionStats")`** to inspect query execution plans and index usage.
- ✅ **Compare BEFORE vs. AFTER metrics** under identical test environments.
- ✅ **Respect the Performance Budget SLAs**.

---

## Repository Performance Budget

All PRs, refactors, and feature additions are evaluated against these strict performance SLAs:

| Metric / Target Area | SLA Target | Measurement Method |
| :--- | :--- | :--- |
| **Initial Dashboard Interactive (TTI)** | **$< 800\text{ ms}$** | Chrome DevTools Performance Trace |
| **API Latency ($P_{95}$)** | **$< 200\text{ ms}$** | Express Logger / Uvicorn Access Trace |
| **Database Query Execution** | **$< 50\text{ ms}$** | MongoDB `explain("executionStats")` |
| **First Contentful Paint (FCP)** | **$< 1.0\text{ s}$** | Lighthouse / Web Vitals Observer |
| **Largest Contentful Paint (LCP)** | **$< 2.5\text{ s}$** | Chrome Performance Panel |
| **Drag & Drop Frame Rate** | **$60\text{ FPS}$ ($16.6\text{ms/frame}$)** | Chrome DevTools Frame Renderer |
| **Duplicate Queries per Endpoint** | **$0$** | Prisma Log Inspector |
| **Unindexed Collection Scans (`COLLSCAN`)** | **$0$** (for common production queries) | MongoDB Atlas Execution Log |

---

## Profiling Tooling Quick Reference

### 1. MongoDB Index Verification
```javascript
db.tasks.explain("executionStats").find({ workspace_id: ObjectId("..."), status: "in_progress" });
```

### 2. React Profiler Component Audit
1. Open Chrome DevTools $\rightarrow$ **Profiler** tab.
2. Click **Record**, interact with the Kanban board (drag card, switch filter), click **Stop**.
3. Inspect **Commit Tree** for unmemoized components with long render bars.

### 3. API Response Latency Audit
```bash
curl -w "\nTTFB: %{time_starttransfer}s | Total: %{time_total}s\n" -o /dev.null -s http://localhost:5000/api/workspaces
```
