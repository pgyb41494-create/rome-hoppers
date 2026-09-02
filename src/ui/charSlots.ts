import type { Loadout, SaveData } from "../core/types";

export interface CharSlotDef {
  id: string;
  name: string;
  className: string;
  cost: number;
  blurb: string;
  loadout: Partial<Loadout>;
  primary: string;
}

export const CHAR_SLOTS: CharSlotDef[] = [
  {
    id: "swordsman",
    name: "Magnus",
    className: "Swordsman",
    cost: 0,
    blurb: "Swordsmen are excellent defenders. High endurance, heavily armored and later swords have long reach.",
    loadout: { weaponId: "gladius", offhandId: "buckler" },
    primary: "#8b1e2d",
  },
  {
    id: "spearman",
    name: "Lucius",
    className: "Spearman",
    cost: 0,
    blurb: "Spearmen keep foes at a distance with long thrusts and steady footing.",
    loadout: { weaponId: "spear", offhandId: null },
    primary: "#4a5560",
  },
  {
    id: "axeman",
    name: "Voss",
    className: "Axeman",
    cost: 0,
    blurb: "Axemen trade defense for brutal chops that stagger armored rivals.",
    loadout: { weaponId: "axe", offhandId: null },
    primary: "#6b4423",
  },
  {
    id: "lancer",
    name: "Brutus",
    className: "Lancer",
    cost: 50,
    blurb: "Lancers keep enemies at spear length. Strong spacing game, weaker in a clinch.",
    loadout: { weaponId: "spear", offhandId: "buckler" },
    primary: "#1a4a4f",
  },
  {
    id: "crusher",
    name: "Garrus",
    className: "Crusher",
    cost: 100,
    blurb: "Crushers trade speed for devastating knockback. One clean hit can end a bout.",
    loadout: { weaponId: "mace", offhandId: "scutum" },
    primary: "#5c3824",
  },
];

const FREE_ROTATE = ["swordsman", "spearman", "axeman"];

export function getDeathRecruitOptions(save: SaveData): CharSlotDef[] {
  const freeId = FREE_ROTATE[save.stats.losses % FREE_ROTATE.length] ?? "swordsman";
  const free = CHAR_SLOTS.find((s) => s.id === freeId) ?? CHAR_SLOTS[0];
  const premiumA = CHAR_SLOTS.find((s) => s.id === "lancer")!;
  const premiumB = CHAR_SLOTS.find((s) => s.id === "crusher")!;
  return [
    { ...free, cost: 0 },
    { ...premiumA },
    { ...premiumB },
  ];
}

export const TUTORIAL_LINES = [
  "So… You want to learn the ways of the Rome Hopper, huh?",
  "Use A and D to move. Arrow keys swing your weapon!",
  "Earn denarii, upgrade your gear, and make the crowd roar your name.",
];
