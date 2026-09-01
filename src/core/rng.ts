export class Rng {
  private s: number;
  constructor(seed = Date.now() % 2147483647) {
    this.s = seed || 1;
  }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  range(a: number, b: number) {
    return a + this.next() * (b - a);
  }
  int(a: number, b: number) {
    return (a + this.next() * (b - a + 1)) | 0;
  }
  pick<T>(arr: readonly T[]) {
    return arr[(this.next() * arr.length) | 0];
  }
  chance(p: number) {
    return this.next() < p;
  }
}
