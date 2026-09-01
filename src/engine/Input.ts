import type { FighterInput, Keybinds, MobileLayout } from "../core/types";
import { clamp } from "../core/math";

export class Input {
  keys = new Set<string>();
  mouse = { x: 0, y: 0, left: false, right: false, leftHeld: false, rightHeld: false };
  p1: FighterInput = blankInput();
  p2: FighterInput = blankInput();
  pausePressed = false;
  bindCapture: ((code: string) => void) | null = null;
  touches: Map<number, { x: number; y: number; role: string }> = new Map();
  joy = { active: false, x: 0, y: 0, id: -1 };
  mobileDown = new Set<string>();
  usingTouch = false;
  canvas: HTMLCanvasElement;
  layout: MobileLayout;

  constructor(canvas: HTMLCanvasElement, layout: MobileLayout) {
    this.canvas = canvas;
    this.layout = layout;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousemove", this.onMouseMove);
    canvas.addEventListener("mousedown", this.onMouseDown);
    canvas.addEventListener("mouseup", this.onMouseUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = false;
    });
    window.addEventListener("gamepadconnected", () => undefined);
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.bindCapture) {
      e.preventDefault();
      this.bindCapture(e.code);
      this.bindCapture = null;
      return;
    }
    this.keys.add(e.code);
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * this.canvas.width;
    this.mouse.y = ((e.clientY - r.top) / r.height) * this.canvas.height;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouse.left = true;
    if (e.button === 2) this.mouse.right = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouse.left = false;
    if (e.button === 2) this.mouse.right = false;
  };

  worldAim(camX: number, camY: number, scale: number, bufW: number, bufH: number) {
    return {
      x: camX + (this.mouse.x / this.canvas.width) * (bufW / scale) - bufW / scale / 2,
      y: camY + (this.mouse.y / this.canvas.height) * (bufH / scale) - bufH / scale / 2,
    };
  }

  poll(p1Binds: Keybinds, p2Binds: Keybinds, gamepads: boolean) {
    this.pausePressed = this.keys.has(p1Binds.pause);
    this.p1 = this.fromBinds(p1Binds, true);
    this.p2 = this.fromBinds(p2Binds, false);
    if (this.usingTouch) this.applyTouch(this.p1);
    if (gamepads) this.applyGamepads();
    this.mouse.leftHeld = this.mouse.left;
    this.mouse.rightHeld = this.mouse.right;
  }

  private fromBinds(b: Keybinds, isP1: boolean): FighterInput {
    const left = this.keys.has(b.left);
    const right = this.keys.has(b.right);
    const up = this.keys.has(b.up);
    const down = this.keys.has(b.down);
    return {
      moveX: (right ? 1 : 0) - (left ? 1 : 0),
      moveY: (down ? 1 : 0) - (up ? 1 : 0),
      aimX: 0,
      aimY: 0,
      attack: isP1 ? this.mouse.left && !this.mouse.leftHeld : this.keys.has("KeyO"),
      attackHeld: isP1 ? this.mouse.left : this.keys.has("KeyO"),
      block: isP1 ? this.mouse.right : this.keys.has("KeyL"),
      jump: this.keys.has(b.jump),
      dodge: this.keys.has(b.dodge),
      crouch: down,
      interact: this.keys.has(b.interact),
      throw: this.keys.has(b.throw),
    };
  }

  applyTouch(into: FighterInput) {
    into.moveX = this.joy.x;
    into.moveY = this.joy.y;
    into.attack = this.mobileDown.has("attack");
    into.attackHeld = this.mobileDown.has("attack");
    into.block = this.mobileDown.has("block");
    into.jump = this.mobileDown.has("jump") || this.joy.y < -0.65;
    into.dodge = this.mobileDown.has("dodge");
    into.crouch = this.joy.y > 0.65;
    into.interact = this.mobileDown.has("interact");
    into.throw = this.mobileDown.has("throw");
  }

  private applyGamepads() {
    const pads = navigator.getGamepads?.() ?? [];
    const slots: FighterInput[] = [this.p1, this.p2];
    let gi = 0;
    for (const pad of pads) {
      if (!pad || gi > 1) continue;
      const x = dead(pad.axes[0] ?? 0);
      const y = dead(pad.axes[1] ?? 0);
      const ax = dead(pad.axes[2] ?? 0);
      const ay = dead(pad.axes[3] ?? 0);
      const t = slots[gi];
      t.moveX = x;
      t.moveY = y;
      t.aimX = ax;
      t.aimY = ay;
      t.attack = pad.buttons[7]?.pressed || pad.buttons[2]?.pressed;
      t.attackHeld = t.attack;
      t.block = pad.buttons[6]?.pressed || pad.buttons[1]?.pressed;
      t.jump = pad.buttons[0]?.pressed;
      t.dodge = pad.buttons[5]?.pressed || pad.buttons[4]?.pressed;
      t.crouch = y > 0.55;
      t.interact = pad.buttons[3]?.pressed;
      t.throw = pad.buttons[1]?.pressed && pad.buttons[7]?.pressed;
      gi++;
    }
  }

  setMobileButton(role: string, down: boolean) {
    this.usingTouch = true;
    if (down) this.mobileDown.add(role);
    else this.mobileDown.delete(role);
  }

  setJoy(x: number, y: number, active: boolean) {
    this.usingTouch = true;
    this.joy.active = active;
    this.joy.x = clamp(x, -1, 1);
    this.joy.y = clamp(y, -1, 1);
  }
}

function blankInput(): FighterInput {
  return {
    moveX: 0,
    moveY: 0,
    aimX: 0,
    aimY: 0,
    attack: false,
    attackHeld: false,
    block: false,
    jump: false,
    dodge: false,
    crouch: false,
    interact: false,
    throw: false,
  };
}

function dead(v: number, d = 0.18) {
  return Math.abs(v) < d ? 0 : v;
}

export { blankInput };
