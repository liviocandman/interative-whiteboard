"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get deleteCanvasState () {
        return deleteCanvasState;
    },
    get getCanvasState () {
        return getCanvasState;
    },
    get saveCanvasState () {
        return saveCanvasState;
    }
});
const _redis = require("../config/redis");
async function saveCanvasState(roomId, state, ttlSeconds = 3600) {
    await _redis.pubClient.set(`room:${roomId}:state`, JSON.stringify(state), {
        EX: ttlSeconds
    });
}
async function getCanvasState(roomId) {
    const serialized = await _redis.pubClient.get(`room:${roomId}:state`);
    return serialized ? JSON.parse(serialized) : null;
}
async function deleteCanvasState(roomId) {
    await _redis.pubClient.del(`room:${roomId}:state`);
}

//# sourceMappingURL=stateService.js.map