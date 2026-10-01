# Lemma

A quiet mathematical note editor for university work. The editor stores structured Tiptap JSON, renders equations with KaTeX, plots functions with function-plot, and prints clean A4 pages from the browser.

## Run locally

1. Install Node.js 20+ and run `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
4. Apply both SQL migrations in `supabase/migrations/` in timestamp order.
5. Run `npm run dev` and open http://localhost:3000.

The attached project brief's project ID is configured in the ignored local `.env.local` for this checkout. The app uses only the publishable key in the browser. Never add a Supabase secret or service-role key to `NEXT_PUBLIC_*` variables.

## Writing

- Use the toolbar or `/` on an empty line for headings, lists, quote, callout, divider, equations, graphs, and code blocks.
- `⌘ M` inserts inline math; `⌘ ⇧ E` inserts a display equation. Ctrl works on Windows/Linux, and `⌘ ⇧ M` is also supported. Type `$x^2$` to turn it into inline math, or `$$` at the start of an empty paragraph to add a display equation. StarterKit markdown shortcuts include headings (`#`), lists (`-`), quotes (`>`), and dividers (`---`). Select the rendered equation to edit its source and preview side by side.
- Type a command such as `\sum` in the equation source to choose a snippet. Tab cycles through snippet fields.
- Type `$\` in the editor to toggle demonstration typography for ordinary prose, or use the `T` toolbar button.
- Graphs support multiple functions, draggable pan/scroll zoom, editable domains and size, and manually added coordinate points.
- Use **Read mode** to hide editing controls and **Focus mode** (⌘ ⇧ F) to clear workspace chrome. Use Export → PDF or Print / Save PDF to create a vector-text printout using the browser print dialog.
- `⌘ ⇧ P` opens workspace search. Create classes and nested folders from the library, move notes using **Move to**, favorite notes in the editor, and change each note’s icon from its toolbar menu. Writing settings include the typeface, size, and page arrangement. Notes start infinite; **Add page** inserts a numbered page break.
- Use **Share read-only link** to copy a URL that opens the note in a locked reader view.
- Notes autosave to Supabase after edits; failed saves remain in local browser storage for recovery. History keeps a starting snapshot and further snapshots at most once per two minutes of edits.

## Database and security

The migrations create `notes`, `note_versions`, and shared `folders`, enable RLS, and add a trigger for version snapshots. They grant the `anon` role read/write access to notes and folders because this MVP has no accounts. Anyone who obtains the project URL and publishable key can read, change, or delete every note and folder. The publishable key is designed to be public; it does not authenticate a person. Use this database only for non-sensitive demo notes until authentication, per-user ownership, and restrictive RLS policies are added. No service-role key is used by the app.

The frontend uses browser local storage as a temporary recovery cache. Supabase is the shared canonical store when configured; without environment variables, notes are local only and cloud controls show a save issue.

## Checks

- `npm run build` builds the production app with the Webpack builder (works in restricted/offline environments).
- `npm run lint` runs ESLint.

## MVP scope

The starter sample, **Sommes géométriques**, exercises prose, color, inline and aligned math, a callout, a list, and a graph. This MVP has no authentication or private notes. Shared URLs open read-only in the app, while the underlying database remains public under the accountless MVP policy. PDF export uses browser print-to-PDF for selectable text and vector math; the browser print dialog is required to save a PDF.
