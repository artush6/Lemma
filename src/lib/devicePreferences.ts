import { defaultPreferences, type Preferences } from "@/components/editor/Settings";
export type ThemePreference = "system" | "light" | "dark";
export const deviceSettingsEvent = "lemma:device-settings";
export function readDevicePreferences(): Preferences {
  try {
    const raw = localStorage.getItem("lemma:preferences");
    return {
      ...defaultPreferences,
      ...(raw
        ? JSON.parse(raw)
        : {
            font: localStorage.getItem("lemma:font") || defaultPreferences.font,
            size: Number(localStorage.getItem("lemma:size")) || defaultPreferences.size,
          }),
    };
  } catch {
    return { ...defaultPreferences };
  }
}
export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem("lemma:theme");
    return value === "light" || value === "dark" || value === "system"
      ? value
      : localStorage.getItem("lemma:dark") === "true"
        ? "dark"
        : "system";
  } catch {
    return document.documentElement.classList.contains("dark") ? "dark" : "system";
  }
}
export function isDarkTheme(theme: ThemePreference) {
  return (
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}
export function writeDevicePreferences(value: Preferences) {
  localStorage.setItem("lemma:preferences", JSON.stringify(value));
  localStorage.setItem("lemma:font", value.font);
  localStorage.setItem("lemma:size", String(value.size));
  window.dispatchEvent(new Event(deviceSettingsEvent));
}
export function writeThemePreference(value: ThemePreference) {
  localStorage.setItem("lemma:theme", value);
  localStorage.setItem("lemma:dark", String(isDarkTheme(value)));
  document.documentElement.classList.toggle("dark", isDarkTheme(value));
  window.dispatchEvent(new Event(deviceSettingsEvent));
}
