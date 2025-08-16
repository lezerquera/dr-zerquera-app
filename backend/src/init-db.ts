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

// Array con la definición de todos los servicios.
// Esto hace que el código sea más limpio y fácil de mantener que una única y enorme cadena SQL.
const servicesToSeed = [
    {
        name: 'Acupuntura',
        description: 'Técnica de curación milenaria que utiliza agujas finas para restaurar el equilibrio, aliviar el dolor y promover el bienestar general.',
        imageUrl: '/assets/servicio-acupuntura.webp',
        duration: '45-60 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Acupuntura: Curación Milenaria",
            benefits: ["Alivio efectivo del dolor agudo y crónico.", "Reducción significativa del estrés y la ansiedad.", "Mejora de la calidad del sueño.", "Fortalecimiento del sistema inmunológico."],
            treats: ["Dolor de espalda y cuello", "Migrañas y cefaleas tensionales.", "Artritis y lesiones deportivas.", "Insomnio y fatiga."],
            process: ["Diagnóstico personalizado según la Medicina Tradicional China.", "Inserción de agujas finas y estériles en puntos energéticos clave.", "Periodo de relajación profunda para permitir que el cuerpo responda.", "Recomendaciones de estilo de vida para potenciar los efectos."],
            frequency: "Sesiones semanales o quincenales según la condición.",
            safety: "Procedimiento muy seguro, realizado con agujas estériles de un solo uso."
        }
    },
    {
        name: 'Medicina Oriental',
        description: 'Enfoque integral que combina diagnóstico tradicional chino con técnicas modernas para tratar la causa raíz de las enfermedades.',
        imageUrl: '/assets/servicio-medicina-oriental.webp',
        duration: '60 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Medicina Oriental: Sabiduría Ancestral para la Salud Moderna",
            benefits: ["Tratamiento holístico que aborda cuerpo, mente y espíritu.", "Identificación de desequilibrios energéticos subyacentes.", "Planes de tratamiento que pueden incluir acupuntura, hierbas y dieta.", "Prevención de enfermedades futuras fortaleciendo el sistema."],
            treats: ["Amplia gama de condiciones agudas y crónicas.", "Desórdenes digestivos y respiratorios.", "Problemas de salud mental y emocional.", "Desequilibrios hormonales y ginecológicos."],
            process: ["Evaluación detallada incluyendo pulso y diagnóstico de lengua.", "Creación de un plan de tratamiento integral.", "Aplicación de terapias como acupuntura, moxibustión o ventosas.", "Prescripción de fórmulas herbales personalizadas si es necesario."],
            frequency: "Consultas regulares para ajustar el tratamiento.",
            safety: "Enfoque seguro y natural, adaptado a cada individuo."
        }
    },
    {
        name: 'Medicina Funcional',
        description: 'Enfoque personalizado que identifica y trata las causas fundamentales de las enfermedades crónicas.',
        imageUrl: '/assets/servicio-medicina-funcional.webp',
        duration: '90 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Medicina Funcional: Tratando la Causa, no solo el Síntoma",
            benefits: ["Investigación profunda de las causas raíz de la enfermedad.", "Uso de pruebas de laboratorio avanzadas.", "Planes de tratamiento altamente personalizados.", "Enfoque en nutrición, estilo de vida y genética."],
            treats: ["Enfermedades autoinmunes y crónicas.", "Fatiga crónica y fibromialgia.", "Problemas metabólicos y de peso.", "Salud intestinal y desequilibrios hormonales."],
            process: ["Análisis exhaustivo de historial médico y estilo de vida.", "Solicitud de pruebas funcionales específicas (sangre, saliva, etc.).", "Desarrollo de un plan terapéutico detallado.", "Seguimiento continuo para optimizar los resultados."],
            frequency: "Consulta inicial intensiva con seguimientos periódicos.",
            safety: "Basado en la ciencia, centrado en el paciente y la prevención."
        }
    },
    {
        name: 'Medicina Ortomolecular',
        description: 'Tratamiento que utiliza nutrientes en dosis terapéuticas para restaurar el equilibrio bioquímico óptimo.',
        imageUrl: '/assets/servicio-medicina-ortomolecular.webp',
        duration: '60 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Medicina Ortomolecular: Nutrición para la Sanación Celular",
            benefits: ["Corrección de deficiencias nutricionales específicas.", "Optimización de la función celular y metabólica.", "Uso de vitaminas, minerales y aminoácidos en dosis terapéuticas.", "Apoyo integral a la salud y prevención de enfermedades."],
            treats: ["Estrés oxidativo y envejecimiento prematuro.", "Apoyo al sistema inmunológico.", "Mejora del rendimiento mental y físico.", "Condiciones crónicas relacionadas con deficiencias nutricionales."],
            process: ["Evaluación bioquímica y análisis de deficiencias.", "Diseño de un protocolo de suplementación personalizado.", "Asesoramiento nutricional para potenciar los efectos.", "Monitorización de la respuesta y ajuste de dosis."],
            frequency: "Consultas para establecer y ajustar el plan de nutrientes.",
            safety: "Seguro bajo supervisión médica para garantizar dosis adecuadas."
        }
    },
    {
        name: 'Medicina Homeopática',
        description: 'Sistema de medicina natural que estimula la capacidad innata del cuerpo para curarse a sí mismo.',
        imageUrl: '/assets/servicio-medicina-homeopatica.webp',
        duration: '75 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Medicina Homeopática: Estímulo Natural para la Autocuración",
            benefits: ["Tratamiento suave, no tóxico y sin efectos secundarios.", "Enfoque individualizado basado en la totalidad de los síntomas.", "Fortalece la respuesta vital del propio cuerpo.", "Adecuado para todas las edades, incluyendo niños y ancianos."],
            treats: ["Afecciones agudas como resfriados, gripes y alergias.", "Problemas crónicos de la piel, digestivos y emocionales.", "Trastornos del sueño y estrés.", "Apoyo general al bienestar y la vitalidad."],
            process: ["Entrevista homeopática detallada para entender al individuo.", "Selección de un remedio específico que coincida con el cuadro sintomático.", "Administración del remedio en dosis mínimas.", "Seguimiento para evaluar la respuesta del cuerpo."],
            frequency: "Varía según si la condición es aguda o crónica.",
            safety: "Extremadamente seguro, utilizando remedios altamente diluidos."
        }
    },
    {
        name: 'Consulta de Nutrición TCM',
        description: 'Orientación personalizada sobre el uso de principios de la Medicina Tradicional China para optimizar la salud a través de la nutrición adecuada.',
        imageUrl: '/assets/servicio-nutricion.webp',
        duration: '45 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Nutrición TCM: Alimentación para el Equilibrio Energético",
            benefits: ["Plan de alimentación basado en su constitución y diagnóstico TCM.", "Uso de las propiedades energéticas de los alimentos (frío, caliente, etc.).", "Mejora de la digestión y la absorción de nutrientes.", "Armonización del flujo de Qi (energía vital) en el cuerpo."],
            treats: ["Problemas digestivos como hinchazón, gases y digestión lenta.", "Fatiga, falta de energía y debilidad.", "Desequilibrios de peso.", "Apoyo nutricional para condiciones crónicas."],
            process: ["Evaluación de la dieta actual y diagnóstico según la TCM.", "Recomendaciones de alimentos específicos para incluir o evitar.", "Guía sobre métodos de cocción y horarios de comida.", "Recetas y planes de comidas adaptados a sus necesidades."],
            frequency: "Consulta inicial con seguimientos para ajustar el plan.",
            safety: "Enfoque natural y personalizado, basado en principios milenarios."
        }
    },
    {
        name: 'Terapia de Ozono en Acupuntos',
        description: 'Aplicación dirigida de ozono en puntos de acupuntura para mejorar la curación, apoyar el sistema inmunológico y aliviar el dolor.',
        imageUrl: '/assets/servicio-terapia-de-ozono.webp',
        duration: '30 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Terapia de Ozono: Oxigenación y Sanación Potenciada",
            benefits: ["Potente efecto antiinflamatorio y analgésico.", "Mejora de la oxigenación y circulación en los tejidos.", "Estimulación del sistema inmunológico y acción antimicrobiana.", "Acelera la reparación y regeneración de tejidos."],
            treats: ["Dolor articular y muscular crónico.", "Hernias discales y ciática.", "Fibromialgia.", "Heridas de difícil cicatrización e infecciones localizadas."],
            process: ["Identificación de los puntos de acupuntura relevantes.", "Preparación de una mezcla de oxígeno-ozono en concentraciones precisas.", "Inyección de pequeñas cantidades de la mezcla en los puntos seleccionados.", "Procedimiento rápido con mínimas molestias."],
            frequency: "Serie de tratamientos, generalmente semanales.",
            safety: "Seguro cuando es administrado por un profesional capacitado."
        }
    },
    {
        name: 'Terapia de Inyección',
        description: 'Utilización de inyecciones especializadas para administrar sustancias naturales para el alivio dirigido del dolor y la regeneración de tejidos.',
        imageUrl: '/assets/servicio-terapia-de-inyeccion.webp',
        duration: '30 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Terapia de Inyección: Alivio Dirigido y Regeneración",
            benefits: ["Administración precisa de agentes terapéuticos en el sitio de la lesión.", "Alivio rápido y localizado del dolor.", "Estimulación de los procesos naturales de curación del cuerpo.", "Alternativa mínimamente invasiva a procedimientos más complejos."],
            treats: ["Dolor en articulaciones (rodilla, hombro, etc.).", "Puntos gatillo miofasciales.", "Lesiones de tendones y ligamentos.", "Neuralgias y dolor de nervios periféricos."],
            process: ["Diagnóstico preciso de la zona a tratar.", "Selección de la sustancia a inyectar (proloterapia, vitaminas, etc.).", "Procedimiento de inyección estéril y preciso.", "Instrucciones para el cuidado posterior a la inyección."],
            frequency: "Generalmente se requieren varias sesiones espaciadas.",
            safety: "Procedimiento seguro realizado en un entorno clínico."
        }
    },
    {
        name: 'Consulta Herbal TCM',
        description: 'Asesoramiento experto sobre la incorporación de la Medicina Herbal China Tradicional para objetivos personalizados de salud y bienestar.',
        imageUrl: '/assets/servicio-consulta-herbal.webp',
        duration: '60 minutos',
        price: 'Consultar',
        detailedInfo: {
            title: "Consulta Herbal TCM: El Poder Curativo de la Naturaleza",
            benefits: ["Fórmulas personalizadas para tratar su patrón de desequilibrio específico.", "Apoyo natural para una amplia variedad de condiciones de salud.", "Menos efectos secundarios que muchos medicamentos convencionales.", "Trabaja en sinergia con otros tratamientos como la acupuntura."],
            treats: ["Problemas digestivos, respiratorios y ginecológicos.", "Manejo del estrés, la ansiedad y el insomnio.", "Fortalecimiento del sistema inmunológico.", "Mejora de la energía y la vitalidad general."],
            process: ["Diagnóstico detallado según los principios de la TCM.", "Prescripción de una fórmula herbal única para usted.", "Instrucciones claras sobre la preparación y dosificación.", "Seguimiento para ajustar la fórmula según su progreso."],
            frequency: "Consulta inicial con seguimientos para reevaluar y modificar la fórmula.",
            safety: "Seguro y efectivo bajo la guía de un herbolario cualificado."
        }
    }
];

