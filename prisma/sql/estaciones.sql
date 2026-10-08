-- Estaciones de ejemplo de Encuentro Fester 2026.
-- Pegar tal cual en la consola SQL de la base (la de DATABASE_URL) y ejecutar.
-- Es Postgres estandar (13+): no depende del proveedor.
--
-- Solo crea las que falten de: Registro + Kiosko 1 a 5, al final del orden.
-- La lista real se administra en /admin/estaciones: este script NUNCA
-- desactiva, reactiva, reordena ni borra estaciones existentes (tampoco las
-- creadas en el admin). Es idempotente: se puede correr las veces que haga falta.
--
-- Equivale a "npm run db:stations" (prisma/update-stations.ts).
-- La lista de ejemplo vive en src/lib/stations.ts (DEFAULT_STATIONS): si cambia
-- alla, actualiza los valores de abajo a mano.

with deseadas (name, emoji, n) as (
  values
    ('Registro', '🎟️', 1),
    ('Kiosko 1', '1️⃣', 2),
    ('Kiosko 2', '2️⃣', 3),
    ('Kiosko 3', '3️⃣', 4),
    ('Kiosko 4', '4️⃣', 5),
    ('Kiosko 5', '5️⃣', 6)
),
faltantes as (
  select d.name, d.emoji, row_number() over (order by d.n) as pos
    from deseadas d
   where not exists (select 1 from "Station" s where lower(s.name) = lower(d.name))
)
insert into "Station" (id, name, emoji, "order", active, "createdAt")
select gen_random_uuid()::text,
       f.name,
       f.emoji,
       (select coalesce(max("order"), 0) from "Station") + f.pos,
       true,
       now()
  from faltantes f;

-- Comprobacion: todas las estaciones, activas primero y en orden.
select name, emoji, "order", active
  from "Station"
 order by active desc, "order";
