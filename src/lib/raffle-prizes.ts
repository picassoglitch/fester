// Aldo 2026-11-05 — la rifa va premio por premio; cada categoría de brazalete tiene sus premios.
import type { BraceletCategory } from "@/lib/bracelet";

/** Los estudiantes no participan en la rifa. */
export type RaffleCategory = Exclude<BraceletCategory, "Estudiante">;
export const RAFFLE_CATEGORIES: readonly RaffleCategory[] = ["Aplicador", "Profesionista"];

export type RafflePrize = {
  key: string;
  category: RaffleCategory;
  /** Etiqueta corta: "Kit 01", "Moto". */
  label: string;
  name: string;
  items: readonly string[];
  /** Cuántas personas se lo llevan. */
  slots: number;
  /** Ruta en public/. Si el archivo no existe se muestra la ficha sin foto. */
  image: string;
};

export const RAFFLE_PRIZES = [
  {
    key: "kit-01",
    category: "Aplicador",
    label: "Kit 01",
    name: "Constructor Premium",
    slots: 1,
    image: "/rifa/kit-01.webp",
    items: [
      "Taladro Milwaukee M18 FUEL 2904-22",
      "Mochila Milwaukee PACKOUT",
      "Broca Milwaukee 48-20-9097",
      "Flexómetro Stanley FATMAX 8 m",
    ],
  },
  {
    key: "kit-02",
    category: "Aplicador",
    label: "Kit 02",
    name: "Constructor de Aplicación",
    slots: 2,
    image: "/rifa/kit-02.webp",
    items: [
      "Mezcladora RUBI RUBIMIX-9 SUPERTORQUE",
      "Varilla RUBI M-120-R",
      "Faja industrial DexterHand",
      "Lentes de seguridad",
      "Guantes de trabajo",
      "Maleta / organizador",
    ],
  },
  {
    key: "moto-aplicador",
    category: "Aplicador",
    label: "Moto",
    name: "VENTO TERRA DS 170 – 2026",
    slots: 1,
    image: "/rifa/moto-aplicador.webp",
    items: ["1 motocicleta · premio para aplicador"],
  },
  {
    key: "kit-03",
    category: "Profesionista",
    label: "Kit 03",
    name: "Arquitecto Medición",
    slots: 1,
    image: "/rifa/kit-03.webp",
    items: [
      "Medidor láser Bosch Professional GLM",
      "Nivel láser verde Bosch Professional",
      "Tripié Bosch BT 150",
      "Flexómetro Stanley FATMAX 8 m",
      "Mochila ejecutiva / obra",
    ],
  },
  {
    key: "kit-04",
    category: "Profesionista",
    label: "Kit 04",
    name: "Arquitecto Tecnología",
    slots: 2,
    image: "/rifa/kit-04.webp",
    items: [
      "Samsung Galaxy Tab S9 FE",
      "Leica DISTO D2",
      "Power Bank Anker",
      "Sketchbook / libreta premium",
      "Portaminas profesional + minas",
    ],
  },
  {
    key: "moto-profesionista",
    category: "Profesionista",
    label: "Moto",
    name: "VENTO GTS PRO 300 – 2026",
    slots: 1,
    image: "/rifa/moto-profesionista.webp",
    items: ["1 motocicleta · premio para profesionista"],
  },
] as const satisfies readonly RafflePrize[];

export type RafflePrizeKey = (typeof RAFFLE_PRIZES)[number]["key"];

export function rafflePrize(key: string | null | undefined): RafflePrize | null {
  return RAFFLE_PRIZES.find((p) => p.key === key) ?? null;
}

export function prizeTitle(prize: RafflePrize): string {
  return `${prize.label} · ${prize.name}`;
}

const PLURAL: Record<RaffleCategory, string> = {
  Aplicador: "aplicadores",
  Profesionista: "profesionistas",
};

export function categoryPlural(category: RaffleCategory): string {
  return PLURAL[category];
}

export function emptyPoolMessage(prize: RafflePrize): string {
  return `No quedan ${PLURAL[prize.category]} por sortear para ${prizeTitle(prize)}.`;
}

export function fullPrizeMessage(prize: RafflePrize): string {
  return prize.slots === 1
    ? `${prizeTitle(prize)} ya tiene ganador.`
    : `${prizeTitle(prize)} ya tiene sus ${prize.slots} ganadores.`;
}
