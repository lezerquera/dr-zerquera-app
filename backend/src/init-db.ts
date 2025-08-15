/// <reference types="node" />

import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('\n❌ ERROR: La variable de entorno DATABASE_URL no está configurada.');
  console.error("Por favor, cree un archivo '.env' en el directorio 'backend'.");
  console.error('Dentro de ese archivo, añada la línea con su URL de conexión a PostgreSQL, así:');
  console.error('DATABASE_URL="postgresql://user:password@host:port/database"\n');
  throw new Error("❌ DATABASE_URL no está configurada.");
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

export const initializeDatabase = async () => {
  const client = await pool.connect();
  console.log('Connected to the database for initialization.');

  try {
    await client.query('BEGIN');
    console.log('Starting database initialization...');

    console.log('Dropping existing tables...');
    await client.query('DROP TABLE IF EXISTS users, accepted_insurances, insurances, chat_messages, appointments, services, education, doctor_profile, clinic_info CASCADE;');

    console.log('Creating tables...');
    
     await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'patient')),
        name VARCHAR(255) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE clinic_info (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        address VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255)
      );
    `);

    await client.query(`
      CREATE TABLE doctor_profile (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        titles VARCHAR(255),
        photo_url VARCHAR(255),
        introduction TEXT,
        specialties TEXT[],
        experience TEXT
      );
    `);

    await client.query(`
      CREATE TABLE education (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctor_profile(id),
        degree VARCHAR(255),
        institution VARCHAR(255),
        location VARCHAR(255)
      );
    `);

    await client.query(`
      CREATE TABLE services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        description TEXT,
        image_url VARCHAR(255),
        duration VARCHAR(50),
        price VARCHAR(50),
        detailed_info JSONB
      );
    `);

    await client.query(`
      CREATE TABLE appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id),
        patient_name VARCHAR(255),
        patient_phone VARCHAR(50),
        patient_email VARCHAR(255),
        service_id INTEGER REFERENCES services(id),
        urgency VARCHAR(50),
        reason TEXT,
        status VARCHAR(50),
        appointment_date DATE,
        appointment_time TIME
      );
    `);

    await client.query(`
      CREATE TABLE chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        sender_role VARCHAR(50),
        text TEXT,
        "timestamp" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE insurances (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand_color VARCHAR(20)
      );
    `);

    await client.query(`
      CREATE TABLE accepted_insurances (
        insurance_id VARCHAR(255) PRIMARY KEY REFERENCES insurances(id)
      );
    `);
    
    console.log('Tables created successfully.');
    
    console.log('Inserting initial data...');

    // Seed Admin User
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(`
        INSERT INTO users (email, password_hash, role, name) VALUES
        ('admin@zimi.health', $1, 'admin', 'Admin User')
    `, [adminPasswordHash]);
    console.log('Admin user seeded.');


    await client.query(`
        INSERT INTO clinic_info (id, name, address, phone, email, website) VALUES
        (1, 'Zerquera Integrative Medical Institute', '8240 SW 40th St, Miami, FL 33155', '+1 (305) 274-4351', 'info@zimi.health', 'zimi.health')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website;
    `);

    await client.query(`
      INSERT INTO doctor_profile (id, name, titles, photo_url, introduction, specialties, experience) VALUES
      (1, 'Dr. Pablo J. Zerquera', 'MD, FACP', 'https://raw.githubusercontent.com/lezerquera/dr-zerquera-app/main/assets/dr-zerquera.jpeg',
      'El Dr. Pablo J. Zerquera es un médico internista con más de 20 años de experiencia, certificado por la junta, que se especializa en medicina integrativa. Su enfoque combina la medicina convencional con terapias complementarias basadas en la evidencia para tratar a la persona en su totalidad, no solo los síntomas. El Dr. Zerquera cree firmemente en la creación de planes de tratamiento personalizados que aborden las causas fundamentales de la enfermedad y promuevan el bienestar a largo plazo, capacitando a sus pacientes para que tomen un papel activo en su propia salud.',
      '{"Medicina Interna", "Medicina Integrativa", "Acupuntura Médica", "Manejo del Dolor Crónico", "Salud Digestiva", "Prevención y Bienestar"}',
      'Con una distinguida carrera que abarca más de dos décadas, el Dr. Zerquera ha servido como médico de atención primaria y consultor en diversos entornos clínicos. Ha completado una formación avanzada en acupuntura médica y medicina funcional. Su experiencia radica en el diagnóstico y tratamiento de condiciones médicas complexas, con un interés particular en enfermedades crónicas, trastornos autoinmunes y desequilibrios hormonales. Está comprometido con el aprendizaje continuo y la integración de las últimas investigaciones científicas en su práctica para ofrecer la mejor atención posible a sus pacientes.'
      ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, titles = EXCLUDED.titles, photo_url = EXCLUDED.photo_url, introduction = EXCLUDED.introduction, specialties = EXCLUDED.specialties, experience = EXCLUDED.experience;
    `);
    
    await client.query(`
        INSERT INTO education (doctor_id, degree, institution, location) VALUES
        (1, 'Doctor en Medicina (MD)', 'Universidad de Miami Miller School of Medicine', 'Miami, FL'),
        (1, 'Residencia en Medicina Interna', 'Jackson Memorial Hospital', 'Miami, FL'),
        (1, 'Fellow of the American College of Physicians (FACP)', 'American College of Physicians', 'Filadelfia, PA'),
        (1, 'Certificación en Acupuntura Médica para Médicos', 'Helms Medical Institute', 'Berkeley, CA');
    `);

    await client.query(`
        INSERT INTO services (name, description, image_url, duration, price, detailed_info) VALUES
        ('Consulta de Medicina Integrativa Inicial', 'Una evaluación integral para crear un plan de salud personalizado.', 'https://raw.githubusercontent.com/lezerquera/dr-zerquera-app/main/assets/service-consultation.jpeg', '90 Minutos', '$350', '{
          "title": "Su Camino hacia el Bienestar Comienza Aquí",
          "benefits": [
            "Evaluación completa de su historial médico y estilo de vida.",
            "Plan de tratamiento personalizado que integra lo mejor de la medicina convencional y complementaria.",
            "Enfoque en la identificación de las causas raíz de sus problemas de salud.",
            "Educación y empoderamiento para que tome el control de su salud."
          ],
          "treats": [
            "Condiciones crónicas (diabetes, hipertensión)",
            "Fatiga y falta de energía",
            "Problemas digestivos (SII, SIBO)",
            "Desequilibrios hormonales",
            "Estrés y ansiedad"
          ],
          "process": [
            "Revisión exhaustiva de su historial de salud y cuestionarios.",
            "Discusión profunda sobre sus metas de salud.",
            "Examen físico.",
            "Recomendaciones iniciales y solicitud de pruebas de laboratorio si es necesario."
          ],
          "frequency": "Una sola vez para pacientes nuevos",
          "safety": "Realizado por un médico certificado. Seguro para todas las condiciones."
        }'),
        ('Sesión de Acupuntura Médica', 'Terapia de acupuntura para aliviar el dolor, reducir el estrés y mejorar el flujo de energía.', 'https://raw.githubusercontent.com/lezerquera/dr-zerquera-app/main/assets/service-acupuncture.jpeg', '60 Minutos', '$150', '{
          "title": "Equilibrio y Alivio a través de la Acupuntura",
          "benefits": [
            "Alivio efectivo del dolor agudo y crónico.",
            "Reducción significativa del estrés y la ansiedad.",
            "Mejora de la calidad del sueño.",
            "Fortalecimiento del sistema inmunológico."
          ],
          "treats": [
            "Dolor de espalda y cuello",
            "Migrañas y cefaleas tensionales",
            "Artritis",
            "Lesiones deportivas",
            "Insomnio"
          ],
          "process": [
            "Breve consulta para evaluar su progreso y síntomas actuales.",
            "Colocación de agujas finas y estériles en puntos de acupuntura específicos.",
            "Periodo de relajación de 20-30 minutos con las agujas puestas.",
            "Retiro de las agujas y recomendaciones para después de la sesión."
          ],
          "frequency": "Recomendado 1-2 veces por semana inicialmente",
          "safety": "Procedimiento muy seguro con agujas de un solo uso. Efectos secundarios mínimos.",
          "specialOffer": {
              "oldPrice": "750",
              "newPrice": "600",
              "description": "Paquete de 5 Sesiones"
          }
        }'),
        ('Terapia de Nutrición Funcional', 'Optimice su salud a través de la alimentación con un plan nutricional basado en la ciencia.', 'https://raw.githubusercontent.com/lezerquera/dr-zerquera-app/main/assets/service-nutrition.jpeg', '60 Minutos', '$200', '{
          "title": "Que la Comida sea tu Medicina",
          "benefits": [
            "Identificación de sensibilidades alimentarias.",
            "Plan de alimentación antiinflamatorio personalizado.",
            "Mejora de la energía y la claridad mental.",
            "Soporte para la pérdida de peso y la salud metabólica."
          ],
          "treats": [
            "Alergias e intolerancias alimentarias",
            "Enfermedades autoinmunes",
            "Problemas de la piel (eczema, acné)",
            "Salud intestinal y digestiva"
          ],
          "process": [
            "Análisis detallado de su diario de alimentos y síntomas.",
            "Recomendaciones para pruebas de laboratorio funcionales (si es necesario).",
            "Creación de un plan de comidas y suplementos personalizado.",
            "Seguimiento y ajustes para asegurar el éxito a largo plazo."
          ],
          "frequency": "Consulta inicial, seguida de seguimientos mensuales",
          "safety": "Basado en evidencia científica y adaptado a sus necesidades individuales."
        }');
    `);

    const insurances = [
        { id: 'aetna', name: 'Aetna', brandColor: '#00A3E0' },
        { id: 'ambetter', name: 'Ambetter', brandColor: '#F15A29' },
        { id: 'avmed', name: 'AvMed', brandColor: '#00558C' },
        { id: 'bcbs', name: 'Blue Cross Blue Shield', brandColor: '#005EB8' },
        { id: 'cigna', name: 'Cigna', brandColor: '#007DBA' },
        { id: 'doctors-healthcare', name: 'Doctors Healthcare Plans', brandColor: '#1E90FF' },
        { id: 'simply', name: 'Simply Healthcare', brandColor: '#00AEEF' },
        { id: 'sunshine', name: 'Sunshine Health', brandColor: '#FFC72C' },
        { id: 'uhc', name: 'UnitedHealthcare', brandColor: '#00549A' },
        { id: 'medicare', name: 'Medicare', brandColor: '#B0B0B0' },
    ];

    for (const ins of insurances) {
        await client.query(
            `INSERT INTO insurances (id, name, brand_color) VALUES ($1, $2, $3)`,
            [ins.id, ins.name, ins.brandColor]
        );
    }
    console.log('Insurances seeded.');

    // Seed some accepted insurances
    const acceptedInsurances = ['bcbs', 'uhc', 'aetna', 'cigna', 'medicare'];
    for (const insId of acceptedInsurances) {
        await client.query(
            `INSERT INTO accepted_insurances (insurance_id) VALUES ($1)`,
            [insId]
        );
    }
    console.log('Accepted insurances seeded.');

    await client.query('COMMIT');
    console.log('✅ Database initialization complete and data seeded.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
    console.log('Client released.');
  }
};

// This block ensures the script only runs automatically if executed directly
// e.g., `npx ts-node src/init-db.ts`
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Script finished successfully.');
      pool.end();
    })
    .catch(() => {
      console.error('Script failed.');
      pool.end();
    });
}
