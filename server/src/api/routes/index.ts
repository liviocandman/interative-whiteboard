import { Router } from 'express';
import { RoomController } from '../controllers/RoomController';
import { validateCreateRoom, validateJoinRoom } from '../validators/roomValidators';

const router = Router();
const roomController = new RoomController();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'whiteboard-api',
  });
});

// Room routes
router.get('/api/rooms', (req, res) => roomController.getRooms(req, res));
router.get('/api/rooms/stats', (req, res) => roomController.getStats(req, res));
router.get('/api/rooms/:roomId', (req, res) => roomController.getRoomById(req, res));
router.get('/api/rooms/:roomId/exists', (req, res) => roomController.checkRoomExists(req, res));

router.post('/api/rooms', validateCreateRoom, (req, res) => roomController.createRoom(req, res));
router.post('/api/rooms/:roomId/join', validateJoinRoom, (req, res) => roomController.joinRoom(req, res));

router.delete('/api/rooms/:roomId', (req, res) => roomController.deleteRoom(req, res));

export default router;