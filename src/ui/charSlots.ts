import type { Loadout } from "../core/types";

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
    id: "lancer",
    name: "Brutus",
    className: "Lancer",
    cost: 50,
    blurb: "Lancers keep enemies at spear length. Strong spacing game, weaker in a clinch.",
    loadout: { weaponId: "spear", offhandId: null },
    primary: "#1a4a4f",
  },
  {
    id: "crusher",
    name: "Garrus",
    className: "Crusher",
    cost: 100,
    blurb: "Crushers trade speed for devastating knockback. One clean hit can end a bout.",
    loadout: { weaponId: "mace", offhandId: null },
    primary: "#5c3824",
  },
];

export const TUTORIAL_LINES = [
  "So… You want to learn the ways of the Rome Hopper, huh?",
  "Train hard in the yard, then pick your path from the great hall.",
  "Earn denarii, upgrade your gear, and make the crowd roar your name.",
];
