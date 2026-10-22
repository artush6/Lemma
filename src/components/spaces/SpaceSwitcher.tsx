import { FileText, Code2, Layers } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type Space = "notes" | "code" | "cards";
const spaces: { id: Space; label: string; icon: typeof FileText; key: string }[] = [
  { id: "notes", label: "Notes", icon: FileText, key: "1" },
  { id: "code", label: "Code Lab", icon: Code2, key: "2" },
  { id: "cards", label: "Flashcards", icon: Layers, key: "3" },
];

export function SpaceSwitcher({ value, onChange }: { value: Space; onChange: (s: Space) => void }) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => {
        if (v === "notes" || v === "code" || v === "cards") onChange(v);
      }}
      className="space-navigation"
    >
      <TabsList className="space-switcher" aria-label="Spaces">
        {spaces.map(({ id, label, icon: Icon, key }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={value === id ? "is-active" : ""}
            title={`${label} (Alt+${key})`}
          >
            <Icon size={15} />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
