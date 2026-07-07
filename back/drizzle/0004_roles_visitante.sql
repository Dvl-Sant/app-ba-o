-- Agregar 'visitante' al enum user_role.
-- Postgres no permite ALTER TYPE ... ADD VALUE dentro de un bloque de
-- transaccion, por eso esta migracion se marca con "transaction": false
-- en el journal. Se separa del RENAME/ALTER DEFAULT (migracion 0005),
-- que si pueden ir en transaccion.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'visitante';
