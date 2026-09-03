/**
 * Contenido editable del Encuentro Fester 2026.
 * Toda la copia de la landing vive aqui para que marketing la ajuste sin tocar JSX.
 * Fuentes: mockup aprobado y "Cambios Landing Encuentro Fester 2026" (2 de septiembre).
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

/* --- ¿Qué es Encuentro Fester? (copy aprobado por marca) --- */

export const ABOUT = {
  title: "¿Qué es Encuentro Fester?",
  lead: "Fester te invita a una experiencia para quienes están transformando la forma de construir.",
  body: "Ven y vive una experiencia única donde podrás aprender, experimentar, descubrir soluciones, conocer nuevas tecnologías, tendencias e innovaciones.",
  closing: "Capacitaciones, influencers referentes del giro de la construcción y grandes sorpresas.",
} as const;

export type Feature = {
  icon: IconName;
  title: string;
  /** Frase de apertura en negritas; opcional cuando el texto es una sola oracion. */
  lead?: string;
  paragraphs: readonly string[];
};

/**
 * Los tres recuadros. Marca pidio sustituir los textos tal cual: se pueden
 * ajustar saltos de linea, no el sentido del mensaje.
 */
const FEATURE_ITEMS: readonly Feature[] = [
    {
      icon: "mic",
      title: "Influencers y conferencistas",
      lead: "Conoce las ideas que están transformando la construcción.",
      paragraphs: [
        "Compartirán su experiencia y visión sobre innovación, tecnología y las nuevas tendencias que están redefiniendo la forma de construir.",
        "Una oportunidad para aprender de quienes están marcando el rumbo y descubrir qué viene para el futuro de la industria.",
      ],
    },
    {
      icon: "vr",
      title: "Experiencia inmersiva",
      paragraphs: [
        "Vive una experiencia inmersiva de Fester + Google y descubre cómo Cool Roof utiliza innovación y tecnología para transformar la manera en que protegemos y habitamos nuestros hogares.",
      ],
    },
    {
      icon: "gift",
      title: "Sorpresas y recompensas",
      lead: "Porque vivir EL ENCUENTRO también tiene sus recompensas.",
      paragraphs: [
        "Prepárate para descubrir sorpresas, experiencias especiales y regalos exclusivos que harán de tu visita una experiencia inolvidable.",
        "Ven, participa y déjate sorprender.",
      ],
    },
];

export const FEATURES = {
  title: "Todo lo que encontrarás en Encuentro Fester",
  items: FEATURE_ITEMS,
  notice: "Cupo limitado. Regístrate con anticipación.",
} as const;

/* --- Agenda destacada --- */

export type AgendaItem = { time: string; title: string; copy: string; icon: IconName };

/**
 * Los cuatro bloques siguen el mapeo de marca (areas de capacitacion,
 * influencers y conferencistas, experiencia inmersiva, sorpresas). Los
 * horarios vienen del mockup aprobado.
 */
const AGENDA_ITEMS: readonly AgendaItem[] = [
    {
      time: "11:00 am – 3:30 pm",
      title: "Áreas de capacitación",
      copy: "Información de producto · Técnicas de aplicación.",
      icon: "kiosk",
    },
    {
      time: "11:30 am",
      title: "Influencers y conferencistas",
      copy: "Conoce las ideas que están transformando la construcción: experiencia y visión sobre innovación, tecnología y nuevas tendencias.",
      icon: "bulb",
    },
    {
      time: "1:30 pm",
      title: "Experiencia inmersiva",
      copy: "Fester + Google: descubre cómo Cool Roof utiliza innovación y tecnología para transformar la manera en que protegemos y habitamos nuestros hogares.",
      icon: "vr",
    },
    {
      time: "3:30 pm",
      title: "Sorpresas y recompensas",
      copy: "Porque vivir EL ENCUENTRO también tiene sus recompensas: sorpresas, experiencias especiales y regalos exclusivos.",
      icon: "gift",
    },
];

export const AGENDA = { title: "Agenda destacada", items: AGENDA_ITEMS } as const;

/* --- Speakers e invitados --- */

export type Speaker = {
  name: string;
  role: string;
  bio: string;
  /** Participacion en el programa; se muestra resaltada al pie de la tarjeta. */
  talk: string;
  /** Ruta dentro de /public, por ejemplo "/speakers/michel-rojkind.jpg". Sin foto se muestra un marcador. */
  photo?: string;
  /** Perfil de LinkedIn; sin URL no se muestra el icono. */
  linkedin?: string;
};

export const SPEAKERS_SECTION = {
  title: "Speakers e invitados",
} as const;

export const SPEAKERS: Speaker[] = [
  {
    name: "Arqui Juve",
    role: "Líder en diseño, innovación y gestión de proyectos.",
    bio: "Profesional con amplia experiencia en diseño de espacios y gestión de proyectos sustentables. Comparte su visión sobre tendencias y soluciones inteligentes y eficientes.",
    talk: "Participa como tu conferencista especialista.",
  },
  {
    name: "Arqui Diego",
    role: "Especialista en Arquitectura Sostenible y Construcción Verde.",
    bio: "Experto en arquitectura sostenible y construcción eficiente con innovación y materiales de vanguardia para edificar productos y materiales con propósito.",
    talk: "Participa con su charla inspiradora y aplicable.",
  },
  {
    name: "Michel Rojkind",
    role: "Arquitecto y Líder en Diseño e Innovación Urbana.",
    bio: "Arquitecto reconocido por su visión artística, vanguardista y su enfoque transformador de espacios urbanos.",
    talk: "Participa con conferencia inspiracional.",
  },
];

