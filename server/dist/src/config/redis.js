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
    get initRedis () {
        return initRedis;
    },
    get pubClient () {
        return pubClient;
    },
    get subClient () {
        return subClient;
    }
});
const _redis = require("redis");
const pubClient = (0, _redis.createClient)({
    url: process.env.REDIS_URL || "redis://localhost:6379"
});
const subClient = pubClient.duplicate();
pubClient.on("error", (err)=>console.error("Redis Pub Error:", err));
subClient.on("error", (err)=>console.error("Redis Sub Error:", err));
async function initRedis() {
    await pubClient.connect();
    await subClient.connect();
    console.log("✅ Redis conectado");
}

//# sourceMappingURL=redis.js.map