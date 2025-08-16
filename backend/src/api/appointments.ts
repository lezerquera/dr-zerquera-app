import express from 'express';
import { Request, Response } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

const selectAppointmentQuery = `
    SELECT a.id,
           a.patient_id        AS "patientId",
           a.patient_name      AS "patientName",
           a.patient_phone     AS "patientPhone",
           a.patient_email     AS "patientEmail",
           a.urgency,
           a.reason,
           a.status,
           a.appointment_date  AS "date",
           a.appointment_time  AS "time",
           (SELECT row_to_json(s) FROM (SELECT id, name, description, image_url as "imageUrl", duration, price, detailed_info as "detailedInfo" FROM services WHERE id = a.service_id) s) as service
    FROM appointments a
`;

// GET /api/appointments
router.get('/', verifyToken, isAdmin, async (req: Request, res: Response) => {
    try {
        const result = await pool.query(`${selectAppointmentQuery} ORDER BY a.id DESC`);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/appointments (Authenticated users)
router.post('/', verifyToken, async (req: Request, res: Response) => {
    const { patientName, patientPhone, patientEmail, serviceId, urgency, reason } = req.body;
    const patientId = req.user?.id;

    if (!patientName || !patientPhone || !patientEmail || !serviceId || !urgency || !reason) {
        return res.status(400).json({ error: 'Missing required appointment data.' });
    }

    try {
        const insertResult = await pool.query(
            `INSERT INTO appointments (patient_id, patient_name, patient_phone, patient_email, service_id, urgency, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Solicitada')
             RETURNING id`,
            [patientId, patientName, patientPhone, patientEmail, serviceId, urgency, reason]
        );
        
        const newAppointmentId = insertResult.rows[0].id;

        const finalResult = await pool.query(`${selectAppointmentQuery} WHERE a.id = $1`, [newAppointmentId]);
        
        if (finalResult.rows.length === 0) {
             return res.status(404).json({ error: 'Could not retrieve the created appointment.' });
        }

        res.status(201).json(finalResult.rows[0]);
    } catch (err) {
        console.error('Error creating appointment request:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/appointments/:id/confirm (Admin only)
router.put('/:id/confirm', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // Set appointment for 7 days from now at 10 AM as a placeholder
    const appointmentDate = new Date();
    appointmentDate.setDate(appointmentDate.getDate() + 7);
    const dateStr = appointmentDate.toISOString().split('T')[0];
    const timeStr = '10:00:00';

    try {
        const updateResult = await pool.query(
            `UPDATE appointments 
             SET status = 'Confirmada', appointment_date = $1, appointment_time = $2 
             WHERE id = $3 RETURNING patient_id`,
            [dateStr, timeStr, id]
        );

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found.' });
        }

        const finalResult = await pool.query(`${selectAppointmentQuery} WHERE a.id = $1`, [id]);
        
        if (finalResult.rows.length === 0) {
            return res.status(404).json({ error: 'Could not retrieve the updated appointment.' });
        }

        res.json(finalResult.rows[0]);

    } catch (err) {
        console.error('Error confirming appointment:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as appointmentsRouter };