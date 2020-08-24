"use strict";

function initialize() {
    global.items = json.parse(json.read(db.user.cache.items));
    global.globals = json.parse(json.read(db.globals));
    global.templates = json.parse(json.read(db.user.cache.templates));
    global.tplLookup = itm_hf.createLookup();
}

module.exports.initialize = initialize;