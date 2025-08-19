import express from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/users/admin-id
// A protected endpoint to get the ID of the administrator account.
// This is needed so the frontend (patient view) knows who to send chat messages to.
router.get('/admin-id', verifyToken, async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query("SELECT id, name FROM users WHERE role = 'admin' LIMIT 1");
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Admin user not found' });
        }
        res.json({ adminId: result.rows[0].id, adminName: result.rows[0].name });
    } catch (err) {
        console.error("Error fetching admin ID:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Rutas solo para Administradores ---

// GET /api/users/patients (Admin only: get all patients)
router.get('/patients', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query("SELECT id, name, email FROM users WHERE role = 'patient' ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patients list:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/users/patients/:id (Admin only: get a specific patient's details and form submissions)
router.get('/patients/:id', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    try {
        // 1. Get patient info including insurance
        const patientRes = await pool.query(
           `SELECT u.id, u.name, u.email, i.name as "insuranceName"
             FROM users u
             LEFT JOIN insurances i ON u.insurance_id = i.id
             WHERE u.id = $1 AND u.role = 'patient'`,
            [id]
        );
        if (patientRes.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }
        const patient = patientRes.rows[0];

        // 2. Get their form submissions
        const submissionsRes = await pool.query(
            `SELECT 
                fs.id, 
                fs.submission_date AS "submissionDate", 
                fs.answers, 
                ft.title, 
                ft.structure
             FROM form_submissions fs
             JOIN form_templates ft ON fs.template_id = ft.id
             WHERE fs.patient_id = $1
             ORDER BY fs.submission_date DESC`,
            [id]
        );
        
        // 3. Get their confirmed appointments
        const appointmentsRes = await pool.query(
            `SELECT 
                a.id, a.status, a.appointment_date AS "date", a.appointment_time AS "time",
                row_to_json(s.*) as service
             FROM appointments a
             LEFT JOIN services s ON a.service_id = s.id
             WHERE a.patient_id = $1 AND a.status = 'Confirmada'
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [id]
        );

        res.json({ 
            patient, 
            submissions: submissionsRes.rows,
            appointments: appointmentsRes.rows
        });

    } catch (err) {
        console.error("Error fetching patient details:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as usersRouter };