"use strict";

const utility = require('./utility.js');
const profile = require('./profile.js');
const trader = require('./trader.js');

var items = JSON.parse(utility.readJson('data/configs/items.json'));
var stashX = 10; // fix for your stash size
var stashY = 66; // ^ if you edited it ofc
var output = "";
// --------------------------------------------------------------------------------------------------------------------- \\
// recalculate stach taken place
function recheckInventoryFreeSpace(tmpList) {
	let Stash2D = Array(stashY).fill(0).map(x => Array(stashX).fill(0));
	//console.log(tmpList.data[1].Inventory.stash);
	for (let item of tmpList.data[1].Inventory.items) {
		// hideout  // added proper stash ID older was "5c71b934354682353958ea35"
		if (item.parentId == tmpList.data[1].Inventory.stash && item.location != undefined) {
			let tmpItem = getItem(item._tpl)[1];
			let tmpSize = getSize(item._tpl, item._id, tmpList.data[1].Inventory.items);
			
			//			x			L				r
			let iW = tmpSize[0] + tmpSize[2] + tmpSize[3];
			
			//			y			u				d
			let iH = tmpSize[1] + tmpSize[4] + tmpSize[5];
			let fH = (item.location.rotation == "Vertical" ? iW : iH);
			let fW = (item.location.rotation == "Vertical" ? iH : iW);
			
			for (let x = 0; x < fH; x++) {
				Stash2D[item.location.y + x].fill(1, item.location.x, item.location.x + fW);
			}
		}
	}
	return Stash2D;
}
// Translate currency_name to _tpl
function getCurrency(currency) {
	// get currency
	switch (currency) {
		case "EUR":
			return "5696686a4bdc2da3298b456a";

		case "USD":
			return "569668774bdc2da2298b4568";
			
		default:
			return "5449016a4bdc2d6f028b456f"; // RUB is here // set by default
	}
}
// take money and insert items into return to server request
function payMoney(tmpList, moneyObject, body) {
	for (let item of tmpList.data[1].Inventory.items) {
		for (let i = 0; i < moneyObject.length; i++){
			if(typeof item.upd != "undefined")
				if (item._id == moneyObject[i]._id && item.upd.StackObjectsCount > body[i].count) {
					item.upd.StackObjectsCount -= body[i].count;
					output.data.items.change.push({"_id": item._id, "_tpl": item._tpl, "parentId": item.parentId, "slotId": item.slotId, "location": item.location, "upd": {"StackObjectsCount": item.upd.StackObjectsCount}});
				} else if (item._id == moneyObject[i]._id && item.upd.StackObjectsCount == body[i].count) {
					delete tmpList.data[1].Inventory.items[item];
					output.data.items.del.push({ "_id": item._id });
				} else if (item._id == moneyObject[i].id && item.upd.StackObjectsCount < body[i].count)
					return false;
		}
	}
	// this script will not override data if something goes wrong aka return false;
	// if everything goes OK save profile
	profile.setCharacterData(tmpList);
	console.log("Items taken. Status OK.", "white", "green");
	return true;
}
// find required items to take after buying (handles multiple items)
function findMoney(tmpList, barter_itemID) {
	let prepareReturn = [];
		for (let item of tmpList.data[1].Inventory.items)
			for (let i = 0; i < barter_itemID.length; i++)
				if (item._id == barter_itemID[i])
					prepareReturn[i] = item;
	return prepareReturn; // if none return []
}
// receive money back after selling
function getMoney(tmpList, amount, body, output) {
	
	let tmpTraderInfo = trader.get(body.tid);
	let currency = getCurrency(tmpTraderInfo.data.currency);

	for (let item of tmpList.data[1].Inventory.items) {
		if (item._tpl == currency) {
			item.upd.StackObjectsCount += amount;
			profile.setCharacterData(tmpList);
			output.data.items.change.push({"_id": item._id, "_tpl": item._tpl, "parentId": item.parentId, "slotId": item.slotId, "location": item.location, "upd": {"StackObjectsCount": item.upd.StackObjectsCount}});
			console.log("Money received: " + amount + " " + tmpTraderInfo.data.currency, "white", "green");
			return true;
		}
	}

	console.log("No money found", "white", "red");
	return false;
}
//this sets automaticly a stash size from items.json (its not added anywhere yet cause we still use base stash)
function setPlayerStash(){
	let stashTPL = profile.getStashType();
	stashX = (items.data[stashTPL]._props.Grids[0]._props.cellsH != 0) ? items.data[stashTPL]._props.Grids[0]._props.cellsH : 10;
	stashY = (items.data[stashTPL]._props.Grids[0]._props.cellsV != 0) ? items.data[stashTPL]._props.Grids[0]._props.cellsV : 66;
}
// --> Generate ID not repeatable for item
function GenItemID() {
	return Math.floor(new Date() / 1000) + utility.getRandomInt(0, 999999999).toString();
}
// -> Gets item from <input: _tpl>
function getItem(template) {
	for (let itm in items.data) {
		if (items.data[itm]._id && items.data[itm]._id == template) {
			let item = items.data[itm];
			return [true, item];
		}
	}
	return [false, {}];
}
// -> Prepares item Width and height returns array(6)
function getSize(itemtpl, itemID, location) {
	let toDo = [itemID];
	let tmpItem = getItem(itemtpl)[1];

	let outX = 0, outY = 0, outL = 0, outR = 0, outU = 0, outD = 0, tmpL = 0, tmpR = 0, tmpU = 0, tmpD = 0;
	
	outX = tmpItem._props.Width;
	outY = tmpItem._props.Height;
	
	while (true) {
		if (toDo[0] != undefined) {
			for (let tmpKey in location) {
				if (location[tmpKey].parentId && location[tmpKey].parentId == toDo[0]) {
					toDo.push(location[tmpKey]._id);
					tmpItem = getItem(location[tmpKey]._tpl)[1];

					if (typeof tmpItem._props.ExtraSizeLeft != "undefined" && tmpItem._props.ExtraSizeLeft != 0) {
						tmpL += tmpItem._props.ExtraSizeLeft;
					}
					
					if (typeof tmpItem._props.ExtraSizeRight != "undefined" && tmpItem._props.ExtraSizeRight != 0) {
						tmpR += tmpItem._props.ExtraSizeRight;
					}
					
					if (typeof tmpItem._props.ExtraSizeUp != "undefined" && tmpItem._props.ExtraSizeUp != 0) {
						tmpU += tmpItem._props.ExtraSizeUp;
					}
					
					if (typeof tmpItem._props.ExtraSizeDown != "undefined" && tmpItem._props.ExtraSizeDown != 0) {
						tmpD += tmpItem._props.ExtraSizeDown;
					}
				}
			}

			outL += tmpL; outR += tmpR; outU += tmpU; outD += tmpD;
			tmpL = 0; tmpR = 0; tmpU = 0; tmpD = 0;
			toDo.splice(0, 1);

			continue;
		}

		break;
	}
	
	return [outX, outY, outL, outR, outU, outD];
}
// -> Accept quest
function acceptQuest(tmpList, body) {
	tmpList.data[1].Quests.push({"qid": body.qid.toString(), "startTime": 1337, "status": 2}); // statuses seem as follow - 1 - not accepted | 2 - accepted | 3 - failed | 4 - completed
	profile.setCharacterData(tmpList);
	return "OK";
}
// -> 
function completeQuest(tmpList, body) {
	for (let quest of tmpList.data[1].Quests) {
		if (quest.qid == body.qid) {
			quest.status = 4;
		}
	}

	//send reward to the profile : if quest_list.id == bodyqid then quest_list.succes

	profile.setCharacterData(tmpList);
	return "OK";
}
// -> 
function questHandover(tmpList, body) {
	let counter = 0;
	let found = false;

 	for (let itemHandover of body.items) {
		counter += itemHandover.count;
		removeItem(tmpList, {Action: 'Remove', item: itemHandover.id});
	}

 	for (let backendCounter in tmpList.data[1].BackendCounters) {
		if (backendCounter == body.conditionId) {
			tmpList.data[1].BackendCounters[body.conditionId].value += counter;
			found = true;
		}
	}

 	if (!found) {
		tmpList.data[1].BackendCounters[body.conditionId] = {"id" : body.conditionId, "qid" : body.qid, "value" : counter};
	}

 	profile.setCharacterData(tmpList);
	return "OK";
}
// -> 
function addNote(tmpList, body) {
	tmpList.data[1].Notes.Notes.push({"Time": body.note.Time, "Text": body.note.Text});
	profile.setCharacterData(tmpList);
	return "OK";
}
// -> 
function editNode(tmpList, body) {
	tmpList.data[1].Notes.Notes[body.index] = {"Time": body.note.Time, "Text": body.note.Text};
	profile.setCharacterData(tmpList);
	return "OK";
}
// -> 
function deleteNote(tmpList, body) {
	tmpList.data[1].Notes.Notes.splice(body.index, 1);
	profile.setCharacterData(tmpList);
	return "OK";
}
// -> Move item to diffrent place - counts with equiping filling magazine etc
function moveItem(tmpList, body) {
	//cartriges handler start
	if (body.to.container == 'cartridges'){
		let tmp_counter = 0;
		for (let item_ammo in tmpList.data[1].Inventory.items) {
			if(body.to.id == tmpList.data[1].Inventory.items[item_ammo].parentId){
				tmp_counter++;
			}
		}
		body.to.location = tmp_counter;//wrong location for first cartrige
		console.log(body.to.location);
	}
	//cartriges handler end
	
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.parentId = body.to.id;
			item.slotId = body.to.container;
			if (typeof body.to.location != "undefined") {
				item.location = body.to.location;
			} else {
				if (item.location) {
					delete item.location;
				}
			}
			
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// -> Deletes item completly
function removeItem(tmpList, body, ) {
	var toDo = [body.item];

	while (true) {
		if (toDo[0] != undefined) {
			// needed else iterator may decide to jump over stuff
			while (true) {
				let tmpEmpty = "yes";

				for (let tmpKey in tmpList.data[1].Inventory.items) {
					if ((tmpList.data[1].Inventory.items[tmpKey].parentId && tmpList.data[1].Inventory.items[tmpKey].parentId == toDo[0])
					|| (tmpList.data[1].Inventory.items[tmpKey]._id && tmpList.data[1].Inventory.items[tmpKey]._id == toDo[0])) {
					
						output.data.items.del.push({"_id": tmpList.data[1].Inventory.items[tmpKey]._id});
						toDo.push(tmpList.data[1].Inventory.items[tmpKey]._id);
						tmpList.data[1].Inventory.items.splice(tmpKey, 1);
						
						tmpEmpty = "no";
					}
				}

				if (tmpEmpty == "yes") {
					break;
				};
			}

			toDo.splice(0, 1);
			continue;
		}

		break;
	}
	
	profile.setCharacterData(tmpList);
	return "OK";
}
// -> Spliting item / Create new item with splited amount and removing that amount from older one
function splitItem(tmpList, body) {
	let location = body.container.location;
	if(typeof body.container.location == "undefined" && body.container.container === "cartridges"){
		let tmp_counter = 0;
		for (let item_ammo in tmpList.data[1].Inventory.items) {
			if(tmpList.data[1].Inventory.items[item_ammo].parentId == body.container.id)
				tmp_counter++;
		}
		location = tmp_counter;//wrong location for first cartrige
	}
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.StackObjectsCount -= body.count;
			let newItem = GenItemID();
				output.data.items.new.push({"_id": newItem, "_tpl": item._tpl, "parentId": body.container.id, "slotId": body.container.container, "location": location, "upd": {"StackObjectsCount": body.count}});
				tmpList.data[1].Inventory.items.push({"_id": newItem, "_tpl": item._tpl, "parentId": body.container.id, "slotId": body.container.container, "location": location, "upd": {"StackObjectsCount": body.count}});
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// -> Merging to one item / deletes one item and adding its value to second one
function mergeItem(tmpList, body) {
	for (let key in tmpList.data[1].Inventory.items) {
		if (tmpList.data[1].Inventory.items[key]._id && tmpList.data[1].Inventory.items[key]._id == body.with) {
			for (let key2 in tmpList.data[1].Inventory.items) {
				if (tmpList.data[1].Inventory.items[key2]._id && tmpList.data[1].Inventory.items[key2]._id == body.item) {
					tmpList.data[1].Inventory.items[key].upd.StackObjectsCount = (tmpList.data[1].Inventory.items[key].upd.StackObjectsCount ? tmpList.data[1].Inventory.items[key].upd.StackObjectsCount : 1) + (tmpList.data[1].Inventory.items[key2].upd.StackObjectsCount ? tmpList.data[1].Inventory.items[key2].upd.StackObjectsCount : 1);
					output.data.items.del.push({"_id": tmpList.data[1].Inventory.items[key2]._id});
					tmpList.data[1].Inventory.items.splice(key2, 1);

					profile.setCharacterData(tmpList);
					return "OK";
				}
			}
		}
	}

	return "";
}
// -> Fold item / generally weapon
function foldItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Foldable = {"Folded": body.value};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// -> Toggle item / flashlight, laser etc.
function toggleItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Togglable = {"On": body.value};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// -> Tag item / Taggs item with given name and color
function tagItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id && item._id == body.item) {
			item.upd.Tag = {"Color": body.TagColor, "Name": body.TagName};

			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// -> Binds item to quick bar
function bindItem(tmpList, body) {
	for (let index in tmpList.data[1].Inventory.fastPanel) { 
		// if binded items is already in fastPanel 
		if (tmpList.data[1].Inventory.fastPanel[index] == body.item) { 
			// we need to remove index before re-adding somewhere else  
			tmpList.data[1].Inventory.fastPanel[index] = ""; 
		} 
	} 
 
	tmpList.data[1].Inventory.fastPanel[body.index] = body.item; 
	profile.setCharacterData(tmpList); 
	return "OK"; 
}
// -> Eat item and get benefits // maybe for future features
function eatItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
		if (item._id == body.item) {
			let effects = getItem(item._tpl)[1]._props.effects_health;
		}
	}

	let hydration = tmpList.data[1].Health.Hydration;
	let energy = tmpList.data[1].Health.Energy;

 	hydration.Current += effects.hydration.value;
	energy.Current += effects.energy.value;

 	if (hydration.Current > hydration.Maximum) {
		hydration.Current = hydration.Maximum;
	}
	
	if (energy.Current > energy.Maximum) {
		energy.Current = energy.Maximum;
	}

 	profile.setCharacterData(tmpList);
 	removeItem(tmpList, {Action: 'Remove', item: body.item});
 	return "OK";
}
// -> Healing
function healPlayer(tmpList, body) {
	// healing body part
	for (let bdpart in tmpList.data[1].Health.BodyParts) {
		if (bdpart == body.part) {
			tmpList.data[1].Health.BodyParts[bdpart].Health.Current += body.count;
		}
	}

	// update medkit used (hpresource)
	for (let item of tmpList.data[1].Inventory.items) {
		// find the medkit in the inventory
		if (item._id == body.item) {
			if (typeof item.upd.MedKit === "undefined") {
				let maxhp = getItem(item._tpl)[1]._props.MaxHpResource;
				
				item.upd.MedKit = {"HpResource": maxhp - body.count};
			} else {
				item.upd.MedKit.HpResource -= body.count;
			}

			profile.setCharacterData(tmpList);

			// remove medkit if its empty
			if (item.upd.MedKit.HpResource == 0 ) {
				removeItem(tmpList, {Action: 'Remove', item: body.item});
			}
		}
	}
	
	return "OK";
}
// add to Wish list - really dont know what it is ...
function addToWishList(tmpList, body) {
	// check if the item is already in wishlist
	for (let item in tmpList.data[1].Wishlist) {
		console.log(item);

		// don't add the item
		if (tmpList.data[1].WishList[item].tid == body.templateId) {
			return "OK";
		}
	}

	// add the item to the wishlist
	tmpList.data[1].WishList.push({"tid": body.templateId});
	profile.setCharacterData(tmpList);
	return "OK";
}
// remove to Wish list - really dont know what it is ...
function removeFromWishList(tmpList, body) {
	// remove the item if it exists
	for (let item in tmpList.data[1].Wishlist) {
		console.log(item);

		if (tmpList.data[1].WishList[item].tid == body.templateId) {
			tmpList.data[1].WishList.splice(item, 1);
		}
	}

	profile.setCharacterData(tmpList);
	return "OK";
}
// examine item and adds it to examined list
function examineItem(tmpList, body) {
	let returned = "BAD";

	// trader inventory
	if (tmpTrader) {
		for (let item of tmpTrader.data) {
			if (item._id == body.item) {
				console.log("Found trader with examined item: " + item._id);
				returned = item._tpl;
				break;
			}
		}
	}

	// player inventory
	if (returned == "BAD") {
		for (let item of tmpList.data[1].Inventory.items) {
			if (item._id == body.item) {
				console.log("Found equipment examing item: " + item._id);
				returned = item._tpl;
				break;
			}
		}
	}

	// item not found
	if (returned == "BAD") {
		console.log("Cannot find proper item. Stopped.", "white", "red");
		return "BAD";
	}

	// item found
	console.log("EXAMINED: " + returned, "white", "green");
	tmpList.data[1].Encyclopedia[returned] = true;
	profile.setCharacterData(tmpList);

	return "OK";
}
// transfer item // mainly drag drop item from scav inventory to stash and reloading weapon by clicking 'Reload"
function transferItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
			if (item._id == body.item) {
				if(item.upd.StackObjectsCount > body.count)
					item.upd.StackObjectsCount -= body.count;
				else 
					item.splice(item, 1);
			}
			if(item._id == body.with){
				item.upd.StackObjectsCount += body.count;
			}
	}
	profile.setCharacterData(tmpList);
	return "OK";
}
// Swap Item // dont know for what it is ... maybe replace one item with another
function swapItem(tmpList, body) {
	for (let item of tmpList.data[1].Inventory.items) {
			if (item._id == body.item) {
				item.parentId = body.to.id // parentId
				item.slotId = body.to.container // slotId
				item.location = body.to.location // location
			}
			if(item._id == body.item2){
				item.parentId = body.to2.id
				item.slotId = body.to2.container
				delete item.location;
			}
	}
	profile.setCharacterData(tmpList);
	return "OK";
}
// Buying item from trader
function buyItem(tmpList, body) {
	let tmpTrader = trader.getAssort(body.tid);
	// Buy item has only 1 item thats why [0][0]
	console.log(body.scheme_items);
	let money = [];
	let moneyID = [];
	//prepare barter items as money (roubles are counted there as well)
	for(let i = 0; i < body.scheme_items.length; i++){
		money[i] = body.scheme_items[i].count; //tmpTrader.data.barter_scheme[body.item_id][0][0].count 
		moneyID[i] = body.scheme_items[i].id;
	}
	//check if money exists if not throw an exception (this step must be fullfill no matter what - by client side - if not user cheats)
	let moneyObject = findMoney(tmpList, moneyID);
	if(typeof moneyObject[0] == "undefined"){
		console.log("Error something goes wrong (findMoney) - stop cheating");
		return "";
	}
	
	// pay the item	to profile
	if (!payMoney(tmpList, moneyObject, body.scheme_items)) {
		console.log("no money found");
		return "";
	}
		
	// print debug information
	console.log("Bought item: " + body.item_id);
	for (let item of tmpTrader.data.items) {
		if (item._id && item._id == body.item_id) {
			let MaxStacks = 1;
			let StacksValue = [];

			let tmpItem = getItem(item._tpl)[1];

			// split stacks if the size is higher than allowed
			if (body.count > tmpItem._props.StackMaxSize) {
				let count = body.count;
					
				//maxstacks if not divided by then +1
				let calc = body.count - (Math.floor(body.count / tmpItem._props.StackMaxSize) * tmpItem._props.StackMaxSize);
				MaxStacks = (calc > 0)? MaxStacks + Math.floor(count / tmpItem._props.StackMaxSize):Math.floor(count / tmpItem._props.StackMaxSize);

				for (let sv = 0; sv < MaxStacks; sv++){
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

			// for each stack
			for (let stacks = 0; stacks < MaxStacks; stacks++){
				let tmpSizeX = 0;
				let tmpSizeY = 0;
				let badSlot = "no";
				let addedProperly = false;
				let tmpSize = getSize(item._tpl, item._id, tmpTrader.data.item);
				let StashFS_2D = recheckInventoryFreeSpace(tmpList);					
				console.log(tmpSize);
				tmpSizeX = tmpSize[0] + tmpSize[2] + tmpSize[3];
				tmpSizeY = tmpSize[1] + tmpSize[4] + tmpSize[5];
					
				for (let y = 0; y < stashY; y++) {
					for (let x = 0; x < stashX; x++) {
						badSlot = "no";

						for (let itemY = 0; itemY < tmpSizeY; itemY++) {
							for (let itemX = 0; itemX < tmpSizeX; itemX++) {
								if (StashFS_2D[y + itemY][x + itemX] != 0) {
									badSlot = "yes";
									break;
								}
							}

							if (badSlot == "yes") {
								break;
							}
						}
						console.log("Item placed at position [" +x + "," +y + "]");
						//console.log(StashFS_2D);
						if (badSlot == "no") {
							let newItem = GenItemID();
							let toDo = [[item._id, newItem]];

							output.data.items.new.push({"_id": newItem, "_tpl": item._tpl, "parentId": "5c71b934354682353958ea35", "slotId": "hideout", "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
							tmpList.data[1].Inventory.items.push({"_id": newItem, "_tpl": item._tpl, "parentId": "5c71b934354682353958ea35", "slotId": "hideout", "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
							//tmpUserTrader.data[newItem] = [[{"_tpl": item._tpl, "count": prices.data.barter_scheme[item._tpl][0][0].count}]];
							
							while (true) {
								if (toDo[0] != undefined) {
									for (let tmpKey in tmpTrader.data.items) {
										if (tmpTrader.data.items[tmpKey].parentId && tmpTrader.data.items[tmpKey].parentId == toDo[0][0]) {
											newItem = GenItemID();

											let SlotID = tmpTrader.data.items[tmpKey].slotId
                                            
											if (SlotID == "hideout"){
                                                output.data.items.new.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": SlotID, "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
                                                tmpList.data[1].Inventory.items.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": tmpTrader.data.items[tmpKey].slotId, "location": {"x": x, "y": y, "r": 0}, "upd": {"StackObjectsCount": StacksValue[stacks]}});
                                            } else {
                                                output.data.items.new.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": SlotID, "upd": {"StackObjectsCount": StacksValue[stacks]}});
                                                tmpList.data[1].Inventory.items.push({"_id": newItem, "_tpl": tmpTrader.data.items[tmpKey]._tpl, "parentId": toDo[0][1], "slotId": tmpTrader.data.items[tmpKey].slotId, "upd": {"StackObjectsCount": StacksValue[stacks]}});
                                            }

                                            toDo.push([tmpTrader.data.items[tmpKey]._id, newItem]);
										}
									}

									toDo.splice(0, 1);
									continue;
								}

								break;
							}

							addedProperly = true;
							break;
						}
					}
						
					if (addedProperly) {
						break;
					}
				}
			}	
			
			// assumes addedProperly is always true
			//profile.setPurchasesData(tmpUserTrader);
			profile.setCharacterData(tmpList);
			return "OK";
		}
	}

	return "";
}
// Selling item to trader
function sellItem(tmpList, body) {
	let money = 0;

	// print debug information
	console.log("Items:");
	console.log(body.items);
	let prices = JSON.parse(profile.getPurchasesData());
	// find the items
	for (let item of tmpList.data[1].Inventory.items) {
		for (let i in body.items) {
			let checkID = body.items[i].id.replace(' clone', '').replace(' clon', '');

			// item found
			if (item && item._id == checkID) {
				// add money to return to the player
				let price_money = prices.data[item._id][0][0].count;
				if (removeItem(tmpList, {Action: 'Remove', item: checkID}) == "OK") {
					money += price_money * body.items[i].count;
				}
			}
		}
	}

	// get money the item
	if (!getMoney(tmpList, money, body, output)) {
		return "";
	}
				
	//profile.setPurchasesData(tmpUserTrader); 
	return "OK";
}
// separate is that selling or buying
function confirmTrading(tmpList, body)  {

	// buying
	if (body.type == "buy_from_trader")  {
		setPlayerStash();
		return buyItem(tmpList, body);
	}

	// selling
	if (body.type == "sell_to_trader") {				
		return sellItem(tmpList, body);
	}

	return "";
}
// Ragfair trading
function confirmRagfairTrading(tmpList, body) {
	console.log(body);
	body.Action = "TradingConfirm";
	body.type = "buy_from_trader";
	body.tid = "91_everythingTrader";
	body.item_id = body.offerId;
	body.scheme_id = 0;
	body.scheme_items = body.items;

	if (confirmTrading(tmpList, body) == "OK" ) {
		return "OK";
	} else {
		return "error";
	}
}
// --- REQUEST HANDLING BELOW --- //
function getOutput() {
	return output;
}

function resetOutput() {
	output = JSON.parse('{"err":0, "errmsg":null, "data":{"items":{"new":[], "change":[], "del":[]}, "badRequest":[], "quests":[], "ragFairOffers":[]}}');
}

function handleMoving(body) {	
	let tmpList = profile.getCharacterData();

	switch(body.Action) {
		case "QuestAccept":
			return acceptQuest(tmpList, body);

		case "QuestComplete":
			return completeQuest(tmpList, body);

		case "QuestHandover":
			return questHandover(tmpList, body);

		case "AddNote":
			return addNote(tmpList, body);

		case "EditNote":
			return editNode(tmpList, body);

		case "DeleteNote":
			return deleteNote(tmpList, body);

		case "Move":
			return moveItem(tmpList, body);

		case "Remove":
			return removeItem(tmpList, body);

		case "Split":
			return splitItem(tmpList, body);

		case "Merge":
			return mergeItem(tmpList, body);
		
		case "Fold":
			return foldItem(tmpList, body);

		case "Toggle":
			return toggleItem(tmpList, body);
            
		case "Tag":
			return tagItem(tmpList, body);

		case "Bind":
			return bindItem(tmpList, body);

		case "Eat":
			return eatItem(tmpList, body);

		case "Heal":
			return healPlayer(tmpList, body);
		
		case "Examine":
			return examineItem(tmpList, body);

		case "Transfer":
			return transferItem(tmpList, body);

		case "Swap":
			return swapItem(tmpList, body);

		case "AddToWishList":
			return addToWishList(tmpList, body);

		case "RemoveFromWishList":
			return removeFromWishList(tmpList, body);

		case "TradingConfirm":
			return confirmTrading(tmpList, body);

		case "RagFairBuyOffer":
			return confirmRagfairTrading(tmpList, body);

		default:
			console.log("UNHANDLED ACTION:" + body.Action, "white", "red");
            return "";
	}
}

function moving(info) {
	let output = "";
		
	// handle all items
	for (let i = 0; i < info.data.length; i++) {
		output = handleMoving(info.data[i]);
	}

	// return items
	if (output == "OK") {
		return JSON.stringify(getOutput());
	}

	return output;    
}

module.exports.getOutput = getOutput;
module.exports.resetOutput = resetOutput;
module.exports.moving = moving;
module.exports.removeItem = removeItem;