


import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Carga los archivos .env del directorio actual (frontend/)
    const env = loadEnv(mode, '.', '');
    const isDevelopment = mode === 'development';
    
    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                devOptions: {
                  // Se vuelve a habilitar el Service Worker en desarrollo para que aparezca el banner de instalación.
                  enabled: true
                },
                workbox: {
                  // Fuerza al nuevo Service Worker a activarse inmediatamente.
                  clientsClaim: true,
                  skipWaiting: true,
                  
                  // En producción, pre-cacheamos los assets. En desarrollo, lo evitamos
                  // para no interferir con el HMR de Vite.
                  globPatterns: isDevelopment ? [] : ['**/*.{js,css,ico,png,svg,webp,webmanifest}'],
                  
                  // Esencial para SPAs: dirige todas las navegaciones al index.html para que React Router funcione.
                  // Esto solo es necesario para producción con el service worker.
                  navigateFallback: isDevelopment ? undefined : '/index.html',
                  
                  // LÓGICA DE CACHÉ EN TIEMPO DE EJECUCIÓN
                  runtimeCaching: isDevelopment
                    // MODO DESARROLLO:
                    // El Service Worker actúa como un proxy de solo red. Intercepta las peticiones
                    // pero siempre las busca en la red (servidor de Vite). Esto evita la pantalla blanca
                    // por caché obsoleto, pero mantiene el SW activo para que la app sea instalable.
                    ? [
                        {
                          urlPattern: ({ url }) => url.origin === self.location.origin,
                          handler: 'NetworkOnly'
                        }
                      ]
                    // MODO PRODUCCIÓN:
                    // Estrategia robusta para la App Shell. Intenta la red primero,
                    // y si falla (offline), sirve la página desde el caché.
                    : [
                        {
                          urlPattern: ({ request }) => request.mode === 'navigate',
                          handler: 'NetworkFirst',
                          options: {
                            cacheName: 'pages-cache',
                            networkTimeoutSeconds: 5,
                          },
                        },
                      ],

                  cleanupOutdatedCaches: true,
                },
                // Asegura que los assets importantes, incluido el manifiesto, estén disponibles.
                includeAssets: ['favicon.svg', 'assets/*.*', 'manifest.webmanifest'],
                manifest: {
                    name: 'Dr. Zerquera - Gestión Médica',
                    short_name: 'Dr. Zerquera',
                    description: 'Aplicación para la gestión de la clínica del Dr. Zerquera, permitiendo a pacientes reservar citas y comunicarse con el médico.',
                    theme_color: '#083C70',
                    background_color: '#FFFFFF',
                    display: 'standalone',
                    scope: '/',
                    start_url: '/',
                    icons: [
                        {
                            src: '/assets/zimi-logo.png',
                            sizes: '500x500',
                            type: 'image/png',
                            purpose: 'any maskable'
                        }
                    ],
                    screenshots: [
                        {
                          "src": "/assets/screenshot-desktop.webp",
                          "sizes": "1920x1080",
                          "type": "image/webp",
                          "form_factor": "wide",
                          "label": "Vista de escritorio de la aplicación de gestión"
                        },
                        {
                          "src": "/assets/screenshot-mobile.webp",
                          "sizes": "1080x1920",
                          "type": "image/webp",
                          "form_factor": "narrow",
                          "label": "Vista móvil para solicitar citas y chatear"
                        }
                    ]
                }
            })
        ],
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