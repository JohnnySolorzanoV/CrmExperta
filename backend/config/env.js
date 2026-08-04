import dotenv from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Única fuente de verdad para cargar las variables de entorno del backend.
// Importar este módulo (por efectos secundarios) en cada entrypoint para que
// dotenv no reemplaze variables ya presentes en process.env.
dotenv.config({ path: resolve(__dirname, '..', '.env') })