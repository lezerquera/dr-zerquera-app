import express from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import pool from '../db';
import type { User } from '../shared/types';

const router = express.Router();

// El chequeo de JWT_SECRET se hace en server.ts al arrancar.
// Esto elimina la necesidad de una clave insegura por defecto.
// Se usa '!' para asegurar a TypeScript que la variable existirá en este punto.
const JWT_SECRET = process.env.JWT_SECRET!;

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

        // CORRECCIÓN: Manejar explícitamente la cadena vacía como NULL.
        // Si `insuranceId` es una cadena vacía (''), se convertirá en `null`.
        const finalInsuranceId = insuranceId ? insuranceId : null;

        const newUserResult = await pool.query(
            'INSERT INTO users (email, password_hash, role, name, insurance_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, role, name',
            [email, passwordHash, 'patient', name, finalInsuranceId]
        );

        const newUser: User = newUserResult.rows[0];

        const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '1d' });

        res.status(201).json({ token });

    } catch (err) {
        console.error("--- DETAILED REGISTRATION ERROR ---");
        console.error(`Timestamp: ${new Date().toISOString()}`);
        console.error(`Attempted registration for email: ${email}`);
        console.error("Error Object:", err);
        console.error("--- END OF DETAILED ERROR ---");

        // The pre-query check handles most cases, but this catch handles race conditions
        // or other DB-level constraints.
        const dbError = err as { code?: string };
        if (dbError.code === '23505') { // unique_violation code for PostgreSQL
             return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        res.status(500).json({ error: 'Internal server error' });
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
        
        const userPayload: User = { id: user.id, email: user.email, role: user.role, name: user.name };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '1d' });

        res.json({ token });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as authRouter };