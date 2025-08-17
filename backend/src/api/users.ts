import express, { type Request, type Response } from 'express';
import pool from '../db';
import { verifyToken } from '../middleware/auth';

const router = express.Router();

// GET /api/users/admin-id
// A protected endpoint to get the ID of the administrator account.
// This is needed so the frontend (patient view) knows who to send chat messages to.
router.get('/admin-id', verifyToken, async (req: Request, res: Response) => {
    try {
        const result = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        res.json({ adminId: result.rows[0].id });
    } catch (err) {
        console.error("Error fetching admin ID:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as usersRouter };