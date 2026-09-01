import { rand } from "../core/math";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
}

export class ParticleSystem {
  list: Particle[] = [];
  cap = 220;

  spawn(x: number, y: number, n: number, color: string, speed = 2, size = 2) {
    const room = this.cap - this.list.length;
    const count = Math.min(n, Math.max(0, room));
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(0.3, 1) * speed;
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(0, 1.2),
        life: rand(0.25, 0.7),
        max: 0.7,
        size: size,
        color,
        g: 18,
      });
    }
  }

  dust(x: number, y: number) {
    this.spawn(x, y, 6, "#c4a574", 1.2, 2);
  }

  spark(x: number, y: number, heavy: boolean) {
    this.spawn(x, y, heavy ? 16 : 8, heavy ? "#e8c547" : "#f0e6d0", heavy ? 3.2 : 2, 2);
    this.spawn(x, y, 4, "#c43b3b", 1.4, 2);
  }

  block(x: number, y: number) {
    this.spawn(x, y, 10, "#8aa0b3", 2.4, 2);
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      p.vy += p.g * dt;
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  }
}
