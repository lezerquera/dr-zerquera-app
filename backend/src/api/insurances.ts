import express from 'express';
import { Request, Response } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/insurances/all (Public)
router.get('/all', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT id, name, brand_color as "brandColor" FROM insurances ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/insurances/accepted (Public)
router.get('/accepted', async (req: Request, res: Response) => {
    try {
        const result = await pool.query('SELECT insurance_id FROM accepted_insurances');
        res.json(result.rows.map(r => r.insurance_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/insurances/accepted (Admin only)
router.post('/accepted', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const { accepted } = req.body;
    if (!Array.isArray(accepted)) {
        return res.status(400).json({ error: 'Invalid payload, "accepted" must be an array of strings.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM accepted_insurances');
        if (accepted.length > 0) {
            const values = accepted.map((id, index) => `($${index + 1})`).join(',');
            await client.query(`INSERT INTO accepted_insurances (insurance_id) VALUES ${values}`, accepted);
        }
        await client.query('COMMIT');
        res.json({ success: true, acceptedInsurances: accepted });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// GET /api/insurances/accepted-details (Public)
router.get('/accepted-details', async (req: Request, res: Response) => {
     try {
        const result = await pool.query(
            `SELECT i.id, i.name, i.brand_color as "brandColor"
             FROM insurances i
             JOIN accepted_insurances ai ON i.id = ai.insurance_id
             ORDER BY i.name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as insurancesRouter };