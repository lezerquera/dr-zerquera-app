import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Carga los archivos .env del directorio actual (frontend/)
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [react()],
        build: {
            // Es una buena práctica vaciar el directorio de salida en cada construcción para evitar artefactos antiguos.
            emptyOutDir: true,
        },
        // Expone las variables de entorno con prefijo VITE_ al código del cliente
        define: {
            'import.meta.env.VITE_API_URL': JSON.stringify(env.VITE_API_URL),
            'process.env.API_KEY': JSON.stringify(env.API_KEY) // Mantenemos esto por si Gemini lo necesita
        },
        server: {
            proxy: {
                // Redirige las solicitudes /api a nuestro servidor backend
                '/api': {
                    target: 'http://localhost:3001',
                    changeOrigin: true, // Necesario para hosts virtuales
                    secure: false,      // No verifica certificados SSL
                },
            },
        },
    }
})