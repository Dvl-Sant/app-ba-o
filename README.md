# Baño Office

App web para saber si el baño único de la oficina está libre u ocupado, **con login de usuarios, cola de turnos y tiempo extra**. Los usuarios autenticados controlan el estado del baño; cuando está ocupado, el resto puede anotarse en una fila y recibir un aviso cuando le toca.

- **Front**: React + Vite + TypeScript + Tailwind + react-icons. Mobile-first.
- **Back**: Node.js + Fastify + TypeScript + Drizzle ORM.
- **DB**: PostgreSQL (estado y usuarios persistentes).
- **Control de acceso**: registro + login con JWT. El primero en registrarse es admin.
- **Cola FIFO**: al liberar, se le ofrece el turno al siguiente; tiene 60 s para ocuparlo o pasa al próximo.
- **Tiempo extra**: el que está dentro puede sumar +1 min (hasta `EXTRA_MAX` veces).
- **Notificaciones in-app**: toast + sonido para "se ocupó/liberó" y "te toca". Preparado para sumar Web Push en el futuro.

> **Cambio desde v1**: la versión anterior usaba un QR anónimo impreso en la puerta y un sensor Shelly. Esos mecanismos se eliminaron. Ahora el control lo tienen los usuarios autenticados. El firmware NodeMCU de los LEDs sigue funcionando porque `GET /state` sigue siendo público.

---

## Arquitectura

```mermaid
graph LR
    subgraph Navegador[Navegador / Celular]
        UI[Front React]
        LS[(localStorage<br/>JWT + usuario)]
    end

    subgraph Docker[Docker Compose / Dokploy]
        NGINX[Nginx<br/>estáticos + proxy /api]
        API[Fastify API<br/>auth + baño + cola]
        PG[(PostgreSQL<br/>usuarios, estado, cola)]
    end

    UI <-->|polling 2s<br/>JSON + Bearer| NGINX
    NGINX <-->|HTTP interno :3000| API
    API <--> PG
    UI <--> LS
```

## Modelo de datos

```mermaid
erDiagram
    users ||--o{ queue_entries : "se anota"
    users ||--o| bathroom_state : "bloquea / notificado"
    users {
        uuid id PK
        varchar email UK
        varchar name
        varchar password_hash
        enum role "admin | member"
    }
    bathroom_state {
        int id PK "singleton = 1"
        enum status "free | occupied"
        uuid locked_by_user_id FK
        timestamptz expires_at
        int extra_minutes_used
        uuid current_notified_user_id FK
        timestamptz notified_at
    }
    queue_entries {
        uuid id PK
        uuid user_id FK
        timestamptz joined_at
        enum status "waiting | notified | served | skipped"
    }
```

## Flujo completo de uso

```mermaid
sequenceDiagram
    participant A as Ana
    participant B as Bob
    participant F as Front
    participant API as Back
    participant DB as Postgres

    A->>F: Login
    F->>API: POST /auth/login
    API-->>F: { token, user }
    A->>F: "Marcar Ocupado"
    F->>API: POST /bathroom/lock (Bearer)
    API->>DB: status=occupied, lockedBy=Ana, expiresAt=now+10m
    API-->>F: 200

    B->>F: "Sumarme a la fila"
    F->>API: POST /queue/join (Bearer)
    API->>DB: queue_entries(Bob, waiting)

    A->>F: "Liberar"
    F->>API: POST /bathroom/unlock
    API->>DB: status=free; notifyNext() → Bob=notified
    API-->>F: { notifiedUserId: Bob }
    F->>F: toast + sonido "Te toca" a Bob

    B->>F: "Ocupar (es mi turno)"
    F->>API: POST /bathroom/lock
    API->>DB: status=occupied, lockedBy=Bob, Bob=served
    Note over API,DB: Si Bob no ocupa en 60 s, purge() lo saltea<br/>y notifica al siguiente.
```

### Tiempo extra
Mientras el baño está ocupado, **solo el dueño del lock** ve el botón **"Tiempo extra +1 min"**. Cada toque suma `EXTRA_MINUTES_MS` (60 s) hasta `EXTRA_MAX` (5) veces.

