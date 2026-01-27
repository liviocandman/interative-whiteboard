<div align="center">

# ✨ Scribo.io

**A real-time collaborative whiteboard for teams, educators, and creators**


[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Demo](https://your-app.netlify.app) 

</div>

---

## 🎯 About

Scribo is a modern, real-time collaborative drawing application that enables teams to brainstorm, sketch, and create together from anywhere in the world.

### ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🎨 **Drawing Tools** | Pen, eraser, bucket fill with customizable colors and stroke widths |
| ✨ **Magic Pen** | Draw rough shapes → auto-detects and converts to perfect circles, rectangles, triangles |
| 👥 **Real-time Collaboration** | Multiple users can draw simultaneously with instant synchronization |
| 🔄 **Undo/Redo** | Full history support with keyboard shortcuts (Ctrl+Z / Ctrl+Y) |
| 🏠 **Room Management** | Create public/private rooms with password protection |
| 📱 **Responsive Design** | Works seamlessly on desktop and tablet devices |
| ⚡ **Low Latency** | Optimized WebSocket communication for smooth drawing experience |

---

## 🖼️ Preview

<div align="center">

| Drawing Tools | Magic Pen | Collaboration |
|:-------------:|:---------:|:-------------:|
| Pen, Eraser, Fill | Shape Detection | Real-time Sync |

</div>

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm 9+
- Redis (or Upstash account)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/interactive-whiteboard.git
cd interactive-whiteboard

# Install dependencies
npm run install:all

# Configure environment
cp client/.env.example client/.env
cp server/.env.example server/.env

# Start development servers
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
interactive-whiteboard/
├── client/          # React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API & Canvas services
│   │   └── utils/        # Utility functions
│   └── README.md
├── server/          # Express + Socket.io backend
│   ├── src/
│   │   ├── services/     # Business logic
│   │   ├── handlers/     # Socket event handlers
│   │   └── config/       # Configuration
│   └── README.md
└── DEPLOYMENT.md    # Deployment guide
```

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Socket.io Client** - Real-time communication
- **Tailwind CSS** - Utility-first styling

### Backend
- **Express 5** - Web framework
- **Socket.io** - WebSocket server
- **Redis (Upstash)** - State persistence
- **TypeScript** - Type-safe development
- **SWC** - Fast compilation

---

## 🌐 Deployment

The application is designed for easy deployment:

| Service | Component | Purpose |
|---------|-----------|---------|
| **Netlify** | Client | Static site hosting |
| **Render** | Server | Node.js WebSocket server |
| **Upstash** | Redis | Serverless data store |

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run client tests
cd client && npm test

# Run server tests
cd server && npm test
```

**Test Coverage:** 100 unit tests across client and server.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ for collaborative creativity

</div>
