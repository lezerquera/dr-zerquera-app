import express, { type Request, type Response } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/chat/conversations (Admin only)
// Fetches a list of all conversations, with the last message and unread count for each.
router.get('/conversations', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    try {
        const query = `
            SELECT
                p.id AS "patientId",
                p.name AS "patientName",
                (SELECT text FROM chat_messages WHERE (sender_id = p.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = p.id) ORDER BY timestamp DESC LIMIT 1) AS "lastMessage",
                (SELECT timestamp FROM chat_messages WHERE (sender_id = p.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = p.id) ORDER BY timestamp DESC LIMIT 1) AS "lastMessageTimestamp",
                (SELECT COUNT(*) FROM chat_messages WHERE sender_id = p.id AND recipient_id = $1 AND is_read = false) AS "unreadCount"
            FROM
                users p
            WHERE
                p.id IN (
                    SELECT sender_id FROM chat_messages WHERE recipient_id = $1
                    UNION
                    SELECT recipient_id FROM chat_messages WHERE sender_id = $1
                )
                AND p.role = 'patient'
            ORDER BY "lastMessageTimestamp" DESC;
        `;
        const result = await pool.query(query, [adminId]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching conversations:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chat/unread-count (Admin only)
// Fetches the total number of unread messages for the admin.
router.get('/unread-count', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    try {
        const query = `
            SELECT COUNT(*)
            FROM chat_messages
            WHERE recipient_id = $1 AND is_read = false
        `;
        const result = await pool.query(query, [adminId]);
        const count = parseInt(result.rows[0].count, 10);
        res.json({ unreadCount: count });
    } catch (err) {
        console.error("Error fetching unread message count:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chat/conversation/:patientId (Admin only)
// Fetches the full chat history with a specific patient and marks messages as read.
router.get('/conversation/:patientId', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const adminId = req.user!.id;
    const patientId = parseInt(req.params.patientId);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Mark messages from patient to admin as read
        await client.query(
            'UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false',
            [patientId, adminId]
        );
        // Fetch the conversation
        const result = await client.query(
            `SELECT m.id, m.sender_id as "senderId", m.recipient_id as "recipientId", m.text, m.is_read as "isRead", to_char(m.timestamp, 'HH:MI AM') as timestamp, u.name as sender, u.role as "senderRole" 
             FROM chat_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
             ORDER BY m.timestamp ASC`,
            [patientId, adminId]
        );
        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error fetching conversation with patient ${patientId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});


// GET /api/chat/my-conversation (Patient only)
// Fetches the patient's conversation with the admin and marks messages as read.
router.get('/my-conversation', verifyToken, async (req: Request, res: Response) => {
    const patientId = req.user!.id;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // First find adminId
        const adminResult = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminResult.rows.length === 0) {
            throw new Error("Admin user not found");
        }
        const adminId = adminResult.rows[0].id;
        
        // Mark messages from admin to this patient as read
        await client.query(
            'UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND recipient_id = $2 AND is_read = false',
            [adminId, patientId]
        );
        
        // Fetch the conversation
        const result = await client.query(
            `SELECT m.id, m.sender_id as "senderId", m.recipient_id as "recipientId", m.text, m.is_read as "isRead", to_char(m.timestamp, 'HH:MI AM') as timestamp, u.name as sender, u.role as "senderRole" 
             FROM chat_messages m
             JOIN users u ON m.sender_id = u.id
             WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
             ORDER BY m.timestamp ASC`,
            [patientId, adminId]
        );
        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error fetching conversation for patient ${patientId}:`, err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});


// POST /api/chat/messages
router.post('/messages', verifyToken, async (req: Request, res: Response) => {
    const { text, recipientId } = req.body;
    const senderId = req.user!.id;

    if (!text || !recipientId) {
        return res.status(400).json({ error: 'Text and recipientId are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO chat_messages (sender_id, recipient_id, text) VALUES ($1, $2, $3) RETURNING id, text, sender_id as "senderId", recipient_id as "recipientId", is_read as "isRead", (SELECT name FROM users WHERE id = $1) as sender, (SELECT role FROM users WHERE id = $1) as "senderRole", to_char(timestamp, \'HH:MI AM\') as timestamp',
            [senderId, recipientId, text]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as chatMessagesRouter };