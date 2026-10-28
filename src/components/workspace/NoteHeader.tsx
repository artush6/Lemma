import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Eye, Pencil, Focus, Share2, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
export function NoteHeader({
  title,
  folder,
  read,
  saved,
  onRead,
  onFocus,
  onShare,
  onRename,
  onLibrary,
  onSidebar,
  onExport,
  onHistory,
  onSettings,
  onFavorite,
  shared,
  onRevoke,
  exportDialog,
}: {
  title: string;
  folder: string;
  read: boolean;
  saved: "saved" | "saving" | "offline";
  onRead: (read: boolean) => void;
  onFocus: () => void;
  onShare: () => void;
  onRename: () => void;
  onLibrary: () => void;
  onSidebar: () => void;
  onExport: () => void;
  onHistory: () => void;
  onSettings: () => void;
  onFavorite: () => void;
  shared: boolean;
  onRevoke: () => void;
  exportDialog: ReactNode;
}) {
  return (
    <div className="workspace-note-header">
      <nav className="workspace-note-breadcrumb" aria-label="Document breadcrumb">
        <Button variant="ghost" size="sm" onClick={onLibrary} title={folder}>
          <span>{folder}</span>
        </Button>
        <span className="workspace-crumb-divider">/</span>
        <Button variant="ghost" size="sm" onClick={onRename} title="Rename note">
          <span>{title}</span>
          <ChevronDown size={12} />
        </Button>
      </nav>
      <div className="workspace-note-actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="workspace-mode"
              aria-label={`Document mode: ${read ? "Read" : "Edit"}`}
            >
              {read ? <Eye size={15} /> : <Pencil size={15} />}
              <span>{read ? "Read" : "Edit"}</span>
              <ChevronDown size={12} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="workspace-context workspace-mode-menu">
            <DropdownMenuRadioGroup
              value={read ? "read" : "edit"}
              onValueChange={(value) => onRead(value === "read")}
            >
              <DropdownMenuRadioItem value="edit">
                <Pencil size={15} /> Edit
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="read">
                <Eye size={15} /> Read
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="sm"
          className="workspace-focus-action"
          onClick={onFocus}
          title="Focus mode · ⌘/Ctrl Shift F"
        >
          <Focus size={15} />
          <span className="workspace-control-label">Focus</span>
        </Button>
        <span className={`workspace-note-save ${saved}`} role="status">
          <i />
          {saved === "saving" ? "Saving…" : saved === "offline" ? "Saved locally" : "Saved"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="workspace-share"
          onClick={onShare}
          title="Share read-only link"
        >
          <Share2 size={15} />
          <span className="workspace-control-label">Share</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More note actions">
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="workspace-context">
            <DropdownMenuItem onSelect={onRename}>Rename note</DropdownMenuItem>
            <DropdownMenuItem onSelect={onFavorite}>Toggle favorite</DropdownMenuItem>
            <DropdownMenuItem onSelect={onExport}>Export…</DropdownMenuItem>
            <DropdownMenuItem onSelect={onHistory}>Version history</DropdownMenuItem>
            <DropdownMenuItem onSelect={onFocus}>Focus mode</DropdownMenuItem>
            <DropdownMenuItem onSelect={onShare}>Share read-only link</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSidebar}>Toggle note sidebar</DropdownMenuItem>
            <DropdownMenuItem onSelect={onSettings}>Writing settings…</DropdownMenuItem>
            {shared && <DropdownMenuItem onSelect={onRevoke}>Stop sharing</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
        {exportDialog}
      </div>
    </div>
  );
}
