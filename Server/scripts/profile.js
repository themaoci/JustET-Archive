"use strict";

require("./libs.js");

function getProfiles() {
    return JSON.parse(utility.readJson("appdata/profiles/profiles.json"));
}

function loadTraderStandings(playerData = "") {
    // get profile Data
	let profileData = playerData;
	if(playerData == "")
		profileData = getCharacterData();
	
    let profileCharData = profileData.data[1];
    // get trader data and update by profile info
    let dynTrader;
    // Check if trader standing data exists
    /*if (profileCharData.hasOwnProperty("TraderStandings")) {
        for (dynTrader of trader.getDynamicTraders()) {
            let profileStanding = profileCharData.TraderStandings[dynTrader];
            let traderLoyality = trader.get(dynTrader).data.loyalty;

            traderLoyality.currentLevel = profileStanding.currentLevel;
            traderLoyality.currentStanding = profileStanding.currentStanding;
            traderLoyality.currentSalesSum = profileStanding.currentSalesSum;

            // set Loyalty in trader
            trader.get(dynTrader).data.loyalty = traderLoyality;
        }
    } else {
        profileCharData.TraderStandings = {};
        // add with default data
        for (dynTrader of trader.getDynamicTraders()) {
            let traderLoyality = trader.get(dynTrader).data.loyalty;
            profileCharData.TraderStandings[dynTrader] =
                {
                    "currentSalesSum": traderLoyality.currentSalesSum,
                    "currentLevel": traderLoyality.currentLevel,
                    "currentStanding": traderLoyality.currentStanding
                };
        }
        // save profile
        profileData.data[1] = profileCharData;
        setCharacterData(profileData);
    }*/
	if(playerData != "")
		return profileData;
}

