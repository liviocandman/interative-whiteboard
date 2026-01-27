# Server - Interactive Whiteboard

Node.js backend providing real-time WebSocket communication and state management.

## 🛠️ Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Express** | 5.x | Web framework |
| **Socket.io** | 4.x | WebSocket server |
| **TypeScript** | 5.x | Type-safe development |
| **Redis (Upstash)** | - | State persistence & caching |
| **SWC** | 1.x | Fast TypeScript compilation |
| **Vitest** | 3.x | Unit testing framework |
| **bcrypt** | 5.x | Password hashing |

## 📁 Project Structure

```
src/
├── config/           # Configuration modules
│   ├── app.config.ts      # Express app setup
│   ├── redis.config.ts    # Redis client
│   └── socket.config.ts   # Socket.io config
├── handlers/         # Socket event handlers
│   └── socketHandlers.ts  # Drawing, room events
├── routes/           # REST API routes
│   └── roomRoutes.ts      # Room CRUD endpoints
├── services/         # Business logic
│   ├── DrawingService.ts  # Stroke management
│   ├── RoomService.ts     # Room management
│   └── UserService.ts     # User sessions
├── types/            # TypeScript definitions
├── utils/            # Utilities
│   ├── validation.ts      # Input validation
│   └── logger.ts          # Logging utility
└── index.ts          # Application entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Redis instance (local or Upstash)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Configure your Redis URL in .env
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 4000) |
| `REDIS_URL` | Redis connection URL | Yes |
| `CORS_ORIGINS` | Allowed origins | Yes |
| `NODE_ENV` | Environment | No (default: development) |

### Development

```bash
# Start development server with hot reload
npm run dev

# Server runs on http://localhost:4000
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (tsx) |
| `npm run build` | Compile TypeScript (SWC) |
| `npm run start` | Run production build |
| `npm run type-check` | TypeScript validation |
| `npm test` | Run unit tests |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Files

| File | Coverage |
|------|----------|
| `validation.test.ts` | Input validation, RateLimiter |

## 🔌 Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `joinRoom` | `roomId: string` | Join a whiteboard room |
| `leaveRoom` | - | Leave current room |
| `drawing` | `Stroke` | Send drawing stroke |
| `resetBoard` | - | Clear the canvas |
| `undoStroke` | - | Undo last stroke |
| `redoStroke` | - | Redo undone stroke |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `initialState` | `CanvasState` | Canvas state on join |
| `drawing` | `Stroke` | Broadcast stroke to room |
| `clearBoard` | - | Broadcast canvas clear |
| `userJoined` | `UserInfo` | User joined notification |
| `userLeft` | `UserInfo` | User left notification |

## 🗄️ Redis Data Structure

| Key Pattern | Type | Description |
|-------------|------|-------------|
| `room:{id}` | Hash | Room metadata |
| `room:{id}:strokes` | List | Drawing strokes |
| `room:{id}:users` | Set | Active users |

## 🔒 Security

- **Rate Limiting** - Per-user request throttling
- **Input Validation** - All inputs sanitized
- **CORS** - Configurable origin whitelist
- **Password Hashing** - bcrypt for room passwords

## 📦 Build

```bash
# Compile to dist/
npm run build

# Run production
npm run start
```

## 🏥 Health Check

```bash
curl http://localhost:4000/health
# Response: { "status": "ok", "timestamp": "..." }
```
