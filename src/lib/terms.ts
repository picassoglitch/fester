// Texto integro de "Encuentro_Fester_2026_TYC_Aprobados.pdf" (cliente, 2026-11-04).
// No editar a mano: solo se cambia con una version nueva aprobada.
import type { LegalBlock } from "@/components/LegalDocument";

/** Ruta interna con los terminos completos. */
export const TERMS_PATH = "/terminos-y-condiciones";

export const TERMS = {
  organizer: "DESINT, S.A. de C.V.",
  contactEmail: "contacto@encuentrofester.com.mx",
  lead: "Evento dirigido a profesionales, distribuidores y aliados de la industria de la construcción. Cupo máximo de 450 asistentes simultáneos. El registro y la espera en fila no garantizan el ingreso, que estará sujeto a la validación del pase, la capacidad autorizada del recinto y el horario de cierre de admisión.",
  intro: "Estos términos regulan el registro, el ingreso, la permanencia y la participación en el evento.",
  blocks: [
    { kind: "h2", text: "Identificación del evento y del organizador" },
    { kind: "p", text: "Evento: Encuentro Fester 2026, que se llevará a cabo el día 5 de noviembre de 2026, con sede en Frontón Bucareli, Ciudad de México. Organizador responsable: DESINT, S.A. de C.V., con domicilio en Calle San Francisco número 46, Colonia San Bartolo Ameyalco, Alcaldía Álvaro Obregón, C.P. 01800, Ciudad de México, en adelante el “Organizador”. Registro oficial: https://www.encuentrofester.com.mx Atención: contacto@encuentrofester.com.mx" },

    { kind: "h2", text: "Acceso gratuito" },
    { kind: "p", text: "El registro y la entrada son gratuitos. No se exige comprar productos, realizar pagos o donativos, consumir alimentos ni aceptar publicidad para ingresar. Traslados, hospedaje, estacionamiento y gastos personales serán por cuenta del asistente. Las condiciones de alimentos, regalos y sorteos se especifican en sus apartados." },

    { kind: "h2", text: "Registro individual previo" },
    { kind: "p", text: "Cada asistente deberá completar su registro previo en https://www.encuentrofester.com.mx y recibirá un comprobante individual con folio o código QR. El registro confirmado no garantiza el acceso al evento ni reserva un lugar. El ingreso estará sujeto a la validación de identidad, mayoría de edad, cumplimiento de estos Términos y Condiciones, disponibilidad de aforo y horario de cierre de admisión." },
    { kind: "p", text: "El registro no otorga prioridad frente a otras personas que se encuentren esperando. El evento tiene un aforo máximo de 450 asistentes simultáneos. Si al llegar una persona registrada ya se ha alcanzado dicho límite, podrá esperar en la fila habilitada para ese fin; el ingreso se permitirá conforme exista capacidad disponible y dentro del horario de admisión. Permanecer en la fila no garantiza el acceso." },
    { kind: "p", text: "Cada acompañante deberá contar con su propio registro. Los registros duplicados no conceden beneficios adicionales. Los comprobantes no podrán venderse ni utilizarse para suplantar identidades." },

    { kind: "h2", text: "Aforo y fila de ingreso" },
    { kind: "p", text: "El evento tendrá un aforo máximo de 450 asistentes simultáneos, sin perjuicio de cualquier límite inferior que resulte aplicable por disposición de la autoridad o por las condiciones de seguridad del recinto." },
    { kind: "p", text: "El ingreso se realizará previa validación del registro y por orden de llegada, sujeto a la capacidad disponible. Cuando se alcance el aforo máximo, se pausará temporalmente el ingreso y las personas registradas que lleguen deberán formarse en la fila habilitada por el Organizador." },
    { kind: "p", text: "Conforme salgan asistentes y se contabilicen las salidas, se permitirá el ingreso de nuevas personas respetando el orden de la fila y el límite de ocupación autorizado." },
    { kind: "p", text: "Contar con un registro confirmado o permanecer en la fila no garantiza el acceso al evento ni a una actividad específica. El ingreso únicamente podrá realizarse cuando exista aforo disponible y antes del horario de cierre de admisión, que será informado por el Organizador. Si no se libera capacidad antes de dicho cierre, las personas que continúen en la fila no podrán ingresar." },
    { kind: "p", text: "En todo momento deberán mantenerse libres las banquetas, los accesos, las salidas de emergencia y las rutas de circulación. Por razones de seguridad o por instrucciones de la autoridad, el Organizador podrá reorganizar o suspender temporalmente la fila, informando oportunamente a las personas asistentes." },

    { kind: "h2", text: "Validación y reingreso" },
    { kind: "p", text: "Para ingresar deberá presentarse el pase digital con código QR y una identificación vigente que permita verificar la identidad del titular. El personal podrá realizar una revisión visual sin retener el documento ni obtener copias como requisito general. Las incidencias se atenderán en el módulo de acceso." },
    { kind: "p", text: "El pase QR es personal e intransferible. La salida y el eventual reingreso estarán sujetos al aforo, horario, validación de la acreditación y las instrucciones del personal; la salida no garantiza el reingreso. El registro no habilita el acceso a áreas de operación o restringidas." },

    { kind: "h2", text: "Público objetivo y accesibilidad" },
    { kind: "p", text: "El evento está dirigido a profesionales, distribuidores y aliados de la industria de la construcción, incluidos arquitectos, ingenieros, contratistas, aplicadores, maestros de obra y estudiantes del sector. Solo podrán asistir personas de 18 años cumplidos o más. No se admitirá a menores, incluso acompañados de una persona adulta. Quien no pueda acreditar su mayoría de edad no podrá ingresar." },
    { kind: "p", text: "Los apoyos de accesibilidad podrán coordinarse en contacto@encuentrofester.com.mx; el Organizador procurará ajustes razonables y trato no discriminatorio en la espera, el ingreso y las actividades." },

    { kind: "h2", text: "Seguridad y evento sin alcohol" },
    { kind: "p", text: "Las personas asistentes deberán respetar al personal y a los demás participantes, cuidar las instalaciones y atender las instrucciones de seguridad, evacuación y protección civil. Se prohíben violencia, acoso, amenazas, daños deliberados y el ingreso con armas, explosivos, sustancias ilegales u objetos que representen un riesgo real. No habrá venta ni suministro de alcohol; tampoco se permitirá introducirlo o consumirlo en el evento." },
    { kind: "p", text: "Control de acceso y permanencia. La organización podrá negar el acceso o solicitar el retiro de cualquier persona cuando, a su juicio y con base en las circunstancias observadas, existan hechos que puedan comprometer la seguridad o tranquilidad del evento, de los asistentes o del personal; cuando se presenten conductas violentas, amenazas, acoso o daños; cuando se incumplan las medidas de seguridad y las reglas del evento previamente informadas; o cuando exista una restricción establecida por la autoridad competente o la legislación aplicable. La decisión será tomada por el personal autorizado de la organización, atendiendo a las circunstancias de cada caso y bajo criterios objetivos, razonables, proporcionales y no discriminatorios. Lo anterior se aplicará sin perjuicio de los derechos que correspondan a los asistentes conforme a la legislación aplicable." },

    { kind: "h2", text: "Experiencia de realidad virtual" },
    { kind: "p", text: "El evento incluirá una experiencia inmersiva, así como actividades y capacitaciones, sujetas a horarios, turnos y capacidad de operación. La participación será voluntaria y el ingreso al recinto no garantiza un turno. Antes de participar, el operador explicará las instrucciones y advertencias del equipo. La persona participante deberá seguirlas, utilizar el equipo bajo supervisión y mantenerse en el área delimitada." },
    { kind: "p", text: "Ante mareo, desorientación o cualquier malestar, la persona deberá avisar al operador y detener la experiencia. Podrá retirarse de la actividad en cualquier momento. El operador suspenderá el uso si identifica una falla o riesgo. Estas condiciones no sustituyen las advertencias del fabricante ni liberan al Organizador u operador de sus deberes de seguridad, supervisión e higiene." },

    { kind: "h2", text: "Alimentos" },
    { kind: "p", text: "El evento contará con una zona de alimentos y bebidas. Se dispondrá de un máximo de 450 kits de alimentos gratuitos, sujetos a disponibilidad y hasta agotar existencias. El registro, el ingreso al recinto o la espera en fila no garantizan recibir un kit de alimentos. La modalidad, contenido, horarios y lugar de entrega se informarán en la convocatoria o en el propio recinto. La disponibilidad de otros productos, sus precios y, en su caso, cortesías también se informará. El acceso gratuito al evento no estará sujeto a consumo mínimo." },
    { kind: "p", text: "Quienes tengan alergias o restricciones alimentarias deberán consultar al personal de alimentos antes de consumir. Se facilitará información sobre ingredientes y posibles alérgenos; no se prometerá ausencia de contaminación cruzada sin respaldo del proveedor. Cualquier incidente deberá reportarse al personal." },

    { kind: "h2", text: "Regalos" },
    { kind: "p", text: "El evento contará con regalos. Su tipo, cantidad, requisitos y forma de entrega se comunicarán antes de la dinámica correspondiente. El registro o la espera en fila no garantizan un regalo. Se respetará lo anunciado y se informará cualquier limitación de existencias desde la convocatoria; no se agregarán restricciones después de participar." },

    { kind: "h2", text: "Sorteos" },
    { kind: "p", text: "Los sorteos se regirán por bases específicas disponibles en https://www.encuentrofester.com.mx o puntos de consulta, además de estos términos. Las bases deberán identificar al responsable, requisitos de participación, premios y cantidades, número de participaciones, método de selección, fecha y hora, forma de comunicar resultados y procedimiento, plazo y lugar de entrega. También precisarán si se exige presencia física, cómo se tratará la ausencia de una persona ganadora y las exclusiones aplicables." },
    { kind: "p", text: "El comprobante de registro al evento no equivale a un boleto de sorteo, y no garantiza obtener un premio. La gratuidad del acceso no sustituye las autorizaciones aplicables al sorteo." },
    { kind: "p", text: "Cuando una dinámica exija estar dentro del recinto, esa condición se informará antes de participar. Inscribirse en un sorteo no concede prioridad de entrada ni permite rebasar el aforo. La situación de quienes esperen fuera deberá resolverse en las bases de la dinámica, sin prometer acceso para participar." },

    { kind: "h2", text: "Datos personales" },
    { kind: "p", text: "Henkel Capital, S.A. de C.V. (Fester) será responsable del tratamiento de los datos personales recabados a través del registro del evento. Los datos se utilizarán para gestionar el registro, validar el correo electrónico, generar y administrar el pase QR, controlar el acceso y comunicar información relacionada con el evento, así como para las finalidades descritas en el aviso de privacidad integral disponible antes de recabar los datos en https://www.encuentrofester.com.mx/aviso-de-privacidad, en donde se indicarán las transferencias, los medios para ejercer derechos de acceso, rectificación, cancelación y oposición, y los mecanismos para limitar el uso de los datos o revocar el consentimiento." },
    { kind: "p", text: "Las comunicaciones publicitarias serán opcionales y se gestionarán por separado. Negarse a recibirlas no impedirá registrarse ni asistir. Los datos adicionales requeridos para sorteos y entrega de premios deberán informarse en el aviso correspondiente. Estos términos no sustituyen el aviso de privacidad." },

    { kind: "h2", text: "Cobertura audiovisual y uso de imagen" },
    { kind: "p", text: "Durante el evento se realizará cobertura audiovisual mediante fotografías, videos y otras grabaciones con la finalidad de documentar las actividades, generar memoria del evento y elaborar materiales informativos, institucionales y promocionales relacionados con el evento y futuras ediciones." },
    { kind: "p", text: "Al completar su registro, la persona asistente reconoce y acepta que, durante su participación en el evento, podrá aparecer de manera incidental o identificable en fotografías, videos y demás materiales audiovisuales generados en el marco de dicha cobertura, los cuales podrán ser utilizados y difundidos por el Organizador a través de sus medios de comunicación, redes sociales, sitios web y otros canales oficiales relacionados con el evento." },
    { kind: "p", text: "El Organizador procurará que la cobertura se realice de manera respetuosa y conforme a la normativa aplicable. La aparición incidental en materiales generales de documentación del evento no implicará necesariamente que la persona asistente sea presentada como testimonial, vocera o promotora del evento o de alguno de sus patrocinadores." },
    { kind: "p", text: "Cuando se pretenda utilizar la imagen, voz o testimonio de una persona de manera individualizada para fines publicitarios o promocionales específicos, el Organizador recabará la autorización correspondiente, cuando legalmente resulte necesaria, indicando el alcance y las condiciones aplicables." },
    { kind: "p", text: "Las personas que no deseen aparecer de manera identificable en la cobertura audiovisual podrán comunicarlo a través de contacto@encuentrofester.com.mx o al personal de atención del evento, a fin de que se les informe sobre las medidas disponibles. Esta manifestación no afectará su registro ni su acceso al evento, sin perjuicio de que, debido a la naturaleza de una cobertura colectiva, no siempre sea posible evitar por completo toda aparición incidental en tomas generales." },

    { kind: "h2", text: "Cambios suspensión y cancelación" },
    // El PDF trae "[CANALES OFICIALES]" sin llenar; Aldo aprobo estos canales el 2026-11-04.
    { kind: "p", text: "Por causas justificadas de seguridad, fuerza mayor o instrucciones de autoridad, podrá ser necesario modificar horarios, suspender actividades, reprogramar o cancelar el evento. El Organizador comunicará oportunamente el cambio, su causa y las opciones disponibles por el sitio https://www.encuentrofester.com.mx, el correo contacto@encuentrofester.com.mx y a los contactos registrados. Una reprogramación requerirá confirmar nuevamente la intención de asistir, sin costo y bajo la regla de acceso por orden de llegada." },
    { kind: "p", text: "Las medidas de seguridad podrán comprender el cierre temporal de acceso, la suspensión de la fila exterior o la evacuación del recinto. El personal indicará el procedimiento. La evacuación no concederá prioridad automática para volver a entrar; la reapertura dependerá de las condiciones de seguridad y de las instrucciones aplicables." },
    { kind: "p", text: "No se introducirán restricciones retroactivas que perjudiquen derechos adquiridos. Al ser gratuita la entrada, no existe un precio de acceso que reembolsar. Esto no limita los derechos o las responsabilidades que legalmente procedan por daños o incumplimientos imputables a quien corresponda. Los cambios de sorteos deberán atender además sus bases y autorización." },

    { kind: "h2", text: "Responsabilidad y pertenencias" },
    { kind: "p", text: "Cada asistente deberá cuidar sus pertenencias y responderá por los daños que cause en los términos de la legislación aplicable. Los objetos extraviados, incidentes o necesidades de asistencia se reportarán en contacto@encuentrofester.com.mx. El Organizador y los prestadores deberán atender los incidentes conforme a sus funciones y protocolos." },

    { kind: "h2", text: "Aceptación y atención de controversias" },
    { kind: "p", text: "La aceptación expresa durante el registro comprende la versión de estos términos disponible en ese momento, incluidas las reglas de uso del pase QR personal, validación de identidad y acceso sujeto al aforo autorizado. Las consultas y reclamaciones podrán dirigirse a contacto@encuentrofester.com.mx. Se aplicará la legislación mexicana y la normativa de la sede, sin limitar el derecho de acudir a las autoridades competentes." },
  ] satisfies readonly LegalBlock[],
} as const;