export const initializeDatabase = async () => {
  const client = await pool.connect();
  console.log('Connected to the database for initialization.');

  try {
    await client.query('BEGIN');
    console.log('Starting database initialization...');

    // --- PASO 1: Resetear todo EXCEPTO la tabla de servicios ---
    console.log('Dropping existing tables (services table will be preserved)...');
    await client.query('DROP TABLE IF EXISTS users, accepted_insurances, insurances, chat_messages, appointments, education, doctor_profile, clinic_info CASCADE;');

    // --- PASO 2: Recrear las tablas que fueron borradas ---
    console.log('Recreating tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'patient')),
        name VARCHAR(255) NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinic_info (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        address VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_profile (
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
      CREATE TABLE IF NOT EXISTS education (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER REFERENCES doctor_profile(id),
        degree VARCHAR(255),
        institution VARCHAR(255),
        location VARCHAR(255)
      );
    `);
    
    // --- PASO 3: Manejar la tabla de servicios de forma segura ---
    console.log('Ensuring services table exists and is structured correctly...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image_url VARCHAR(255),
        duration VARCHAR(50),
        price VARCHAR(50),
        detailed_info JSONB
      );
    `);

    // El resto de tablas que dependen de 'services'
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        patient_name VARCHAR(255),
        patient_phone VARCHAR(50),
        patient_email VARCHAR(255),
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        urgency VARCHAR(50),
        reason TEXT,
        status VARCHAR(50),
        appointment_date DATE,
        appointment_time TIME
      );
    `);
     await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        sender_role VARCHAR(50),
        text TEXT,
        "timestamp" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS insurances (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        brand_color VARCHAR(20)
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS accepted_insurances (
        insurance_id VARCHAR(255) PRIMARY KEY REFERENCES insurances(id)
      );
    `);
    console.log('Tables created successfully.');
    
    // --- PASO 4: Poblar los datos (seeding) ---
    console.log('Inserting initial data...');

    // Seed Admin User (siempre se resetea)
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(`
        INSERT INTO users (email, password_hash, role, name) VALUES ('admin@zimi.health', $1, 'admin', 'Admin User')
        ON CONFLICT (email) DO NOTHING;
    `, [adminPasswordHash]);
    console.log('Admin user seeded.');

    // Seed Clinic Info (siempre se resetea)
    await client.query(`
        INSERT INTO clinic_info (id, name, address, phone, email, website) VALUES
        (1, 'Zerquera Integrative Medical Institute', '8240 SW 40th St, Miami, FL 33155', '+1 (305) 274-4351', 'info@zimi.health', 'zimi.health')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website;
    `);

    // Seed Doctor Profile (siempre se resetea)
    await client.query(`
      INSERT INTO doctor_profile (id, name, titles, photo_url, introduction, specialties, experience) VALUES
      (1, 'Dr. Pablo J. Zerquera', 'MD, FACP', '/assets/dr-zerquera.webp',
      'El Dr. Pablo J. Zerquera es un médico internista con más de 20 años de experiencia, certificado por la junta, que se especializa en medicina integrativa. Su enfoque combina la medicina convencional con terapias complementarias basadas en la evidencia para tratar a la persona en su totalidad, no solo los síntomas. El Dr. Zerquera cree firmemente en la creación de planes de tratamiento personalizados que aborden las causas fundamentales de la enfermedad y promuevan el bienestar a largo plazo, capacitando a sus pacientes para que tomen un papel activo en su propia salud.',
      '{"Medicina Interna", "Medicina Integrativa", "Acupuntura Médica", "Manejo del Dolor Crónico", "Salud Digestiva", "Prevención y Bienestar"}',
      'Con una distinguida carrera que abarca más de dos décadas, el Dr. Zerquera ha servido como médico de atención primaria y consultor en diversos entornos clínicos. Ha completado una formación avanzada en acupuntura médica y medicina funcional. Su experiencia radica en el diagnóstico y tratamiento de condiciones médicas complexas, con un interés particular en enfermedades crónicas, trastornos autoinmunes y desequilibrios hormonales. Está comprometido con el aprendizaje continuo y la integración de las últimas investigaciones científicas en su práctica para ofrecer la mejor atención posible a sus pacientes.'
      ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, titles = EXCLUDED.titles, photo_url = EXCLUDED.photo_url, introduction = EXCLUDED.introduction, specialties = EXCLUDED.specialties, experience = EXCLUDED.experience;
    `);
    await client.query(`DELETE FROM education WHERE doctor_id = 1;`); // Limpiar educación vieja antes de insertar
    await client.query(`
        INSERT INTO education (doctor_id, degree, institution, location) VALUES
        (1, 'Doctor en Medicina (MD)', 'Universidad de Miami Miller School of Medicine', 'Miami, FL'),
        (1, 'Residencia en Medicina Interna', 'Jackson Memorial Hospital', 'Miami, FL'),
        (1, 'Fellow of the American College of Physicians (FACP)', 'American College of Physicians', 'Filadelfia, PA'),
        (1, 'Certificación en Acupuntura Médica para Médicos', 'Helms Medical Institute', 'Berkeley, CA');
    `);

    // --- PASO 5: Poblar la tabla de servicios de forma inteligente ---
    console.log('Seeding services: Adding new services while preserving existing ones...');
    
    // Primero, obtenemos los nombres de todos los servicios existentes para evitar duplicados.
    const existingServicesResult = await client.query('SELECT name FROM services');
    const existingServiceNames = new Set(existingServicesResult.rows.map(row => row.name));

    // Filtramos la lista de servicios a insertar, quedándonos solo con los que no existen.
    const newServicesToSeed = servicesToSeed.filter(service => !existingServiceNames.has(service.name));
    
    if (newServicesToSeed.length > 0) {
        console.log(`Found ${newServicesToSeed.length} new services to insert.`);
        // Insertamos los servicios nuevos uno por uno usando consultas parametrizadas para seguridad.
        for (const service of newServicesToSeed) {
            await client.query(
                `INSERT INTO services (name, description, image_url, duration, price, detailed_info)
                 VALUES ($1, $2, $3, $4, $5, $6);`,
                [service.name, service.description, service.imageUrl, service.duration, service.price, JSON.stringify(service.detailedInfo)]
            );
        }
    } else {
        console.log('No new services to insert. All services are up-to-date.');
    }
    console.log('Services seeded successfully.');


    // Seed Insurances (siempre se resetea)
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
            `INSERT INTO insurances (id, name, brand_color) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
            [ins.id, ins.name, ins.brandColor]
        );
    }
    console.log('Insurances seeded.');

    // Seed some accepted insurances (siempre se resetea)
    const acceptedInsurances = ['bcbs', 'uhc', 'aetna', 'cigna', 'medicare'];
    await client.query('DELETE FROM accepted_insurances;'); // Limpiar antes de insertar
    for (const insId of acceptedInsurances) {
        await client.query(
            `INSERT INTO accepted_insurances (insurance_id) VALUES ($1) ON CONFLICT (insurance_id) DO NOTHING`,
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