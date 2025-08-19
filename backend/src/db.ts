
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// La validación de DATABASE_URL ahora se realiza en `server.ts` al iniciar la aplicación.
// Esto asegura que la aplicación falle rápidamente si la configuración es incorrecta.
// Usamos el operador de aserción no nulo (!) porque el chequeo en server.ts garantiza que la variable existe.
const dbUrl = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString: dbUrl,
  // Habilitar SSL para bases de datos en la nube, que es un requisito común.
  // Se deshabilita explícitamente solo si la conexión es a 'localhost'.
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

// Añadido: Manejador de errores para el pool de conexiones.
// Esto es crucial para la estabilidad. Sin esto, un error en un cliente
// inactivo puede hacer que todo el proceso de Node se cierre sin un log claro.
pool.on('error', (err, client) => {
  console.error('❌ Error inesperado en un cliente de base de datos inactivo', err);
  // En un entorno de producción, es una buena práctica reiniciar el proceso
  // ante un error grave de base de datos para asegurar un estado limpio.
  process.exit(-1);
});


export default pool;