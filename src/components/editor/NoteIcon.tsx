import { FileText } from "lucide-react";

import { iconCatalog, decodeIcon } from "./iconCatalog";

export function NoteIcon({ icon, className = "" }: { icon?: string; className?: string }) {
  if (icon?.startsWith("svg:")) {
    const { name, color } = decodeIcon(icon);
    const Icon = iconCatalog[name as keyof typeof iconCatalog] || FileText;
    return (
      <Icon size={16} style={{ color }} className={`note-symbol ${className}`} aria-hidden="true" />
    );
  }
  return icon && icon !== "📄" ? (
    <span className={`note-symbol ${className}`} aria-hidden="true">
      {icon}
    </span>
  ) : (
    <FileText size={16} className={`note-symbol ${className}`} aria-hidden="true" />
  );
}
