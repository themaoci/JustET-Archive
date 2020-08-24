"use strict";

function getRandomValue(node) {
	let keys = Object.keys(node);
	return json.parse(json.read(node[keys[utility.getRandomInt(0, keys.length - 1)]]));
}

function addDogtag(bot, sessionID) {
	let weaponArray = [
		'A Magical Force',
		'Goose With A Knife',
		'Spartan Laser',
		'Smashed Vodka Bottle',
		'Heart Attack',
		'Arrow To The Knee'
	];
	let randomNumber = Math.floor(Math.random()*weaponArray.length);
	
	let pmcData = profile_f.profileServer.getPmcProfile(sessionID);
	let dogtagItem = {
		_id: utility.generateNewItemId(),
		_tpl: ((bot.Info.Side === 'Usec') ? "59f32c3b86f77472a31742f0" : "59f32bb586f774757e1e8442"),
		parentId: bot.Inventory.equipment,
		slotId: "Dogtag",
		upd: {
			"Dogtag": {
				"Nickname": bot.Info.Nickname,
				"Side": bot.Info.Side,
				"Level": bot.Info.Level,
				"Time": (new Date().toISOString()),
				"Status": "Killed by ",
				"KillerName": pmcData.Info.Nickname,
				"WeaponName": weaponArray[randomNumber]
			}
		}
	}

	bot.Inventory.items.push(dogtagItem);
	return bot;
}

function generateBot(bot, role, sessionID) {
	let type = (role === "cursedAssault") ? "assault" : role;
	let node = {};

	// chance to spawn simulated PMC players
	if ((type === "assault" || type === "marksman" || type === "pmcBot") && settings.gameplay.bots.pmcEnabled) {
		let spawnChance = utility.getRandomInt(0, 99);
		let sideChance = utility.getRandomInt(0, 99);

		if (spawnChance < settings.gameplay.bots.pmcSpawnChance) {
			if (sideChance < settings.gameplay.bots.pmcUsecChance) {
				bot.Info.Side = "Usec";
				type = "usec";
			} else {
				bot.Info.Side = "Bear";
				type = "bear";
			}

			bot.Info.Level = utility.getRandomInt(1, 70);
		}
	}

	// we don't want player scav to be generated as PMC
	if (role === "playerScav") {
		type = "assault";
	}

	// generate bot
	node = db.bots[type.toLowerCase()];

	bot.Info.Settings.Role = role;
	bot.Info.Nickname = getRandomValue(node.names);
	bot.Info.Settings.Experience = getRandomValue(node.experience);
	bot.Info.Voice = getRandomValue(node.appearance.voice);
	bot.Health = getRandomValue(node.health);
	bot.Customization.Head = getRandomValue(node.appearance.head);
	bot.Customization.Body = getRandomValue(node.appearance.body);
	bot.Customization.Feet = getRandomValue(node.appearance.feet);
	bot.Customization.Hands = getRandomValue(node.appearance.hands);
	bot.Inventory = getRandomValue(node.inventory);

	// add dogtag to PMC's		
	if (type === "usec" || type === "bear") {
		bot = addDogtag(bot, sessionID);
	}
	
	return bot;
}

function generate(info, sessionID) {
	let generatedBots = []; 

	for (let condition of info.conditions) {
		for (let i = 0; i < condition.Limit; i++)  {
			let bot = json.parse(json.read(db.bots.base));

			bot._id = "bot" + utility.getRandomIntEx(99999999);
			bot.Info.Settings.BotDifficulty = condition.Difficulty;
			bot = generateBot(bot, condition.Role, sessionID);
			generatedBots.unshift(bot);
		}
	}

	return generatedBots;
}

function generatePlayerScav() {
	let scavData = generate({"conditions":[{"Role":"playerScav","Limit":1,"Difficulty":"normal"}]});

	scavData[0].Info.Settings = {};
	return scavData[0];
}

module.exports.generate = generate;
module.exports.generatePlayerScav = generatePlayerScav;