function saveProfileProgress(offRaidData) {
    let profile_data = JSON.parse(utility.readJson(offRaidData.game + "\\SavedProfile.json"));
    let offRaidProfile = profile_data;
    let currentProfile = getCharacterData();
    //replace data below
    currentProfile.data[1].Info.Experience = offRaidProfile.Info.Experience;
    currentProfile.data[1].Info.Level = offRaidProfile.Info.Level;
    //currentProfile.data[1].Health = offRaidProfile.Health;
    currentProfile.data[1].Skills = offRaidProfile.Skills;
    currentProfile.data[1].Stats.SessionCounters = offRaidProfile.Stats.SessionCounters;
    currentProfile.data[1].Stats.OverallCounters = offRaidProfile.Stats.OverallCounters;
    currentProfile.data[1].Stats.LastSessionDate = offRaidProfile.Stats.LastSessionDate;
    currentProfile.data[1].Encyclopedia = offRaidProfile.Encyclopedia;
    currentProfile.data[1].ConditionCounters = offRaidProfile.ConditionCounters;
    currentProfile.data[1].Quests = offRaidProfile.Quests;
    //currentProfile.data[1].TraderStandings = offRaidProfile.TraderStandings;


    //work with a string instead of looping through data, less code, less ressources, faster
    var string_inventory = JSON.stringify(offRaidProfile.Inventory.items);

    //replace all these GClasses shit
    let replaceConfig = JSON.parse(utility.readJson("database/configs/offlineProgressionReplacer.json"));
    var keys = Object.keys(replaceConfig);
    for (let iterate = 0; iterate < keys.length; iterate++) {
        string_inventory = string_inventory.replace(new RegExp(keys[iterate], 'g'), replaceConfig[keys[iterate]]);
    }
    /* version 3333 - offlineProgressionReplacer.json
    {
        "GClass798": "Sight",
        "GClass795": "Repairable",
        "GClass780": "Foldable",
        "GClass779": "FireMode",
        "GClass791": "MedKit",
        "GClass781": "FoodDrink",
        "GClass778": "FaceShield",
        "GClass800": "Togglable",
        "GClass786": "Keycard",
        "GClass799": "Tag",
        "GClass788": "Light",
        "GClass000": "Dogtag" ??? unknownGCLASS for 3333 version
    }
    */

    //and then re-parse the string into an object preparing to replace ID fix
    offRaidProfile.Inventory.items = JSON.parse(string_inventory);

    // replace bsg shit long ID with proper one
    for (let recalID in offRaidProfile.Inventory.items) {
        if (offRaidProfile.Inventory.items.hasOwnProperty(recalID)) {
            //do not replace important ID's
            if (
                offRaidProfile.Inventory.items[recalID]._id !== offRaidProfile.Inventory.equipment &&
                offRaidProfile.Inventory.items[recalID]._id !== offRaidProfile.Inventory.questRaidItems &&
                offRaidProfile.Inventory.items[recalID]._id !== offRaidProfile.Inventory.questStashItems
            ) {
                let old_id = offRaidProfile.Inventory.items[recalID]._id;
                let new_id = utility.generateNewItemId();
                string_inventory = string_inventory.replace(new RegExp(old_id, 'g'), new_id);
            }
        }
    }
    offRaidProfile.Inventory.items = JSON.parse(string_inventory);

    //remove previous equippement & other, KEEP ONLY THE STASH
    move_f.removeItem(currentProfile, {Action: 'Remove', item: currentProfile.data[1].Inventory.equipment});
    move_f.removeItem(currentProfile, {Action: 'Remove', item: currentProfile.data[1].Inventory.questRaidItems});
    move_f.removeItem(currentProfile, {Action: 'Remove', item: currentProfile.data[1].Inventory.questStashItems});


    //and then fill with offline raid equipement
    for (let inventoryitem in offRaidProfile.Inventory.items) {
        if (offRaidProfile.Inventory.items.hasOwnProperty(inventoryitem)) {
            currentProfile.data[1].Inventory.items.push(offRaidProfile.Inventory.items[inventoryitem]);
        }
    }

    let pocketid = "";
    let items_to_delete = [];

    //but if the player get killed, he loose almost everything
    if (offRaidData.status !== "Survived" && offRaidData.status !== "Runner") {
        let inventoryitem;
        for (inventoryitem in currentProfile.data[1].Inventory.items) {
            if (currentProfile.data[1].Inventory.items[inventoryitem].parentId === currentProfile.data[1].Inventory.equipment
                && currentProfile.data[1].Inventory.items[inventoryitem].slotId !== "SecuredContainer"
                && currentProfile.data[1].Inventory.items[inventoryitem].slotId !== "Scabbard"
                && currentProfile.data[1].Inventory.items[inventoryitem].slotId !== "Pockets") {
                //store it and delete later because i dont know its not working otherwiswe
                items_to_delete.push(currentProfile.data[1].Inventory.items[inventoryitem]._id);
            }

            //we need pocket id for later, its working differently
            if (currentProfile.data[1].Inventory.items[inventoryitem].slotId === "Pockets") {
                pocketid = currentProfile.data[1].Inventory.items[inventoryitem]._id;
            }
        }

        //and then delete inside pockets
        for (inventoryitem in currentProfile.data[1].Inventory.items) {
            if (currentProfile.data[1].Inventory.items[inventoryitem].parentId === pocketid) {
                //store it and delete later because i dont know its not working otherwiswe
                items_to_delete.push(currentProfile.data[1].Inventory.items[inventoryitem]._id);
            }
        }

        //finally delete them
        for (var item_to_delete in items_to_delete) {
            move_f.removeItem(currentProfile, {Action: 'Remove', item: items_to_delete[item_to_delete]});
        }
    }
    utility.writeJson(offRaidData.game + "\\SavedProfile.json", "{}");
    setCharacterData(currentProfile);
}

function getCharacterData() {
    // create full profile data from simplified character data
    let playerData = JSON.parse(
        utility.readJson("appdata/profiles/character_" + constants.getActiveID() + ".json")
    );
    let scavData = bots.generatePlayerScav();
    scavData._id = playerData.savage;
    scavData.aid = constants.getActiveID();
    let ret = {err: 0, errmsg: null, data: []};
    ret.data.push(playerData);
    ret.data.push(scavData);
 	//ret = loadTraderStandings(ret);
   return ret;
}

function getStashType() {
    let temp = JSON.parse(
        utility.readJson("appdata/profiles/character_" + constants.getActiveID() + ".json")
    );
    for (let key in temp.Inventory.items) {
        if (temp.Inventory.items.hasOwnProperty(key)) {
            if (temp.Inventory.items[key]._id === temp.Inventory.stash)
                return temp.Inventory.items[key]._tpl;
        }
    }
    console.log("Not found Stash: error check character.json", "red");
    return "NotFound Error";
}

