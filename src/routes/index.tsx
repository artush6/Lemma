import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import Editor from "@/components/editor/Editor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lemma — mathematical notes" },
      { name: "description", content: "A calm writing space for mathematical thinking." },
      { property: "og:title", content: "Lemma — mathematical notes" },
      { property: "og:description", content: "A calm writing space for mathematical thinking." },
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
