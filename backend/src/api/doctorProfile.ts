import express, { Request, Response } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/doctor-profile (Public)
router.get('/', async (req: Request, res: Response) => {
    try {
        const profileResult = await pool.query('SELECT id, name, titles, photo_url AS "photoUrl", introduction, specialties, experience FROM doctor_profile WHERE id = 1');
        if (profileResult.rows.length === 0) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }
        const profile = profileResult.rows[0];
        
        const educationResult = await pool.query('SELECT * FROM education WHERE doctor_id = 1 ORDER BY id');
        profile.education = educationResult.rows;

        res.json(profile);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/doctor-profile (Admin only)
router.post('/', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const { name, titles, photoUrl, introduction, specialties, experience, education } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const profileUpdateQuery = `
            UPDATE doctor_profile 
            SET name = $1, titles = $2, photo_url = $3, introduction = $4, specialties = $5, experience = $6 
            WHERE id = 1
        `;
        await client.query(profileUpdateQuery, [name, titles, photoUrl, introduction, specialties, experience]);

        await client.query('DELETE FROM education WHERE doctor_id = 1');

        for (const edu of education) {
            const eduInsertQuery = 'INSERT INTO education (doctor_id, degree, institution, location) VALUES (1, $1, $2, $3)';
            await client.query(eduInsertQuery, [edu.degree, edu.institution, edu.location]);
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    } finally {
        client.release();
    }
});

export { router as doctorProfileRouter };