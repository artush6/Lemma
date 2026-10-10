# Graph memory retention

`GraphView` cleared the SVG on redraw/unmount but `function-plot` 1.25.4 keeps every constructed `Chart` in the static `Chart.cache`. Each redraw therefore retained a detached chart, SVG nodes and event listeners. Clearing the container did not release those references.

The view now owns the `Chart` explicitly and removes its listeners and cache entry during effect cleanup and failed plotting. Drawing still uses the same library, expressions, sampling settings and interactive zoom behavior.

In an isolated Chrome session with mocked cloud data, twenty note reopen/resize cycles increased retained DOM nodes from approximately 1,400 to 10,400 before the fix. After the fix, the count remained approximately 1,230, including after forced garbage collection. Retained JavaScript heap remained below 20 MB in that test. The test includes equations and a graph, repeated resizing/reopening, invalid expressions, and recovery to a valid plot.

Run `node tests/graph-memory.mjs` against a running configured development server. It uses Chrome by default (`CHROME_CHANNEL` and `BASE_URL` can override the defaults), reads the public Supabase URL from `.env.local`, and mocks all cloud traffic. No real account data is accessed or modified.

This confirms and fixes graph retention. It does **not** establish the cause of a reported 8 GB spike on a single note open. The representative note remained stable while idle; identifying that separate spike requires the affected note's content characteristics and whether the reported memory belongs to the browser renderer or the Node/Next.js server.

## Follow-up: first note and new-note entry

The reported spike also occurred when creating a blank note. `tests/editor-entry.mjs` now covers opening the single sample note from the library, creating a blank note from the library, creating ten more notes, and typing afterward. Cloud responses are mocked, including note creation. After forced garbage collection the measured JS heap was approximately 12 MB in the library, 14 MB in the first note, 15 MB in the first blank note and 17 MB after ten more notes. DOM nodes dropped from 1,228 in the graph note to 439 in the blank note; the ten additional note navigation rows brought this to 529. The app remained responsive, with one workspace list request and no runtime errors. The actual local Next dev-server process used approximately 200 MB RSS during this investigation. The dev runtime log contained no errors.

These results do not reproduce the reported 8 GB single-entry failure. Browser JS heap and total process memory are different measurements; identifying the affected browser/process (and its renderer or GPU helper) remains necessary. No further application behavior was changed based on an unconfirmed cause. Run the new regression with `node tests/editor-entry.mjs`.

## Safari-engine verification

After the report that both Arc and Safari were affected, `tests/webkit-entry.mjs` repeated the same first-note and blank-note actions in Playwright WebKit 26.6. The test includes process RSS for the WebKit launcher and its separate XPC WebContent, GPU and Networking helpers (which have parent PID 1 and would otherwise be missed by a descendant-only process count). Combined RSS was approximately 480 MB in the library, 528 MB in the sample note, 494 MB in the blank note and 518 MB after ten more notes. All entry/editing assertions passed; no runaway DOM mutations or browser errors occurred. This is isolated WebKit with mocked cloud data, not the user's Safari profile. Run `node tests/webkit-entry.mjs` after installing the official Playwright WebKit browser with `playwright install webkit`. ESLint passed.
