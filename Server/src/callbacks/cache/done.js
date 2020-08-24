"use strict";

function done() {
    settings.server.rebuildCache = false;
    json.write("user/server.config.json", settings);
}

server.addStartCallback("doneCaching", done);