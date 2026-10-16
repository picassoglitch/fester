import { BOOTH, PRIZE_DESK, project, type Point } from "@/lib/map-layout";
import { OUTLINE, star } from "@/components/map/sprites";

/**
 * Lo que se dibuja en el canvas junto con la gente, para que se tapen bien
 * entre si: los kioskos, la mesa de premios y los destellos de cada escaneo.
 */

type Faces = { top: string; left: string; right: string };

/** Una caja isometrica con centro en el piso, de `w` x `d` y `h` de alto, desde `z`. */
function isoBox(
  ctx: CanvasRenderingContext2D,
  c: Point,
  w: number,
  d: number,
  z: number,
  h: number,
  faces: Faces,
) {
  const x0 = c.x - w / 2;
  const x1 = c.x + w / 2;
  const y0 = c.y - d / 2;
  const y1 = c.y + d / 2;
  const p = (x: number, y: number, zz: number) => project({ x, y }, zz);
  const poly = (points: Point[], fill: string) => {
    ctx.beginPath();
    points.forEach((pt, i) => (i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  };
  // Cara de enfrente a la izquierda (y = y1) y a la derecha (x = x1), luego la tapa.
  poly([p(x0, y1, z), p(x1, y1, z), p(x1, y1, z + h), p(x0, y1, z + h)], faces.left);
  poly([p(x1, y0, z), p(x1, y1, z), p(x1, y1, z + h), p(x1, y0, z + h)], faces.right);
  poly([p(x0, y0, z + h), p(x1, y0, z + h), p(x1, y1, z + h), p(x0, y1, z + h)], faces.top);
}

/** Rebote de un destello: crece, se pasa un poco y se asienta en ~0.7 s. */
function pulseScale(age: number): number {
  if (age < 0 || age > 0.8) return 1;
  return 1 + 0.16 * Math.exp(-6 * age) * Math.sin(age * 16);
}

function withPulse(ctx: CanvasRenderingContext2D, base: Point, age: number, draw: () => void) {
  const s = pulseScale(age);
  ctx.save();
  if (s !== 1) {
    ctx.translate(base.x, base.y);
    ctx.scale(s, s);
    ctx.translate(-base.x, -base.y);
  }
  draw();
  ctx.restore();
}

const AWNING_RED = "#e2001a";

export type BoothDraw = { spot: Point; emoji: string; active: boolean };

/** Altura del kiosko hasta arriba del toldo, en la pantalla. */
export const BOOTH_TOP = 74;

/** Kiosko de una estacion: mostrador crema, postes y toldo rojo Fester a rayas. */
export function drawBooth(ctx: CanvasRenderingContext2D, booth: BoothDraw, pulseAge: number) {
  const { spot } = booth;
  withPulse(ctx, project(spot), pulseAge, () => {
    ctx.globalAlpha = booth.active ? 1 : 0.5;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";

    // Sombra en el piso
    ctx.fillStyle = "rgba(10,20,35,0.25)";
    const shadow = project({ x: spot.x + 6, y: spot.y + 6 });
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, BOOTH.w * 0.85, BOOTH.w * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    // Postes traseros, mostrador, postes delanteros
    const post = (x: number, y: number) => {
      const a = project({ x, y }, 30);
      const b = project({ x, y }, 62);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1.6;
    };
    const hw = BOOTH.w / 2 - 3;
    const hd = BOOTH.d / 2 - 3;
    post(spot.x - hw, spot.y - hd);
    isoBox(ctx, spot, BOOTH.w, BOOTH.d, 0, 30, { top: "#fbf7ee", left: "#e9e0cc", right: "#d6caaf" });
    post(spot.x + hw, spot.y - hd);
    post(spot.x - hw, spot.y + hd);
    post(spot.x + hw, spot.y + hd);

    // Toldo
    isoBox(ctx, spot, BOOTH.w + 14, BOOTH.d + 14, 62, 9, {
      top: AWNING_RED,
      left: "#c40016",
      right: "#a80014",
    });
    // Rayas blancas en la cara izquierda del toldo
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    const y1 = spot.y + (BOOTH.d + 14) / 2;
    const x0 = spot.x - (BOOTH.w + 14) / 2;
    const stripes = 5;
    const stripeW = (BOOTH.w + 14) / (stripes * 2);
    for (let i = 0; i < stripes; i++) {
      const sx = x0 + stripeW * (i * 2 + 0.5);
      const pts = [
        project({ x: sx, y: y1 }, 62),
        project({ x: sx + stripeW, y: y1 }, 62),
        project({ x: sx + stripeW, y: y1 }, 71),
        project({ x: sx, y: y1 }, 71),
      ];
      ctx.beginPath();
      pts.forEach((pt, j) => (j === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)));
      ctx.closePath();
      ctx.fill();
    }

    // Emoji de la estacion al frente del mostrador
    const front = project({ x: spot.x, y: spot.y + BOOTH.d / 2 }, 15);
    ctx.font = "20px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(booth.emoji, front.x, front.y);
  });
}

/** Mostrador dorado de premios con una pila de regalos. */
export function drawPrizeDesk(ctx: CanvasRenderingContext2D, pulseAge: number) {
  const c = { x: PRIZE_DESK.x, y: PRIZE_DESK.y };
  withPulse(ctx, project(c), pulseAge, () => {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    ctx.fillStyle = "rgba(10,20,35,0.25)";
    const shadow = project({ x: c.x + 8, y: c.y + 8 });
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, PRIZE_DESK.w * 0.75, PRIZE_DESK.w * 0.37, 0, 0, Math.PI * 2);
    ctx.fill();

    isoBox(ctx, c, PRIZE_DESK.w, PRIZE_DESK.d, 0, 32, { top: "#ffd54a", left: "#f5b301", right: "#d39a00" });
    const gifts: [number, number, number, Faces][] = [
      [-34, 0, 18, { top: "#ff6b7a", left: "#e2001a", right: "#a80014" }],
      [-8, -4, 24, { top: "#6fb8ff", left: "#1e6fc0", right: "#004f92" }],
      [22, 2, 16, { top: "#5fe0a6", left: "#23c77f", right: "#17925c" }],
    ];
    for (const [dx, dy, size, faces] of gifts) {
      const g = { x: c.x + dx, y: c.y + dy };
      isoBox(ctx, g, size, size, 32, size * 0.9, faces);
      // Liston
      const a = project({ x: g.x, y: g.y + size / 2 }, 32);
      const b = project({ x: g.x, y: g.y + size / 2 }, 32 + size * 0.9);
      ctx.save();
      ctx.strokeStyle = "#fff6d6";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.restore();
    }
  });
}

