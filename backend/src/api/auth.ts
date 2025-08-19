
import express from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import pool from '../db';
import type { User } from '../shared/types';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-that-is-long-and-secure';

// POST /api/auth/register
router.post('/register', async (req: express.Request, res: express.Response) => {
    const { email, password, name, insuranceId } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        
        // FIX: Robustly handle optional insurance_id. If it's an empty string or null, pass NULL to the DB.
        const finalInsuranceId = insuranceId ? insuranceId : null;

        const newUserResult = await pool.query(
            'INSERT INTO users (email, password_hash, role, name, insurance_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, name',
            [email, passwordHash, 'patient', name, finalInsuranceId]
        );

        const newUser: User = newUserResult.rows[0];

        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ token });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: 'Internal server error during registration' });
    }
});

// POST /api/auth/login
router.post('/login', async (req: express.Request, res: express.Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const tokenPayload: User = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: 'Internal server error during login' });
    }
});

export { router as authRouter };