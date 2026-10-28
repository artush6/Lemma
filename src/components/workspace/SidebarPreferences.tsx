import { useEffect, useState } from "react";
import { Settings2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Settings, type Preferences } from "../editor/Settings";
import {
  deviceSettingsEvent,
  readDevicePreferences,
  readThemePreference,
  writeDevicePreferences,
  writeThemePreference,
  isDarkTheme,
  type ThemePreference,
} from "@/lib/devicePreferences";

/** Device settings remain available without mounting or navigating to a note. */
export function SidebarPreferences() {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(readDevicePreferences);
  const [theme, setTheme] = useState(readThemePreference);
  const [dark, setDark] = useState(() => isDarkTheme(theme));
  const [error, setError] = useState("");
  useEffect(() => {
    const sync = () => {
      setPreferences(readDevicePreferences());
      setTheme(readThemePreference());
    };
    window.addEventListener(deviceSettingsEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(deviceSettingsEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    const update = () => {
      const next = isDarkTheme(theme);
      setDark(next);
      document.documentElement.classList.toggle("dark", next);
    };
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);
  const onTheme = (next: ThemePreference) => {
    try {
      writeThemePreference(next);
      setTheme(next);
      setError("");
    } catch {
      setError("Device settings could not be saved.");
    }
  };
  const onPreferences = (next: Preferences) => {
    try {
      writeDevicePreferences(next);
      setPreferences(next);
      setError("");
    } catch {
      setError("Device settings could not be saved.");
    }
  };
  return (
    <div className="workspace-sidebar-preferences" role="group" aria-label="Workspace preferences">
      <Button variant="ghost" onClick={() => setOpen(true)}>
        <Settings2 /> Settings
      </Button>
      <Button
        variant="ghost"
        onClick={() => onTheme(dark ? "light" : "dark")}
        aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {dark ? <Sun /> : <Moon />} {dark ? "Light theme" : "Dark theme"}
      </Button>
      {error && <p role="alert">{error}</p>}
      <Settings
        open={open}
        onOpenChange={setOpen}
        preferences={preferences}
        onChange={onPreferences}
        theme={theme}
        onTheme={onTheme}
        dark={dark}
        saved="saved"
        scope="device"
        onSignOut={() => {}}
      />
    </div>
  );
}
