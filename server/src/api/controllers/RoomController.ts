import { Request, Response } from 'express';
import { RoomService } from '../../services/room/RoomService';
import type { CreateRoomRequest, RoomFilter, JoinRoomRequest } from '../../types';

export class RoomController {
  private roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  }

  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body as CreateRoomRequest;
      
      // Mock creator info (in production, get from auth)
      const createdBy = {
        id: 'user-' + Date.now(),
        name: 'Anonymous User',
      };

      const room = await this.roomService.createRoom(data, createdBy);
      
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create room',
      });
    }
  }

  async getRooms(req: Request, res: Response): Promise<void> {
    try {
      const filter: RoomFilter = {
        search: req.query.search as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        isPublicOnly: req.query.isPublicOnly === 'true',
        sortBy: req.query.sortBy as any,
        sortOrder: req.query.sortOrder as any,
      };

      const rooms = await this.roomService.getAllRooms(filter);
      res.json(rooms);
    } catch (error) {
      console.error('Error getting rooms:', error);
      res.status(500).json({
        error: 'Failed to get rooms',
      });
    }
  }

  async getRoomById(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const room = await this.roomService.getRoomById(roomId);

      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }

      res.json(room);
    } catch (error) {
      console.error('Error getting room:', error);
      res.status(500).json({
        error: 'Failed to get room',
      });
    }
  }

  async checkRoomExists(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const exists = await this.roomService.roomExists(roomId);

      res.json({ exists });
    } catch (error) {
      console.error('Error checking room:', error);
      res.status(500).json({
        error: 'Failed to check room',
      });
    }
  }

  async joinRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { password } = req.body as JoinRoomRequest;

      const room = await this.roomService.joinRoom(roomId, password);
      res.json(room);
    } catch (error) {
      console.error('Error joining room:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to join room',
      });
    }
  }

  async deleteRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      
      // TODO: Check if user is owner before deleting
      await this.roomService.deleteRoom(roomId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({
        error: 'Failed to delete room',
      });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.roomService.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        error: 'Failed to get stats',
      });
    }
  }
}