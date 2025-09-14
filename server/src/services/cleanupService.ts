import { deleteCanvasState } from "./stateService";
import { deleteRoom, getRoomUsersCount } from "./roomService";
import { clearRoomStrokes } from "./strokeService";

// Valor padrão de delay para limpeza: 5 minutos, ou override em env var
const DEFAULT_CLEANUP_DELAY_MS = 5 * 60 * 1000;

type CleanupJob = {
  timeoutId: NodeJS.Timeout;
  scheduledAtMs: number; 
  delayMs: number;        
};

// Mapa que rastreia jobs agendados por roomId
const scheduledCleanupJobs = new Map<string, CleanupJob>();

// Executa a limpeza imediata de todos os recursos de uma sala vazia.
async function executeRoomCleanup(roomId: string): Promise<void> {
  try {
    const activeUserCount = await getRoomUsersCount(roomId);
    if (activeUserCount > 0) {
      console.log(
        `[cleanupService] Sala "${roomId}" ainda tem ${activeUserCount} usuário(s). Abortando cleanup.`
      );
      return;
    }

    console.log(`[cleanupService] Limpando recursos da sala "${roomId}"...`);

    await Promise.all([
      deleteCanvasState(roomId),
      deleteRoom(roomId),
      clearRoomStrokes(roomId),
    ]);

    console.log(`[cleanupService] Recursos da sala "${roomId}" removidos com sucesso.`);
  } catch (error) {
    console.error(
      `[cleanupService] Erro ao limpar sala "${roomId}":`,
      error
    );
  }
}

// Agenda um job de cleanup para uma sala vazia
export function scheduleCleanupForRoom(
  roomId: string,
  delayMs: number = DEFAULT_CLEANUP_DELAY_MS
): boolean {
  if (scheduledCleanupJobs.has(roomId)) {
    console.log(
      `[cleanupService] Já existe um cleanup agendado para a sala "${roomId}".`
    );
    return false;
  }

  const scheduledAtMs = Date.now();
  const timeoutId = setTimeout(async () => {
    scheduledCleanupJobs.delete(roomId);
    console.log(
      `[cleanupService] Job de cleanup disparado para sala "${roomId}" (agendado em ${new Date(
        scheduledAtMs
      ).toISOString()}).`
    );
    await executeRoomCleanup(roomId);
  }, delayMs);

  scheduledCleanupJobs.set(roomId, { timeoutId, scheduledAtMs, delayMs });
  console.log(
    `[cleanupService] Cleanup agendado para a sala "${roomId}" em ${delayMs}ms (execução prevista para ${new Date(
      scheduledAtMs + delayMs
    ).toISOString()}).`
  );
  return true;
}

// Cancela o job de cleanup agendado para uma sala.
export function cancelScheduledCleanupForRoom(roomId: string): boolean {
  const job = scheduledCleanupJobs.get(roomId);
  if (!job) {
    console.log(
      `[cleanupService] Não há cleanup agendado para a sala "${roomId}".`
    );
    return false;
  }

  clearTimeout(job.timeoutId);
  scheduledCleanupJobs.delete(roomId);
  console.log(
    `[cleanupService] Cleanup cancelado para a sala "${roomId}".`
  );
  return true;
}

export function scheduleOrCancelRoomCleanup(
  roomId: string,
  activeUserCount: number,
  customDelayMs?: number
): void {
  if (activeUserCount === 0) {
    scheduleCleanupForRoom(roomId, customDelayMs);
  } else {
    cancelScheduledCleanupForRoom(roomId);
  }
}
