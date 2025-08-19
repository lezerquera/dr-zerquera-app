import { Pool } from 'pg';
import dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';
import path from 'path';

// --- DATOS INICIALES (SEEDING) ---
// Se mantiene la misma data que el original...

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

// --- LÓGICA DE INICIALIZACIÓN ---

/**
 * Función autocontenida y exportable que se conecta a la base de datos,
 * borra las tablas existentes y las vuelve a crear con datos iniciales.
 * Maneja su propia conexión y la cierra al finalizar.
 */
export const initializeDatabase = async () => {
  // Carga las variables de entorno desde el archivo .env en el directorio 'backend'
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('\n❌ ERROR: La variable de entorno DATABASE_URL no está configurada.');
    console.error("Por favor, cree un archivo '.env' en el directorio 'backend'.");
    console.error('Dentro de ese archivo, añada la línea con su URL de conexión a PostgreSQL, así:');
    console.error('DATABASE_URL="postgresql://user:password@host:port/database"\n');
    throw new Error("DATABASE_URL no está configurada.");
  }

  const pool = new Pool({
    connectionString: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  console.log('✅ Conectado a la base de datos para la inicialización.');

  try {
    await client.query('BEGIN');
    console.log('▶️  Iniciando la inicialización de la base de datos...');

    console.log('    - Borrando tablas existentes...');
    // Se ha cambiado para eliminar todas las tablas, incluyendo servicios, para una reinicialización limpia.
    await client.query('DROP TABLE IF EXISTS users, accepted_insurances, insurances, chat_messages, appointments, services, education, doctor_profile, clinic_info CASCADE;');

    console.log('    - Recreando tablas...');
    // Las sentencias CREATE TABLE permanecen iguales
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
        recipient_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        text TEXT,
        is_read BOOLEAN DEFAULT FALSE,
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
    console.log('    - Tablas creadas con éxito.');
    
    console.log('    - Insertando datos iniciales...');

    // Seed Admin User
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    await client.query(`
        INSERT INTO users (email, password_hash, role, name) VALUES ('admin@zimi.health', $1, 'admin', 'Admin User') ON CONFLICT (email) DO NOTHING;
    `, [adminPasswordHash]);
    console.log('      -> Usuario administrador sembrado.');

    // Seed Clinic & Doctor Info
    await client.query(`
        INSERT INTO clinic_info (id, name, address, phone, email, website) VALUES
        (1, 'Zerquera Integrative Medical Institute', '7700 N Kendall Dr. Unit 807, Kendall, FL 33156', '(305) 274-4351', 'drzerquera@aol.com', 'www.drzerquera.com')
        ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, phone = EXCLUDED.phone, email = EXCLUDED.email, website = EXCLUDED.website;
    `);
    await client.query(`
      INSERT INTO doctor_profile (id, name, titles, photo_url, introduction, specialties, experience) VALUES
      (1, 'Dr. Pablo J. Zerquera', 'OMD, AP, PhD', '/assets/dr-zerquera.webp',
      'El Dr. Pablo Zerquera se graduó como médico en la Universidad de La Habana, Cuba, donde recibió una formación rigurosa en ciencias médicas convencionales. Su interés por los enfoques terapéuticos complementarios lo llevó a profundizar en la medicina oriental, obteniendo una especialización en Acupuntura y Medicina Tradicional China en el Acupuncture and Massage College de Miami, Florida.',
      '{"Medicina Oriental y Acupuntura", "Medicina Funcional", "Medicina Ortomolecular", "Medicina Homeopática", "Manejo del Dolor"}',
      'Comprometido con una visión integradora de la salud, el Dr. Zerquera completó un doctorado en Medicina Homeopática en la Universidad Internacional de Cambridge, fortaleciendo su enfoque clínico con herramientas terapéuticas que respetan la individualidad biológica y emocional de cada paciente. Con más de una década de experiencia clínica, ha desarrollado una práctica centrada en el tratamiento del dolor crónico, trastornos emocionales, lesiones agudas y desequilibrios funcionales. Su abordaje combina técnicas como acupuntura, moxibustión, terapia de ozono en acupuntos, medicina ortomolecular y estrategias de regulación neurovegetativa, siempre con base en evidencia y sensibilidad clínica. El Dr. Zerquera atiende en inglés y español, y se distingue por su capacidad para integrar conocimientos médicos tradicionales con terapias avanzadas, ofreciendo una experiencia terapéutica precisa, humana y profundamente restauradora.'
      ) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, titles = EXCLUDED.titles, photo_url = EXCLUDED.photo_url, introduction = EXCLUDED.introduction, specialties = EXCLUDED.specialties, experience = EXCLUDED.experience;
    `);
    await client.query(`DELETE FROM education WHERE doctor_id = 1;`);
    await client.query(`
        INSERT INTO education (doctor_id, degree, institution, location) VALUES
        (1, 'Médico', 'Universidad de La Habana', 'Cuba'),
        (1, 'Especialización en Acupuntura y Medicina Tradicional China', 'Acupuncture and Massage College', 'Miami, FL'),
        (1, 'Doctorado en Medicina Homeopática (PhD)', 'Universidad Internacional de Cambridge', '');
    `);
    console.log('      -> Perfil del doctor y de la clínica sembrados.');

    // Seed Services
    for (const service of servicesToSeed) {
        await client.query(
            `INSERT INTO services (name, description, image_url, duration, price, detailed_info) VALUES ($1, $2, $3, $4, $5, $6);`,
            [service.name, service.description, service.imageUrl, service.duration, service.price, JSON.stringify(service.detailedInfo)]
        );
    }
    console.log(`      -> ${servicesToSeed.length} servicios sembrados.`);

    // Seed Insurances
    const insurances = [
        { id: 'aetna', name: 'Aetna', brandColor: '#00A3E0' }, { id: 'ambetter', name: 'Ambetter', brandColor: '#F15A29' }, { id: 'avmed', name: 'AvMed', brandColor: '#00558C' }, { id: 'bcbs', name: 'Blue Cross Blue Shield', brandColor: '#005EB8' }, { id: 'cigna', name: 'Cigna', brandColor: '#007DBA' }, { id: 'doctors-healthcare', name: 'Doctors Healthcare Plans', brandColor: '#1E90FF' }, { id: 'simply', name: 'Simply Healthcare', brandColor: '#00AEEF' }, { id: 'sunshine', name: 'Sunshine Health', brandColor: '#FFC72C' }, { id: 'careplus', name: 'Care Plus', brandColor: '#FDB813' }, { id: 'healthsun', name: 'Health Sun', brandColor: '#00A79D' },
    ];
    for (const ins of insurances) {
        await client.query(
            `INSERT INTO insurances (id, name, brand_color) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, brand_color = EXCLUDED.brand_color`,
            [ins.id, ins.name, ins.brandColor]
        );
    }
    const acceptedInsurances = ['bcbs', 'aetna', 'cigna', 'careplus', 'healthsun'];
    await client.query('DELETE FROM accepted_insurances;');
    for (const insId of acceptedInsurances) {
        await client.query(`INSERT INTO accepted_insurances (insurance_id) VALUES ($1) ON CONFLICT (insurance_id) DO NOTHING`, [insId]);
    }
    console.log('      -> Seguros sembrados.');

    await client.query('COMMIT');
    console.log('✅ ¡Éxito! La base de datos ha sido inicializada y los datos han sido sembrados.');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error durante la inicialización de la base de datos:', err);
    throw err; // Lanza el error para que el proceso principal lo capture
  } finally {
    client.release();
    console.log('Cliente de base de datos liberado.');
    await pool.end();
    console.log('Pool de conexiones cerrado.');
  }
};

// --- PUNTO DE ENTRADA DEL SCRIPT ---

const main = async () => {
  console.log('--- Iniciando script de inicialización de la base de datos ---');
  try {
    await initializeDatabase();
    console.log('--- ✅ Script de inicialización finalizado con éxito ---');
  } catch (error) {
    console.error('--- ❌ El script de inicialización falló. Vea el error de arriba. ---');
    // El proceso se cerrará automáticamente debido al error no controlado,
    // pero se puede forzar si es necesario, aunque no es ideal.
    process.exit(1);
  }
};

// Se ejecuta solo si el archivo es llamado directamente desde la línea de comandos.
// Esto evita que el script se ejecute cuando es importado por otros archivos (como el servidor API).
if (require.main === module) {
  main();
}