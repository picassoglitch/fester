# Manual de uso · Encuentro Fester 2026

Guía corta para las tres personas que usan la app: **asistentes**, **staff** de estaciones y **administradores**.

Sustituye `https://TU-DOMINIO` por la URL real del evento.

| Quién | Entra por | Qué hace |
|---|---|---|
| Asistente | `https://TU-DOMINIO/` | Se registra, recibe su pase con QR y ve su avance. |
| Staff | `https://TU-DOMINIO/staff` | Escanea pases en su estación y entrega premios. |
| Administrador | `https://TU-DOMINIO/staff` (PIN de admin) | Todo lo del staff + panel, asistentes, estaciones y staff. |

---

## 1. Asistentes (público)

### Registrarse
1. Abre la página del evento y baja a la sección **Registro**.
2. Llena el formulario: nombre completo, empresa (o marca la casilla de **Independiente**), giro, correo, teléfono, puesto, estado, edad y cómo te enteraste. Si eliges **Otro**, escribe tu respuesta.
3. Acepta el aviso de privacidad y envía.
4. Se abre tu **pase digital** con un código de 6 letras/números (ej. `K7M2PQ`) y un código QR.

> Si el correo ya estaba registrado, la app te lleva directo al pase que ya existía. El registro es personal e intransferible.

### Usar el pase el día del evento
- Guarda el pase: toma captura de pantalla o deja la pestaña abierta. El navegador recuerda tu código.
- Para volver a abrirlo: entra a `https://TU-DOMINIO/pase`, toca **Continuar como…** o escribe tu código y **Ver mi pase**. También hay un enlace **Mi pase** al pie de la página principal.
- En cada estación muestra el QR. El staff lo escanea y la **estrella aparece sola** en tu pantalla (se actualiza cada pocos segundos; también al regresar a la pestaña).
- El pase muestra estrellas ganadas, cuántas faltan y la lista de estaciones con la hora de cada visita.
- Al completar todas las estaciones verás **🎉 ¡Recorrido completo!** Ve al **módulo de premios** y muestra el mismo QR.
- Cuando te entreguen el premio, el pase lo indica con la hora y quién lo entregó.

### Problemas comunes
- **"Pase no encontrado"**: revisa el código (no usa las letras O, I, L, S ni los números 0, 1, 5). Si lo perdiste, dicta tu nombre o correo al staff; un administrador puede buscarlo.
- **No aparece la estrella**: espera unos segundos o recarga. Si sigue sin aparecer, pide al staff que vuelva a escanear; un escaneo repetido no duplica nada.

---

## 2. Staff de estación

### Entrar
1. Abre `https://TU-DOMINIO/staff` en el celular o tableta.
2. Escribe tu **PIN personal** (4 a 8 dígitos) que te dio el administrador.
3. La sesión dura 14 horas. Para cerrarla usa **Salir**.

> El PIN identifica quién escaneó cada pase. No lo compartas. Si lo olvidas, el administrador te asigna uno nuevo.

### Escanear pases (pantalla **Escanear pases**)
1. En **Estación asignada** elige tu estación. El dispositivo la recuerda para la próxima vez.
2. Permite el acceso a la cámara cuando el navegador lo pida.
3. Apunta la cámara al QR del asistente. El resultado aparece en una tarjeta:
   - **Verde · "Estrella registrada en …"**: todo bien.
   - **Gris · "… ya tenía la estrella de …"**: ese pase ya se había escaneado aquí; no pasa nada.
   - **Dorado · "… completó el recorrido"**: manda a la persona al módulo de premios.
   - **Rojo**: el código no existe o la estación está inactiva. Revisa el código o avisa al administrador.
4. Toca **Escanear siguiente** y continúa.

**Sin cámara o el QR no se lee**: escribe el código en **Código manual** y toca **Ir**.

**Escaneo desde la cámara del teléfono**: si tienes la sesión abierta, también puedes escanear el QR con la app de cámara normal; se abre la pantalla de escaneo y la estrella se registra en tu estación asignada.

A la derecha (o abajo en celular) ves tus contadores del día: registrados, quiénes completaron, premios por dar, avance por estación y últimos escaneos. Se actualizan solos cada 30 segundos.

### Entregar premios (pantalla **Premios**)
1. Toca **Premios** (o **Entregar premios** al pie de la pantalla de escaneo).
2. Escanea el QR o escribe el código.
   - **"Premio entregado a …"**: entrégalo.
   - **"Ojo: el premio … ya se había entregado"**: no entregues otro.
   - **"… todavía no completa todas las estaciones"**: indícale qué le falta (aparece en su pase).
