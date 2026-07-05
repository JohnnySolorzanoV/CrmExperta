# Pruebas backend (Vitest)

Este backend ahora incluye pruebas unitarias e integracion para rutas y casos de uso criticos.

## Requisitos

- Tener Postgres corriendo.
- Configurar en `backend/.env`:
  - `DATABASE_URL`
  - `DATABASE_URL_TEST` (base separada para pruebas)
  - `JWT_SECRET`
- Si `DATABASE_URL_TEST` no esta disponible, las pruebas de integracion no ejecutan asserts (la suite sigue corriendo para unit tests).

## Comandos

- `npm test`: ejecuta toda la suite una vez.
- `npm run test:watch`: modo watch.
- `npm run test:integration`: solo pruebas de integracion (`tests/integration`).

## Cobertura inicial incluida

- Unit:
  - `auth.casosDeUso`
  - `cita.casosDeUso`
  - `caso.casosDeUso`
- Integracion (API + Postgres real):
  - `/api/auth/login`
  - `/api/citas` (creacion y conflicto de hora)
  - `/api/casos/:id/estado`
