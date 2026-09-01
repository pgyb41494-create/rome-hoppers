import { armorById } from "../armor/catalog";
import type { Appearance, Loadout, SaveData } from "../core/types";
import { weaponById } from "../weapons/catalog";

export interface FighterStats {
  className: string;
  power: number;
  vitality: number;
  defense: number;
  agility: number;
  reach: number;
  maxHp: number;
}

export function fighterClass(loadout: Loadout) {
  const w = weaponById(loadout.weaponId);
  const map: Record<string, string> = {
    shortsword: "Swordsman",
    longsword: "Duelist",
    spear: "Lancer",
    axe: "Reaver",
    mace: "Crusher",
    dagger: "Striker",
    hammer: "Breaker",
    halberd: "Pole Guard",
    bow: "Archer",
    shield: "Guardian",
  };
  return map[w.category] ?? "Gladiator";
}

export function rankTitle(level: number, wins: number) {
  if (level >= 12) return "Champion";
  if (level >= 8) return "Veteran";
  if (level >= 5) return "Contender";
  if (wins >= 3) return "Brawler";
  return "Weakling";
}

export function computeStats(save: SaveData, appearance?: Appearance, loadout?: Loadout): FighterStats {
  const ap = appearance ?? save.appearance;
  const lo = loadout ?? save.loadout;
  const w = weaponById(lo.weaponId);
  let prot = 0;
  let weight = 0;
  let mob = 1;
  for (const id of Object.values(lo.armor)) {
    const a = armorById(id);
    if (!a) continue;
    prot += a.protection;
    weight += a.weight;
    mob *= a.mobility;
  }
  const maxHp = Math.round(100 + save.level * 4 + prot * 40 + ap.muscle * 12);
  return {
    className: fighterClass(lo),
    power: Math.round(w.damage * 0.35 + ap.muscle * 8 + w.weight * 2),
    vitality: Math.round(maxHp / 18),
    defense: Math.round(prot * 28 + weight * 1.5),
    agility: Math.round(mob * 6 + (1 / w.weight) * 3),
    reach: Math.round(w.reach / 10),
    maxHp,
  };
}

export function modeLabel(mode: string) {
  const labels: Record<string, string> = {
    campaign: "Campaign",
    tournament: "Tournament",
    survival: "Survival",
    versus: "Local Versus",
    quick: "Quick Fight",
    training: "Training",
  };
  return labels[mode] ?? mode;
}
