# Lemma

Lemma is a focused study workspace for computer science students: organize notes by class, write on independently saved pages, work with math and graphs, and search across your notes.

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
4. Apply every SQL migration in `supabase/migrations/` in timestamp order.
5. Enable email sign-in links in Supabase Auth and add the local and production URLs to its redirect allow list. To use “Continue as guest,” also enable anonymous sign-ins in the Supabase Auth settings.
6. Run `npm run dev` and open http://localhost:3000.

The browser only uses the public publishable key. Never put a Supabase secret or service-role key in a `NEXT_PUBLIC_*` variable. Without Supabase settings, Lemma runs locally and saves drafts in this browser.

## Writing and pages

- Use `/` on an empty line for headings, lists, quotes, callouts, dividers, equations, graphs, and code blocks.
- `⌘ M` inserts inline math; `⌘ ⇧ E` inserts a display equation. `$x^2$` also converts to inline math. Select an equation to edit its source and preview.
- Paste from Notion or another rich-text app to keep common structure while dropping copied styling. Tables become readable text rows.
- Each note contains separately selectable pages. Use the Pages list in the left rail to add, switch, or delete a page. The page ID is in the URL, so refresh and browser navigation return to that page.
- Search checks note titles and page text. The contents rail jumps to a heading in the current page.
- Share links are read-only and use a random token. Supabase workspaces can use an email sign-in link or a persistent anonymous guest session. Guest workspaces are tied to the browser session on that device; use email sign-in when you need access across devices.
- Use Read mode, Focus mode (`⌘ ⇧ F`), or Export → PDF / Print to study and share your work.

## Data and privacy

The migrations scope notes and folders to the signed-in Supabase user. Public clients cannot query those tables. A read-only database function returns only the note associated with a matching share token.

The private-workspace migration leaves pre-existing accountless notes with no owner. They are retained in the database but are no longer accessible through the client. Export or assign those legacy notes before applying the migration if you need to keep them.

Local recovery drafts are namespaced by account in the browser. Supabase remains canonical when configured; unsynced changes remain in local storage and the save indicator reports when cloud saving fails.

## Current scope

Lemma includes classes and folders, notes with independent pages, rich text and math blocks, function graphs, full-text-in-page search, heading navigation, version history, PDF printing, and read-only sharing. Flashcards and a sandboxed code runner are possible next study tools; the current code block is a writing block, not an execution environment.
