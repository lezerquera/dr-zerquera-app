import express from 'express';
import cors, { CorsOptions } from 'cors';
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

const app: express.Express = express();
const port = process.env.PORT || 3001;

// --- Configuración de CORS Explícita y Segura ---
const allowedOrigins: string[] = [
    'http://localhost:5173', // Origen para desarrollo local
];

// Si la URL del frontend está definida en el entorno (producción), la añadimos a la lista blanca.
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
    console.log(`CORS: Production frontend URL added to allowed origins: ${process.env.FRONTEND_URL}`);
}

const corsOptions: CorsOptions = {
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

app.get('/api', (req: express.Request, res: express.Response) => {
    res.send('ZIMI Backend API is running!');
});

// Endpoint secreto para inicializar la BD
app.get('/api/setup/init-database-super-secret-key', async (req: express.Request, res: express.Response) => {
    console.log('Received request to initialize database...');
    try {
        await initializeDatabase();
        res.status(200).send('✅ Base de datos inicializada con éxito. ¡Ya puedes cerrar esta ventana!');
    } catch (error) {
        console.error('Error during remote database initialization:', error);
        res.status(500).send(`❌ Error al inicializar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
});


app.get('/api/health', async (req: express.Request, res: express.Response) => {
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