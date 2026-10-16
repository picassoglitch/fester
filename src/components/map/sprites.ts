import type { MapPerson } from "@/lib/map";
import {
  crowdSlot,
  DEFAULT_RING,
  DOOR,
  prizeSlot,
  project,
  unitPair,
  type Point,
  type Ring,
} from "@/lib/map-layout";
import { profileColor } from "@/lib/profiles";

/** Unidades del piso por segundo. */
const SPEED = 130;
const FADE_PER_SECOND = 2;

export type Sprite = {
  id: string;
  name: string;
  profile: string;
  color: string;
  status: MapPerson["status"];
  stationId: string;
  /** Pies, en el plano del piso. */
  x: number;
  y: number;
  /** Puntos que le faltan por caminar. */
  path: Point[];
  speed: number;
  phase: number;
  skin: string;
  pants: string;
  /** Hacia donde mira en la pantalla. */
  facing: 1 | -1;
  alpha: number;
  /** Se desvanece y se borra: salio por la puerta o ya no viene en el sondeo. */
  fading: boolean;
};

const SKINS = ["#f1c7a5", "#d9a37c", "#a8714f", "#7a4b32"];
const PANTS = ["#2b3a55", "#3c4f6e", "#4a3b32", "#2f4a43"];
export const OUTLINE = "#14213a";

function destination(sprite: Sprite): Point {
  return sprite.path.length > 0 ? sprite.path[sprite.path.length - 1] : sprite;
}

