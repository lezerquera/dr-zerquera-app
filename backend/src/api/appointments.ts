import express, { Request, Response } from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router: express.Router = express.Router();

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
           row_to_json(s.*)    AS service
    FROM appointments a
    JOIN services s ON a.service_id = s.id
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

// POST /api/appointments (Public)
router.post('/', verifyToken, async (req: Request, res: Response) => {
    const { patientName, patientPhone, patientEmail, serviceId, urgency, reason } = req.body;
    const patientId = req.user?.id;
    
    if (!patientName || !serviceId || !urgency || !reason) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO appointments (patient_id, patient_name, patient_phone, patient_email, service_id, urgency, reason, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Solicitada')
             RETURNING id`,
            [patientId, patientName, patientPhone, patientEmail, serviceId, urgency, reason]
        );
        
        const newAppointmentResult = await pool.query(
            `${selectAppointmentQuery} WHERE a.id = $1`,
            [result.rows[0].id]
        );

        res.status(201).json(newAppointmentResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/appointments/:id/confirm
router.put('/:id/confirm', verifyToken, isAdmin, async (req: Request, res: Response) => {
    const appointmentId = parseInt(req.params.id);

    try {
        const date = new Date().toISOString().split('T')[0]; // Placeholder date
        const time = '10:00'; // Placeholder time

        const result = await pool.query(
            `UPDATE appointments
             SET status = 'Confirmada', appointment_date = $1, appointment_time = $2
             WHERE id = $3
             RETURNING id, patient_id AS "patientId"`,
            [date, time, appointmentId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        const updatedAppointmentResult = await pool.query(
             `${selectAppointmentQuery} WHERE a.id = $1`,
            [appointmentId]
        );

        res.json(updatedAppointmentResult.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export { router as appointmentsRouter };