import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { InputRule } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ImagePlus } from "lucide-react";

export const safeImageSource = (src: string) => {
  const source = src.trim();
  if (
    !source ||
    [...source].some((char) => char.charCodeAt(0) < 32 || char === "<" || char === ">")
  )
    return false;
  return (
    /^(https?:\/\/|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(source) ||
    !/^[a-z][a-z0-9+.-]*:/i.test(source)
  );
};
export const imageFileContent = async (file: File) => {
  if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return null;
  if (file.size > 2 * 1024 * 1024) throw new Error("Choose an image smaller than 2 MB.");
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return { type: "image", attrs: { src, alt: file.name } };
};

export const ImageBlock = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes: () => ({ src: { default: "" }, alt: { default: "" }, title: { default: null } }),
  parseHTML: () => [
    {
      tag: "img[src]",
      getAttrs: (el) => (safeImageSource(el.getAttribute("src") || "") ? null : false),
    },
  ],
  renderHTML: ({ HTMLAttributes }) => ["img", mergeAttributes(HTMLAttributes)],
});

function MissingImageView({ node, editor, getPos }: NodeViewProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <NodeViewWrapper className="missing-image" contentEditable={false}>
      <ImagePlus size={20} />
      <span>
        <strong>{node.attrs["name"]}</strong>
        <small>Image file was not included in the pasted text.</small>
      </span>
      {editor.isEditable && (
        <Button variant="ghost" type="button" onClick={() => input.current?.click()}>
          Attach image
        </Button>
      )}
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          try {
            const content = await imageFileContent(file);
            if (editor.isDestroyed) return;
            const pos = getPos();
            if (content && typeof pos === "number")
              editor
                .chain()
                .focus()
                .insertContentAt({ from: pos, to: pos + node.nodeSize }, content)
                .run();
          } catch (error) {
            window.alert(
              error instanceof Error ? error.message : "This image could not be opened.",
            );
          } finally {
            if (input.current) input.current.value = "";
          }
        }}
      />
    </NodeViewWrapper>
  );
}
export const ImagePlaceholder = Node.create({
  name: "imagePlaceholder",
  group: "block",
  atom: true,
  addAttributes: () => ({
    name: { default: "Image", parseHTML: (el) => el.getAttribute("data-name") },
  }),
  parseHTML: () => [{ tag: 'figure[data-type="image-placeholder"]' }],
  renderHTML: ({ node }) => [
    "figure",
    { "data-type": "image-placeholder", "data-name": node.attrs["name"] },
    node.attrs["name"],
  ],
  addNodeView: () => ReactNodeViewRenderer(MissingImageView),
});

function ToggleView({ node, updateAttributes }: NodeViewProps) {
  return (
    <NodeViewWrapper
      className={`toggle-heading level-${node.attrs["level"]} ${node.attrs["collapsed"] ? "collapsed" : ""}`}
    >
      <button
        type="button"
        contentEditable={false}
        className="toggle-heading-button"
        aria-label={node.attrs["collapsed"] ? "Expand section" : "Collapse section"}
        aria-expanded={!node.attrs["collapsed"]}
        onClick={() => updateAttributes({ collapsed: !node.attrs["collapsed"] })}
      >
        <ChevronRight size={16} />
      </button>
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
export const ToggleBody = Node.create({
  name: "toggleBody",
  content: "block+",
  defining: true,
  parseHTML: () => [{ tag: 'div[data-type="toggle-body"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, { "data-type": "toggle-body" }),
    0,
  ],
});
export const ToggleHeading = Node.create({
  name: "toggleHeading",
  group: "block",
  content: "heading toggleBody",
  defining: true,
  addAttributes: () => ({
    level: {
      default: 2,
      parseHTML: (el) => Number(el.getAttribute("data-level")) || 2,
      renderHTML: (attrs) => ({ "data-level": attrs["level"] }),
    },
    collapsed: {
      default: false,
      parseHTML: (el) => el.getAttribute("data-collapsed") === "true",
      renderHTML: (attrs) => ({ "data-collapsed": String(attrs["collapsed"]) }),
    },
  }),
  parseHTML: () => [{ tag: 'section[data-type="toggle-heading"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { "data-type": "toggle-heading" }),
    0,
  ],
  addNodeView: () => ReactNodeViewRenderer(ToggleView),
  addInputRules() {
    return [
      new InputRule({
        find: /^(#{1,6})\s>\s$/,
        handler: ({ state, range, match }) => {
          const level = match[1]!.length;
          const node = this.type.create({ level }, [
            state.schema.nodes["heading"]!.create({ level }),
            state.schema.nodes["toggleBody"]!.create(
              null,
              state.schema.nodes["paragraph"]!.create(),
            ),
          ]);
          const resolved = state.doc.resolve(range.from);
          if (!resolved.parent.isTextblock || resolved.depth === 0) return;
          const start = resolved.before();
          const transaction = state.tr;
          transaction.replaceWith(start, resolved.after(), node);
          transaction.setSelection(TextSelection.create(transaction.doc, start + 2));
        },
      }),
    ];
  },
});
