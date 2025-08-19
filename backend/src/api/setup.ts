import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { initializeDatabase } from '../init-db';

const router = express.Router();

// This is a sensitive endpoint and should be protected in a real application
// e.g. with an environment variable secret key check.
router.post('/initialize', async (req: ExpressRequest, res: ExpressResponse) => {
    try {
        console.log("Attempting to initialize database via API...");
        await initializeDatabase();
        res.status(200).json({ message: 'Database initialized successfully.' });
    } catch (error) {
        const err = error as Error;
        console.error('API Error: Failed to initialize database.', err.message);
        res.status(500).json({ error: 'Database initialization failed.', details: err.message });
    }
});

export { router as setupRouter };