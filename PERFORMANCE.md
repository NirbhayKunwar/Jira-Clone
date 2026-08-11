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

## Database Index Policy

Before creating an index:
1. Capture `explain("executionStats")`.
2. Confirm `COLLSCAN` or slow `IXSCAN`.
3. Verify the query is part of a real production workflow.
4. Measure performance before and after index creation.
5. Document the rationale and index definition in the repository.

Before removing an index:
1. Verify it is unused via database telemetry.
2. Inspect production query patterns across services.
3. Measure write performance impact on high-throughput collections.

---

## React Performance Guidelines

Before using `React.memo`:
- Verify unnecessary re-renders using the **React DevTools Profiler**.
- Stabilize props using `useMemo` or `useCallback` where appropriate.
- Avoid passing inline objects, array literals, or inline arrow functions to memoized components.

Avoid:
- Expensive filtering or sorting operations inside render bodies (wrap in `useMemo`).
- Unnecessary Context updates that re-render deep component trees.
- Full Zustand store subscriptions when granular selectors (e.g. `useAuthStore(s => s.user)`) are sufficient.

---

## API Performance Standards

### GET Endpoints
- Return only required fields via explicit Prisma/MongoDB projections.
- Use projection to eliminate internal or sensitive fields.
- Use cursor/offset pagination for large collections.

### POST / PUT / PATCH Endpoints
- Return only the updated resource DTO.
- Avoid returning or refetching entire parent collections after single-item mutations.

### DELETE Endpoints
- Prefer soft-delete patterns where appropriate for data integrity.

### Queries & Async Operations
- Use `Promise.all()` only for truly independent async operations.
- Eliminate $N+1$ query patterns by fetching relations in unified queries or batching lookups.

---

## Repository Performance Budget

All PRs, refactors, and feature additions are evaluated against these strict performance SLAs:

| Metric / Target Area | SLA Target | Measurement Method |
| :--- | :--- | :--- |
| **Initial Dashboard Interactive (TTI)** | **$< 800\text{ ms}$** | Chrome DevTools Performance Trace |
| **API Latency ($P_{95}$)** | **$< 200\text{ ms}$** | Express request timing middleware + Pino logs |
| **Database Query Execution** | **$< 50\text{ ms}$** | MongoDB `explain("executionStats")` / Prisma Log |
| **First Contentful Paint (FCP)** | **$< 1.0\text{ s}$** | Web Vitals / Lighthouse |
| **Largest Contentful Paint (LCP)** | **$< 2.5\text{ s}$** | Chrome Performance Panel |
| **Drag & Drop Frame Rate** | **$60\text{ FPS}$ ($16.6\text{ms/frame}$)** | Chrome Frame Renderer |
| **Duplicate Queries per Endpoint** | **$0$** | Prisma Log Inspector |
| **Unindexed Collection Scans (`COLLSCAN`)** | **$0$** (for common production queries) | MongoDB Atlas Execution Log |

---

## ⚡ 60 FPS Board Engine Architecture

To maintain a consistent 60 FPS frame rate under heavy load (e.g. 10,000+ cards across 4 columns), the frontend board rendering engine implements 4 core optimizations:

1. **Normalized Zustand Board State (`boardStore.js`)**:
   - Tasks are stored in $O(1)$ key-value lookup dictionaries (`tasksById` and `columns`).
   - Dragging a card between columns mutates strictly the origin column ID list, destination column ID list, and target task status object.
   - Sibling cards and uninvolved columns remain 100% unrendered.

2. **Web Worker Thread Offloading (`boardWorker.js`)**:
   - High-card-count filtering, priority sorting, and text searching are computed off the main JavaScript thread using a dedicated Web Worker (`boardWorker.js`).
   - The main UI thread receives pre-indexed task ID lists, keeping main-thread execution time at **0 ms**.

3. **LexoRank Fractional Indexing (`lexoRank.js`)**:
   - Re-ordering tasks uses lexicographical string rank calculation (`LexoRank.between(prevRank, nextRank)`).
   - Inserting a task between two items updates only the target task's rank string, eliminating $O(N)$ index re-numbering array loops.

4. **Zero-Reflow Drag & Auto-Scroll (`useZeroReflowAutoScroll.js`)**:
   - Drag interactions render visual feedback via GPU compositor transforms (`transform: translate3d(...)`) outside React render cycles.
   - Smooth container auto-scrolling runs inside `requestAnimationFrame` loops with CSS layout containment (`contain: layout style paint;`).

---

## Frontend Bundle Budget

- **Initial JavaScript (GZip)**: **$< 250\text{ KB}$**
- **Largest Lazy-Loaded Chunk**: **$< 100\text{ KB}$**
- **CSS Bundle (GZip)**: **$< 50\text{ KB}$**

Every new third-party dependency must be justified based on utility vs. bundle cost. Run `npm run build` in `frontend/` before merging any pull request.

---

## Performance CI Gate

Every Pull Request and deployment must pass:
- `npm test` cleanly without failures.
- `npm run build` cleanly without bundler compilation warnings.
- Code linting and static analysis checks.
- Prisma schema generation (`prisma generate`).
- Zero new failing unit/integration tests.
- Zero duplicate database queries introduced on API endpoints.
- Zero new `COLLSCAN` queries for common production workflows.
- Initial bundle size increase $\le 10\%$ unless explicitly justified.
- Any performance budget regression must be documented and approved.

---

## Observability

Monitor:
- Request latency ($P_{50}$, $P_{95}$, $P_{99}$)
- Error rate and exception tracebacks
- Process memory usage and CPU utilization
- Database query execution duration
- Slow endpoints and slow aggregation pipelines

Use **Pino** for structured logging in Express (`backend/config/logger.js`). Keep log outputs JSON-structured and machine-readable.

---

## Engineering Principle

> **Performance is a feature.**
>
> Every optimization must be:
> - **measurable**
> - **reproducible**
> - **documented**
> - **maintainable**
>
> Clean, readable, maintainable code takes priority over premature micro-optimizations unless profiling demonstrates a measurable user benefit.

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
