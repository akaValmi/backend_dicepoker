# Backend Poker de Dados

Servidor Node.js + Express + Socket.IO para el juego.

## Requisitos
- Node.js 18+ (recomendado 20+)

## Instalación
```bash
npm install
```

## Desarrollo
```bash
npm run dev
```

## Producción
```bash
npm start
```

## Variables de entorno
- `PORT` (opcional) Puerto del servidor. Por defecto 5000.
- `CORS_ORIGIN` Origen permitido para el frontend (ej.: https://tu-frontend.vercel.app).

## Endpoints HTTP
- `POST /api/roll`
- `POST /api/evaluate`
- `POST /api/next-turn`
- `POST /api/new-game`

> Nota: la app principal usa Socket.IO para tiempo real.

## Eventos Socket.IO
- `create_room` `{ name }`
- `join_room` `{ roomId, name }`
- `set_keep` `{ keep }`
- `roll_dice` `{ rerollDice }`
- `end_turn`
- `new_game`

Respuestas:
- `room_joined`
- `state_update`
- `error_message`

## Despliegue gratuito (Render)
1) Crear un **Web Service**.
2) Root Directory: `backend_poker`.
3) Build: `npm install`.
4) Start: `npm start`.
5) Variables: `CORS_ORIGIN` con el dominio del frontend.

Si el backend está en free tier, puede tardar unos segundos en responder la primera vez.
