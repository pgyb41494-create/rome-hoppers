import type { ArmorSlot, Appearance, Loadout } from "./types";

export const HairStyles = ["shaved", "short", "mohawk", "tied", "long", "wreath"] as const;
export const FaceStyles = ["clean", "scar", "paint", "stubble", "mask"] as const;
export const Accessories = ["none", "cape", "belt", "necklace", "bracers", "laurel"] as const;

export function defaultAppearance(name = "Valens"): Appearance {
  return {
    skin: 2,
    hair: 1,
    hairColor: 1,
    face: 0,
    height: 1,
    width: 1,
    muscle: 0.55,
    primary: "#8b1e2d",
    secondary: "#c4843a",
    accessory: 1,
    name,
  };
}

export function rivalAppearance(name = "Cato"): Appearance {
  return {
    skin: 3,
    hair: 2,
    hairColor: 0,
    face: 1,
    height: 1.04,
    width: 1.06,
    muscle: 0.7,
    primary: "#1a4a4f",
    secondary: "#8aa0b3",
    accessory: 0,
    name,
  };
}

export function emptyArmor(): Record<ArmorSlot, string | null> {
  return {
    helmet: "cloth-wrap",
    chest: "leather-harness",
    shoulder: null,
    gloves: null,
    legs: "wrap-legs",
    boots: "sandals",
  };
}

export function defaultLoadout(): Loadout {
  return {
    weaponId: "gladius",
    offhandId: "buckler",
    armor: emptyArmor(),
  };
}

export const GladiatorNames = [
  "Valens",
  "Cato",
  "Livia",
  "Nero",
  "Sura",
  "Titus",
  "Aelia",
  "Rufus",
  "Cassia",
  "Varro",
  "Octavia",
  "Drusus",
  "Marcia",
  "Gaius",
  "Thalia",
  "Bran",
  "Kira",
  "Otho",
  "Selene",
  "Magnus",
];
