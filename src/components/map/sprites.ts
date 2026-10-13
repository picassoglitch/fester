import type { MapPerson } from "@/lib/map";
import {
  crowdSlot,
  DOOR,
  prizeSlot,
  route,
  unitPair,
  type Point,
} from "@/lib/map-layout";
import { profileColor } from "@/lib/profiles";

/** Unidades del lienzo por segundo. */
const SPEED = 150;
const FADE_PER_SECOND = 2;

export type Sprite = {
  id: string;
  name: string;
  profile: string;
  color: string;
  status: MapPerson["status"];
  stationId: string;
  x: number;
  y: number;
  /** Puntos que le faltan por caminar. */
  path: Point[];
  speed: number;
  phase: number;
  skin: string;
  facing: 1 | -1;
  alpha: number;
  /** Se desvanece y se borra: salio por la puerta o ya no viene en el sondeo. */
  fading: boolean;
};

const SKINS = ["#f1c7a5", "#d9a37c", "#a8714f", "#7a4b32"];

function destination(sprite: Sprite): Point {
  return sprite.path.length > 0 ? sprite.path[sprite.path.length - 1] : sprite;
}

function same(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
}

/** A donde tiene que ir cada quien segun su estado. */
export function targetFor(person: MapPerson, spots: Map<string, Point>): Point | null {
  if (person.status === "leaving") return DOOR;
  if (person.status === "prize") return prizeSlot(person.id);
  const spot = spots.get(person.stationId);
  return spot ? crowdSlot(spot, person.id) : null;
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
    facing: 1,
    alpha: 1,
    fading: false,
  };
}

/**
 * Aplica un sondeo. En la primera carga cada quien aparece ya en su lugar;
 * despues, quien llega nuevo entra por la puerta y camina a su estacion.
 */
export function applySnapshot(
  sprites: Map<string, Sprite>,
  people: readonly MapPerson[],
  spots: Map<string, Point>,
  { initial, instant }: { initial: boolean; instant: boolean },
) {
  const seen = new Set<string>();

  for (const person of people) {
    const target = targetFor(person, spots);
    if (!target) continue;
    seen.add(person.id);
    let sprite = sprites.get(person.id);

    if (!sprite) {
      if (person.status === "leaving") {
        // Recogio su premio antes de que lo vieramos: sale desde la mesa.
        if (!initial && !instant) continue;
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
        const pickup = prizeSlot(person.id);
        sprite.path = [...route(sprite, pickup), ...route(pickup, DOOR)];
      } else {
        sprite.path = route(sprite, target);
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
      if (Math.abs(dx) > 0.5) sprite.facing = dx > 0 ? 1 : -1;
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

/**
 * Un trabajador de caricatura parado en (x, y), que son sus pies. Mide unas
 * 34 unidades. `t` en segundos para caminar y respirar.
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  t: number,
  highlighted: boolean,
) {
  const walking = isWalking(sprite);
  const swing = walking ? Math.sin(t * 13 + sprite.phase) * 5 : 0;
  const bob = walking ? Math.abs(Math.sin(t * 13 + sprite.phase)) * 1.6 : Math.sin(t * 2 + sprite.phase) * 0.7;
  const x = sprite.x;
  const y = sprite.y - bob;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, sprite.alpha));

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(sprite.x, sprite.y + 1, 9, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();

  if (highlighted) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(sprite.x, sprite.y + 1, 15, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.lineCap = "round";
  ctx.strokeStyle = "#1d2b3a";

  // Piernas
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 11);
  ctx.lineTo(x - 3 + swing * 0.6, y);
  ctx.moveTo(x + 3, y - 11);
  ctx.lineTo(x + 3 - swing * 0.6, y);
  ctx.stroke();

  // Brazos
  ctx.lineWidth = 3;
  ctx.strokeStyle = sprite.skin;
  ctx.beginPath();
  ctx.moveTo(x - 7, y - 20);
  ctx.lineTo(x - 9 - swing * 0.5, y - 11);
  ctx.moveTo(x + 7, y - 20);
  ctx.lineTo(x + 9 + swing * 0.5, y - 11);
  ctx.stroke();

  // Torso con la playera del color del perfil
  ctx.fillStyle = sprite.color;
  ctx.strokeStyle = "#1d2b3a";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(x - 7.5, y - 24, 15, 14, 4);
  ctx.fill();
  ctx.stroke();

  // Cabeza
  ctx.fillStyle = sprite.skin;
  ctx.beginPath();
  ctx.arc(x, y - 29, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ojo hacia donde camina
  ctx.fillStyle = "#1d2b3a";
  ctx.beginPath();
  ctx.arc(x + 2.4 * sprite.facing, y - 29, 1.1, 0, Math.PI * 2);
  ctx.fill();

  const hat = hatFor(sprite.profile);
  if (hat === "cap") {
    // Birrete
    ctx.fillStyle = "#1d2b3a";
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 35);
    ctx.lineTo(x, y - 39);
    ctx.lineTo(x + 9, y - 35);
    ctx.lineTo(x, y - 31.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#f5b301";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y - 35);
    ctx.lineTo(x + 7, y - 31);
    ctx.stroke();
  } else {
    // Casco
    ctx.fillStyle = hat === "white" ? "#f7f7f2" : "#ffd23f";
    ctx.beginPath();
    ctx.arc(x, y - 31, 6.6, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(x - 8.5 + sprite.facing * 1.5, y - 32, 17, 2.6, 1.2);
    ctx.fill();
    ctx.stroke();
  }

  // Esperando su premio: estrella dorada encima
  if (sprite.status === "prize") {
    const sy = y - 46 + Math.sin(t * 3 + sprite.phase) * 1.5;
    ctx.fillStyle = "#f5b301";
    ctx.strokeStyle = "#1d2b3a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 5 : 2.2;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const px = x + Math.cos(a) * r;
      const py = sy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
