"use strict";

function main(sessionID) {
    if (!account_f.accountServer.isWiped(sessionID)) {
        updateTraders(sessionID);
        updatePlayerHideout(sessionID);
    }
}

function updateTraders(sessionID) {
    // update each hour
    let update_per = 3600;
    let timeNow = Math.floor(Date.now() / 1000);
    let tradersToUpdateList = trader_f.traderServer.getAllTraders(sessionID);

    tradersToUpdateList = tradersToUpdateList.data;
    
    for (let i = 0; i < tradersToUpdateList.length; i++) {
        if ((tradersToUpdateList[i].supply_next_time + update_per) > timeNow) {
            continue;
        }

        // update restock timer
        let substracted_time = timeNow - tradersToUpdateList[i].supply_next_time;
        let days_passed = Math.floor((substracted_time) / 86400);
        let time_co_compensate = days_passed * 86400;
        let newTraderTime = tradersToUpdateList[i].supply_next_time + time_co_compensate;
        let compensateUpdate_per = Math.floor((timeNow - newTraderTime) / update_per);

        compensateUpdate_per = compensateUpdate_per * update_per;
        newTraderTime = newTraderTime + compensateUpdate_per + update_per;
        tradersToUpdateList[i].supply_next_time = newTraderTime;
    }
}

function updatePlayerHideout(sessionID) {
    let pmcData = profile_f.profileServer.getPmcProfile(sessionID);

    // update production time
    for (let prod in pmcData.Hideout.Production) { 
        /* bitcoin farm : manage multiples bitcoins but fuck this shit
         * loop to find btc farm (hideout area 20)
         * then check what level of upgrade the player btc farm is
         * if lvl = 1 : do nothing
         * if level = 2 or 3 then see how many bitcoins are already farmed, 
         * then check time elapsed, and count how many bitcoins were farmed
         * if farm is full, cut the production "inProgress" = false
         */

        /*
            this need more checks too
            if production need fuel, or generator turned on, check both of these

            if fuel = 0 then generator = disabled 
            if production needs gennerator activated true, then check if generator activated == true

        */
        let time_elapsed = Math.floor(Date.now() / 1000) - pmcData.Hideout.Production[prod].StartTime;
        pmcData.Hideout.Production[prod].Progress = time_elapsed; 
    }

    for (let area in pmcData.Hideout.Areas) {            
        // update resource of first slot
        if (pmcData.Hideout.Areas[area].slots.length > 0) {
            // hmmm ...? 
        }
    }
}

module.exports.main = main;
