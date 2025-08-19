
import express from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/clinic-info (Public)
router.get('/', async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query('SELECT * FROM clinic_info LIMIT 1');
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/clinic-info (Admin only)
router.post('/', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    const { name, address, phone, email, website } = req.body;
    try {
        const result = await pool.query(
            `UPDATE clinic_info SET name = $1, address = $2, phone = $3, email = $4, website = $5 WHERE id = 1 RETURNING *`,
            [name, address, phone, email, website]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as clinicInfoRouter };
