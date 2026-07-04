-- Schema corregido para CRM Experta
-- Cambios respecto al original:
--   - FK apuntan a Usuario(id) en vez de identificacion
--   - Cita ahora tiene id_cliente e id_abogado
--   - Nombres de tablas y columnas en snake_case
--   - NOT NULL donde corresponde

CREATE TABLE Usuario (
    id SERIAL PRIMARY KEY,
    identificacion VARCHAR(20) UNIQUE NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Abogado (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    num_licencia VARCHAR(20) UNIQUE NOT NULL,
    especialidad VARCHAR(100) NOT NULL
);

CREATE TABLE Cliente (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
    direccion VARCHAR(200),
    telefono VARCHAR(20)
);

CREATE TABLE Administrador (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE
);

CREATE TABLE Caso (
    id SERIAL PRIMARY KEY,
    estado_caso VARCHAR(20) NOT NULL,
    fecha_apertura TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tipo_caso VARCHAR(50) NOT NULL,
    nombre_caso VARCHAR(100) NOT NULL,
    id_cliente INTEGER NOT NULL REFERENCES Cliente(id) ON DELETE CASCADE,
    id_abogado INTEGER NOT NULL REFERENCES Abogado(id) ON DELETE CASCADE
);

CREATE TABLE Chatbot (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES Usuario(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chat_log TEXT
);

CREATE TABLE Calendario (
    id SERIAL PRIMARY KEY,
    id_abogado INTEGER NOT NULL REFERENCES Abogado(id) ON DELETE CASCADE,
    fecha_evento TIMESTAMP NOT NULL,
    descripcion TEXT
);

CREATE TABLE Cita (
    id SERIAL PRIMARY KEY,
    id_cliente INTEGER NOT NULL REFERENCES Cliente(id) ON DELETE CASCADE,
    id_abogado INTEGER NOT NULL REFERENCES Abogado(id) ON DELETE CASCADE,
    fecha_hora_copia TIMESTAMP NOT NULL,
    id_calendario INTEGER REFERENCES Calendario(id) ON DELETE SET NULL,
    motivo TEXT,
    estado_cita VARCHAR(20) DEFAULT 'pendiente',
    resumen_chatbot TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    google_event_id VARCHAR(255),
    motivo_cancelacion TEXT,
    cancelado_por VARCHAR(50),
    CONSTRAINT cita_abogado_requerido CHECK (id_abogado IS NOT NULL)
);

-- One active (non-cancelled) appointment per lawyer per clock-hour.
-- Partial index so cancelled rows do not block the slot.
-- Run once and is idempotent via IF NOT EXISTS. If existing duplicates exist, clean them first.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_cita_abogado_hora_activa
  ON Cita (id_abogado, date_trunc('hour', fecha_hora_copia))
  WHERE estado_cita != 'cancelada';

CREATE TABLE Documento (
    id SERIAL PRIMARY KEY,
    id_caso INTEGER NOT NULL REFERENCES Caso(id) ON DELETE CASCADE,
    nombre_documento VARCHAR(255) NOT NULL,
    descripcion TEXT,
    extension VARCHAR(10),
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ruta_archivo VARCHAR(500) NOT NULL,
    tamaño INTEGER NOT NULL
);

