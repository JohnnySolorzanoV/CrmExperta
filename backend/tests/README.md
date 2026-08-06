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

## Respaldo y restauracion (RFC9)

El respaldo solo se considera funcional si puede restaurarse en otra base aislada y
reproducir los mismos datos. La prueba `tests/integration/respaldo.restauracion.test.js`
ejecuta el ciclo real completo:

1. Crea dos bases aisladas `*_test`: `crm_experta_respaldo_origen_test` y
   `crm_experta_respaldo_destino_test` (nunca usa bases de produccion).
2. Puebla el origen con datos sinteticos.
3. Ejecuta `respaldar.sh` contra el origen (validando que termine con codigo 0).
4. Ejecuta `restaurar.sh` contra el destino.
5. Compara esquema y cantidades de registros entre ambas bases.
6. Registra duracion, tamano del respaldo y errores como evidencia en
   `backend/backups/evidencia-respaldo-restauracion.md`.

### Herramientas PostgreSQL

`respaldar.sh` y `restaurar.sh` usan `pg_dump`/`psql` del host si existen; si no,
los ejecutan dentro del contenedor Postgres indicado por `PG_CONTAINER`
(por defecto en las pruebas: `crm-pg-test`). La URL se reescribe a `localhost:5432`
cuando se ejecuta dentro del contenedor. Por ejemplo:

```sh
DATABASE_URL=postgres://... PG_CONTAINER=crm-pg-test npm run db:backup
```

## Credenciales de administrador (RFC11)

El seed de administrador (`npm run seed`) obtiene sus credenciales desde
`config/credencialesAdmin.js`:

- En **desarrollo** (`NODE_ENV=development`) se permiten valores por defecto
  (`admin@crm.com` / `admin123`) para facilitar el arranque local.
- En **cualquier otro entorno** (produccion, staging, etc.) son obligatorias via
  `ADMIN_CORREO` y `ADMIN_CONTRASENA`. Si faltan, el proceso **se detiene** (exit 1)
  y nunca se usa una clave por defecto.
- La contrasena **nunca se imprime** en consola.
- Se usa de forma consistente `ADMIN_CONTRASENA` (sin el typo `ADMIN_CONTROSENA`).

Cubierto por `tests/unit/credencialesAdmin.test.js` (RFC11-01..07), incluyendo la
ejecucion real `NODE_ENV=production node seed.js`.

## Archivos invalidos u huerfanos (RFC12)

`backend/modulos/documentos/documento.rutas.js` valida extension y MIME **en conjunto**
dentro del `fileFilter` de multer, antes de escribir el archivo en disco. Si la operacion
en base falla despues de recibir el archivo (caso ajeno, caso inexistente, fallo de
auditoria), el archivo temporal se elimina en el `catch` de la ruta.

Cubierto por `tests/integration/documentos.routes.test.js` (RFC12-01..05):
extension prohibida, MIME falso, caso ajeno, fallo posterior a la recepcion y
sincronizacion base/almacenamiento (el directorio `backend/uploads` se limpia en cada
`beforeEach` para evitar huerfanos acumulados).

## Cobertura incluida

- Unit: `auth`, `cita`, `caso`, `calendario`, `chatbot`, `documento`, `usuario`, `entidades`,
  `cita.recordatorios`, `credencialesAdmin`.
- Integracion (API + Postgres real): login/registro/recuperacion, citas (creacion, doble reserva,
  transiciones de estado), casos, clientes, documentos (multipart, descarga, eliminacion),
  abogados, calendario, chatbot, usuario/roles, seguridad/accesos, auditoria, salud (`/health` y `/ready`),
  respaldo y restauracion reales (RFC9).