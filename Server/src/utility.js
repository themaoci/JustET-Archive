"use strict";

var fs = require('fs');

function readJson(file) {
	return (fs.readFileSync(file, 'utf8')).replace(/[\r\n\t]/g, '');
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, "\t"), 'utf8');
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);

	return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomIntEx(max) {
	return Math.floor(Math.random() * Math.floor(max));
}

module.exports.readJson = readJson;
module.exports.writeJson = writeJson;
module.exports.getRandomInt = getRandomInt;
module.exports.getRandomIntEx = getRandomIntEx;
