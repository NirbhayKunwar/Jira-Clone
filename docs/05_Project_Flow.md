# 05 — Complete Project Flow

Tracing a request lifecycle:

1. **User interaction**: User drags a task on the Kanban board.
2. **State update**: Local state is updated optimistically.
3. **API dispatch**: HTTP PUT request sent to `/api/tasks/:id` with Bearer token.
4. **Rate check**: Rate limiter checks client IP threshold.
5. **Session verify**: Auth middleware decodes token and sets `req.user`.
6. **Controller action**: Controller performs check on parameters.
7. **Database write**: Prisma updates task status inside PostgreSQL.
8. **HTTP response**: Returns `200 OK` payload.
9. **Cache Sync**: React Query invalidates task cache.