function setCharacterData(data) {
    if (typeof data.data !== "undefined") {
        data = data.data[0];
    }
    utility.writeJson("appdata/profiles/character_" + constants.getActiveID() + ".json", data);
}

function addChildPrice(data, parentID, childPrice) {
    for (let invItems in data) {
        if (data.hasOwnProperty(invItems)) {
            if (data[invItems]._id === parentID) {
                if (data[invItems].hasOwnProperty("childPrice")) {
                    data[invItems].childPrice += childPrice;
                } else {
                    data[invItems].childPrice = childPrice;
                    break;
                }
            }
        }
    }
    return data;
}

function getPurchasesData() {
    //themaoci fix for offline raid selling ;) selling for 0.9 times of regular price for now
    //load files
    let multiplier = 0.9;
    let data = JSON.parse( utility.readJson("appdata/profiles/character_" + constants.getActiveID() + ".json") );
    items = items_f.prepareItems();
    //prepared vars
    let equipment = data.Inventory.equipment;
    let stash = data.Inventory.stash;
    let questRaidItems = data.Inventory.questRaidItems;
    let questStashItems = data.Inventory.questStashItems;

    data = data.Inventory.items; // make data as .items array

    //do not add this items to the list of soldable
    let notSoldableItems = [
        "544901bf4bdc2ddf018b456d", //wad of rubles
        "5449016a4bdc2d6f028b456f", // rubles
        "569668774bdc2da2298b4568", // euros
        "5696686a4bdc2da3298b456a" // dolars
    ];

    for (let invItems in data) {
        if (data.hasOwnProperty(invItems)) {
            if (
                data[invItems]._id !== equipment &&
                data[invItems]._id !== stash &&
                data[invItems]._id !== questRaidItems &&
                data[invItems]._id !== questStashItems &&
                notSoldableItems.indexOf(data[invItems]._tpl) === -1
            ) {
                if (data[invItems].hasOwnProperty("parentId")) {
                    if (
                        data[invItems].parentId !== equipment &&
                        data[invItems].parentId !== stash &&
                        data[invItems].parentId !== questRaidItems &&
                        data[invItems].parentId !== questStashItems
                    ) {
                        let templateId = data[invItems]._tpl;
                        let itemCount =
                            typeof data[invItems].upd !== "undefined"
                                ? typeof data[invItems].upd.StackObjectsCount !== "undefined"
                                ? data[invItems].upd.StackObjectsCount
                                : 1
                                : 1;
                        let basePrice =
                            items.data[templateId]._props.CreditsPrice >= 1
                                ? items.data[templateId]._props.CreditsPrice
                                : 1;
                        data = addChildPrice(
                            data,
                            data[invItems].parentId,
                            itemCount * basePrice
                        ); // multiplyer is used at parent item
                    }
                }
            }
        }
    }

    let purchaseOutput = '{"err": 0,"errmsg":null,"data":{'; //start output string here
    let i = 0;
    for (let invItems in data) {
        if (data.hasOwnProperty(invItems)) {
            if (
                data[invItems]._id !== equipment &&
                data[invItems]._id !== stash &&
                data[invItems]._id !== questRaidItems &&
                data[invItems]._id !== questStashItems &&
                notSoldableItems.indexOf(data[invItems]._tpl) === -1
            ) {
                if (i !== 0) {
                    purchaseOutput += ",";
                } else {
                    i++;
                }
                let itemCount =
                    typeof data[invItems].upd !== "undefined"
                        ? typeof data[invItems].upd.StackObjectsCount !== "undefined"
                        ? data[invItems].upd.StackObjectsCount
                        : 1
                        : 1;
                let templateId = data[invItems]._tpl;
                let basePrice =
                    items.data[templateId]._props.CreditsPrice >= 1
                        ? items.data[templateId]._props.CreditsPrice
                        : 1;
                if (data[invItems].hasOwnProperty("childPrice")) {
                    basePrice += data[invItems].childPrice;
                }
                let preparePrice = basePrice * multiplier * itemCount;
                preparePrice = preparePrice > 0 && preparePrice !== "NaN" ? preparePrice : 1;
                purchaseOutput +=
                    '"' +
                    data[invItems]._id +
                    '":[[{"_tpl": "' +
                    data[invItems]._tpl +
                    '","count": ' +
                    preparePrice.toFixed(0) +
                    "}]]";
            }
        }
    }
    purchaseOutput += "}}"; // end output string here
    return purchaseOutput;
}

