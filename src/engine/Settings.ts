import type { SettingsData } from "../core/types";
import { DefaultKeybinds, DefaultMobile, DefaultP2Keybinds } from "../core/types";

const KEY = "rome-hoppers-settings-v1";

export function defaultSettings(): SettingsData {
  return {
    master: 0.85,
    sfx: 0.9,
    music: 0.55,
    quality: "high",
    shake: 1,
    pixelScale: 0,
    showFps: false,
    keybinds: { ...DefaultKeybinds },
    p2Keybinds: { ...DefaultP2Keybinds },
    mobile: { ...DefaultMobile, joystick: { ...DefaultMobile.joystick }, attack: { ...DefaultMobile.attack }, block: { ...DefaultMobile.block }, jump: { ...DefaultMobile.jump }, dodge: { ...DefaultMobile.dodge }, interact: { ...DefaultMobile.interact }, throw: { ...DefaultMobile.throw } },
    editingMobile: false,
  };
}

export function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSettings();
    return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(data: SettingsData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
