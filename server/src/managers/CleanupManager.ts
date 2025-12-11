import { RoomService } from '../services/RoomService';
import { StateService } from '../services/StateService';
import { StrokeService } from '../services/StrokeService';

interface CleanupJob {
  timeoutId: NodeJS.Timeout;
  roomId: string;
  scheduledAt: number;
  delayMs: number;
}

export class CleanupManager {
  private static instance: CleanupManager;
  private jobs = new Map<string, CleanupJob>();
  private roomService: RoomService;
  private stateService: StateService;
  private strokeService: StrokeService;
  private readonly DEFAULT_DELAY_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.roomService = new RoomService();
    this.stateService = new StateService();
    this.strokeService = new StrokeService();
  }

  static getInstance(): CleanupManager {
    if (!CleanupManager.instance) {
      CleanupManager.instance = new CleanupManager();
    }
    return CleanupManager.instance;
  }

  scheduleCleanup(roomId: string, delayMs: number = this.DEFAULT_DELAY_MS): boolean {
    if (this.jobs.has(roomId)) {
      console.log(`[CleanupManager] Cleanup already scheduled for room ${roomId}`);
      return false;
    }

    const scheduledAt = Date.now();
    const timeoutId = setTimeout(() => {
      this.executeCleanup(roomId);
    }, delayMs);

    const job: CleanupJob = {
      timeoutId,
      roomId,
      scheduledAt,
      delayMs,
    };

    this.jobs.set(roomId, job);

    console.log(
      `[CleanupManager] Scheduled cleanup for room ${roomId} in ${delayMs}ms`
    );

    return true;
  }

  cancelCleanup(roomId: string): boolean {
    const job = this.jobs.get(roomId);
    if (!job) {
      return false;
    }

    clearTimeout(job.timeoutId);
    this.jobs.delete(roomId);

    console.log(`[CleanupManager] Canceled cleanup for room ${roomId}`);
    return true;
  }

  private async executeCleanup(roomId: string): Promise<void> {
    this.jobs.delete(roomId);

    try {
      // Check if room is still empty
      const userCount = (await this.roomService.getStats()).activeUsers;
      if (userCount > 0) {
        console.log(
          `[CleanupManager] Room ${roomId} has ${userCount} users, aborting cleanup`
        );
        return;
      }

      console.log(`[CleanupManager] Executing cleanup for room ${roomId}`);

      // Execute cleanup of all resources
      await Promise.allSettled([
        this.roomService.deleteRoom(roomId),
        this.stateService.deleteCanvasState(roomId),
        this.strokeService.clearStrokes(roomId),
      ]);

      console.log(`[CleanupManager] Successfully cleaned up room ${roomId}`);

    } catch (error) {
      console.error(`[CleanupManager] Error cleaning up room ${roomId}:`, error);
    }
  }

  shutdown(): void {
    console.log(`[CleanupManager] Shutting down, canceling ${this.jobs.size} pending jobs`);

    for (const job of this.jobs.values()) {
      clearTimeout(job.timeoutId);
    }

    this.jobs.clear();
  }

  getPendingJobs(): CleanupJob[] {
    return Array.from(this.jobs.values());
  }

  getJobCount(): number {
    return this.jobs.size;
  }

  hasJob(roomId: string): boolean {
    return this.jobs.has(roomId);
  }
}
