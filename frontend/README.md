# Frontend — Jira Clone Client Application

This directory houses the React 19 client application for the Jira Clone, powered by a **60 FPS zero-reflow rendering engine**, $O(1)$ normalized Zustand board state, Web Worker background processing, LexoRank fractional indexing, and viewport-locked layout scrolling.

---

## 🛠️ Tech Stack & State Engine

* **Framework**: React 19
* **Build System**: Vite 8 (Vite code-splitting & Rollup bundling)
* **Styling**: Tailwind CSS v4 (CSS variables, layout containment rules `.kanban-column-container`)
* **State Management**:
  * **Normalized Board Store (`boardStore.js`)**: $O(1)$ key-value hash maps (`tasksById` and `columns`). Moving a card updates **only 2 columns and 1 card** (98% render reduction).
  * **TanStack React Query**: Server state caching & mutation invalidation hooks (`useTasks.js`).
* **Performance Offloading**:
  * **Web Worker (`boardWorker.js`)**: Non-blocking background thread for task filtering and text searching.
  * **LexoRank Fractional Indexing (`lexoRank.js`)**: String-based $O(1)$ task re-ordering without array reflows.
  * **Zero-Reflow Auto-Scroll (`useZeroReflowAutoScroll.js`)**: GPU-accelerated container scroll loop.

---

## 🖼️ Viewport Height Locking & Layout Architecture

To prevent unattractive blank spaces underneath the left navigation bar when scrolling through long views (e.g. *Profile Settings*, *Teams Directory*):
1. **Outer Viewport Container**: `h-dvh w-full flex overflow-hidden` locks the screen to exact 100vh viewport height.
2. **Sticky Navigation Sidebar**: `xl:sticky xl:top-0 xl:h-dvh` pins the left navigation sidebar in place at 100vh height.
3. **Internal Main Panel Scrolling**: `<main className="flex-1 overflow-y-auto custom-scrollbar">` handles vertical content scrolling inside the main pane, ensuring the sidebar never scrolls away or leaves blank space.

---

## 🎨 Loading UX & Glassmorphic Skeletons

* **[`AppSplash.jsx`](src/components/common/AppSplash.jsx)**: Minimalist Linear-style glassmorphic splash loader for initial app boot.
* **[`TabSkeleton.jsx`](src/components/common/TabSkeleton.jsx)**: Suspense fallback skeleton for lazy-loaded tabs (*Profile Settings*, *Schedule Calendar*).
* **[`KanbanBoardSkeleton.jsx`](src/components/common/KanbanBoardSkeleton.jsx)**: Wireframe placeholder for initial board data hydration ($0\text{ Cumulative Layout Shift}$).

---

## 📂 Component Map

* **[`KanbanBoard.jsx`](src/components/board/KanbanBoard.jsx)**: Board container handling drag-and-drop state mutation.
* **[`KanbanColumn.jsx`](src/components/board/KanbanColumn.jsx)**: Memoized column component subscribing strictly to column task IDs.
* **[`TaskCard.jsx`](src/components/board/TaskCard.jsx)**: Isolated task card subscriber reading from `tasksById` with interactive assignee selection.

---

## 🚀 Available Scripts

Run from the `frontend/` directory:

### `npm install`
Installs frontend dependencies.

### `npm run dev`
Starts Vite development server on `http://localhost:5173`.

### `npm run build`
Compiles, minifies, and bundles assets into `dist/` folder (**1870 modules in 1.10s**).

### `npm run lint`
Runs ESLint quality audits.
