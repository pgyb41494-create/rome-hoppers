import { ARMOR, armorForSlot } from "../armor/catalog";
import { ARENAS } from "../arenas/catalog";
import { Accessories, FaceStyles, HairStyles } from "../core/identity";
import type { ArmorSlot, GameModeId, SaveData, SettingsData } from "../core/types";
import { ACHIEVEMENTS, CHALLENGES } from "../progression/Achievements";
import { xpForLevel } from "../progression/Save";
import { WEAPONS } from "../weapons/catalog";

export type ScreenId =
  | "main"
  | "play"
  | "character"
  | "weapons"
  | "armor"
  | "tournament"
  | "settings"
  | "stats"
  | "fight";

export class AppUI {
  menus: HTMLElement;
  hud: HTMLElement;
  mobile: HTMLElement;
  toasts: HTMLElement;
  onNav: (id: ScreenId | "back") => void = () => undefined;
  onPlay: (mode: GameModeId, extra?: string) => void = () => undefined;
  onEquipWeapon: (id: string, off: boolean) => void = () => undefined;
  onEquipArmor: (id: string) => void = () => undefined;
  onAppearance: (key: string, value: number | string) => void = () => undefined;
  onSetting: (key: string, value: unknown) => void = () => undefined;
  onBind: (who: "p1" | "p2", action: string) => void = () => undefined;
  onResult: (action: "menu" | "retry" | "next") => void = () => undefined;

  constructor() {
    this.menus = document.getElementById("menus")!;
    this.hud = document.getElementById("hud")!;
    this.mobile = document.getElementById("mobile-controls")!;
    this.toasts = document.getElementById("toasts")!;
  }

