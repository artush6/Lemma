import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function SidebarPortal({
  host,
  visible = true,
  children,
}: {
  host?: HTMLElement | null | undefined;
  visible?: boolean;
  children: ReactNode;
}) {
  if (!visible) return null;
  return host ? createPortal(children, host) : children;
}
