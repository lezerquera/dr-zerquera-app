import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';
import type { ChatMessage, User } from '../shared/types';

const router = express.Router();

// GET /api/chat/conversations (Admin only)
// Fetches a list of all conversations, with the last message and unread count for each.
router.get('/conversations', verifyToken, isAdmin, async (req: ExpressRequest, res: ExpressResponse) => {
    const adminId = req.user!.id;
    try {
        const query = `
            SELECT
                p.id AS "patientId",
                p.name AS "patientName",
                (SELECT text FROM chat_messages WHERE (sender_id = p.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = p.id) ORDER BY "timestamp" DESC LIMIT 1) AS "lastMessage",
                (SELECT "timestamp" FROM chat_messages WHERE (sender_id = p.id AND recipient_id = $1) OR (sender_id = $1 AND recipient_id = p.id) ORDER BY "timestamp" DESC LIMIT 1) AS "lastMessageTimestamp",
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


// GET /api/chat/my-conversation (Patient only)
router.get('/my-conversation', verifyToken, async (req: ExpressRequest, res: ExpressResponse) => {
    const patientId = req.user?.id;
    if (!patientId) {
        return res.status(403).json({ error: 'User ID not found' });
    }

    try {
        const adminResult = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (adminResult.rows.length === 0) {
            return res.status(404).json({ error: "Admin user not found" });
        }
        const adminId = adminResult.rows[0].id;
        
        const result = await pool.query(
            `SELECT
                m.id,
                u_sender.name AS sender,
                m.sender_id as "senderId",
                u_sender.role as "senderRole",
                m.recipient_id as "recipientId",
                m.text,
                to_char(m."timestamp", 'HH24:MI, DD Mon') as "timestamp",
                m.is_read as "isRead"
             FROM chat_messages m
             JOIN users u_sender ON m.sender_id = u_sender.id
             WHERE (m.sender_id = $1 AND m.recipient_id = $2)
                OR (m.sender_id = $2 AND m.recipient_id = $1)
             ORDER BY m."timestamp" ASC`,
            [patientId, adminId]
        );

        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patient conversation:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// GET /api/chat/conversation/:patientId (Admin only)
router.get('/conversation/:patientId', verifyToken, isAdmin, async (req: ExpressRequest, res: ExpressResponse) => {
    const adminId = req.user!.id;
    const patientId = parseInt(req.params.patientId, 10);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Marcar mensajes como leídos
        await client.query(
            `UPDATE chat_messages SET is_read = true WHERE sender_id = $1 AND recipient_id = $2`,
            [patientId, adminId]
        );

        // Obtener la conversación
        const result = await client.query(
             `SELECT
                m.id,
                u_sender.name AS sender,
                m.sender_id as "senderId",
                u_sender.role as "senderRole",
                m.recipient_id as "recipientId",
                m.text,
                to_char(m."timestamp", 'HH24:MI, DD Mon') as "timestamp",
                m.is_read as "isRead"
             FROM chat_messages m
             JOIN users u_sender ON m.sender_id = u_sender.id
             WHERE (m.sender_id = $1 AND m.recipient_id = $2)
                OR (m.sender_id = $2 AND m.recipient_id = $1)
             ORDER BY m."timestamp" ASC`,
            [patientId, adminId]
        );

        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error fetching admin conversation:", err);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});


// POST /api/chat/messages
router.post('/messages', verifyToken, async (req: ExpressRequest, res: ExpressResponse) => {
    const senderId = req.user!.id;
    const senderRole = req.user!.role;
    const senderName = req.user!.name;
    const { text, recipientId } = req.body;

    if (!text || !recipientId) {
        return res.status(400).json({ error: 'Text and recipientId are required' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO chat_messages (sender_id, recipient_id, text) VALUES ($1, $2, $3) RETURNING id, "timestamp"',
            [senderId, recipientId, text]
        );
        
        const newMessage: ChatMessage = {
            id: result.rows[0].id,
            sender: senderName,
            senderId: senderId,
            senderRole: senderRole as 'admin' | 'patient',
            recipientId: recipientId,
            text: text,
            timestamp: new Date(result.rows[0].timestamp).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
            isRead: false
        };

        res.status(201).json(newMessage);
    } catch (err) {
        console.error("Error posting chat message:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/chat/unread-count (Admin only)
router.get('/unread-count', verifyToken, isAdmin, async (req: ExpressRequest, res: ExpressResponse) => {
    const adminId = req.user!.id;
    try {
        const result = await pool.query(
            "SELECT COUNT(*) FROM chat_messages WHERE recipient_id = $1 AND is_read = false",
            [adminId]
        );
        res.json({ unreadCount: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error("Error fetching unread chat count:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as chatMessagesRouter };