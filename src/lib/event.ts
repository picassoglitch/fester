/**
 * Contenido editable del Encuentro Fester 2026.
 * Toda la copia de la landing vive aqui para que marketing la ajuste sin tocar JSX.
 */

import type { IconName } from "@/components/landing/Icon";

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
  registrationDeadline: "Cupo limitado",
} as const;

export const NAV_LINKS = [
  { href: "#evento", label: "Encuentro Fester 2026" },
  { href: "#descripcion", label: "Descripción" },
  { href: "#conferencistas", label: "Conferencistas" },
  { href: "#registro", label: "Registro" },
  { href: "#contacto", label: "Contacto" },
] as const;

/* --- ¿Qué es Encuentro Fester? --- */

export const ABOUT = {
  title: "¿Qué es Encuentro Fester?",
  paragraphs: [
    "Encuentro Fester es la experiencia de Fester para profesionales, distribuidores y aliados de la industria de la construcción, donde compartimos soluciones, conocimiento y las tendencias que están transformando la forma de construir en México.",
    "Un día de aprendizaje, innovación, inspiración y conexión con expertos de la industria.",
  ],
} as const;

export type Feature = { icon: IconName; title: string; copy: string };

export const FEATURES = {
  title: "Todo lo que encontrarás en Encuentro Fester",
  items: [
    {
      icon: "training",
      title: "Capacitaciones de producto",
      copy: "Sesiones prácticas con especialistas Fester para conocer a fondo las soluciones y su aplicación en obra.",
    },
    {
      icon: "mic",
      title: "Conferencias e influencers",
      copy: "Charlas inspiradoras y networking con referentes de la arquitectura y la construcción.",
    },
    {
      icon: "gift",
      title: "Sorpresas y regalos",
      copy: "Dinámicas, premios y experiencias exclusivas para los asistentes.",
    },
  ] satisfies Feature[],
  notice: "Cupo limitado. Regístrate con anticipación.",
} as const;

/* --- Agenda destacada --- */

export type AgendaItem = {
  time: string;
  title: string;
  /** Conferencista a cargo, cuando aplica. */
  speaker?: string;
  copy: string;
  icon: IconName;
};

export const AGENDA = {
  title: "Agenda destacada",
  items: [
    {
      time: "11:00 am – 2:00 pm",
      title: "Kiosco y experiencias Fester",
      copy: "Conoce nuestras soluciones y vive las experiencias interactivas de la marca.",
      icon: "kiosk",
    },
    {
      time: "11:30 am",
      title: "Conferencia: Innovación que protege hoy y mañana",
      speaker: "Arqui Jove",
      copy: "Soluciones para construir y proteger espacios con la tecnología Fester.",
      icon: "shield",
    },
    {
      time: "1:00 pm",
      title: "Charla: Arquitectura y construcción sostenible",
      speaker: "Arqui Diego",
      copy: "Estrategias y materiales para proyectos rentables y responsables con el entorno.",
      icon: "leaf",
    },
    {
      time: "2:30 pm",
      title: "Conferencia especial: Diseño e innovación urbana",
      speaker: "Michel Rojkind",
      copy: "Visión creativa y de futuro para ciudades más habitables y eficientes.",
      icon: "city",
    },
  ] satisfies AgendaItem[],
} as const;

/* --- Speakers e invitados --- */

export type Speaker = {
  name: string;
  role: string;
  bio: string;
  /** Participación en el programa; se muestra resaltada al pie de la tarjeta. */
  talk: string;
  /** Ruta dentro de /public, por ejemplo "/speakers/michel-rojkind.jpg". Sin foto se muestra un marcador. */
  photo?: string;
};

export const SPEAKERS_SECTION = {
  title: "Speakers e invitados",
} as const;

export const SPEAKERS: Speaker[] = [
  {
    name: "Arqui Jove",
    role: "Líder en diseño, innovación y gestión de proyectos",
    bio: "Arquitecto con amplia experiencia en el desarrollo de espacios y la gestión de proyectos innovadores, enfocado en integrar soluciones eficientes que protegen y dan valor a cada obra.",
    talk: "Participa con la conferencia: Innovación que protege hoy y mañana.",
  },
  {
    name: "Arqui Diego",
    role: "Especialista en arquitectura sostenible y construcción verde",
    bio: "Experto en arquitectura sostenible y construcción responsable, con experiencia en proyectos de eficiencia energética, materiales ecológicos y diseño con impacto positivo en el entorno.",
    talk: "Participa en la charla: Arquitectura y construcción sostenible.",
  },
  {
    name: "Michel Rojkind",
    role: "Arquitecto reconocido por su enfoque urbano",
    bio: "Arquitecto reconocido internacionalmente por su estilo audaz y vanguardista y por su visión del diseño urbano y la innovación, con proyectos emblemáticos en México y el mundo.",
    talk: "Participa con la conferencia especial: Diseño e innovación urbana.",
  },
];

