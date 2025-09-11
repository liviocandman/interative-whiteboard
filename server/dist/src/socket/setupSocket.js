"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "setupSocket", {
    enumerable: true,
    get: function() {
        return setupSocket;
    }
});
const _redis = require("../config/redis");
const _stateService = require("../services/stateService");
const _roomService = require("../services/roomService");
const _strokeService = require("../services/strokeService");
const REDIS_ROOM_PREFIX = "room:";
async function setupSocket(io) {
    // Subscriber global para strokes de outras instâncias
    try {
        await _redis.subClient.pSubscribe(`${REDIS_ROOM_PREFIX}*`, (rawMessage, channel)=>{
            try {
                const roomId = channel.substring(REDIS_ROOM_PREFIX.length);
                if (!roomId) return;
                const { stroke, origin } = JSON.parse(rawMessage);
                io.in(roomId).except(origin ?? []).emit("drawing", stroke);
            } catch (err) {
                console.error("Redis pSubscribe handler error:", err);
            }
        });
        console.log("🔔 Redis pSubscribe registrado em pattern 'room:*'");
    } catch (err) {
        console.error("Falha ao registrar pSubscribe no Redis:", err);
    }
    // Cancela inscrição no Redis ao encerrar processo
    process.once("SIGINT", async ()=>{
        try {
            await _redis.subClient.pUnsubscribe(`${REDIS_ROOM_PREFIX}*`);
            console.log("🔕 Redis pUnsubscribe executado");
            process.exit(0);
        } catch  {
            process.exit(1);
        }
    });
    // Limpa estado, metadados e strokes quando sala fica vazia
    async function cleanupRoomWhenEmpty(roomId, count) {
        if (count !== 0) {
            console.log(`Sala ${roomId} com ${count} usuário(s) — mantida`);
            return;
        }
        console.log(`🧹 Sala ${roomId} vazia — apagando estado e removendo sala`);
        await Promise.all([
            (0, _stateService.deleteCanvasState)(roomId),
            (0, _roomService.deleteRoom)(roomId),
            (0, _strokeService.deleteRoomStrokes)(roomId)
        ]).catch((err)=>console.error("Erro no cleanup:", err));
    }
    io.on("connection", (socket)=>{
        console.log(`🟢 Socket conectado: ${socket.id}`);
        let joinedRoom = null;
        socket.on("joinRoom", async (roomId, ack)=>{
            if (!roomId) {
                ack?.("roomId inválido");
                return;
            }
            // Sai da sala anterior se necessário
            if (joinedRoom && joinedRoom !== roomId) {
                try {
                    const prevCount = await (0, _roomService.removeUserFromRoom)(joinedRoom, socket.id);
                    socket.leave(joinedRoom);
                    await cleanupRoomWhenEmpty(joinedRoom, prevCount);
                } catch (err) {
                    console.error("Erro ao sair de sala anterior:", err);
                } finally{
                    joinedRoom = null;
                }
            }
            // Registra no serviço e entra na sala
            try {
                const newCount = await (0, _roomService.addUserToRoom)(roomId, socket.id);
                socket.join(roomId);
                joinedRoom = roomId;
                console.log(`📌 ${socket.id} entrou na sala ${roomId} (${newCount} usuários)`);
            } catch (err) {
                console.error("Falha addUserToRoom:", err);
                ack?.(err.message || "Erro ao registrar usuário");
                return;
            }
            // Envia estado inicial consolidado
            try {
                const [snapshot, strokes] = await Promise.all([
                    (0, _stateService.getCanvasState)(roomId),
                    (0, _strokeService.getRoomStrokes)(roomId)
                ]);
                socket.emit("initialState", {
                    snapshot: snapshot ?? null,
                    strokes
                });
                ack?.();
            } catch (err) {
                console.error("Falha ao recuperar estado inicial:", err);
                socket.emit("initialState", {
                    snapshot: null,
                    strokes: []
                });
                ack?.(err.message || "Falha ao recuperar estado inicial");
            }
        });
        socket.on("drawing", async (stroke)=>{
            if (!joinedRoom) return;
            try {
                await (0, _strokeService.publishStroke)(joinedRoom, {
                    ...stroke
                }, socket.id);
            } catch (err) {
                console.error("Erro ao publicar stroke:", err);
                socket.emit("error", {
                    event: "drawing",
                    message: err.message
                });
            }
        });
        socket.on("saveState", async (canvasState, ack)=>{
            if (!joinedRoom) {
                ack?.("sem sala");
                return;
            }
            try {
                await (0, _stateService.saveCanvasState)(joinedRoom, canvasState);
                ack?.();
            } catch (err) {
                console.error("Erro saveCanvasState:", err);
                ack?.(err.message || "Falha ao salvar estado");
            }
        });
        socket.on("leaveRoom", async (roomId, ack)=>{
            const target = roomId ?? joinedRoom;
            if (!target) {
                ack?.("não está em sala");
                return;
            }
            try {
                const newCount = await (0, _roomService.removeUserFromRoom)(target, socket.id);
                socket.leave(target);
                if (joinedRoom === target) joinedRoom = null;
                console.log(`🚪 ${socket.id} saiu da sala ${target} (${newCount} usuários)`);
                await cleanupRoomWhenEmpty(target, newCount);
                ack?.();
            } catch (err) {
                console.error("Erro leaveRoom:", err);
                ack?.(err.message || "Falha ao sair da sala");
            }
        });
        socket.on("disconnect", async (reason)=>{
            if (!joinedRoom) {
                console.log(`🔴 ${socket.id} desconectou (sem sala) — razão: ${reason}`);
                return;
            }
            const roomToClean = joinedRoom;
            joinedRoom = null;
            try {
                const newCount = await (0, _roomService.removeUserFromRoom)(roomToClean, socket.id);
                socket.leave(roomToClean);
                console.log(`🔴 ${socket.id} desconectou de ${roomToClean} (${newCount} usuários)`);
                await cleanupRoomWhenEmpty(roomToClean, newCount);
            } catch (err) {
                console.error("Erro no handler disconnect:", err);
            }
        });
    });
}

//# sourceMappingURL=setupSocket.js.map