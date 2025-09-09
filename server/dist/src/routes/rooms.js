"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
const _express = require("express");
const router = (0, _express.Router)();
router.get("/", (_req, res)=>{
    res.json({
        status: "ok",
        timestamp: new Date().toISOString()
    });
});
const _default = router;

//# sourceMappingURL=rooms.js.map