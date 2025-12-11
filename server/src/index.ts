import dotenv from 'dotenv';
import { WhiteboardServer } from './server';

dotenv.config();

async function startServer() {
  try {
    const server = new WhiteboardServer();
    await server.initialize();

    const port = parseInt(process.env.PORT || '3001');
    await server.start(port);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only start if this file is run directly
if (require.main === module) {
  startServer();
}

export { WhiteboardServer };