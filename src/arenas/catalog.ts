import Matter from "matter-js";
import { Palette } from "../core/constants";
import { PhysicsWorld } from "../physics/PhysicsWorld";

export interface ArenaDef {
  id: string;
  name: string;
  unlockLevel: number;
  w: number;
  h: number;
  ground: number;
  bg: string[];
  accent: string;
  amb: string;
  pits: { x: number; y: number; w: number; h: number }[];
  platforms: { x: number; y: number; w: number; h: number }[];
  props: { x: number; y: number; w: number; h: number; hp: number }[];
  traps: { x: number; y: number; w: number; h: number }[];
  spawn: [{ x: number; y: number }, { x: number; y: number }];
}

export const ARENAS: ArenaDef[] = [
  {
    id: "colosseum",
    name: "Sand Circlet",
    unlockLevel: 1,
    w: 1400,
    h: 620,
    ground: 520,
    bg: ["#3a2218", "#6b3a28", "#c4a574"],
    accent: Palette.bronze,
    amb: "crowd",
    pits: [],
    platforms: [
      { x: 280, y: 390, w: 140, h: 16 },
      { x: 1120, y: 390, w: 140, h: 16 },
    ],
    props: [
      { x: 700, y: 492, w: 28, h: 28, hp: 30 },
      { x: 500, y: 492, w: 22, h: 22, hp: 20 },
      { x: 900, y: 492, w: 22, h: 22, hp: 20 },
    ],
    traps: [],
        spawn: [
      { x: 520, y: 430 },
      { x: 880, y: 430 },
    ],
  },
  {
    id: "desert",
    name: "Sunken Court",
    unlockLevel: 2,
    w: 1500,
    h: 640,
    ground: 540,
    bg: ["#2a1c12", "#8a5a28", "#e0b56a"],
    accent: "#e8c547",
    amb: "wind",
    pits: [{ x: 750, y: 600, w: 160, h: 80 }],
    platforms: [
      { x: 750, y: 360, w: 180, h: 14 },
      { x: 240, y: 430, w: 100, h: 14 },
      { x: 1260, y: 430, w: 100, h: 14 },
    ],
    props: [{ x: 400, y: 512, w: 30, h: 26, hp: 24 }],
    traps: [],
    spawn: [
      { x: 320, y: 450 },
      { x: 1180, y: 450 },
    ],
  },
  {
    id: "frozen",
    name: "Hoarfrost Keep",
    unlockLevel: 3,
    w: 1380,
    h: 620,
    ground: 520,
    bg: ["#15202a", "#3a5560", "#9ec9d4"],
    accent: "#9ec9d4",
    amb: "wind",
    pits: [],
    platforms: [
      { x: 690, y: 340, w: 220, h: 14 },
      { x: 200, y: 420, w: 120, h: 14 },
      { x: 1180, y: 420, w: 120, h: 14 },
    ],
    props: [
      { x: 560, y: 494, w: 18, h: 36, hp: 18 },
      { x: 820, y: 494, w: 18, h: 36, hp: 18 },
    ],
    traps: [],
    spawn: [
      { x: 340, y: 430 },
      { x: 1040, y: 430 },
    ],
  },
  {
    id: "jungle",
    name: "Vine Sanctum",
    unlockLevel: 4,
    w: 1460,
    h: 660,
    ground: 560,
    bg: ["#102016", "#2a4a28", "#6b8f4a"],
    accent: "#3d5a3a",
    amb: "jungle",
    pits: [{ x: 730, y: 620, w: 120, h: 70 }],
    platforms: [
      { x: 360, y: 400, w: 110, h: 14 },
      { x: 730, y: 330, w: 150, h: 14 },
      { x: 1100, y: 400, w: 110, h: 14 },
    ],
    props: [{ x: 520, y: 532, w: 26, h: 26, hp: 22 }],
    traps: [{ x: 730, y: 548, w: 70, h: 10 }],
    spawn: [
      { x: 280, y: 470 },
      { x: 1180, y: 470 },
    ],
  },
  {
    id: "volcano",
    name: "Cinder Bowl",
    unlockLevel: 5,
    w: 1420,
    h: 640,
    ground: 530,
    bg: ["#1a0c0c", "#6b1d12", "#e25a1c"],
    accent: "#e25a1c",
    amb: "fire",
    pits: [{ x: 710, y: 600, w: 200, h: 90 }],
    platforms: [
      { x: 260, y: 410, w: 130, h: 16 },
      { x: 1160, y: 410, w: 130, h: 16 },
      { x: 710, y: 300, w: 160, h: 16 },
    ],
    props: [],
    traps: [
      { x: 500, y: 520, w: 40, h: 8 },
      { x: 920, y: 520, w: 40, h: 8 },
    ],
    spawn: [
      { x: 280, y: 430 },
      { x: 1140, y: 430 },
    ],
  },
  {
    id: "castle",
    name: "Banner Court",
    unlockLevel: 6,
    w: 1480,
    h: 640,
    ground: 530,
    bg: ["#16141c", "#3a3348", "#6b1d2a"],
    accent: "#8b1e2d",
    amb: "crowd",
    pits: [],
    platforms: [
      { x: 200, y: 380, w: 160, h: 18 },
      { x: 1280, y: 380, w: 160, h: 18 },
      { x: 740, y: 360, w: 120, h: 16 },
    ],
    props: [
      { x: 600, y: 504, w: 24, h: 24, hp: 28 },
      { x: 880, y: 504, w: 24, h: 24, hp: 28 },
    ],
    traps: [],
    spawn: [
      { x: 360, y: 440 },
      { x: 1120, y: 440 },
    ],
  },
  {
    id: "pit",
    name: "The Hollow",
    unlockLevel: 1,
    w: 1200,
    h: 700,
    ground: 600,
    bg: ["#0a0c10", "#1c242e", "#4a5560"],
    accent: "#c4843a",
    amb: "drip",
    pits: [],
    platforms: [
      { x: 600, y: 420, w: 200, h: 16 },
      { x: 220, y: 500, w: 100, h: 14 },
      { x: 980, y: 500, w: 100, h: 14 },
    ],
    props: [{ x: 600, y: 572, w: 32, h: 26, hp: 35 }],
    traps: [{ x: 600, y: 590, w: 80, h: 8 }],
    spawn: [
      { x: 280, y: 510 },
      { x: 920, y: 510 },
    ],
  },
];

