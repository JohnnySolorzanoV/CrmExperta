# Pruebas backend (Vitest)

Este backend incluye pruebas unitarias y de integracion para rutas y casos de uso criticos.

## Requisitos

- Tener Postgres corriendo.
- Configurar en `backend/.env`:
  - `DATABASE_URL`
  - `DATABASE_URL_TEST` (base separada para pruebas)
  - `JWT_SECRET`

> Seguridad de pruebas: `test:integration` **exige** `DATABASE_URL_TEST` y valida que el
> nombre de la base termine en `_test`. Nunca usa `DATABASE_URL` para crear/eliminar bases.
> Si la variable falta o el nombre no es claramente de pruebas, el script se aborta antes
> de ejecutar cualquier `DROP DATABASE`.

## Comandos

- `npm test`: ejecuta toda la suite (unit + integracion).
- `npm run test:unit`: solo pruebas unitarias (`tests/unit`).
- `npm run test:integration`: crea la base de pruebas y ejecuta `tests/integration`.

## Cobertura incluida

- Unit: `auth`, `cita`, `caso`, `calendario`, `chatbot`, `documento`, `usuario`, `entidades`, `cita.recordatorios`.
- Integracion (API + Postgres real): login/registro/recuperacion, citas (creacion, doble reserva,
  transiciones de estado), casos, clientes, documentos (multipart, descarga, eliminacion),
  abogados, calendario, chatbot, usuario/roles, seguridad/accesos, auditoria, salud (`/health` y `/ready`).