3. Los contadores **Por entregar** / **Entregados** te dicen cómo va la fila.

### Consejos
- Mantén buena luz y el QR a unos 15–20 cm de la cámara.
- Un pase escaneado dos veces en la misma estación **no** duplica la estrella.
- Si te equivocaste de estación, avisa al administrador: solo él puede revertir un escaneo.

---

## 3. Administradores

Entras con tu PIN en `https://TU-DOMINIO/staff` y caes en el **Panel**. Arriba tienes cuatro secciones: **Panel**, **Asistentes**, **Estaciones** y **Staff**, más el enlace **Escanear** para trabajar como staff.

### Antes del evento (una sola vez)
1. **Estaciones**: crea una por cada punto que vale estrella. Escribe emoji + nombre y pulsa agregar. Ordénalas con ▲ ▼. Cada estación **activa** cuenta para completar el recorrido.
2. **Staff**: agrega a cada persona con nombre, PIN (4–8 dígitos, único) y rol **Staff** o **Administrador**. Entrega a cada quien su PIN en persona; después no se puede consultar, solo cambiar con **Cambiar PIN**.
3. Cambia el PIN del administrador inicial (viene del seed, `ADMIN_PIN`, por defecto `482913`).
4. Haz una prueba completa: regístrate, escanea en todas las estaciones, entrega el premio y luego **elimina** ese asistente de prueba.

### Durante el evento
**Panel** (se actualiza solo): asistentes, cuántos completaron, premios por entregar, escaneos de los últimos 15 minutos, estrellas promedio, avance global y tiempo mediano del recorrido. Abajo: avance por estación, distribución de estrellas, registros por hora, actividad reciente, últimos registros y escaneos por miembro del staff.

**Asistentes**:
- Busca por nombre, código, correo o teléfono.
- Filtra: **Todos · En curso · Completos · Premio pendiente · Premio entregado**.
- Toca un nombre para ver su ficha:
  - **Recorrido**: cada escaneo con hora y quién lo hizo. **Revertir escaneo** borra uno equivocado.
  - **Estaciones pendientes**.
  - **Premio**: **Marcar premio entregado** (por ejemplo si se entregó sin escanear) o **Revertir entrega**.
  - **QR del pase** y enlace para abrir el pase como lo ve el asistente (útil si perdió su código).
  - **Eliminar asistente y su historial**: irreversible.

**Estaciones**: si una estación se cancela, **Desactivar** en vez de eliminar. Al desactivar, eliminar o reactivar, el avance de todos los asistentes se recalcula solo (alguien "completo" puede dejar de estarlo si activas una estación nueva).

**Staff**: **Desactivar** a quien ya no deba entrar (su PIN deja de funcionar al instante) y **Cambiar PIN** si alguien lo olvidó. Cada persona muestra cuántos escaneos lleva.

### Después del evento
En **Asistentes** descarga los reportes:
- **Exportar asistentes (CSV)**: datos de registro, estrellas, hora de cada estación, premio y quién lo entregó.
- **Exportar escaneos (CSV)**: un renglón por escaneo con asistente, estación, staff y hora.

Los CSV abren directo en Excel (incluyen acentos correctamente).

---

## 4. Puesta en marcha (técnico)

Variables de entorno (ver `.env.example`):

| Variable | Para qué |
|---|---|
| `DATABASE_URL` | Postgres (conexión pooled). |
| `DIRECT_URL` | Postgres directa; solo para `prisma db push` / migraciones. |
| `SESSION_SECRET` | Firma de sesiones. Cadena aleatoria de 32+ caracteres. |
| `NEXT_PUBLIC_APP_URL` | URL pública; va dentro de los QR. Fíjala con el dominio definitivo. |
| `ADMIN_PIN` | PIN del primer administrador que crea el seed. |
| `NEXT_PUBLIC_TIME_ZONE` | Opcional, por defecto `America/Mexico_City`. |

```bash
npm install
npm run db:push     # crea las tablas
npm run db:seed     # admin inicial + estaciones de ejemplo
npm run dev         # http://localhost:3000
```

Rutas útiles: `/` registro · `/pase` recuperar pase · `/pase/CODIGO` pase · `/s/CODIGO` destino del QR · `/staff` acceso · `/staff/escanear` estaciones · `/staff/premios` premios · `/admin` panel.
