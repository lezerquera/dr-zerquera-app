import express from 'express';
import { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import { clinicInfoRouter } from './api/clinic';
import { doctorProfileRouter } from './api/doctorProfile';
import { servicesRouter } from './api/services';
import { appointmentsRouter } from './api/appointments';
import { chatMessagesRouter } from './api/chat';
import { insurancesRouter } from './api/insurances';
import { authRouter } from './api/auth';
import './middleware/auth';
import { initializeDatabase } from './init-db'; // Importar la función

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// --- Configuración de CORS Explícita y Segura ---
const allowedOrigins: string[] = [
    'http://localhost:5173', // Origen para desarrollo local
];

// Si la URL del frontend está definida en el entorno (producción), la añadimos a la lista blanca.
if (process.env.FRONTEND_URL) {
    // Normalizamos la URL para eliminar una posible barra final ('/'), que es un error común.
    const frontendUrl = process.env.FRONTEND_URL.endsWith('/')
        ? process.env.FRONTEND_URL.slice(0, -1)
        : process.env.FRONTEND_URL;
    allowedOrigins.push(frontendUrl);
    console.log(`CORS: Production frontend URL added to allowed origins: ${frontendUrl}`);
}

const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
        // Permitir peticiones sin 'origin' (como las de Postman o apps móviles) o si el origen está en nuestra lista blanca.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`CORS Blocked: El origen '${origin}' no está en la lista de permitidos: [${allowedOrigins.join(', ')}]`);
            callback(new Error('No permitido por la política de CORS.'));
        }
    },
    optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/clinic-info', clinicInfoRouter);
app.use('/api/doctor-profile', doctorProfileRouter);
app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/chat-messages', chatMessagesRouter);
app.use('/api/insurances', insurancesRouter);

app.get('/api', (req: Request, res: Response) => {
    res.send('ZIMI Backend API is running!');
});

// Endpoint seguro para inicializar la BD, protegido por una variable de entorno.
app.get('/api/setup/init-database', async (req: Request, res: Response) => {
    const secretKey = process.env.INIT_DB_SECRET_KEY;
    const providedKey = req.query.key;

    if (!secretKey || secretKey.length < 10) {
        console.error('CRITICAL: INIT_DB_SECRET_KEY is not set or is too short. The database initialization endpoint is disabled.');
        return res.status(500).send('❌ Endpoint de inicialización no configurado de forma segura en el servidor.');
    }
    
    if (providedKey !== secretKey) {
        console.warn(`SECURITY: Failed attempt to access init-database endpoint with wrong key: ${providedKey}`);
        return res.status(403).send('❌ Clave secreta no válida.');
    }

    console.log('Received authorized request to initialize database...');
    try {
        await initializeDatabase();
        res.status(200).send('✅ Base de datos inicializada con éxito. ¡Ya puedes cerrar esta ventana!');
    } catch (error) {
        console.error('Error during remote database initialization:', error);
        res.status(500).send(`❌ Error al inicializar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
});


app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        res.status(200).send('Backend and database connection are healthy.');
    } catch (error) {
        console.error(error);
        res.status(500).send('Database connection failed.');
    }
});

// The app.listen call is removed from this file.
// It now lives in `local.ts` for local development.
// This makes server.ts compatible with serverless environments.
export default app;