function same(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

/** A donde tiene que ir cada quien segun su estado. */
export function targetFor(
  person: MapPerson,
  spots: Map<string, Point>,
  ring: Ring = DEFAULT_RING,
): Point | null {
  if (person.status === "leaving") return DOOR;
  if (person.status === "prize") return prizeSlot(person.id);
  const spot = spots.get(person.stationId);
  return spot ? crowdSlot(spot, person.id, ring.inner, ring.outer) : null;
}

function newSprite(person: MapPerson, at: Point): Sprite {
  const [a, b] = unitPair(person.id);
  return {
    id: person.id,
    name: person.name,
    profile: person.profile,
    color: profileColor(person.profile),
    status: person.status,
    stationId: person.stationId,
    x: at.x,
    y: at.y,
    path: [],
    speed: SPEED * (0.85 + a * 0.3),
    phase: b * Math.PI * 2,
    skin: SKINS[Math.floor(a * SKINS.length) % SKINS.length],
    pants: PANTS[Math.floor(b * PANTS.length) % PANTS.length],
    facing: 1,
    alpha: 1,
    fading: false,
  };
}

/**
 * Aplica un sondeo. En la primera carga cada quien aparece ya en su lugar;
 * despues, quien llega nuevo entra por la puerta y camina a su estacion.
 * Cancha y vestibulo no tienen muros entre si: se camina en linea recta.
 */
export function applySnapshot(
  sprites: Map<string, Sprite>,
  people: readonly MapPerson[],
  spots: Map<string, Point>,
  { initial, instant, ring = DEFAULT_RING }: { initial: boolean; instant: boolean; ring?: Ring },
) {
  const seen = new Set<string>();

  for (const person of people) {
    const target = targetFor(person, spots, ring);
    if (!target) continue;
    seen.add(person.id);
    let sprite = sprites.get(person.id);

    if (!sprite) {
      if (person.status === "leaving") {
        // Recogio su premio antes de que lo vieramos (o ya salio y sigue en
        // la ventana del sondeo): solo en la primera carga se le ve salir.
        if (!initial) continue;
        sprite = newSprite(person, prizeSlot(person.id));
      } else {
        sprite = newSprite(person, initial || instant ? target : DOOR);
      }
      sprites.set(person.id, sprite);
    }

    sprite.name = person.name;
    sprite.profile = person.profile;
    sprite.color = profileColor(person.profile);
    sprite.status = person.status;
    sprite.stationId = person.stationId;
    sprite.fading = false;
    sprite.alpha = Math.max(sprite.alpha, 0.01);

    if (!same(destination(sprite), target)) {
      if (instant) {
        sprite.x = target.x;
        sprite.y = target.y;
        sprite.path = [];
      } else if (person.status === "leaving") {
        // Pasa por la mesa de premios y de ahi a la puerta.
        sprite.path = [prizeSlot(person.id), DOOR];
      } else {
        sprite.path = [target];
      }
    }
  }

  for (const sprite of sprites.values()) {
    if (!seen.has(sprite.id)) sprite.fading = true;
  }
}

/** Avanza la animacion `dt` segundos. */
export function step(sprites: Map<string, Sprite>, dt: number) {
  for (const sprite of sprites.values()) {
    let budget = sprite.speed * dt;
    while (budget > 0 && sprite.path.length > 0) {
      const next = sprite.path[0];
      const dx = next.x - sprite.x;
      const dy = next.y - sprite.y;
      const dist = Math.hypot(dx, dy);
      // En la pantalla, avanzar en x va a la derecha y avanzar en y a la izquierda.
      if (Math.abs(dx - dy) > 0.5) sprite.facing = dx - dy > 0 ? 1 : -1;
      if (dist <= budget) {
        sprite.x = next.x;
        sprite.y = next.y;
        sprite.path.shift();
        budget -= dist;
      } else {
        sprite.x += (dx / dist) * budget;
        sprite.y += (dy / dist) * budget;
        budget = 0;
      }
    }

    // Llego a la puerta con su premio: se va.
    if (sprite.status === "leaving" && sprite.path.length === 0 && same(sprite, DOOR)) {
      sprite.fading = true;
    }
    if (sprite.fading) {
      sprite.alpha -= FADE_PER_SECOND * dt;
      if (sprite.alpha <= 0) sprites.delete(sprite.id);
    }
  }
}

export function isWalking(sprite: Sprite): boolean {
  return sprite.path.length > 0;
}

/** El sombrero dice algo del perfil: casco blanco a quien supervisa, birrete al estudiante. */
function hatFor(profile: string): "white" | "cap" | "yellow" {
  if (profile === "Estudiante") return "cap";
  if (profile === "Arquitecto" || profile === "Inspector de obras") return "white";
  return "yellow";
}

/** Estrella de cinco picos (solo el trazo; quien llama rellena). */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** Altura del personaje en la pantalla, de los pies a la punta del casco. */
const SPRITE_HEIGHT = 40;

/**
 * Un trabajador de caricatura cabezon, con los pies en su lugar del piso.
 * `t` en segundos para caminar y respirar.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  t: number,
  highlighted: boolean,
) {
  const walking = isWalking(sprite);
  const cycle = t * 11 + sprite.phase;
  const swing = walking ? Math.sin(cycle) * 4 : 0;
  const bob = walking ? Math.abs(Math.sin(cycle)) * 2 : Math.sin(t * 2 + sprite.phase) * 0.6;
  const feet = project(sprite);
  const x = feet.x;
  const y = feet.y - bob;
  const f = sprite.facing;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, sprite.alpha));

  // Sombra en el piso, achatada como el piso isometrico
  ctx.fillStyle = "rgba(10,20,35,0.32)";
  ctx.beginPath();
  ctx.ellipse(feet.x, feet.y, 10 - bob, 4.6 - bob * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (highlighted) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y, 17, 8.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;

  // Piernas
  ctx.fillStyle = sprite.pants;
  for (const [side, s] of [
    [-1, swing],
    [1, -swing],
  ] as const) {
    ctx.beginPath();
    ctx.roundRect(x + side * 3.4 - 2.4 + s * 0.5, y - 11, 4.8, 11, 2);
    ctx.fill();
    ctx.stroke();
  }

  // Brazos
  ctx.strokeStyle = sprite.skin;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 20);
  ctx.lineTo(x - 9 - swing * 0.6, y - 12);
  ctx.moveTo(x + 7, y - 20);
  ctx.lineTo(x + 9 + swing * 0.6, y - 12);
  ctx.stroke();

  // Torso con la playera del color del perfil y la franja reflejante
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = sprite.color;
  ctx.beginPath();
  ctx.roundRect(x - 7.5, y - 23, 15, 13.5, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(x - 7, y - 16.5, 14, 2);

  // Cabeza grande
  ctx.fillStyle = sprite.skin;
  ctx.beginPath();
  ctx.arc(x, y - 29.5, 7.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ojos y cachete hacia donde camina
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(x + 2 * f, y - 29.5, 1.15, 0, Math.PI * 2);
  ctx.arc(x + 5 * f, y - 29.5, 1.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(226,0,26,0.22)";
  ctx.beginPath();
  ctx.arc(x + 4.2 * f, y - 26.6, 1.8, 0, Math.PI * 2);
  ctx.fill();

  const hat = hatFor(sprite.profile);
  if (hat === "cap") {
    // Birrete
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 36);
    ctx.lineTo(x, y - 40.5);
    ctx.lineTo(x + 10, y - 36);
    ctx.lineTo(x, y - 32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f5b301";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y - 36);
    ctx.lineTo(x + 7 * f, y - 31.5);
    ctx.stroke();
  } else {
    // Casco con visera hacia donde mira
    ctx.fillStyle = hat === "white" ? "#f7f7f2" : "#ffd23f";
    ctx.beginPath();
    ctx.arc(x, y - 32, 8, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - 9 + f * 2.5, y - 33, 18, 3, 1.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(x - 3 * f, y - 36, 2.2, 1.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Esperando su premio: estrella dorada encima
  if (sprite.status === "prize") {
    const sy = y - SPRITE_HEIGHT - 8 + Math.sin(t * 3 + sprite.phase) * 1.6;
    ctx.fillStyle = "#f5b301";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.1;
    star(ctx, x, sy, 5.5);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
