-- Estaciones de escaneo de Encuentro Fester 2026.
-- Pegar tal cual en la consola SQL de la base (la de DATABASE_URL) y ejecutar.
-- Es Postgres estandar (13+): no depende del proveedor.
--
-- Deja activas exactamente estas seis: Registro + Kiosko 1 a 5.
-- Es idempotente: se puede correr las veces que haga falta.
-- Las estaciones que ya no van NO se borran, se desactivan (active = false):
-- borrarlas arrastraria en cascada los escaneos ya registrados.
--
-- Equivale a "npm run db:stations" (prisma/update-stations.ts).

with deseadas (name, emoji, "order") as (
  values
    ('Registro', '🎟️', 1),
    ('Kiosko 1', '1️⃣', 2),
    ('Kiosko 2', '2️⃣', 3),
    ('Kiosko 3', '3️⃣', 4),
    ('Kiosko 4', '4️⃣', 5),
    ('Kiosko 5', '5️⃣', 6)
),
-- Las que ya existen: se reactivan y se les corrige emoji y orden.
actualizadas as (
  update "Station" s
     set name    = d.name,
         emoji   = d.emoji,
         "order" = d."order",
         active  = true
    from deseadas d
   where lower(s.name) = lower(d.name)
  returning s.id
),
-- Las que faltan: se crean.
insertadas as (
  insert into "Station" (id, name, emoji, "order", active, "createdAt")
  select gen_random_uuid()::text, d.name, d.emoji, d."order", true, now()
    from deseadas d
   where not exists (select 1 from "Station" s where lower(s.name) = lower(d.name))
  returning id
)
-- Todo lo demas (Experiencia inmersiva, Juegos, Comida, Zona lounge, Cierre…)
-- se apaga, conservando sus escaneos.
update "Station" s
   set active = false
 where s.active
   and lower(s.name) not in (select lower(name) from deseadas);

-- Comprobacion: deben salir las seis activas en orden y, si habia otras, al final apagadas.
select name, emoji, "order", active
  from "Station"
 order by active desc, "order";
