# Client - Interactive Whiteboard

React-based frontend for the collaborative whiteboard application.

## 🛠️ Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.x | UI library with hooks |
| **TypeScript** | 5.x | Type-safe development |
| **Vite** | 7.x | Build tool & dev server |
| **Socket.io Client** | 4.x | Real-time WebSocket communication |
| **Tailwind CSS** | 4.x | Utility-first CSS framework |
| **Vitest** | 3.x | Unit testing framework |
| **ESLint** | 9.x | Code linting |

## 📁 Project Structure

```
src/
├── components/       # UI components
│   ├── rooms/        # Room management components
│   ├── ui/           # Reusable UI elements
│   └── whiteboard/   # Canvas and toolbar components
├── hooks/            # Custom React hooks
│   ├── useWhiteboard.ts   # Main drawing logic
│   └── useHistory.ts      # Undo/redo functionality
├── pages/            # Route pages
├── services/         # Service modules
│   ├── canvasService.ts   # Canvas operations
│   ├── drawingService.ts  # Drawing utilities
│   ├── fillService.ts     # Bucket fill algorithm
│   └── socket.ts          # Socket.io connection
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
    ├── shapeDetection.ts  # Magic pen shape recognition
    ├── shapeGeneration.ts # Perfect shape generation
    └── throttle.ts        # Performance utilities
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | Server WebSocket URL | `http://localhost:4000` |
| `VITE_APP_NAME` | Application name | `Collaborative Whiteboard` |

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run unit tests |
| `npm run type-check` | TypeScript type check |

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Test Files

| File | Coverage |
|------|----------|
| `shapeGeneration.test.ts` | Shape point generation |
| `shapeDetection.test.ts` | Geometry & shape recognition |
| `throttle.test.ts` | Throttle/debounce utilities |

## 🎨 Features

### Drawing Tools
- **Pen** - Freehand drawing with customizable color and width
- **Eraser** - Erase strokes with adjustable size
- **Bucket Fill** - Flood fill algorithm for closed areas
- **Magic Pen** - Auto-detect and perfect shapes

### Magic Pen Algorithm
1. Collect points as user draws
2. Smooth points using moving average
3. Detect shape using convex hull and circularity metrics
4. Generate perfect geometric points
5. Emit synchronized shape to all users

## 📦 Build

```bash
# Production build
npm run build

# Output in dist/ folder
```

Build output is optimized with:
- Code splitting
- Tree shaking
- Asset hashing for caching
