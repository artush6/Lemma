import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import Editor from "@/components/editor/Editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lemma — notes, code & flashcards" },
      {
        name: "description",
        content:
          "A calm workspace for mathematical notes, code experiments and spaced-repetition flashcards.",
      },
      { property: "og:title", content: "Lemma — notes, code & flashcards" },
      {
        property: "og:description",
        content:
          "A calm workspace for mathematical notes, code experiments and spaced-repetition flashcards.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <ClientOnly fallback={null}>
      <Editor />
    </ClientOnly>
  ),
});
