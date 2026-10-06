<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Lemma (ported from Next.js) lives in src/components/editor + src/lib/notes.ts and renders client-only at `/`; its plain CSS lives in src/styles.css. Why: the TipTap editor and graph library touch the browser on load.
- Render legacy stored note pages as one continuous editor document, preserving their boundaries and normalizing only on edits; this removes page navigation without losing existing content.
- Keep note metadata and formatting controls outside the printable canvas; A4 measurement and active-sheet footer share CSS 96dpi geometry.
- Keep device preferences in one versioned-shape settings object with categorized controls; only expose settings that affect actual behavior.
- Portal graph controls into a workspace-owned side-panel host and equations into anchored popovers within the app theme; editing controls must never alter printable document geometry.
- Use a shared note icon renderer across document metadata and navigation, and keep the contents outline as a compact workspace overlay rather than a reserved column.
- Position block insertion menus from live editor caret coordinates and available viewport space, keeping the current typing line unobstructed.
