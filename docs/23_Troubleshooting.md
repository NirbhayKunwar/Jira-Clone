# 23 — Troubleshooting & Common Bugs

* **Issue**: Strict comparison (`!==`) fails on string vs number IDs.
  * **Fix**: Normalise values to string: `String(w.id) !== String(id)`.
* **Issue**: Auto schema push data-loss.
  * **Fix**: Remove dataloss flag from startup scripts.
