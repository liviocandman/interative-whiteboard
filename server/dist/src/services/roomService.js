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
    get addUserToRoom () {
        return addUserToRoom;
    },
    get createRoom () {
        return createRoom;
    },
    get deleteRoom () {
        return deleteRoom;
    },
    get getRoomUsersCount () {
        return getRoomUsersCount;
    },
    get removeUserFromRoom () {
        return removeUserFromRoom;
    }
});
const _redis = require("../config/redis");
const DEFAULT_TTL_SECONDS = 3600;
function isRedisOpen(client) {
    return !!client && client.isOpen === true;
}
async function createRoom(roomId, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (!roomId) throw new Error("createRoom: roomId inválido");
    if (!isRedisOpen(_redis.pubClient)) return;
    const metaKey = `room:${roomId}:meta`;
    // cria uma chave string com TTL; evita criar set com placeholder
    await _redis.pubClient.set(metaKey, "1", {
        EX: ttlSeconds
    });
}
async function addUserToRoom(roomId, userId) {
    if (!roomId) throw new Error("addUserToRoom: roomId inválido");
    if (!userId) throw new Error("addUserToRoom: userId inválido");
    const usersKey = `room:${roomId}:users`;
    await _redis.pubClient.sAdd(usersKey, userId);
    const count = await _redis.pubClient.sCard(usersKey);
    return typeof count === "number" ? count : Number(count);
}
async function removeUserFromRoom(roomId, userId) {
    if (!roomId) throw new Error("removeUserFromRoom: roomId inválido");
    if (!userId) throw new Error("removeUserFromRoom: userId inválido");
    const usersKey = `room:${roomId}:users`;
    await _redis.pubClient.sRem(usersKey, userId);
    const count = await _redis.pubClient.sCard(usersKey);
    return typeof count === "number" ? count : Number(count);
}
async function deleteRoom(roomId) {
    if (!roomId) throw new Error("deleteRoom: roomId inválido");
    if (!isRedisOpen(_redis.pubClient)) return;
    const keys = [
        `room:${roomId}:users`,
        `room:${roomId}:state`,
        `room:${roomId}:meta`
    ];
    for (const key of keys){
        await _redis.pubClient.del(key);
    }
}
async function getRoomUsersCount(roomId) {
    if (!roomId) throw new Error("getRoomUsersCount: roomId inválido");
    const usersKey = `room:${roomId}:users`;
    const count = await _redis.pubClient.sCard(usersKey);
    return typeof count === "number" ? count : Number(count);
}

//# sourceMappingURL=roomService.js.map