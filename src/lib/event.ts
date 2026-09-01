/**
 * Contenido editable del Encuentro Fester 2026.
 * Toda la copia de la landing vive aqui para que marketing la ajuste sin tocar JSX.
 */

export const EVENT = {
  brand: "Fester",
  claim: "El Socio que Nunca Falla®",
  /** Nombre del evento tal como aparece en el diseño aprobado. */
  name: "Encuentro Fester",
  year: "2026",
  tagline: "El socio que nunca falla — del piso al techo",
  dateLabel: "5 de Noviembre 2026",
  dateShort: "5 de Noviembre",
  city: "Ciudad de México",
  scheduleLabel: "09:00 a 17:00 h",
  registrationDeadline: "Cupo limitado",
} as const;

export const NAV_LINKS = [
  { href: "#evento", label: "Encuentro Fester 2026" },
  { href: "#descripcion", label: "Descripción" },
  { href: "#conferencistas", label: "Conferencistas" },
  { href: "#registro", label: "Registro" },
  { href: "#contacto", label: "Contacto" },
] as const;

export const DESCRIPTION = {
  title: "Descripción del evento",
  lead:
    "El Encuentro Fester 2026 reúne en un solo día a profesionales de la construcción, aplicadores y estudiantes para vivir, de principio a fin, cómo se resuelve una obra completa —del piso al techo— con las soluciones en las que ya confían miles de especialistas en México.",
  paragraphs: [
    "Más que una exposición, es una jornada de capacitación práctica: vas a recorrer demostraciones en vivo, aplicar los sistemas Fester con tus propias manos y resolver dudas directamente con el equipo técnico de la marca. Cada estación está diseñada para que te lleves respuestas aplicables, no folletos.",
    "Y mientras aprendes, ganas. Completa tu recorrido por las estaciones del evento y desbloquea recompensas exclusivas: entre más vives el Encuentro, más te llevas. Todo tu paso queda registrado en tu pase digital con código QR.",
  ],
  highlights: [
    {
      emoji: "🎓",
      title: "Capacitación práctica",
      copy: "Aplica los sistemas Fester tú mismo en demostraciones en vivo y llévate criterio técnico para tu próxima obra.",
    },
    {
      emoji: "🎤",
      title: "Conferencistas de la industria",
      copy: "Contenido técnico y comercial a cargo del equipo Fester y de especialistas invitados del sector construcción.",
    },
    {
      emoji: "🎁",
      title: "Recompensas por participar",
      copy: "Completa las estaciones del recorrido y desbloquea beneficios exclusivos. Entre más vives el evento, más te llevas.",
    },
    {
      emoji: "🤝",
      title: "Networking dirigido",
      copy: "Contacto directo con distribuidores, aplicadores y el equipo técnico de Fester en un mismo lugar.",
    },
  ],
  facts: [
    { label: "Fecha", value: EVENT.dateLabel },
    { label: "Horario", value: EVENT.scheduleLabel },
    { label: "Ciudad", value: EVENT.city },
    { label: "Costo", value: "Entrada sin costo con registro previo" },
  ],
} as const;

export type Speaker = {
  name: string;
  role: string;
  org?: string;
  linkedin?: string;
};

export const SPEAKERS: Speaker[] = [
  { name: "Ing. Raúl Hernández", role: "Director Técnico", org: "Fester" },
  { name: "Arq. Lucía Martínez", role: "Consultora en Envolventes y Fachadas" },
  { name: "M.I. Carlos Pérez", role: "Gerente de Innovación y Desarrollo" },
  { name: "Ing. Sofía Vargas", role: "Especialista en Impermeabilización" },
  { name: "Arq. Eduardo Salazar", role: "Director de Proyectos Estratégicos" },
];

export const BENEFITS = [
  { emoji: "🎟️", title: "Acceso a todas", copy: "las conferencias" },
  { emoji: "🎁", title: "Kit de", copy: "bienvenida" },
  { emoji: "🔗", title: "Networking con", copy: "profesionales" },
] as const;

export const CONTACT = {
  email: "encuentro@fester.com.mx",
  phone: "800 111 0000",
  scheduleLabel: "Lunes a viernes, 9:00 a 18:00 h",
} as const;

/* --- Opciones del formulario de registro --- */

export const POSITIONS = [
  "Arquitecto / Arquitecta",
  "Ingeniero / Ingeniera",
  "Contratista",
  "Aplicador",
  "Distribuidor",
  "Comprador / Compras",
  "Director / Gerente de obra",
  "Estudiante",
  "Otro",
] as const;

export const INDUSTRIES = [
  "Construcción residencial",
  "Construcción comercial",
  "Construcción industrial",
  "Infraestructura",
  "Distribución y ferretería",
  "Consultoría / Despacho",
  "Mantenimiento y servicios",
  "Otro",
] as const;

export const STATES = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;
