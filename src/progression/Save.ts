import { defaultAppearance, defaultLoadout } from "../core/identity";
import type { SaveData, StatsData } from "../core/types";

const KEY = "rome-hoppers-save-v1";

export function emptyStats(): StatsData {
  return {
    wins: 0,
    losses: 0,
    kos: 0,
    damageDealt: 0,
    damageTaken: 0,
    playSeconds: 0,
    maxCombo: 0,
    weaponsThrown: 0,
    parries: 0,
  };
}

export function newSave(): SaveData {
  return {
    version: 1,
    coins: 80,
    xp: 0,
    level: 1,
    unlockedWeapons: ["gladius", "pugio", "buckler"],
    unlockedArmor: ["cloth-wrap", "leather-harness", "wrap-legs", "sandals"],
    unlockedArenas: ["colosseum"],
    unlockedChars: ["swordsman"],
    tutorialDone: false,
    charPage: 0,
    appearance: defaultAppearance(),
    loadout: defaultLoadout(),
    campaignChapter: 0,
    stats: emptyStats(),
    achievements: {},
    challenges: {},
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return newSave();
    const parsed = JSON.parse(raw) as SaveData;
    const fresh = newSave();
    return {
      ...fresh,
      ...parsed,
      appearance: { ...fresh.appearance, ...parsed.appearance },
      loadout: { ...fresh.loadout, ...parsed.loadout, armor: { ...fresh.loadout.armor, ...parsed.loadout.armor } },
      stats: { ...fresh.stats, ...parsed.stats },
      achievements: { ...fresh.achievements, ...parsed.achievements },
      challenges: { ...fresh.challenges, ...parsed.challenges },
    };
  } catch {
    return newSave();
  }
}

export function persistSave(data: SaveData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function xpForLevel(level: number) {
  return 80 + (level - 1) * 45;
}

export function grantXp(save: SaveData, amount: number) {
  save.xp += amount;
  while (save.xp >= xpForLevel(save.level)) {
    save.xp -= xpForLevel(save.level);
    save.level += 1;
    save.coins += 40 + save.level * 8;
  }
}