export function arenaById(id: string) {
  return ARENAS.find((a) => a.id === id) ?? ARENAS[0];
}

export interface ArenaProp {
  body: Matter.Body;
  hp: number;
  max: number;
}

export class ArenaInstance {
  def: ArenaDef;
  statics: Matter.Body[] = [];
  sensors: Matter.Body[] = [];
  props: ArenaProp[] = [];

  constructor(def: ArenaDef, world: Matter.World) {
    this.def = def;
    const g = def.ground;
    const floor = PhysicsWorld.wall(def.w / 2, g + 40, def.w + 80, 80, "arena:ground");
    const left = PhysicsWorld.wall(-20, def.h / 2, 40, def.h, "arena:wall");
    const right = PhysicsWorld.wall(def.w + 20, def.h / 2, 40, def.h, "arena:wall");
    this.statics.push(floor, left, right);
    for (const p of def.platforms) {
      this.statics.push(PhysicsWorld.wall(p.x, p.y, p.w, p.h, "arena:plat"));
    }
    for (const pit of def.pits) {
      const gap = 180;
      this.sensors.push(PhysicsWorld.sensor(pit.x, pit.y, pit.w, pit.h, "sensor:pit"));
    }
    for (const t of def.traps) {
      this.sensors.push(PhysicsWorld.sensor(t.x, t.y, t.w, t.h, "sensor:trap"));
    }
    for (const pr of def.props) {
      const b = Matter.Bodies.rectangle(pr.x, pr.y, pr.w, pr.h, {
        density: 0.002,
        friction: 0.8,
        restitution: 0.1,
        label: "prop:crate",
        chamfer: { radius: 2 },
      });
      this.props.push({ body: b, hp: pr.hp, max: pr.hp });
    }
    Matter.Composite.add(world, [...this.statics, ...this.sensors, ...this.props.map((p) => p.body)]);
  }
}
