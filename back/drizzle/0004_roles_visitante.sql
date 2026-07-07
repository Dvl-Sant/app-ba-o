-- Agregar 'visitante' al enum user_role.
-- Postgres no permite ALTER TYPE ... ADD VALUE dentro de un bloque de
-- transaccion, por eso esta migracion se marca con "transaction": false
-- en el journal. La migracion 0005 (RENAME + ALTER DEFAULT) tambien va
-- sin transaccion, porque Postgres requiere que el ADD VALUE este
-- commiteado y fuera de cualquier transaccion de la sesion antes de
-- poder usar el nuevo valor.
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'visitante';
