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
        appointment_time VARCHAR(50)
      );
    `);
    
    await client.query(`
      CREATE TABLE chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id),
        sender_role VARCHAR(50),
        text TEXT,
        "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE insurances (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand_color VARCHAR(7) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE accepted_insurances (
        insurance_id VARCHAR(50) PRIMARY KEY REFERENCES insurances(id)
      );
    `);

    console.log('Tables created successfully.');

    console.log('Seeding data...');
    
    const adminPassword = process.env.ADMIN_PASSWORD || '1234';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    
    await client.query(
      `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, 'admin', 'Admin')`,
      ['admin@zimi.com', adminPasswordHash]
    );

    const patientPassword = '1234';
    const patientPasswordHash = await bcrypt.hash(patientPassword, 10);

     await client.query(
      `INSERT INTO users (email, password_hash, role, name) VALUES ($1, $2, 'patient', 'Paciente ZIMI')`,
      ['paciente@zimi.com', patientPasswordHash]
    );

    await client.query(
      `INSERT INTO clinic_info (id, name, address, phone, email, website) VALUES 
      (1, 'Zerquera Integrative Medical Institute', '7821 SW 40th St, Miami, FL 33155', '305-274-4351', 'info@zimi.com', 'www.zimi.com')`
    );

    await client.query(
      `INSERT INTO doctor_profile (id, name, titles, photo_url, introduction, specialties, experience) VALUES 
      (1, 
      'Dr. Pablo J. Zerquera', 
      'AP, DOM, L.Ac, MSOM', 
      '/assets/dr-zerquera-profile.jpg', 
      'El Dr. Pablo J. Zerquera es un aclamado especialista en Medicina Oriental y Acupuntura, con más de 20 años de experiencia dedicados al tratamiento del dolor y la promoción de la salud integral. Su enfoque combina la sabiduría ancestral de la medicina china con técnicas modernas para ofrecer a sus pacientes un camino hacia el bienestar y la recuperación. Graduado con honores, el Dr. Zerquera es un apasionado defensor de la medicina integrativa, buscando siempre la raíz de los problemas de salud para proporcionar soluciones duraderas y efectivas. Su misión es empoderar a los pacientes, dándoles las herramientas para vivir una vida más saludable y sin dolor.',
      '{Acupuntura, Medicina Oriental, Manejo del Dolor, Terapia de Inyección de Puntos, Bienestar Holístico}', 
      'Con dos décadas de práctica clínica, el Dr. Zerquera ha tratado exitosamente a miles de pacientes con una amplia gama de condiciones, desde dolor crónico y lesiones deportivas hasta estrés y desequilibrios internos. Su experiencia se extiende a través de diversas modalidades de la Medicina Tradicional China, lo que le permite personalizar los tratamientos para satisfacer las necesidades únicas de cada individuo. Ha trabajado en prestigiosas clínicas y es un ponente habitual en conferencias sobre salud integrativa.')`
    );

    await client.query(
      `INSERT INTO education (doctor_id, degree, institution, location) VALUES 
      (1, 'Maestría en Ciencias de la Medicina Oriental', 'Acupuncture and Massage College', 'Miami, FL'),
      (1, 'Diplomado en Acupuntura (NCCAOM)', 'National Certification Commission for Acupuncture and Oriental Medicine', 'USA'),
      (1, 'Licenciado en Ciencias de la Salud', 'Florida International University', 'Miami, FL')`
    );
    
    await client.query(
      `INSERT INTO services (id, name, description, image_url, duration, price, detailed_info) VALUES
      (1, 'Acupuntura', 'Técnica milenaria para aliviar el dolor, reducir el estrés y promover el equilibrio energético del cuerpo mediante la inserción de finas agujas en puntos específicos.', '/assets/servicio-acupuntura.webp', '60 min', '120',
        '{"title": "Sanación y Equilibrio con Acupuntura", "benefits": ["Alivio efectivo del dolor crónico y agudo.", "Reducción significativa del estrés y la ansiedad.", "Mejora la calidad del sueño y combate el insomnio.", "Fortalece el sistema inmunológico.", "Regula el sistema digestivo y hormonal."], "treats": ["Migrañas y cefaleas", "Dolor de espalda y ciática", "Artritis y dolor articular", "Trastornos digestivos", "Ansiedad y depresión", "Infertilidad"], "process": ["Consulta inicial para evaluar su condición.", "Diagnóstico basado en la Medicina Tradicional China.", "Sesión de acupuntura personalizada y relajante.", "Recomendaciones de seguimiento y estilo de vida."], "frequency": "1-2 sesiones por semana inicialmente", "safety": "Procedimiento seguro con agujas estériles de un solo uso."}'),
      (2, 'Medicina Oriental', 'Un enfoque holístico para la salud que integra acupuntura, fitoterapia y nutrición para tratar la raíz del desequilibrio.', '/assets/servicio-medicina-oriental.webp', '75 min', '180',
        '{"title": "Bienestar Integral con Medicina Oriental", "benefits": ["Trata la causa raíz de las enfermedades, no solo los síntomas.", "Enfoque personalizado y holístico para cada paciente.", "Integra múltiples terapias para resultados óptimos.", "Promueve la prevención y la salud a largo plazo."], "treats": ["Condiciones crónicas complejas", "Desequilibrios hormonales", "Fatiga crónica y fibromialgia", "Trastornos autoinmunes"], "process": ["Diagnóstico completo (lengua, pulso, historial).", "Creación de un plan de tratamiento multifacético.", "Sesiones que pueden combinar acupuntura, hierbas y más.", "Seguimiento continuo para ajustar el plan."], "frequency": "Consultas quincenales o mensuales", "safety": "Supervisado por un especialista certificado en Medicina Oriental."}'),
      (3, 'Medicina Funcional', 'Investigación profunda de las causas subyacentes de la enfermedad, utilizando análisis avanzados para crear un plan de salud personalizado.', '/assets/servicio-medicina-funcional.webp', '90 min', '350',
        '{"title": "Salud Personalizada con Medicina Funcional", "benefits": ["Identifica y aborda la causa raíz de los problemas de salud.", "Utiliza pruebas de laboratorio avanzadas.", "Planes de tratamiento basados en la bioquímica individual.", "Enfoque en la dieta, estilo de vida y suplementación."], "treats": ["Enfermedades crónicas", "Problemas digestivos (SII, SIBO)", "Trastornos de la tiroides", "Enfermedades autoinmunes", "Optimización de la salud"], "process": ["Análisis exhaustivo de historial y síntomas.", "Solicitud de pruebas funcionales (sangre, saliva, heces).", "Análisis de resultados y creación de un plan detallado.", "Seguimiento para monitorizar el progreso."], "frequency": "Consulta inicial y seguimientos cada 1-2 meses", "safety": "Basado en evidencia científica y datos de laboratorio."}'),
      (4, 'Medicina Ortomolecular', 'Optimización de la salud a nivel celular mediante la suplementación precisa de vitaminas, minerales y nutrientes esenciales.', '/assets/servicio-medicina-ortomolecular.webp', '60 min', '200',
        '{"title": "Nutrición Celular con Medicina Ortomolecular", "benefits": ["Corrige deficiencias nutricionales específicas.", "Mejora la energía y la función cognitiva.", "Fortalece el sistema inmunológico.", "Apoya los procesos de desintoxicación del cuerpo."], "treats": ["Fatiga crónica", "Niebla mental", "Prevención de enfermedades", "Apoyo durante tratamientos de cáncer", "Salud cardiovascular"], "process": ["Evaluación nutricional y de estilo de vida.", "Posibles análisis para detectar deficiencias.", "Diseño de un protocolo de suplementación personalizado.", "Ajustes basados en la respuesta del paciente."], "frequency": "Consultas de seguimiento trimestrales", "safety": "Protocolos de suplementación seguros y basados en dosis terapéuticas."}'),
      (5, 'Medicina Homeopática', 'Tratamiento natural que utiliza remedios altamente diluidos para estimular la capacidad de autocuración del cuerpo.', '/assets/servicio-medicina-homeopatica.webp', '60 min', '150',
        '{"title": "Estímulo Natural con Medicina Homeopática", "benefits": ["Tratamiento suave, no tóxico y sin efectos secundarios.", "Individualizado para la totalidad de sus síntomas.", "Seguro para niños, embarazadas y ancianos.", "Estimula la propia capacidad de curación del cuerpo."], "treats": ["Alergias", "Problemas de la piel (eccema, psoriasis)", "Trastornos emocionales (ansiedad, pena)", "Enfermedades agudas (gripes, resfriados)", "Problemas infantiles"], "process": ["Entrevista homeopática detallada para entender al individuo.", "Selección del remedio que mejor se adapta a su caso.", "Prescripción del remedio en la potencia y dosis adecuadas.", "Seguimiento para evaluar la respuesta al remedio."], "frequency": "Las consultas se espacian a medida que mejora la salud", "safety": "Remedios naturales regulados, seguros y efectivos."}'),
      (6, 'Consulta de Nutrición TCM', 'Plan de alimentación personalizado basado en los principios de la Medicina Tradicional China para restaurar el equilibrio y la energía.', '/assets/servicio-nutricion.webp', '60 min', '150',
        '{"title": "Nutrición y Equilibrio Energético", "benefits": ["Aprende qué alimentos son mejores para tu constitución.", "Mejora la digestión y los niveles de energía.", "Apoya la pérdida de peso de forma sostenible.", "Reduce la inflamación a través de la dieta."], "treats": ["Trastornos digestivos (SII, SIBO)", "Fatiga y baja energía", "Sobrepeso y obesidad", "Enfermedades autoinmunes", "Alergias alimentarias"], "process": ["Análisis detallado de su dieta y estilo de vida actual.", "Diagnóstico energético según la Medicina China.", "Creación de un plan de alimentación personalizado.", "Recomendaciones de recetas y suplementos si es necesario."], "frequency": "Consulta inicial y seguimientos mensuales", "safety": "Enfoque educativo y de apoyo para un cambio de hábitos duradero."}'),
      (7, 'Terapia de Ozono en Acupuntos', 'Aplicación de ozono medicinal en puntos de acupuntura para oxigenar tejidos, reducir la inflamación y modular el sistema inmune.', '/assets/servicio-terapia-de-ozono.webp', '30 min', '180',
        '{"title": "Oxigenación y Sanación con Ozonoterapia", "benefits": ["Potente efecto antiinflamatorio y analgésico.", "Mejora la oxigenación y circulación local.", "Acción germicida (antibacteriana, antiviral).", "Modula la respuesta del sistema inmunológico."], "treats": ["Dolor articular crónico (artrosis)", "Hernias discales", "Fibromialgia", "Heridas de difícil cicatrización", "Infecciones crónicas"], "process": ["Se genera ozono medicinal a partir de oxígeno puro.", "Se inyecta una pequeña cantidad en puntos de acupuntura o áreas afectadas.", "El procedimiento es rápido y mínimamente invasivo."], "frequency": "Ciclos de varias sesiones, generalmente semanales", "safety": "Técnica segura cuando es aplicada por un profesional capacitado."}'),
      (8, 'Terapia de Inyección', 'Administración de soluciones homeopáticas o vitaminas en puntos de acupuntura para potenciar la curación y aliviar el dolor.', '/assets/servicio-terapia-de-inyeccion.webp', '30 min', '150',
        '{"title": "Alivio Potenciado con Terapia de Inyección", "benefits": ["Acción antiinflamatoria y analgésica directa.", "Resultados más rápidos que la acupuntura sola.", "Estimulación prolongada de los puntos de acupuntura.", "Aporte localizado de nutrientes y remedios naturales."], "treats": ["Dolor agudo por lesiones deportivas", "Espasmos musculares", "Puntos gatillo (Trigger Points)", "Deficiencias vitamínicas localizadas", "Dolor neuropático"], "process": ["Identificación de los puntos clave para la inyección.", "Preparación de una solución personalizada (vitaminas, traumeel, etc.).", "Aplicación precisa y rápida en los puntos seleccionados."], "frequency": "Según la condición, de semanal a mensual", "safety": "Realizado por un profesional certificado en un entorno estéril."}'),
      (9, 'Consulta Herbal TCM', 'Prescripción de fórmulas herbales chinas personalizadas para tratar condiciones desde la raíz, restaurando el equilibrio interno.', '/assets/servicio-consulta-herbal.webp', '45 min', '100 (más costo de hierbas)',
        '{"title": "Sanación Natural con Fitoterapia China", "benefits": ["Trata la causa raíz de las enfermedades, no solo los síntomas.", "Fórmulas personalizadas para sus necesidades únicas.", "Menos efectos secundarios que muchos medicamentos convencionales.", "Fortalece el cuerpo y previene futuras enfermedades."], "treats": ["Desequilibrios hormonales", "Problemas digestivos crónicos", "Alergias y problemas de la piel", "Insomnio y ansiedad", "Apoyo para la fertilidad"], "process": ["Diagnóstico completo (lengua, pulso, historial).", "Prescripción de una fórmula herbal única.", "Las hierbas se dispensan en forma de tés, gránulos o cápsulas.", "Seguimiento para ajustar la fórmula según la evolución."], "frequency": "La consulta es mensual, el tratamiento es diario", "safety": "Supervisado por un herbalista certificado para garantizar seguridad y eficacia."}')
    );

    const insurances = [
        { id: 'aetna', name: 'Aetna', brandColor: '#E0193E' },
        { id: 'ambetter', name: 'Ambetter', brandColor: '#7C4DFF' },
        { id: 'amerigroup', name: 'Amerigroup', brandColor: '#0064A6' },
        { id: 'avmed', name: 'AvMed', brandColor: '#00A79D' },
        { id: 'bcbs', name: 'Blue Cross Blue Shield', brandColor: '#1F61A8' },
        { id: 'careplus', name: 'CarePlus', brandColor: '#F37421' },
        { id: 'cigna', name: 'Cigna', brandColor: '#00A3C6' },
        { id: 'devoted', name: 'Devoted Health', brandColor: '#FF6F61' },
        { id: 'doctors', name: 'Doctors HealthCare', brandColor: '#2C3E50' },
        { id: 'florida-health-care', name: 'Florida Health Care', brandColor: '#007A53' },
        { id: 'healthsun', name: 'HealthSun', brandColor: '#FDB813' },
        { id: 'humana', name: 'Humana', brandColor: '#6DBA2C' },
        { id: 'leon', name: 'Leon Medical Centers', brandColor: '#A81A2D' },
        { id: 'medicare', name: 'Medicare', brandColor: '#1A4F8B' },
        { id: 'mmm', name: 'MMM of Florida', brandColor: '#0097A9' },
        { id: 'molina', name: 'Molina Healthcare', brandColor: '#00A950' },
        { id: 'simply', name: 'Simply Healthcare', brandColor: '#00B3E3' },
        { id: 'sunshine', name: 'Sunshine Health', brandColor: '#FFC72C' },
        { id: 'uhc', name: 'UnitedHealthcare', brandColor: '#002C77' },
        { id: 'wellcare', name: 'WellCare', brandColor: '#A1286C' },
    ];
    for (const ins of insurances) {
        await client.query('INSERT INTO insurances (id, name, brand_color) VALUES ($1, $2, $3)', [ins.id, ins.name, ins.brandColor]);
    }
    
    // Lista de seguros aceptados por defecto
    const acceptedInsurances = ['aetna', 'bcbs', 'cigna', 'humana', 'medicare', 'uhc'];
    for (const insId of acceptedInsurances) {
        await client.query('INSERT INTO accepted_insurances (insurance_id) VALUES ($1)', [insId]);
    }

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during database initialization:', err);
    throw err;
  } finally {
    client.release();
    console.log('Database client released.');
  }
};

// Si el script se ejecuta directamente con 'ts-node', inicializa la BD.
if (require.main === module) {
  console.log('Running init-db.ts directly...');
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization complete.');
      pool.end();
    })
    .catch((error) => {
      console.error('❌ Failed to initialize database:', error);
      pool.end();
      process.exit(1);
    });
}