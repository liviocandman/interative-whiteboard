"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
const _express = /*#__PURE__*/ _interop_require_default(require("express"));
const _http = /*#__PURE__*/ _interop_require_default(require("http"));
const _cors = /*#__PURE__*/ _interop_require_default(require("cors"));
const _dotenv = /*#__PURE__*/ _interop_require_default(require("dotenv"));
const _socketio = require("socket.io");
const _redis = require("./config/redis");
const _setupSocket = require("./socket/setupSocket");
const _rooms = /*#__PURE__*/ _interop_require_default(require("./routes/rooms"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
_dotenv.default.config();
async function startServer() {
    await (0, _redis.initRedis)();
    const app = (0, _express.default)();
    const server = _http.default.createServer(app);
    const io = new _socketio.Server(server, {
        cors: {
            origin: "*",
            methods: [
                "GET",
                "POST"
            ]
        }
    });
    app.use((0, _cors.default)());
    app.use(_express.default.json());
    app.use("/health", _rooms.default);
    await (0, _setupSocket.setupSocket)(io);
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, ()=>{
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });
}
startServer().catch((err)=>{
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
});

//# sourceMappingURL=index.js.map