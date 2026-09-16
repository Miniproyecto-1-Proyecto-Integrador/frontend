
Base minima del frontend en React + Vite. Su unico objetivo en esta
etapa es demostrar la conexion Frontend a Backend contra
`GET /api/health/`, mostrando "conectado efectivo" cuando el backend
responde correctamente.

## Consulte guia de instalacion de juan pa poder iniciar todo.
ahi dejo detallado que dependencias se necesitan para el correcto funcionamiento, tambien se da una guia
para levantarlo.

## Estructura general de archivod
```
src/
├── services/
│   └── api.js      #unica puerta de salida hacia el backend     
├── App.jsx         #pantalla de estado (loading / ok / error)
├── main.jsx
└── index.css
```

Cuando existan endpoints reales de eventos, se agregarán nuevas
funciones a `services/api.js` sin tocar el resto de la arquitectura!!!

