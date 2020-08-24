"use strict";

const fs = require("fs");
const json = require("./json.js");

const inputDir = "input/locations/";
const outputDir = "output/locations/";

function getDirList(path) {
  return fs.readdirSync(path).filter(function(file) {
    return fs.statSync(path + "/" + file).isDirectory();
  });
}

function getMapName(mapName) {
  if (mapName.includes("bigmap")) {
    return "bigmap";
  } else if (mapName.includes("develop")) {
    return "develop";
  } else if (mapName.includes("factory4_day")) {
    return "factory4_day";
  } else if (mapName.includes("factory4_night")) {
    return "factory4_night";
  } else if (mapName.includes("interchange")) {
    return "interchange";
  } else if (mapName.includes("laboratory")) {
    return "laboratory";
  } else if (mapName.includes("rezervbase")) {
    return "rezervbase";
  } else if (mapName.includes("shoreline")) {
    return "shoreline";
  } else if (mapName.includes("woods")) {
    return "woods";
  } else {
    // ERROR
    return "";
  }
}

function getMapLoot() {
  let inputFiles = fs.readdirSync(inputDir);
  let i = 0;

  for (let file of inputFiles) {
    let filePath = inputDir + file;
    let fileName = file.replace(".json", "");
    let fileData = json.parse(json.read(filePath));
    let mapName = getMapName(fileName.toLowerCase());

    console.log("Splitting: " + filePath);
    let node = ("Location" in fileData) ? fileData.Location.Loot : fileData.Loot;

    for (let item in node) {
      let savePath = outputDir + mapName + "/loot/" + i++ + ".json";
      console.log("Loot." + fileName + ": " + item);
      json.write(savePath, node[item]);
    }
  }
}

function stripMapLootDuplicates() {
  for (let mapName of getDirList(outputDir)) {
    if (mapName === "hideout") {
      continue;
    }

    let dirName = outputDir + mapName + "/loot/";
    let inputFiles = fs.readdirSync(dirName);
    let mapLoot = {};
    let questLoot = {};
    let staticLoot = {};

    console.log("Checking " + mapName);

    // get all items
    for (let file of inputFiles) {
      let filePath = dirName + file;
      let fileName = file.replace(".json", "");
      let fileData = json.parse(json.read(filePath));

      mapLoot[fileName] = json.stringify(fileData.Items);

      // check quest items separately
      if (fileData.Id.includes("quest_")) {
        questLoot[fileName] = json.stringify(fileData.Position);
      }

      // check empty containers separately
      if (fileData.IsStatic && fileData.Items.length === 1) {
        staticLoot[fileName] = fileData.Id;
      }
    }

    // check for items to remove
    for (let loot in mapLoot) {
      for (let file in mapLoot) {
        // don't check the same file
        if (loot === file) {
          continue;
        }

        // loot already exists
        if (mapLoot[loot] === mapLoot[file]
        || (loot in questLoot && file in questLoot && questLoot[loot] === questLoot[file])
        || (loot in staticLoot && file in staticLoot && staticLoot[loot] === staticLoot[file])) {
          let target = dirName + file + ".json";

          console.log(mapName + ".duplicate: " + loot + ", " + file);
          fs.unlinkSync(target);
          delete mapLoot[file];

          if (file in questLoot) {
            delete questLoot[file];
          }

          if (file in staticLoot) {
            delete staticLoot[file];
          }
        }
      }
    }
  }
}

function renameMapLoot() {
  for (let mapName of getDirList(outputDir)) {
    if (mapName === "hideout") {
      continue;
    }

    let dirName = "db/maps/" + mapName + "/loot/";
    let inputFiles = fs.readdirSync(dirName);

    console.log("Renaming " + mapName);

    for (let file in inputFiles) {
      let filePath = dirName + inputFiles[file];
      let fileData = json.parse(json.read(filePath));
      let target = "";

      // set target directory
      if (fileData.IsStatic) {
        target = dirName + "static/" + fileData.Id + "/" + "loot_" + file + ".json";
      } else if (fileData.Id.includes("quest_")) {
        target = dirName + "forced/" + fileData.Id + "/" + "loot_" + file + ".json";
      } else {
        target = dirName + "dynamic/" + fileData.Id + "/" + "loot_" + file + ".json";
      }

      // create missing dir
      let checkPath = target.substr(0, target.lastIndexOf('/'));

      if (!fs.existsSync(checkPath)) {
          fs.mkdirSync(checkPath, { recursive: true });
      }

      // move files
      fs.renameSync(dirName + inputFiles[file], target);
    }
  }
}

function getMapLootCount() {
  let inputFiles = fs.readdirSync(inputDir);

  for (let file of inputFiles) {
    let filePath = inputDir + file;
    let fileName = file.replace(".json", "");
    let fileData = json.parse(json.read(filePath));
    let mapName = getMapName(fileName.toLowerCase());
    let count = typeof fileData["Location"] === "undefined" ? fileData.Loot.length : fileData.Location.Loot.length;
    
    console.log(mapName + ".count: " + count);
  }
}

function map() {
  getMapLoot();
  stripMapLootDuplicates();
  renameMapLoot();
  getMapLootCount();
}

map();
