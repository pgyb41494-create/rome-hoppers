export const GAME_W = 640;
export const GAME_H = 360;

export const Palette = {
  night: "#0d1117",
  ink: "#12161c",
  slate: "#1c242e",
  iron: "#4a5560",
  steel: "#8aa0b3",
  cream: "#f0e6d0",
  parchment: "#e8d7b5",
  sand: "#c4a574",
  bronze: "#c4843a",
  gold: "#e8c547",
  wine: "#6b1d2a",
  crimson: "#c43b3b",
  rust: "#a34a32",
  teal: "#1a4a4f",
  aqua: "#3aa8a0",
  leather: "#6b4423",
  bark: "#3a2a1c",
  moss: "#3d5a3a",
  ice: "#9ec9d4",
  magma: "#e25a1c",
} as const;

export const SkinTones = [
  "#f3d2b5",
  "#e0b48a",
  "#c48a5a",
  "#8d5a36",
  "#5c3824",
  "#3b2418",
] as const;

export const HairColors = [
  "#1a120e",
  "#3b2418",
  "#6b4423",
  "#c4843a",
  "#e8c547",
  "#8aa0b3",
  "#f0e6d0",
  "#6b1d2a",
] as const;

export const TeamColors = {
  player: { primary: "#8b1e2d", secondary: "#c4843a", accent: "#e8c547" },
  rival: { primary: "#1a4a4f", secondary: "#8aa0b3", accent: "#3aa8a0" },
} as const;

export const Collision = {
  world: 0x0001,
  fighter: 0x0002,
  weapon: 0x0004,
  shield: 0x0008,
  prop: 0x0010,
  sensor: 0x0020,
  pickup: 0x0040,
} as const;
