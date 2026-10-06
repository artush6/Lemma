import { FileText } from "lucide-react";

export function NoteIcon({ icon, className = "" }: { icon?: string; className?: string }) {
  return icon && icon !== "📄" ? (
    <span className={`note-symbol ${className}`} aria-hidden="true">
      {icon}
    </span>
  ) : (
    <FileText size={16} className={`note-symbol ${className}`} aria-hidden="true" />
  );
}
