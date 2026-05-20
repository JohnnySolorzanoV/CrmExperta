CREATE TABLE Usuario (
    id SERIAL PRIMARY KEY,
    identificacion VARCHAR(10) UNIQUE,
    nombre VARCHAR(100),
    correo VARCHAR(100) UNIQUE,
    contrasena VARCHAR(255),
    rol VARCHAR(20) 
);

CREATE TABLE ABOGADO (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE REFERENCES Usuario(id),
    num_licencia VARCHAR(10) UNIQUE, 
    especialidad VARCHAR(100)
);

CREATE TABLE CLIENTE (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER UNIQUE REFERENCES Usuario(id),
    direccion VARCHAR (100),
    telefono VARCHAR (10)
);

CREATE TABLE Chatbot (
    idConsulta SERIAL PRIMARY KEY,
    cedula_cliente VARCHAR(10) REFERENCES Usuario(identificacion),
    preguntaUsuarios TEXT,
    respuestaIA TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Cita (
    idCita SERIAL PRIMARY KEY,
    cedula_cliente VARCHAR(10) REFERENCES Usuario(identificacion),
    fechaHora TIMESTAMP,
    motivo TEXT,
    estado VARCHAR(20) DEFAULT 'Pendiente' 
);

CREATE TABLE Documento (
    idDocumento SERIAL PRIMARY KEY,
    nombreArchivo VARCHAR(255) NOT NULL,
    rutaArchivo VARCHAR(500) NOT NULL, 
    tipoDocumento VARCHAR(50), 
    fechaSubida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cedulaUsuario VARCHAR(10),

    CONSTRAINT fk_usuario_documento 
        FOREIGN KEY (cedulaUsuario) 
        REFERENCES Usuario(identificacion) 
        ON DELETE CASCADE 
);

