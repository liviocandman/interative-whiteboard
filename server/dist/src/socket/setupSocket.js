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
const _roomService = require("../services/roomService");
const _stateService = require("../services/stateService");
async function setupSocket(io) {
    await _redis.subClient.pSubscribe("room:*", (message, channel)=>{
        const [, roomId] = channel.split(":");
        io.to(roomId).emit("drawing", JSON.parse(message));
    });
    io.on("connection", (socket)=>{
        console.log("Socket connect:", socket.id);
        let joinedRoom = null;
        socket.on("joinRoom", async (roomId)=>{
            joinedRoom = roomId;
            socket.join(roomId);
            await (0, _roomService.addUserToRoom)(roomId, socket.id);
            const state = await (0, _stateService.getCanvasState)(roomId);
            socket.emit("initialState", state);
        });
        socket.on("drawing", async (stroke)=>{
            if (!joinedRoom) return;
            socket.emit("drawing", stroke);
            await _redis.pubClient.publish(`room:${joinedRoom}`, JSON.stringify(stroke));
        });
        socket.on("saveState", async (canvasState)=>{
            if (!joinedRoom) return;
            await (0, _stateService.saveCanvasState)(joinedRoom, canvasState);
        });
        socket.on("leaveRoom", async ()=>{
            if (!joinedRoom) return;
            await (0, _roomService.removeUserFromRoom)(joinedRoom, socket.id);
            await (0, _stateService.deleteCanvasState)(joinedRoom);
            socket.leave(joinedRoom);
            joinedRoom = null;
        });
        socket.on("disconnecting", async ()=>{
            for (const roomId of socket.rooms){
                if (roomId !== socket.id) {
                    await (0, _roomService.removeUserFromRoom)(roomId, socket.id);
                    await (0, _roomService.deleteRoom)(roomId);
                }
            }
        });
    });
}

//# sourceMappingURL=setupSocket.js.map