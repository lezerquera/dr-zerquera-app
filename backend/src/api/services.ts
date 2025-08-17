import express, { type Request, type Response } from 'express';
import pool from '../db';
import type { Service } from '../shared/types';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

const selectServiceQuery = `
    SELECT id,
           name,
           description,
           image_url       AS "imageUrl",
           duration,
           price,
           detailed_info   AS "detailedInfo"
    FROM services
`;

// GET /api/services (Public)
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`${selectServiceQuery} ORDER BY id`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/services (Admin only)
router.post('/', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const { name, description, imageUrl, duration, price, detailedInfo } = req.body as Service;
    try {
        const result = await pool.query(
            `INSERT INTO services (name, description, image_url, duration, price, detailed_info)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, description, image_url AS "imageUrl", duration, price, detailed_info AS "detailedInfo"`,
            [name, description, imageUrl, duration, price, JSON.stringify(detailedInfo)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/services/:id (Admin only)
router.put('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const { name, description, imageUrl, duration, price, detailedInfo } = req.body as Service;
    try {
        const result = await pool.query(
            `UPDATE services 
             SET name = $1, description = $2, image_url = $3, duration = $4, price = $5, detailed_info = $6
             WHERE id = $7 RETURNING id, name, description, image_url AS "imageUrl", duration, price, detailed_info AS "detailedInfo"`,
            [name, description, imageUrl, duration, price, JSON.stringify(detailedInfo), serviceId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Service not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/services/:id (Admin only)
router.delete('/:id', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const serviceId = parseInt(req.params.id);
    const client = await pool.connect(); // Get a client for transaction

    try {
        await client.query('BEGIN');

        // Paso 1: Desvincular todas las citas asociadas a este servicio.
        // Esto preserva el historial de citas mientras permite la eliminación del servicio.
        await client.query(
            'UPDATE appointments SET service_id = NULL WHERE service_id = $1',
            [serviceId]
        );

        // Paso 2: Eliminar el servicio de forma segura ahora que no tiene dependencias.
        const deleteResult = await client.query('DELETE FROM services WHERE id = $1', [serviceId]);
        
        if (deleteResult.rowCount === 0) {
            // Si no se eliminó ninguna fila, el servicio no existía.
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Servicio no encontrado.' });
        }

        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error deleting service with transaction:", err);
        const dbError = err as { code?: string; detail?: string };
        // Aunque ahora lo manejamos manualmente, dejamos este código por si acaso.
        if (dbError.code === '23503') { // Foreign key violation
            return res.status(409).json({ 
                error: 'No se puede eliminar el servicio porque aún tiene datos asociados.' 
            });
        }
        res.status(500).json({ error: 'Error interno del servidor al intentar eliminar el servicio.' });
    } finally {
        client.release();
    }
});


export { router as servicesRouter };