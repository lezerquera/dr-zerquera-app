import express from 'express';
import pool from '../db';
import { verifyToken } from '../middleware/auth';

const router: express.Router = express.Router();

// GET /api/chat-messages
router.get('/', verifyToken, async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query('SELECT c.id, u.name as sender, c.sender_role as "senderRole", c.text, to_char(c.timestamp, \'HH:MI AM\') as timestamp FROM chat_messages c JOIN users u ON c.sender_id = u.id ORDER BY c.id ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/chat-messages
router.post('/', verifyToken, async (req: express.Request, res: express.Response) => {
    const { text } = req.body;
    const senderId = req.user?.id;
    const senderRole = req.user?.role;
    try {
        const result = await pool.query(
            'INSERT INTO chat_messages (sender_id, sender_role, text) VALUES ($1, $2, $3) RETURNING id, text, sender_role as "senderRole", (SELECT name FROM users WHERE id = $1) as sender, to_char(timestamp, \'HH:MI AM\') as timestamp',
            [senderId, senderRole, text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as chatMessagesRouter };