"use strict";

const fs = require('fs');

function route() {
    if (!settings.server.rebuildCache) {
        return;
    }
    
    db.user.profiles = {
        "list": "user/profiles.config.json",
        "character": "user/profiles/__REPLACEME__/character.json",
        "dialogue": "user/profiles/__REPLACEME__/dialogue.json",
        "storage": "user/profiles/__REPLACEME__/storage.json",
        "userbuilds": "user/profiles/__REPLACEME__/userbuilds.json"
    },
    
    db.user.cache = {
        "items": "user/cache/items.json",
        "quests": "user/cache/quests.json",
        "locations": "user/cache/locations.json",
        "languages": "user/cache/languages.json",
        "customization": "user/cache/customization.json",
        "hideout_areas": "user/cache/hideout_areas.json",
        "hideout_production": "user/cache/hideout_production.json",
        "hideout_scavcase": "user/cache/hideout_scavcase.json",
        "weather": "user/cache/weather.json",
        "templates": "user/cache/templates.json",
        "mods": "user/cache/mods.json"
    };

    for (let trader of utility.getDirList("db/assort/")) {
        db.user.cache["assort_" + trader] = "user/cache/assort_" + trader + ".json";

        if (fs.existsSync("db/assort/" + trader + "/customization/")) {
            db.user.cache["customization_" + trader] = "user/cache/customization_" + trader + ".json";
        }
    }

    for (let locale of utility.getDirList("db/locales/")) {
        db.user.cache["locale_" + locale] = "user/cache/locale_" + locale + ".json";
    }

    json.write("user/cache/db.json", db);
}

server.addStartCallback("routeMissing", route);