## Notificaciones
- **Baño ocupado / libre**: cuando el estado cambia, todos los que tienen la pestaña abierta ven un toast + sonido.
- **Te toca**: cuando es tu turno en la fila, recibís un toast + sonido distintivo y un contador de 60 s.
- La capa de notificaciones (`front/src/notifications.ts`) está aislada para sumar **Web Push** después (avisos con la pestaña cerrada) sin tocar el resto.

## API

| Método | Ruta                 | Auth            | Body                                          | Descripción                                            |
|--------|----------------------|-----------------|-----------------------------------------------|--------------------------------------------------------|
| GET    | `/health`            | —               | —                                             | healthcheck                                            |
| GET    | `/state`             | —               | —                                             | estado público + cola (para el front y el firmware LED)|
| POST   | `/auth/register`     | —               | `{email,name,password}`                       | registro; el 1er usuario es `admin`. Devuelve JWT.    |
| POST   | `/auth/login`        | —               | `{email,password}`                            | login. Devuelve JWT.                                   |
| GET    | `/auth/me`           | `Bearer` JWT    | —                                             | usuario actual                                          |
| PATCH  | `/auth/me`           | `Bearer` JWT    | `{name?,currentPassword?,newPassword?}`       | editar perfil / cambiar contraseña                     |
| GET    | `/users`             | `Bearer` admin  | —                                             | listar usuarios                                         |
| PATCH  | `/users/:id`         | `Bearer` admin  | `{name?,role?}`                               | editar usuario                                          |
| DELETE | `/users/:id`         | `Bearer` admin  | —                                             | borrar usuario (no a sí mismo)                          |
| POST   | `/bathroom/lock`     | `Bearer` JWT    | —                                             | ocupar (solo si está libre y, si hay cola, es tu turno)|
| POST   | `/bathroom/unlock`   | `Bearer` JWT    | —                                             | liberar (dueño o admin) → notifica al siguiente        |
| POST   | `/bathroom/extend`   | `Bearer` JWT    | —                                             | +1 min de tiempo extra (solo dueño)                     |
| POST   | `/queue/join`        | `Bearer` JWT    | —                                             | sumarse a la fila (solo si está ocupado)               |
| POST   | `/queue/leave`       | `Bearer` JWT    | —                                             | salirse de la fila                                      |

**Errores** vía `{ "error": "<code>" }` con status HTTP (`401 unauthorized`, `403 not_your_turn`/`not_owner`/`admin_required`, `409 already_locked`/`already_in_queue`/`extra_max_reached`, etc.).

## Variables de entorno

| Variable           | Dónde   | Default                                   | Descripción                                              |
|--------------------|---------|-------------------------------------------|----------------------------------------------------------|
| `DATABASE_URL`     | back    | `postgres://bano:bano@localhost:5432/bano`| Cadena de conexión a Postgres.                           |
| `JWT_SECRET`       | back    | random (inestable)                        | Secreto para firmar JWT. **Generalo y fijalo.**          |
| `JWT_EXPIRES_IN`   | back    | `7d`                                      | Validez del token.                                       |
| `LOCK_DURATION_MS` | back    | `600000`                                  | Duración inicial del lock (10 min).                      |
| `CLAIM_WINDOW_MS`  | back    | `60000`                                   | Tiempo del siguiente en la fila para tomar el lock (60s).|
| `EXTRA_MINUTES_MS` | back    | `60000`                                   | Cuánto suma cada "tiempo extra" (1 min).                 |
| `EXTRA_MAX`        | back    | `5`                                       | Máx. extras por lock.                                    |
| `CORS_ORIGIN`      | back    | `*`                                       | Origen permitido. En prod, tu dominio.                   |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | compose | `bano` / `bano` / `bano` | Credenciales del Postgres del compose. |
| `FRONT_PORT`       | local   | `8080`                                    | Puerto del front en el host (solo `docker-compose.local.yml`). |

## Despliegue en Dokploy

1. **Creá el servicio** desde este repo (usa `docker-compose.yml`). Levanta 3 servicios: `db` (Postgres), `back`, `front`.
2. **Variables obligatorias** en el servicio `back`:
   - `JWT_SECRET`: `node -e "console.log(require('crypto').randomUUID())"`
   - `POSTGRES_PASSWORD`: una contraseña fuerte.
   - `CORS_ORIGIN`: `https://bano.tu-empresa.com`
