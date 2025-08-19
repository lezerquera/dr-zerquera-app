

import express from 'express';
import pool from '../db';
import { verifyToken, isAdmin } from '../middleware/auth';
import type { ClinicalWizardAnswers, BodyPainPoint } from '../shared/types';

const router = express.Router();


const calculatePriority = (answers: ClinicalWizardAnswers): 'high' | 'medium' | 'low' => {
    // Rule 1: Dolor severo -> Alta prioridad
    if (answers.bodyMap && answers.bodyMap.some(point => point.intensity >= 8)) {
        return 'high';
    }
    // Rule 2: Dolor lumbar severo -> Alta prioridad
    if (answers.bodyMap && answers.bodyMap.some(point => point.bodyPart === 'lumbar' && point.intensity > 7)) {
        return 'high';
    }

    // Rule 3: Dolor moderado -> Prioridad moderada
    if (answers.bodyMap && answers.bodyMap.some(point => point.intensity >= 5)) {
        return 'medium';
    }
    
    // Rule 4: Síntomas digestivos (inferido) o inicio agudo -> Prioridad moderada
    const reasonText = answers.consultationReason?.reason?.toLowerCase() || '';
    const digestiveKeywords = ['digestión', 'estómago', 'intestinal', 'náuseas', 'acidez'];
    if (digestiveKeywords.some(kw => reasonText.includes(kw)) || answers.mtc?.onset === 'Agudo') {
        return 'medium';
    }

    // Default: Leve
    return 'low';
};


// --- Rutas para Administradores ---

// GET /api/forms/templates (Admin: Obtener todas las plantillas de formularios)
router.get('/templates', verifyToken, async (req: express.Request, res: express.Response) => {
    try {
        const result = await pool.query('SELECT id, title, description, structure, form_type as "formType" FROM form_templates ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching form templates:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/forms/templates (Admin: Crear una nueva plantilla de formulario)
router.post('/templates', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    const { title, description, structure } = req.body;
    if (!title || !structure) {
        return res.status(400).json({ error: 'Title and structure are required' });
    }
    try {
        const result = await pool.query(
            'INSERT INTO form_templates (title, description, structure) VALUES ($1, $2, $3) RETURNING id, title, description, structure',
            [title, description, JSON.stringify(structure)]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error creating form template:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/forms/templates/:id (Admin: Actualizar una plantilla de formulario)
router.put('/templates/:id', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    const { title, description, structure } = req.body;
    if (!title || !structure) {
        return res.status(400).json({ error: 'Title and structure are required' });
    }
    try {
        const result = await pool.query(
            'UPDATE form_templates SET title = $1, description = $2, structure = $3 WHERE id = $4 RETURNING id, title, description, structure',
            [title, description, JSON.stringify(structure), id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Form template not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error updating form template:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/forms/templates/:id (Admin: Eliminar una plantilla de formulario)
router.delete('/templates/:id', verifyToken, isAdmin, async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM form_templates WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Form template not found' });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Error deleting form template:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// --- Rutas para Pacientes ---

// GET /api/forms/templates/:id (Paciente: Obtener la estructura de un formulario específico)
router.get('/templates/:id', verifyToken, async (req: express.Request, res: express.Response) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, title, description, structure, form_type as "formType" FROM form_templates WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Form not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Error fetching form structure:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/forms/submissions (Paciente: Enviar las respuestas de un formulario)
router.post('/submissions', verifyToken, async (req: express.Request, res: express.Response) => {
    const patientId = req.user?.id;
    const { templateId, answers } = req.body;
    let priority = null;

    if (!templateId || !answers) {
        return res.status(400).json({ error: 'templateId and answers are required' });
    }

    try {
        // Check if this is a clinical wizard form to calculate priority
        const templateRes = await pool.query('SELECT form_type FROM form_templates WHERE id = $1', [templateId]);
        if (templateRes.rows.length > 0 && templateRes.rows[0].form_type === 'clinical_wizard') {
            priority = calculatePriority(answers as ClinicalWizardAnswers);
        }

        const result = await pool.query(
            'INSERT INTO form_submissions (template_id, patient_id, answers, priority) VALUES ($1, $2, $3, $4) RETURNING id, submission_date',
            [templateId, patientId, JSON.stringify(answers), priority]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Error saving form submission:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/forms/my-submissions (Paciente: Obtener sus formularios enviados)
router.get('/my-submissions', verifyToken, async (req: express.Request, res: express.Response) => {
    const patientId = req.user?.id;
    try {
        const result = await pool.query(
            `SELECT fs.id, fs.submission_date AS "submissionDate", ft.title, ft.id as "templateId"
             FROM form_submissions fs
             JOIN form_templates ft ON fs.template_id = ft.id
             WHERE fs.patient_id = $1
             ORDER BY fs.submission_date DESC`,
            [patientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Error fetching patient submissions:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


export { router as formsRouter };
