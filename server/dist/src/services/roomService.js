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
    get getRoomUsers () {
        return getRoomUsers;
    },
    get removeUserFromRoom () {
        return removeUserFromRoom;
    }
});
const _redis = require("../config/redis");
async function createRoom(roomId, ttlSeconds = 3600) {
    const key = `room:${roomId}:users`;
    await _redis.pubClient.sAdd(key, ""); // cria conjunto vazio
    await _redis.pubClient.expire(key, ttlSeconds);
}
async function addUserToRoom(roomId, userId) {
    const key = `room:${roomId}:users`;
    await _redis.pubClient.sAdd(key, userId);
}
async function removeUserFromRoom(roomId, userId) {
    const key = `room:${roomId}:users`;
    await _redis.pubClient.sRem(key, userId);
}
async function deleteRoom(roomId) {
    await _redis.pubClient.del(`room:${roomId}:users`);
    await _redis.pubClient.del(`room:${roomId}:state`);
}
async function getRoomUsers(roomId) {
    return await _redis.pubClient.sMembers(`room:${roomId}:users`);
}

//# sourceMappingURL=roomService.js.map