"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _vitest = require("vitest");
const _socketioclient = require("socket.io-client");
const _http = require("http");
const _express = /*#__PURE__*/ _interop_require_default(require("express"));
const _socketio = require("socket.io");
const _redis = require("../config/redis");
const _setupSocket = require("../socket/setupSocket");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
const PORT = 5051;
let io;
let httpServer;
(0, _vitest.describe)("Real-time synchronization in the same room", ()=>{
    let clientA;
    let clientB;
    (0, _vitest.beforeAll)(async ()=>{
        await (0, _redis.initRedis)();
        const app = (0, _express.default)();
        httpServer = (0, _http.createServer)(app);
        io = new _socketio.Server(httpServer, {
            cors: {
                origin: "*"
            }
        });
        await (0, _setupSocket.setupSocket)(io);
        await new Promise((resolve)=>{
            httpServer.listen(PORT, ()=>{
                console.log(`Test server running on port ${PORT}`);
                resolve();
            });
        });
        clientA = (0, _socketioclient.io)(`http://localhost:${PORT}`);
        clientB = (0, _socketioclient.io)(`http://localhost:${PORT}`);
    });
    (0, _vitest.afterAll)(async ()=>{
        clientA.disconnect();
        clientB.disconnect();
        io.close();
        httpServer.close();
        await new Promise((res)=>setTimeout(res, 200));
        await _redis.pubClient.quit();
        await _redis.subClient.quit();
    });
    (0, _vitest.it)("User A sends drawing and User B receives it in the same room", async ()=>{
        const roomId = "shared-room";
        let receivedB = false;
        // Both join the same room
        clientA.emit("joinRoom", roomId);
        clientB.emit("joinRoom", roomId);
        // B listens for drawing event
        clientB.on("drawing", (stroke)=>{
            if (stroke?.x === 10 && stroke?.y === 20) {
                receivedB = true;
            }
        });
        // A sends a drawing
        clientA.emit("drawing", {
            x: 10,
            y: 20
        });
        // Wait for propagation
        await new Promise((res)=>setTimeout(res, 500));
        (0, _vitest.expect)(receivedB).toBe(true);
    });
});

//# sourceMappingURL=socketSameRoom.test.js.map