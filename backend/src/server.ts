import express, { Request, Response } from 'express';
import cors from 'cors';
import { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import pool from './db';
import { clinicInfoRouter } from './api/clinic';
import { doctorProfileRouter } from './api/doctorProfile';
import { servicesRouter } from './api/services';
import { appointmentsRouter } from './api/appointments';
import { chatMessagesRouter } from './api/chat';
import { insurancesRouter } from './api/insurances';
import { authRouter } from './api/auth';
import { setupRouter } from './api/setup';
import { usersRouter } from './api/users';
import { formsRouter } from './api/forms'; // Importar el nuevo router
import './middleware/auth';

dotenv.config();

// --- VALIDACIÓN DE VARIABLES DE ENTORNO CRÍTICAS ---
// La aplicación no debe iniciarse si falta configuración esencial.
// Esto previene errores en tiempo de ejecución y mejora la seguridad.
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
        const errorMessage = `\n❌ FATAL ERROR: La variable de entorno requerida '${varName}' no está configurada.\nPor favor, asegúrese de que esté definida en su archivo .env (local) o en la configuración del entorno (producción).\n`;
        console.error(errorMessage);
        (process as any).exit(1); // Fail fast: detiene el proceso si falta configuración.
    }
}


const app = express();
const port = process.env.PORT || 3001;

// --- Configuración de CORS Mejorada para Flexibilidad en Despliegues ---
const baseAllowedOrigins: string[] = [
    'http://localhost:5173', // Origen para desarrollo local
];

// Si la URL del frontend de producción está definida en el entorno, la añadimos.
if (process.env.FRONTEND_URL) {
    const frontendUrl = process.env.FRONTEND_URL.endsWith('/')
        ? process.env.FRONTEND_URL.slice(0, -1)
        : process.env.FRONTEND_URL;
    baseAllowedOrigins.push(frontendUrl);
    console.log(`CORS: Production frontend URL added to allowed origins: ${frontendUrl}`);
}

const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Permitir peticiones sin 'origin' (como las de Postman, apps móviles o del mismo servidor).
        if (!origin) {
            return callback(null, true);
        }
        
        // Permitir orígenes de la lista base (localhost, FRONTEND_URL).
        if (baseAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Permitir dinámicamente cualquier subdominio de Vercel.
        // Esto es ideal para los despliegues de vista previa (previews).
        const vercelPreviewRegex = /^https:\/\/.+\.vercel\.app$/;
        if (vercelPreviewRegex.test(origin)) {
            console.log(`CORS: Vercel preview origin allowed: ${origin}`);
            return callback(null, true);
        }

        // Si no coincide con ninguna regla, se rechaza.
        console.error(`CORS Blocked: El origen '${origin}' no está permitido.`);
        callback(new Error('No permitido por la política de CORS.'));
    },
    optionsSuccessStatus: 200,
};


// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// --- API Routes ---
// Se registran todas las rutas de la API bajo el prefijo /api.
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clinic-info', clinicInfoRouter);
app.use('/api/doctor-profile', doctorProfileRouter);
app.use('/api/services', servicesRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/chat', chatMessagesRouter);
app.use('/api/insurances', insurancesRouter);
app.use('/api/forms', formsRouter); // Añadir la nueva ruta de formularios
app.use('/api/setup', setupRouter); // Ruta de inicialización refactorizada

app.get('/api', (req: Request, res: Response) => {
    res.send('ZIMI Backend API is running!');
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

// El servicio de archivos estáticos y la ruta catch-all ('*') se eliminan.
// Vercel manejará esto a través de las reglas en `vercel.json`.

export default app;