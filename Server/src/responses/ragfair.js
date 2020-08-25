"use strict";

function searchRagfair(url, info, sessionID) {
    return json.stringify({"err": 0, "errmsg": null, "data": ragfair_f.getOffers(info)});
}

router.addStaticRoute("/client/ragfair/search", searchRagfair);
router.addStaticRoute("/client/ragfair/find", searchRagfair);