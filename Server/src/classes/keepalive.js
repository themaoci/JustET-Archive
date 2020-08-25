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
    let receipes = json.parse(json.read(db.user.cache.hideout_production));
    let btcFarmLevel;
    let btcFarmCGs;
    let isGeneratorOn;

    for (let area in pmcData.Hideout.Areas) 
    {            
        switch(pmcData.Hideout.Areas[area].type)
        {
            case 4:
                isGeneratorOn = pmcData.Hideout.Areas[area].active;
                //update fuel resource
                break;

            case 17:
                //update air filters resource
                break;

            case 20:
                btcFarmLevel = pmcData.Hideout.Areas[area].level;
                for(let slot of pmcData.Hideout.Areas[area].slots )
                {
                    if(slot != null){btcFarmCGs++;}
                }
                //check bitcoin farm
                break;
        }
    }

    // update production time
    for (let prod in pmcData.Hideout.Production) { 

        let needGenerator = false;
        for(let receipe of receipes.data)
        {
            if(receipe._id == pmcData.Hideout.Production[prod].RecipeId && receipe.continuous == true)
            {
                needGenerator = true;
            }
        }

        let time_elapsed = (Math.floor(Date.now() / 1000) - pmcData.Hideout.Production[prod].StartTime) - pmcData.Hideout.Production[prod].Progress;
        if(needGenerator == true && isGeneratorOn == false)
        {
            time_elapsed = time_elapsed*0.2;
        }
        pmcData.Hideout.Production[prod].Progress += time_elapsed; 
    }

}

module.exports.main = main;