/* --- Sede y cómo llegar --- */

export const VENUE = {
  title: "Sede",
  name: "Frontón Bucareli",
  city: EVENT.city,
  address: "Av. Bucareli, Cuauhtémoc, Ciudad de México",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Front%C3%B3n+Bucareli%2C+Ciudad+de+M%C3%A9xico",
  ctaLabel: "Cómo llegar",
} as const;

export type Direction = { icon: IconName; title: string; copy: string };

export const DIRECTIONS = {
  title: "¿Cómo llegar?",
  items: [
    {
      icon: "car",
      title: "Auto",
      copy: "Estacionamiento disponible en la zona con cupo limitado. Te recomendamos llegar con tiempo.",
    },
    {
      icon: "train",
      title: "Metro / Taxi",
      copy: "Estaciones Balderas (Líneas 1 y 3) y Juárez (Línea 3) a unos minutos caminando. Los taxis pueden dejarte en la entrada principal.",
    },
    {
      icon: "phone",
      title: "App de transporte",
      copy: "Uber, DiDi y Cabify operan en la zona. Indica «Frontón Bucareli» como destino y baja en la entrada principal.",
    },
  ] satisfies Direction[],
} as const;

/* --- Registro --- */

export const REGISTRATION = {
  title: "Registro",
  lead: "Regístrate sin costo y recibe tu pase digital con código QR. Cupo limitado.",
} as const;

/* --- Preguntas frecuentes --- */

export type FaqItem = { question: string; answer: string };

export const FAQ = {
  title: "Preguntas frecuentes",
  items: [
    {
      question: "¿Quiénes pueden asistir?",
      answer:
        "Profesionales de la construcción, arquitectos, ingenieros, contratistas, aplicadores, distribuidores y estudiantes del sector. Solo necesitas registrarte.",
    },
    {
      question: "¿El registro tiene costo?",
      answer: "No. El registro y el acceso al evento son sin costo, pero el cupo es limitado.",
    },
    {
      question: "¿Necesito registrarme previamente?",
      answer:
        "Sí. Al registrarte generamos tu pase digital con código QR, que te pedirán en el acceso y en las estaciones del evento.",
    },
    {
      question: "¿Cómo recibo mi pase?",
      answer:
        "Al terminar el registro verás tu pase con código QR en pantalla. Guárdalo en tu teléfono o toma una captura; si lo pierdes, vuelve a registrarte con el mismo correo y te llevaremos a tu pase.",
    },
    {
      question: "¿Puedo transferir mi registro a otra persona?",
      answer:
        "El pase es personal e intransferible. Si alguien más quiere asistir, puede registrarse desde esta misma página.",
    },
    {
      question: "¿Habrá estacionamiento?",
      answer:
        "Hay estacionamiento en la zona con cupo limitado. También puedes llegar en Metro (Balderas o Juárez) o en una app de transporte.",
    },
  ] satisfies FaqItem[],
} as const;

/* --- Aviso de privacidad y contacto --- */

export const PRIVACY = {
  title: "Aviso de privacidad",
  text: "En Fester® (Henkel Capital, S.A. de C.V.) respetamos tu privacidad. Tus datos personales serán utilizados únicamente para gestionar tu registro al Encuentro Fester 2026, enviarte comunicación relacionada con el evento y mejorar tu experiencia. No compartiremos tu información con terceros sin tu consentimiento.",
  linkLabel: "Consulta el aviso de privacidad completo en fester.com.mx",
  linkUrl: "https://www.fester.com.mx/",
} as const;

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

export const REFERRAL_SOURCES = [
  "Invitación de Fester",
  "Distribuidor o tienda",
  "Redes sociales",
  "Correo electrónico",
  "Recomendación de un colega",
  "Sitio web de Fester",
  "Otro",
] as const;
