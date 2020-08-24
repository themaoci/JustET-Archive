"use strict";

function handleRoutes(url, info, sessionID) {
    return item_f.itemServer.handleRoutes(info, sessionID);
}

router.addStaticRoute("/client/game/profile/items/moving", handleRoutes);