  render(screen: ScreenId, save: SaveData, settings: SettingsData) {
    if (screen === "fight") {
      this.menus.innerHTML = "";
      return;
    }
    const xpNeed = xpForLevel(save.level);
    const header = `
      <div class="topbar">
        <div class="brand">
          <h1>ROME HOPPERS</h1>
          <p>Glory in the dust</p>
        </div>
        <div class="meta">
          <div class="chip">Lv ${save.level}</div>
          <div class="chip">${save.coins} denarii</div>
          <div class="chip">XP ${save.xp}/${xpNeed}</div>
        </div>
      </div>`;

    if (screen === "main") {
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="layout">
          <div class="nav">
            ${btn("play", "Play")}
            ${btn("character", "Character")}
            ${btn("weapons", "Weapons")}
            ${btn("armor", "Armor")}
            ${btn("tournament", "Tournament")}
            ${btn("stats", "Statistics")}
            ${btn("settings", "Settings")}
          </div>
          <div class="hero">
            <canvas id="menu-art" width="640" height="360"></canvas>
            <div class="caption">Skill, weight, and timing. The sand remembers every miss.</div>
          </div>
        </div>
      </section>`;
    }

    if (screen === "play") {
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        <div class="grid">
          ${modeCard("quick", "Quick Fight", "One opponent. One arena. Prove your timing.")}
          ${modeCard("versus", "Local Versus", "Two fighters, one device. Split controls or pads.")}
          ${modeCard("tournament", "Tournament", "Climb a bracket until only a laurel remains.")}
          ${modeCard("survival", "Survival", "Waves that think better, not sponge more.")}
          ${modeCard("campaign", "Campaign", "From nameless sand to champion of the circlet.")}
          ${modeCard("training", "Training", "Dummies, weapons, footwork, and tutorials.")}
        </div>
        <h3 style="margin:18px 0 8px;font-family:Cinzel,serif;color:var(--gold)">Arenas</h3>
        <div class="grid">
          ${ARENAS.map((a) => {
            const locked = save.level < a.unlockLevel && !save.unlockedArenas.includes(a.id);
            return `<div class="card ${locked ? "locked" : ""}" data-arena="${a.id}">
              <h3>${a.name}</h3>
              <p>${locked ? `Unlocks at level ${a.unlockLevel}` : "Ready for bloodless glory."}</p>
            </div>`;
          }).join("")}
        </div>
      </section>`;
    }

    if (screen === "character") {
      const ap = save.appearance;
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        <div class="layout">
          <div class="hero" style="min-height:320px">
            <canvas id="preview" width="320" height="360"></canvas>
          </div>
          <div class="form">
            <label class="field">Name <input id="nm" type="text" maxlength="16" value="${escapeHtml(ap.name)}" /></label>
            <label class="field">Skin <input id="skin" type="range" min="0" max="5" value="${ap.skin}" /></label>
            <label class="field">Hair (${HairStyles[ap.hair]}) <input id="hair" type="range" min="0" max="5" value="${ap.hair}" /></label>
            <label class="field">Hair color <input id="hairColor" type="range" min="0" max="7" value="${ap.hairColor}" /></label>
            <label class="field">Face (${FaceStyles[ap.face]}) <input id="face" type="range" min="0" max="4" value="${ap.face}" /></label>
            <label class="field">Height <input id="height" type="range" min="0.86" max="1.16" step="0.01" value="${ap.height}" /></label>
            <label class="field">Width <input id="width" type="range" min="0.86" max="1.18" step="0.01" value="${ap.width}" /></label>
            <label class="field">Muscle <input id="muscle" type="range" min="0" max="1" step="0.01" value="${ap.muscle}" /></label>
            <label class="field">Primary color <input id="primary" type="text" value="${ap.primary}" /></label>
            <label class="field">Secondary <input id="secondary" type="text" value="${ap.secondary}" /></label>
            <label class="field">Accessory (${Accessories[ap.accessory]}) <input id="accessory" type="range" min="0" max="5" value="${ap.accessory}" /></label>
          </div>
        </div>
      </section>`;
    }

    if (screen === "weapons") {
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}<span class="hint">Main hand and offhand. Two-handed weapons drop the shield.</span></div>
        <div class="grid">${WEAPONS.map((w) => {
          const owned = save.unlockedWeapons.includes(w.id) || w.unlockLevel <= save.level;
          const eq = save.loadout.weaponId === w.id || save.loadout.offhandId === w.id;
          return `<div class="card ${owned ? "" : "locked"} ${eq ? "equipped" : ""}" data-weapon="${w.id}">
            <h3>${w.name}</h3>
            <p>${w.description}</p>
            <p class="statline">Dmg ${w.damage} · Spd ${w.attackSpeed.toFixed(2)} · Reach ${w.reach} · Wt ${w.weight}</p>
            <p class="statline">${owned ? (w.cost && !save.unlockedWeapons.includes(w.id) ? `${w.cost} denarii` : "Owned") : `Lv ${w.unlockLevel}`}</p>
          </div>`;
        }).join("")}</div>
      </section>`;
    }

    if (screen === "armor") {
      const slots: ArmorSlot[] = ["helmet", "chest", "shoulder", "gloves", "legs", "boots"];
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        ${slots
          .map((s) => {
            return `<h3 style="margin:12px 0 8px;font-family:Cinzel,serif;color:var(--gold)">${s}</h3>
            <div class="grid">${armorForSlot(s)
              .map((a) => {
                const owned = save.unlockedArmor.includes(a.id) || a.unlockLevel <= save.level;
                const eq = save.loadout.armor[s] === a.id;
                return `<div class="card ${owned ? "" : "locked"} ${eq ? "equipped" : ""}" data-armor="${a.id}">
                  <h3>${a.name}</h3>
                  <p>${a.description}</p>
                  <p class="statline">Prot ${(a.protection * 100) | 0}% · Wt ${a.weight} · Mob ${a.mobility.toFixed(2)}</p>
                </div>`;
              })
              .join("")}</div>`;
          })
          .join("")}
      </section>`;
    }

    if (screen === "tournament") {
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        <div class="hero" style="padding:24px">
          <h2 style="font-family:Cinzel,serif;color:var(--gold)">Circlet Bracket</h2>
          <p class="hint" style="margin:12px 0 18px">Four victories. Difficulty climbs with each gate. No extra health sponges — they just read you better.</p>
          <button class="primary" data-nav="start-tourney">Enter the dust</button>
        </div>
      </section>`;
    }

    if (screen === "stats") {
      const s = save.stats;
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        <div class="stats-grid">
          ${stat("Wins", s.wins)}${stat("Losses", s.losses)}${stat("KOs", s.kos)}
          ${stat("Damage", s.damageDealt | 0)}${stat("Taken", s.damageTaken | 0)}
          ${stat("Max combo", s.maxCombo)}${stat("Throws", s.weaponsThrown)}${stat("Parries", s.parries)}
        </div>
        <h3 style="margin:22px 0 8px;font-family:Cinzel,serif;color:var(--gold)">Achievements</h3>
        <div class="grid">${ACHIEVEMENTS.map((a) => `<div class="card ${save.achievements[a.id] ? "equipped" : ""}"><h3>${a.name}</h3><p>${a.desc}</p></div>`).join("")}</div>
        <h3 style="margin:22px 0 8px;font-family:Cinzel,serif;color:var(--gold)">Challenges</h3>
        <div class="grid">${CHALLENGES.map((c) => `<div class="card"><h3>${c.name}</h3><p>${save.challenges[c.id] ?? 0} / ${c.target} · ${c.reward} denarii</p></div>`).join("")}</div>
      </section>`;
    }

    if (screen === "settings") {
      const k = settings.keybinds;
      this.menus.innerHTML = `<section class="screen">${header}
        <div class="row" style="margin:12px 0">${btn("back", "Back")}</div>
        <div class="form" style="max-width:640px">
          <label class="field">Master <input id="master" type="range" min="0" max="1" step="0.01" value="${settings.master}" /></label>
          <label class="field">Effects <input id="sfx" type="range" min="0" max="1" step="0.01" value="${settings.sfx}" /></label>
          <label class="field">Music <input id="music" type="range" min="0" max="1" step="0.01" value="${settings.music}" /></label>
          <label class="field">Screen shake <input id="shake" type="range" min="0" max="1.5" step="0.05" value="${settings.shake}" /></label>
          <label class="field">Quality
            <select id="quality">
              <option ${settings.quality === "low" ? "selected" : ""}>low</option>
              <option ${settings.quality === "medium" ? "selected" : ""}>medium</option>
              <option ${settings.quality === "high" ? "selected" : ""}>high</option>
            </select>
          </label>
          <label class="field">Mobile sensitivity <input id="sens" type="range" min="0.5" max="1.6" step="0.05" value="${settings.mobile.sensitivity}" /></label>
          <label class="field">Show FPS <select id="fps"><option ${settings.showFps ? "selected" : ""} value="yes">yes</option><option ${!settings.showFps ? "selected" : ""} value="no">no</option></select></label>
          <p class="hint">P2: Arrows move, O attack, L block, P jump, / dodge, . pick up, , throw. Gamepads supported.</p>
          <div class="grid">
            ${Object.entries(k).map(([a, v]) => `<div class="bind"><span>${a}</span><button data-bind="${a}">${v}</button></div>`).join("")}
          </div>
        </div>
      </section>`;
    }

    this.bindNav();
  }

  private bindNav() {
    this.menus.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => {
        const id = (el as HTMLElement).dataset.nav!;
        if (id === "start-tourney") this.onPlay("tournament");
        else this.onNav(id as ScreenId | "back");
      });
    });
    this.menus.querySelectorAll("[data-mode]").forEach((el) => {
      el.addEventListener("click", () => this.onPlay((el as HTMLElement).dataset.mode as GameModeId));
    });
    this.menus.querySelectorAll("[data-weapon]").forEach((el) => {
      el.addEventListener("click", (ev) => this.onEquipWeapon((el as HTMLElement).dataset.weapon!, (ev as MouseEvent).shiftKey));
    });
    this.menus.querySelectorAll("[data-armor]").forEach((el) => {
      el.addEventListener("click", () => this.onEquipArmor((el as HTMLElement).dataset.armor!));
    });
    const map: Record<string, string> = {
      nm: "name",
      skin: "skin",
      hair: "hair",
      hairColor: "hairColor",
      face: "face",
      height: "height",
      width: "width",
      muscle: "muscle",
      primary: "primary",
      secondary: "secondary",
      accessory: "accessory",
    };
    for (const [id, key] of Object.entries(map)) {
      const el = this.menus.querySelector("#" + id) as HTMLInputElement | null;
      el?.addEventListener("input", () => {
        const v = el.type === "text" ? el.value : Number(el.value);
        this.onAppearance(key, v);
      });
    }
    for (const id of ["master", "sfx", "music", "shake", "sens"]) {
      const el = this.menus.querySelector("#" + id) as HTMLInputElement | null;
      el?.addEventListener("input", () => this.onSetting(id, Number(el.value)));
    }
    const q = this.menus.querySelector("#quality") as HTMLSelectElement | null;
    q?.addEventListener("change", () => this.onSetting("quality", q.value));
    const fps = this.menus.querySelector("#fps") as HTMLSelectElement | null;
    fps?.addEventListener("change", () => this.onSetting("showFps", fps.value === "yes"));
    this.menus.querySelectorAll("[data-bind]").forEach((el) => {
      el.addEventListener("click", () => this.onBind("p1", (el as HTMLElement).dataset.bind!));
    });
  }

  showHud(html: string) {
    this.hud.classList.remove("hidden");
    this.hud.innerHTML = html;
    this.hud.style.pointerEvents = "none";
  }

  hideHud() {
    this.hud.classList.add("hidden");
  }

  toast(msg: string) {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    this.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  setupMobile(settings: SettingsData, input: { setJoy: (x: number, y: number, a: boolean) => void; setMobileButton: (r: string, d: boolean) => void }) {
    const isTouch = matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!isTouch) {
      this.mobile.classList.add("hidden");
      return;
    }
    this.mobile.classList.remove("hidden");
    const L = settings.mobile;
    this.mobile.innerHTML = `
      <div class="joy" id="joy" style="left:${L.joystick.x * 100}%;top:${L.joystick.y * 100}%"><i id="knob"></i></div>
      ${mbtn("attack", "Atk", L.attack)}
      ${mbtn("block", "Blk", L.block)}
      ${mbtn("jump", "Jump", L.jump)}
      ${mbtn("dodge", "Dodge", L.dodge)}
      ${mbtn("interact", "Grab", L.interact)}
      ${mbtn("throw", "Throw", L.throw)}
    `;
    const joy = this.mobile.querySelector("#joy") as HTMLElement;
    const knob = this.mobile.querySelector("#knob") as HTMLElement;
    const start = { x: 0, y: 0, id: -1 };
    const sens = settings.mobile.sensitivity;
    const move = (cx: number, cy: number) => {
      const r = joy.getBoundingClientRect();
      const dx = (cx - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (cy - (r.top + r.height / 2)) / (r.height / 2);
      const m = Math.hypot(dx, dy) || 1;
      const nx = (dx / m) * Math.min(1, m) * sens;
      const ny = (dy / m) * Math.min(1, m) * sens;
      knob.style.transform = `translate(${nx * 28}px, ${ny * 28}px)`;
      input.setJoy(nx, ny, true);
    };
    joy.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      start.id = t.identifier;
      move(t.clientX, t.clientY);
    });
    window.addEventListener("touchmove", (e) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === start.id) move(t.clientX, t.clientY);
    });
    window.addEventListener("touchend", (e) => {
      for (const t of Array.from(e.changedTouches)) if (t.identifier === start.id) {
        start.id = -1;
        knob.style.transform = "";
        input.setJoy(0, 0, false);
      }
    });
    this.mobile.querySelectorAll(".mbtn").forEach((btn) => {
      const role = (btn as HTMLElement).dataset.role!;
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        input.setMobileButton(role, true);
      });
      btn.addEventListener("touchend", () => input.setMobileButton(role, false));
    });
  }
}

function btn(id: string, label: string) {
  return `<button data-nav="${id}" class="${id === "play" ? "primary" : ""}">${label}</button>`;
}
function modeCard(id: string, title: string, desc: string) {
  return `<div class="card" data-mode="${id}"><h3>${title}</h3><p>${desc}</p></div>`;
}
function stat(k: string, v: number) {
  return `<div class="statbox"><b>${v}</b><span>${k}</span></div>`;
}
function mbtn(role: string, label: string, pos: { x: number; y: number }) {
  return `<button class="mbtn" data-role="${role}" style="left:${pos.x * 100}%;top:${pos.y * 100}%">${label}</button>`;
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

void ARMOR;
