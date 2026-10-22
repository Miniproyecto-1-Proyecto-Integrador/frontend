# Frontend – Organizador de Eventos Independientes

Aplicación web (SPA) para planificar, ejecutar y reprogramar el trabajo logístico de eventos. Proyecto Integrador I – Universidad del Valle.

- **Frontend (producción):** https://frontend-equipo-fisica.vercel.app
- **Backend (producción):** https://backend-wy15.onrender.com/api/

## Stack

React 18 · Vite 5 · React Router 7 · Tailwind CSS 4

## Requisitos

- Node.js 20 o superior (probado con Node 22) y npm
- Backend Django/DRF en ejecución (local o el de producción en Render)

## Configuración

1. Clona el repositorio e instala las dependencias:

```bash
   git clone https://github.com/Miniproyecto-1-Proyecto-Integrador/frontend.git
   cd frontend
   npm install
```

2. Crea el archivo de variables de entorno a partir del ejemplo:

```bash
   cp .env.example .env
```

3. Ajusta `VITE_API_URL` en `.env` (sin `/` al final):

   | Entorno | Valor de `VITE_API_URL` |
   | --- | --- |
   | Backend local | `http://127.0.0.1:8000/api` |
   | Backend en producción | `https://backend-wy15.onrender.com/api` |

   Si la variable no está definida, la app usa `http://127.0.0.1:8000/api` por defecto. La URL se lee solo en `src/services/api.js`; nunca se escribe directamente en los componentes.

> El archivo `.env` está en `.gitignore`. No lo subas al repositorio.

## Ejecución en local

```bash
npm run dev
```

Se abre en http://localhost:5173.
