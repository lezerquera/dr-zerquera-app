
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

// Guard clause: check for existence and throw an error if missing.
// This ensures the process stops and makes it clear to TypeScript
// that dbUrl MUST be a string in the code that follows.
if (!dbUrl) {
    console.error("\n❌ ERROR: La variable de entorno DATABASE_URL no está configurada.");
    console.error("Por favor, cree un archivo .env en el directorio 'backend' y añada su URL de conexión a PostgreSQL.");
    throw new Error("❌ DATABASE_URL no está configurada.");
}

const pool = new Pool({
  connectionString: dbUrl,
  // Habilitar SSL para bases de datos en la nube, que es un requisito común.
  // Se deshabilita explícitamente solo si la conexión es a 'localhost'.
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

export default pool;