function findID(ID) {
    let profiles = getProfiles();
    for (let profile of profiles) {
        if (profile.id === ID) {
            return true;
        }
    }
    return false;
}

function exist(info) {
    let profiles = getProfiles();
    for (let profile of profiles) {
        if (info.email === profile.email) {
            if (
                info.pass === profile.password ||
                info.pass === profile.password_md5
            ) {
                return profile.id;
            } else {
                return -3;
            }
        }
    }

    return -1;
}

function nicknameExist(info) {
    let profiles = getProfiles();

    for (let i = 0; i < profiles.length; i++) {
        let profile = JSON.parse(
            utility.readJson("appdata/profiles/character_" + i + ".json")
        );
        if (profile.Info.Nickname === info.nickname) {
            return true;
        }
    }

    return false;
}

function changeNickname(info) {
    let tmpList = getCharacterData();
    // check if the nickname exists
    if (nicknameExist(info)) {
        return '{"err":225, "errmsg":"this nickname is already in use", "data":null}';
    }

    // change nickname
    tmpList.data[0].Info.Nickname = info.nickname;
    tmpList.data[0].Info.LowerNickname = info.nickname.toLowerCase();

    setCharacterData(tmpList);
    return (
        '{"err":0, "errmsg":null, "data":{"status":0, "nicknamechangedate":' +
        Math.floor(new Date() / 1000) +
        "}}"
    );
}

function changeVoice(info) {
    let tmpList = getCharacterData();

    tmpList.data[0].Info.Voice = info.voice;

    setCharacterData(tmpList);
}

function find(info, backendUrl) {
    let ID = exist(info);

    // profile doesn't exist
    if (ID === -1) {
        return '{"err":206, "errmsg":"account not found", "data":null}';
    }
    if (ID === -3) {
        return '{"err":206, "errmsg":"wrong password", "data":null}';
    }
    constants.setActiveID(ID);
    return (
        '{"err":0, "errmsg":null, "data":{"token":"token_' +
        ID +
        '", "aid":' +
        ID +
        ', "lang":"en", "languages":{"en": "English","ru": "Русский","de": "Deutsch"}, "ndaFree":true, "queued":false, "taxonomy":341, "activeProfileId":"5c71b934354682353958e984", "backend":{"Trading":"' +
        backendUrl +
        '", "Messaging":"' +
        backendUrl +
        '", "Main":"' +
        backendUrl +
        '", "RagFair":"' +
        backendUrl +
        '"}, "utc_time":1337, "totalInGame":0, "twitchEventMember":false}}'
    );
}


