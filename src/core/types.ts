export type LimbId =
  | "head"
  | "torso"
  | "pelvis"
  | "upperArmL"
  | "upperArmR"
  | "forearmL"
  | "forearmR"
  | "handL"
  | "handR"
  | "thighL"
  | "thighR"
  | "shinL"
  | "shinR"
  | "footL"
  | "footR";

export type ArmorSlot = "helmet" | "chest" | "shoulder" | "gloves" | "legs" | "boots";

export type WeaponCategory =
  | "shortsword"
  | "longsword"
  | "spear"
  | "axe"
  | "mace"
  | "dagger"
  | "hammer"
  | "halberd"
  | "bow"
  | "shield";

export type GameModeId =
  | "quick"
  | "versus"
  | "tournament"
  | "survival"
  | "campaign"
  | "training";

export type AiDifficulty = "novice" | "skilled" | "veteran" | "champion";

export type FighterState =
  | "idle"
  | "run"
  | "jump"
  | "crouch"
  | "attack"
  | "block"
  | "dodge"
  | "stagger"
  | "down"
  | "dead";

export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponCategory;
  damage: number;
  knockback: number;
  attackSpeed: number;
  reach: number;
  weight: number;
  staminaCost: number;
  throwDamage: number;
  twoHanded: boolean;
  isRanged: boolean;
  isShield: boolean;
  width: number;
  length: number;
  blade: string;
  haft: string;
  swingArc: number;
  chargeMult: number;
  unlockLevel: number;
  cost: number;
  description: string;
}

export interface ArmorDef {
  id: string;
  slot: ArmorSlot;
  name: string;
  protection: number;
  weight: number;
  durability: number;
  mobility: number;
  color: string;
  trim: string;
  unlockLevel: number;
  cost: number;
  description: string;
}

export interface Loadout {
  weaponId: string;
  offhandId: string | null;
  armor: Record<ArmorSlot, string | null>;
}

export interface Appearance {
  skin: number;
  hair: number;
  hairColor: number;
  face: number;
  height: number;
  width: number;
  muscle: number;
  primary: string;
  secondary: string;
  accessory: number;
  name: string;
}

export interface Keybinds {
  up: string;
  down: string;
  left: string;
  right: string;
  jump: string;
  dodge: string;
  interact: string;
  throw: string;
  pause: string;
}

export interface MobileLayout {
  joystick: { x: number; y: number };
  attack: { x: number; y: number };
  block: { x: number; y: number };
  jump: { x: number; y: number };
  dodge: { x: number; y: number };
  interact: { x: number; y: number };
  throw: { x: number; y: number };
  sensitivity: number;
}

export interface SettingsData {
  master: number;
  sfx: number;
  music: number;
  quality: "low" | "medium" | "high";
  shake: number;
  pixelScale: number;
  showFps: boolean;
  keybinds: Keybinds;
  p2Keybinds: Keybinds;
  mobile: MobileLayout;
  editingMobile: boolean;
}

export interface SaveData {
  version: number;
  coins: number;
  xp: number;
  level: number;
  unlockedWeapons: string[];
  unlockedArmor: string[];
  unlockedArenas: string[];
  appearance: Appearance;
  loadout: Loadout;
  campaignChapter: number;
  stats: StatsData;
  achievements: Record<string, boolean>;
  challenges: Record<string, number>;
}

export interface StatsData {
  wins: number;
  losses: number;
  kos: number;
  damageDealt: number;
  damageTaken: number;
  playSeconds: number;
  maxCombo: number;
  weaponsThrown: number;
  parries: number;
}

export interface HitInfo {
  attackerId: string;
  victimId: string;
  part: LimbId;
  damage: number;
  knockback: { x: number; y: number };
  impact: number;
  blocked: boolean;
  location: "head" | "torso" | "arm" | "leg" | "shield";
  weaponId: string;
}

export interface FighterInput {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  attack: boolean;
  attackHeld: boolean;
  block: boolean;
  jump: boolean;
  dodge: boolean;
  crouch: boolean;
  interact: boolean;
  throw: boolean;
}

export const DefaultKeybinds: Keybinds = {
  up: "KeyW",
  down: "KeyS",
  left: "KeyA",
  right: "KeyD",
  jump: "Space",
  dodge: "ShiftLeft",
  interact: "KeyE",
  throw: "KeyQ",
  pause: "Escape",
};

export const DefaultP2Keybinds: Keybinds = {
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  jump: "KeyP",
  dodge: "Slash",
  interact: "Period",
  throw: "Comma",
  pause: "Escape",
};

export const DefaultMobile: MobileLayout = {
  joystick: { x: 0.14, y: 0.78 },
  attack: { x: 0.88, y: 0.74 },
  block: { x: 0.76, y: 0.8 },
  jump: { x: 0.88, y: 0.56 },
  dodge: { x: 0.76, y: 0.62 },
  interact: { x: 0.64, y: 0.8 },
  throw: { x: 0.64, y: 0.64 },
  sensitivity: 1,
};