/** Un destello en el mapa: aro que se expande o nombre que sube. */
export type Fx = {
  kind: "ring" | "pop";
  /** Donde nace, en el piso. */
  at: Point;
  /** Altura sobre el piso donde nace (pantalla). */
  z: number;
  /** Segundos (reloj de la animacion) en que empieza; puede ser futuro. */
  start: number;
  color: string;
  text?: string;
  sub?: string;
  gold?: boolean;
};

export const RING_SECONDS = 1.1;
export const POP_SECONDS = 2.8;

const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
/** Entrada con rebote sutil, como cubic-bezier(0.34, 1.56, 0.64, 1). */
const easeOutBack = (p: number) => {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2);
};

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > max) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Lo que se ve del lienzo, para que los nombres no se corten en la orilla. */
export type Bounds = { x: number; y: number; w: number; h: number; scale: number };

/** Dibuja un destello; devuelve false cuando ya termino. */
export function drawFx(ctx: CanvasRenderingContext2D, fx: Fx, now: number, bounds: Bounds): boolean {
  const age = now - fx.start;
  if (age < 0) return true;

  if (fx.kind === "ring") {
    if (age > RING_SECONDS) return false;
    const base = project(fx.at);
    for (const delay of [0, 0.18]) {
      const p = (age - delay) / (RING_SECONDS - 0.18);
      if (p < 0 || p > 1) continue;
      const r = 24 + 96 * easeOut(p);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2 + 4 * (1 - p);
      ctx.beginPath();
      ctx.ellipse(base.x, base.y, r, r / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    return true;
  }

  if (age > POP_SECONDS) return false;
  const p = age / POP_SECONDS;
  const anchor = project(fx.at, fx.z);
  const rise = 54 * easeOut(Math.min(1, p * 1.4));
  const enter = Math.min(1, age / 0.35);
  const scale = 0.6 + 0.4 * easeOutBack(enter);
  const alpha = Math.min(1, age / 0.15) * (p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1);

  ctx.save();
  ctx.font = "700 15px system-ui, sans-serif";
  const text = truncate(ctx, fx.text ?? "", 200);
  const textW = ctx.measureText(text).width;
  ctx.font = "600 11px system-ui, sans-serif";
  const sub = fx.sub ? truncate(ctx, fx.sub, 200) : "";
  const subW = sub ? ctx.measureText(sub).width : 0;
  const w = Math.max(textW, subW) + 38;
  const h = sub ? 42 : 28;

  // Que la pildora no se salga del cuadro (el piquito sigue apuntando al kiosko).
  const margin = 6 / bounds.scale;
  const minX = bounds.x + w / 2 + margin;
  const maxX = bounds.x + bounds.w - w / 2 - margin;
  const shift = minX > maxX ? 0 : Math.min(maxX, Math.max(minX, anchor.x)) - anchor.x;
  const top = anchor.y - rise - h;
  const drop = Math.max(0, bounds.y + margin - top);

  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(anchor.x, anchor.y - rise + drop);
  ctx.scale(scale, scale);
  ctx.translate(shift / scale, 0);

  // Pildora con piquito hacia el kiosko
  ctx.fillStyle = fx.gold ? "#f5b301" : "#0b1f3a";
  ctx.strokeStyle = fx.gold ? OUTLINE : fx.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h, w, h, 12);
  const tip = Math.max(-w / 2 + 14, Math.min(w / 2 - 14, -shift / scale));
  ctx.moveTo(tip - 6, 0);
  ctx.lineTo(tip, 7);
  ctx.lineTo(tip + 6, 0);
  ctx.fill();
  ctx.stroke();

  // Punto del color del perfil (o estrella si completo)
  const dotX = -w / 2 + 15;
  const dotY = sub ? -h + 15 : -h / 2;
  if (fx.gold) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.2;
    star(ctx, dotX, dotY, 6.5);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = fx.gold ? OUTLINE : "#ffffff";
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillText(text, -w / 2 + 27, dotY + 0.5);
  if (sub) {
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.fillStyle = fx.gold ? "rgba(20,33,58,0.8)" : "rgba(255,255,255,0.65)";
    ctx.fillText(sub, -w / 2 + 27, -11);
  }
  ctx.restore();
  return true;
}