3. Traefik (Dokploy) enruta al `front` (Nginx), que proxya `/api/*` al `back`.
4. Las **migraciones se aplican solas** al arrancar el back (`runMigrations()` en `server.ts`).
5. El primer usuario que se registre será **admin** y podrá gestionar al resto desde `/users`.

> ¿Preferís el **Postgres gestionado de Dokploy**? Crealo ahí, copiá su `DATABASE_URL` en las env del `back`, y podés quitar el servicio `db` del compose.

## Uso local con Docker

```bash
cp .env.example .env
# editá .env: JWT_SECRET (pegá un UUID) y POSTGRES_PASSWORD
docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

- App: http://localhost:8080
- Postgres: localhost:5432

## Desarrollo sin Docker

```bash
# Postgres accesible (local o docker run -p 5432:5432 ...)
createdb bano   # o lo que uses

# Back
cd back
npm install
DATABASE_URL=postgres://... JWT_SECRET=dev npm run dev          # http://localhost:3000
# primera vez o si cambiás el schema:
npm run db:generate     # genera SQL en drizzle/
npm run db:push         # aplica el schema a la DB (o se aplica solo al arrancar)

# Front (otra terminal)
cd front
npm install
npm run dev             # http://localhost:5173 (proxy /api -> :3000)
```

## Estructura del proyecto

```
Baño/
├── docker-compose.yml          # db + back + front
├── docker-compose.local.yml    # puertos para uso local
├── .env.example
├── back/
│   ├── drizzle/                # migraciones SQL (versionadas)
│   ├── drizzle.config.ts
│   ├── src/
│   │   ├── server.ts           # bootstrap + migraciones al arranque
│   │   ├── config.ts           # variables de entorno
│   │   ├── errors.ts           # HttpError + handler
│   │   ├── db/
│   │   │   ├── schema.ts       # users, bathroom_state, queue_entries
│   │   │   ├── client.ts       # pool + drizzle
│   │   │   └── migrate.ts      # runner de migraciones
│   │   ├── auth/
│   │   │   ├── password.ts     # bcryptjs
│   │   │   ├── jwt.ts          # sign/verify
│   │   │   ├── middleware.ts   # getUser / requireUser
│   │   │   └── routes.ts       # /auth/* + /users (admin)
│   │   └── bathroom/
│   │       ├── logic.ts        # estado baño + cola + purge
│   │       └── routes.ts       # /state /bathroom/* /queue/*
│   └── Dockerfile
└── front/
    ├── src/
    │   ├── App.tsx             # gate auth (login/registro/dashboard)
    │   ├── auth.tsx            # AuthProvider + useAuth
    │   ├── api.ts              # cliente HTTP (JWT en localStorage)
    │   ├── useBano.ts          # polling + detección de transiciones
    │   ├── notifications.ts    # toasts + sonido (extensible a Web Push)
    │   ├── types.ts
    │   ├── pages/{Login,Register,Dashboard}Page.tsx
    │   └── components/Toasts.tsx
    └── Dockerfile
```

## Decisiones de diseño

- **PostgreSQL**: necesario para que usuarios y cola sobrevivan reinicios. El estado del baño es una fila singleton (`id=1`).
- **JWT stateless**: sin tabla de sesiones; el token viaja en `Authorization: Bearer`.
- **Cola FIFO por `joined_at`**: simple y correcta. El turno se ofrece de a uno; si no se toma en `CLAIM_WINDOW_MS`, se saltea (evita que la fila se congele).
- **`purge()` periódico (cada 30 s)**: libera locks expirados y saltea turnos vencidos. También corre antes de cada lectura/acción para coherencia.
- **Primer usuario = admin**: bootstrap de gestión sin semillas manuales.
- **Notificaciones in-app primero**: polling de 2 s ya existe; las transiciones disparan toast + sonido. Web Push queda como extensión futura (capa aislada).
- **Sin WebSocket**: para 5-15 personas el polling es más simple y suficiente.
- **Firmware LED preservado**: `GET /state` sigue siendo público y devuelve `status`, así que el NodeMCU indicador sigue funcionando. La integración Shelly (sensor) quedó deshabilitada.