/* --- Sede y cómo llegar --- */

export const VENUE = {
  title: "Sede",
  name: "Frontón Bucareli",
  city: EVENT.city,
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Front%C3%B3n+Bucareli%2C+Ciudad+de+M%C3%A9xico",
  ctaLabel: "Cómo llegar",
} as const;

export type Direction = { icon: IconName; title: string; copy: string };

const DIRECTION_ITEMS: readonly Direction[] = [
    { icon: "car", title: "Auto", copy: "Estacionamiento disponible (espacios limitados)." },
    {
      icon: "train",
      title: "Metro / Taxi",
      copy: "Estación más cercana: San Juan de Letrán (Línea 8).",
    },
    {
      icon: "phone",
      title: "Apps de transporte",
      copy: "Uber, Didi y Cabify. Deja y recoge en la puerta principal.",
    },
];

export const DIRECTIONS = { title: "¿Cómo llegar?", items: DIRECTION_ITEMS } as const;

/* --- Registro --- */

export const REGISTRATION = {
  title: "Registro",
  lead: "Regístrate sin costo y recibe tu pase digital con código QR. Cupo limitado.",
} as const;

/** Leyendas que marca pidio incorporar junto al formulario. */
export const CONDITIONS = {
  title: "Condiciones de acceso",
  items: [
    "Cupo limitado y nos reservamos el derecho de admisión.",
    "Para el ingreso deberás presentar una identificación distinta al INE (por ejemplo, licencia de conducir, credencial de trabajo u otra).",
    "El registro no es transferible a otra persona.",
    "Es indispensable contar con registro previo para el acceso al evento.",
  ],
} as const;

/* --- Preguntas frecuentes --- */

export type FaqItem = { question: string; answer: string };

const FAQ_ITEMS: readonly FaqItem[] = [
    {
      question: "¿Quiénes pueden asistir?",
      answer:
        "Profesionales, distribuidores y aliados de la industria de la construcción: arquitectos, ingenieros, contratistas, aplicadores, maestros de obra y estudiantes del sector. Solo necesitas registrarte.",
    },
    {
      question: "¿El evento tiene algún costo?",
      answer: "No. Es gratuito, con registro previo.",
    },
    {
      question: "¿Necesito registrarme previamente?",
      answer:
        "Sí. Es indispensable contar con registro previo para el acceso al evento. Al registrarte generamos tu pase con código QR.",
    },
    {
      question: "¿El cupo es limitado?",
      answer:
        "Sí, el cupo es limitado y nos reservamos el derecho de admisión. Te recomendamos registrarte con anticipación para asegurar tu lugar.",
    },
    {
      question: "¿Qué necesito presentar para ingresar?",
      answer:
        "Tu pase con código QR, que obtienes al terminar el registro, y una identificación distinta al INE (licencia de conducir, credencial de trabajo u otra).",
    },
    {
      question: "¿Puedo transferir mi registro a otra persona?",
      answer:
        "No. El registro es personal y no es transferible. Si alguien más quiere asistir, puede registrarse desde esta misma página.",
    },
    {
      question: "¿Habrá alimentos y bebidas?",
      answer: "Sí, contaremos con zona de alimentos y bebidas durante el evento.",
    },
    {
      question: "¿Habrá demostraciones y dinámicas con los productos?",
      answer:
        "Sí, tendremos capacitaciones de producto, técnicas de aplicación y experiencias prácticas.",
    },
    {
      question: "¿Cómo puedo llegar al evento?",
      answer:
        "Consulta la sección de Sede y las opciones de transporte disponibles: auto, Metro o taxi y apps de transporte.",
    },
];

export const FAQ = { title: "Preguntas frecuentes", items: FAQ_ITEMS } as const;

/* --- Aviso de privacidad y contacto --- */

export const PRIVACY = {
  title: "Aviso de privacidad",
  text: "En Fester, S.A. de C.V. valoramos tu privacidad. Tus datos personales serán utilizados únicamente para fines del evento, comunicación relacionada y mejora de la experiencia. No compartimos tu información con terceros sin tu consentimiento.",
  linkLabel: "Consulta nuestro aviso de privacidad completo en www.fester.com.mx",
  linkUrl: "https://www.fester.com.mx/",
} as const;

export const CONTACT = {
  email: "encuentro@fester.com.mx",
  phone: "800 111 0000",
  scheduleLabel: "Lunes a viernes, 9:00 a 18:00 h",
} as const;

/* --- Opciones del formulario de registro --- */

/** Catalogo definitivo de marca para "Puesto / Cargo" (11 opciones, "Otro" incluido). */
export const POSITIONS = [
  "Arquitecto",
  "Albañil",
  "Carpintero",
  "Contratista",
  "DIY",
  "Inspector de obras",
  "Maestro de obra",
  "Proveedor de materiales de construcción",
  "Técnico de la construcción",
  "Técnico de impermeabilización",
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

/** Valor que se guarda en "Empresa" cuando la persona trabaja por su cuenta. */
export const INDEPENDENT_LABEL = "Independiente";

/** Rango aceptado para el campo "Edad". */
export const AGE_LIMITS = { min: 15, max: 99 } as const;

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
