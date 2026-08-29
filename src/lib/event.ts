/**
 * Contenido editable del Encuentro Fester 2026.
 * Toda la copia de la landing vive aqui para que marketing la ajuste sin tocar JSX.
 */

export const EVENT = {
  brand: "Fester",
  claim: "El Socio que Nunca Falla®",
  /** Nombre del evento tal como aparece en el key visual. */
  name: "Encuentro Fester",
  year: "2026",
  tagline: "Para lo que vas a construir hoy",
  dateLabel: "5 de Noviembre 2026",
  dateShort: "5 de Noviembre",
  city: "Ciudad de México",
  scheduleLabel: "09:00 a 17:00 h",
  registrationDeadline: "Cupo limitado",
} as const;

export const NAV_LINKS = [
  { href: "#evento", label: "Encuentro 2026" },
  { href: "#descripcion", label: "Descripción" },
  { href: "#ponentes", label: "Ponentes" },
  { href: "#sede", label: "Sede" },
  { href: "#registro", label: "Registro" },
  { href: "#patrocinadores", label: "Patrocinadores" },
  { href: "#contacto", label: "Contacto" },
] as const;

export const DESCRIPTION = {
  title: "Descripción del evento",
  lead:
    "El Encuentro Fester 2026 reúne en un solo día a especialistas, constructores y distribuidores para mostrar cómo se resuelve una obra completa: del piso al techo, con soluciones probadas de impermeabilización, adhesivos y protección de superficies.",
  paragraphs: [
    "Durante la jornada vas a recorrer demostraciones en vivo, casos reales de obra residencial, comercial e industrial y las novedades de tecnología Fester que llegan este año al mercado mexicano.",
    "Es un espacio pensado para llevarte respuestas aplicables: qué sistema usar en cada etapa, cómo garantizar la durabilidad y con quién apoyarte cuando el proyecto se complica.",
  ],
  highlights: [
    {
      emoji: "🎤",
      title: "Conferencias con especialistas",
      copy: "Contenido técnico y comercial a cargo del equipo Fester y de invitados de la industria.",
    },
    {
      emoji: "🧰",
      title: "Demostraciones en vivo",
      copy: "Aplicación real de sistemas de impermeabilización, recubrimientos y anclajes.",
    },
    {
      emoji: "🏗️",
      title: "Soluciones por tipo de obra",
      copy: "Casos de éxito en proyectos residenciales, comerciales e industriales.",
    },
    {
      emoji: "🤝",
      title: "Networking dirigido",
      copy: "Contacto directo con distribuidores, aplicadores y equipo técnico de la marca.",
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

export const VENUE = {
  name: "Frontón Bucareli",
  street: "Bucareli 118, Col. Centro",
  area: "Cuauhtémoc, 06040, CDMX",
  /**
   * Coordenadas aproximadas del recinto: sirven para centrar el mapa.
   * Confirmalas con el equipo del evento antes de publicar.
   */
  lat: 19.4304,
  lng: -99.1486,
  features: [
    { emoji: "🏛️", copy: "Recinto histórico de más de 100 años restaurado y adaptado para eventos." },
    { emoji: "🅿️", copy: "Estacionamiento cercano y acceso a transporte público." },
    { emoji: "♿", copy: "Instalaciones accesibles y áreas de networking." },
  ],
} as const;

/** Liga de navegación: se arma con la dirección para que el destino sea exacto. */
export const VENUE_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${VENUE.name}, ${VENUE.street}, ${VENUE.area}`,
)}`;

export const BENEFITS = [
  { emoji: "🎟️", title: "Acceso a todas", copy: "las conferencias" },
  { emoji: "🎁", title: "Kit de", copy: "bienvenida" },
  { emoji: "🔗", title: "Networking con", copy: "profesionales" },
] as const;

export const SPONSORS = [
  { name: "Fester", note: "Anfitrión" },
  { name: "Henkel", note: "Grupo" },
  { name: "Loctite", note: "Marca aliada" },
  { name: "Ceresit", note: "Marca aliada" },
  { name: "Teroson", note: "Marca aliada" },
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
