import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from '../types';

// Memoized AI client instance
let ai: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI | null => {
    // La clave de API se lee de las variables de entorno y se expone a través de la configuración de Vite.
    const API_KEY = process.env.API_KEY;

    if (!API_KEY) {
        // Esto solo se registrará una vez si falta la clave.
        if (ai === null) {
             console.warn("API_KEY for Gemini is not set. AI features will be disabled.");
        }
        return null;
    }

    if (!ai) {
        ai = new GoogleGenAI({ apiKey: API_KEY });
    }
    
    return ai;
};

export const generateChatSummary = async (messages: ChatMessage[]): Promise<string> => {
  const aiClient = getAiClient();
  if (!aiClient) {
    return "La función de resumen de IA está desactivada porque la clave de API no está configurada.";
  }

  const conversationHistory = messages
    .filter(msg => msg.senderRole !== 'system') // Filter out system messages
    .map(msg => `${msg.senderRole === 'patient' ? 'Paciente' : 'Doctor'}: ${msg.text}`) // Use role to identify speaker
    .join('\n');

  const prompt = `
    Basado en la siguiente conversación entre un médico y un paciente, por favor proporciona un resumen conciso para los registros del paciente.
    El resumen debe estar en español y ser claro y fácil de entender para alguien sin conocimientos médicos.
    Incluye los siguientes puntos en formato de lista:
    - Síntomas principales mencionados por el paciente.
    - Posible diagnóstico o áreas de preocupación sugeridas por el médico.
    - Pasos a seguir o recomendaciones dadas por el médico.

    Conversación:
    ---
    ${conversationHistory}
    ---
  `;

  try {
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID'))) {
        return "La clave de API de Gemini no es válida. Por favor, verifique la configuración del entorno.";
    }
    return "No se pudo generar el resumen. Por favor, inténtelo de nuevo más tarde.";
  }
};