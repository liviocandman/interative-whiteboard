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
const PORT = 4000;
let io;
let httpServer;
(0, _vitest.describe)("Test multiple users in different rooms", ()=>{
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
        await _redis.pubClient.quit();
        await _redis.subClient.quit();
    });
    (0, _vitest.it)("User A and B join different rooms and do not receive cross events", async ()=>{
        const roomA = "room-1";
        const roomB = "room-2";
        let receivedA = false;
        let receivedB = false;
        clientA.emit("joinRoom", roomA);
        clientB.emit("joinRoom", roomB);
        clientA.on("drawing", ()=>{
            receivedA = true;
        });
        clientB.on("drawing", ()=>{
            receivedB = true;
        });
        // User A sends a drawing event
        clientA.emit("drawing", {
            x: 10,
            y: 20
        });
        // Aguarde um pouco para os eventos propagarem
        await new Promise((res)=>setTimeout(res, 400));
        (0, _vitest.expect)(receivedA).toBe(true); // A should receive its own event
        (0, _vitest.expect)(receivedB).toBe(false); // B should not receive A's event
    });
});

//# sourceMappingURL=socketRooms.test.js.map