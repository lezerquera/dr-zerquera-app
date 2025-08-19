import express, { Request, Response } from 'express';
import cors from 'cors';
import { CorsOptions } from 'cors';
import dotenv from 'dotenv';
import path from 'path'; // Importamos el módulo 'path' de Node.js
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

// --- API Routes ---
// IMPORTANTE: Las rutas de la API deben registrarse ANTES de servir los archivos estáticos.
// Esto asegura que las peticiones a /api/* sean manejadas por el backend y no por el frontend.
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


// --- Servir archivos estáticos del frontend (SOLO EN PRODUCCIÓN) ---
// En desarrollo, Vite se encarga de servir el frontend.
if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
    console.log(`[PROD] Attempting to serve static files from: ${frontendDistPath}`);

    // Servimos los assets (JS, CSS, imágenes, etc.) desde la carpeta 'dist' del frontend.
    app.use(express.static(frontendDistPath));

    // --- Catch-all para servir el index.html del frontend ---
    // Esto es crucial para que el enrutamiento del lado del cliente (React Router) funcione.
    app.get('*', (req: Request, res: Response) => {
        const indexPath = path.join(frontendDistPath, 'index.html');
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('Error sending index.html:', err);
                res.status(500).send('Internal server error while serving the application.');
            }
        });
    });
}

export default app;