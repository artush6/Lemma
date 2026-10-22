import { PanelLeft, PanelRight, ExternalLink, PanelsTopLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
export function ReferencePlacement({
  side,
  onSide,
  onWindow,
  disabled = false,
}: {
  side: "left" | "right";
  onSide: (side: "left" | "right") => void;
  onWindow: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Reference placement"
          title="Reference placement"
        >
          <PanelsTopLeft size={17} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="reference-placement-menu">
        <DropdownMenuRadioGroup
          value={side}
          onValueChange={(value) => onSide(value as "left" | "right")}
        >
          <DropdownMenuRadioItem value="left">
            <PanelLeft size={16} />
            Dock left
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="right">
            <PanelRight size={16} />
            Dock right
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={disabled} onSelect={onWindow}>
          <ExternalLink size={16} />
          Open in new window
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
