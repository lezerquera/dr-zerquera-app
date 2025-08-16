import express, { Request, Response } from 'express';
import { initializeDatabase } from '../init-db';

const router = express.Router();

// GET /api/setup/init-database-super-secret-key
router.get('/init-database-super-secret-key', async (req: Request, res: Response) => {
    console.log('Received request to initialize database via dedicated setup router...');
    try {
        await initializeDatabase();
        res.status(200).send('✅ Base de datos inicializada con éxito. ¡Ya puedes cerrar esta ventana!');
    } catch (error) {
        console.error('Error during remote database initialization:', error);
        res.status(500).send(`❌ Error al inicializar la base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
});

export { router as setupRouter };