function addItemToStash(tmpList, body, trad = "")// Buying item from trader
{ 
    let PlayerStash = itm_hf.getPlayerStash();
    let stashY = PlayerStash[1];
    let stashX = PlayerStash[0];
    item.resetOutput();
    let output = item.getOutput();

    let tmpTrader = JSON.parse(utility.readJson("database/configs/assort/91_everythingTrader.json"));

    for (let item of tmpTrader.data.items) {
        if (item._id === body.item_id) {
            let MaxStacks = 1;
            let StacksValue = [];
            let tmpItem = itm_hf.getItem(item._tpl)[1];

            // split stacks if the size is higher than allowed by StackMaxSize
            if (body.count > tmpItem._props.StackMaxSize) {
                let count = body.count;
                //maxstacks if not divided by then +1
                let calc = body.count - (Math.floor(body.count / tmpItem._props.StackMaxSize) * tmpItem._props.StackMaxSize);
                MaxStacks = (calc > 0) ? MaxStacks + Math.floor(count / tmpItem._props.StackMaxSize) : Math.floor(count / tmpItem._props.StackMaxSize);
                for (let sv = 0; sv < MaxStacks; sv++) {
                    if (count > 0) {
                        if (count > tmpItem._props.StackMaxSize) {
                            count = count - tmpItem._props.StackMaxSize;
                            StacksValue[sv] = tmpItem._props.StackMaxSize;
                        } else {
                            StacksValue[sv] = count;
                        }
                    }
                }
            } else {
                StacksValue[0] = body.count;
            }
            // stacks prepared

            for (let stacks = 0; stacks < MaxStacks; stacks++) {
                tmpList = profile.getCharacterData();//update profile on each stack so stash recalculate will have new items
                let StashFS_2D = itm_hf.recheckInventoryFreeSpace(tmpList);
                let ItemSize = itm_hf.getSize(item._tpl, item._id, tmpTrader.data.items);
                let tmpSizeX = ItemSize[0];
                let tmpSizeY = ItemSize[1];
                //let badSlot = "no";
                addedProperly:
                    for (let y = 0; y <= stashY - tmpSizeY; y++) {
                        for (let x = 0; x <= stashX - tmpSizeX; x++) {
                            let badSlot = "no";
                            break_BadSlot:
                                for (let itemY = 0; itemY < tmpSizeY; itemY++) {
                                    for (let itemX = 0; itemX < tmpSizeX; itemX++) {
                                        if (StashFS_2D[y + itemY][x + itemX] !== 0) {
                                            badSlot = "yes";
                                            break break_BadSlot;
                                        }
                                    }
                                }
                            if (badSlot === "yes") {
                                continue;
                            }

                            console.log("Item placed at position [" + x + "," + y + "]", "", "", true);
                            let newItem = utility.generateNewItemId();
                            let toDo = [[item._id, newItem]];

                            output.data.items.new.push({
                                "_id": newItem,
                                "_tpl": item._tpl,
                                "parentId": tmpList.data[0].Inventory.stash,
                                "slotId": "hideout",
                                "location": {"x": x, "y": y, "r": 0},
                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                            });

                            tmpList.data[0].Inventory.items.push({
                                "_id": newItem,
                                "_tpl": item._tpl,
                                "parentId": tmpList.data[0].Inventory.stash,
                                "slotId": "hideout",
                                "location": {"x": x, "y": y, "r": 0},
                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                            });
                            //tmpUserTrader.data[newItem] = [[{"_tpl": item._tpl, "count": prices.data.barter_scheme[item._tpl][0][0].count}]];

                            while (true) {
                                if (typeof toDo[0] === "undefined") {
                                    break;
                                }

                                for (let tmpKey in tmpTrader.data.items) {
                                    if (tmpTrader.data.items[tmpKey].parentId && tmpTrader.data.items[tmpKey].parentId === toDo[0][0]) {
                                        newItem = utility.generateNewItemId();
                                        let SlotID = tmpTrader.data.items[tmpKey].slotId;
                                        if (SlotID === "hideout") {
                                            output.data.items.new.push({
                                                "_id": newItem,
                                                "_tpl": tmpTrader.data.items[tmpKey]._tpl,
                                                "parentId": toDo[0][1],
                                                "slotId": SlotID,
                                                "location": {"x": x, "y": y, "r": "Horizontal"},
                                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                                            });
                                            tmpList.data[0].Inventory.items.push({
                                                "_id": newItem,
                                                "_tpl": tmpTrader.data.items[tmpKey]._tpl,
                                                "parentId": toDo[0][1],
                                                "slotId": tmpTrader.data.items[tmpKey].slotId,
                                                "location": {"x": x, "y": y, "r": "Horizontal"},
                                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                                            });
                                        } else {
                                            output.data.items.new.push({
                                                "_id": newItem,
                                                "_tpl": tmpTrader.data.items[tmpKey]._tpl,
                                                "parentId": toDo[0][1],
                                                "slotId": SlotID,
                                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                                            });
                                            tmpList.data[0].Inventory.items.push({
                                                "_id": newItem,
                                                "_tpl": tmpTrader.data.items[tmpKey]._tpl,
                                                "parentId": toDo[0][1],
                                                "slotId": tmpTrader.data.items[tmpKey].slotId,
                                                "upd": {"StackObjectsCount": StacksValue[stacks]}
                                            });
                                        }
                                        toDo.push([tmpTrader.data.items[tmpKey]._id, newItem]);
                                    }
                                }
                                toDo.splice(0, 1);
                            }
                            break addedProperly;
                        }
                    }
                profile.setCharacterData(tmpList); // save after each added item
            }
            return output;
        }
    }

    return "";
}

module.exports.getCharacterData = getCharacterData;
module.exports.setCharacterData = setCharacterData;
module.exports.getPurchasesData = getPurchasesData;
module.exports.getStashType = getStashType;
module.exports.changeNickname = changeNickname;
module.exports.changeVoice = changeVoice;
module.exports.find = find;
module.exports.saveProfileProgress = saveProfileProgress;
module.exports.addItemToStash = addItemToStash;