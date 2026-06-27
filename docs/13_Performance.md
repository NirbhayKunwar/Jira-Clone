# 13 — Performance Optimizations

* **Zustand vs Direct DOM**: Removed redundant DOM mutations inside Zustand store calls to let React's lifecycle handle DOM paints declaratively.
* **Query Caching**: TanStack query caches items to avoid repetitive database reads.
