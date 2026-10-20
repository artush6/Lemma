import { useRef, type PointerEvent } from "react";
import { MoveDiagonal2 } from "lucide-react";
export function ResizeHandle({
  label,
  width,
  height,
  onResize,
}: {
  label: string;
  width: number;
  height?: number | undefined;
  onResize: (width: number, height?: number) => void;
}) {
  const start = useRef<{
    x: number;
    y: number;
    width: number;
    height?: number | undefined;
    parent: number;
  } | null>(null);
  const drag = (event: PointerEvent<HTMLButtonElement>) => {
    if (!start.current) return;
    const value = start.current;
    onResize(
      Math.max(20, Math.min(100, value.width + ((event.clientX - value.x) * 100) / value.parent)),
      value.height === undefined
        ? undefined
        : Math.max(180, Math.min(600, value.height + event.clientY - value.y)),
    );
  };
  return (
    <button
      className="media-resize-handle"
      aria-label={label}
      title={`${label} · drag or use arrow keys`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        start.current = {
          x: event.clientX,
          y: event.clientY,
          width,
          height,
          parent:
            event.currentTarget.parentElement?.parentElement?.getBoundingClientRect().width || 640,
        };
      }}
      onPointerMove={drag}
      onPointerUp={(event) => {
        drag(event);
        start.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => {
        start.current = null;
      }}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
          event.preventDefault();
          event.stopPropagation();
          const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -5 : 5;
          if (height !== undefined && ["ArrowUp", "ArrowDown"].includes(event.key))
            onResize(width, Math.max(180, Math.min(600, height + delta * 2)));
          else onResize(Math.max(20, Math.min(100, width + delta)), height);
        }
      }}
    >
      <MoveDiagonal2 size={15} />
    </button>
  );
}
