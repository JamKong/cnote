'use strict';
/**
 * How to Use:
 *              var logger = require("./logHelper").helper;
 *              logger.writeInfo("info log info");
 *              logger.writeErr("error info");
 */
var electron = require('electron'),
	dialog = electron.dialog;
var helper = {};
exports.helper = helper;

var log4js = require('log4js');
var fs = require("fs");
var path = require("path");
var utils = require(path.resolve("./modules/core/utils.js"));

// load the config file
var objConfig = JSON.parse(fs.readFileSync(path.resolve(process.cwd(),"./log4js.json"), "utf8"));

// check if the dir exists
if (objConfig.appenders) {
	var baseDir = objConfig["customBaseDir"];
	var defaultAtt = objConfig["customDefaultAtt"];

	for (var i = 0, j = objConfig.appenders.length; i < j; i++) {
		var item = objConfig.appenders[i];
		if (item["type"] == "console")
			continue;

		if (defaultAtt != null) {
			for (var att in defaultAtt) {
				if (item[att] == null)
					item[att] = defaultAtt[att];
			}
		}
		if (baseDir != null) {
			if (item["filename"] == null)
				item["filename"] = baseDir;
			else
				item["filename"] = baseDir + item["filename"];
		}
		var fileName = item["filename"];
		if (fileName == null)
			continue;
		var pattern = item["pattern"];
		if (pattern != null) {
			fileName += pattern;
		}


		// console.log("## process.config.appPath:",process.config.appPath);

		// dialog.showMessageBox({
		// 	title:'process.config.appPath',
		// 	message:path.resolve(process.config.appPath, '../' + fileName)
		// });
		// utils.mkdirsSync(path.resolve(process.config.appPath, '../' + fileName));
		var dir = path.dirname(path.resolve(process.cwd(), './' + fileName));
		// checkAndCreateDir(dir);
		// dialog.showMessageBox({
		// 	title:'dir',
		// 	message:dir
		// });
		utils.mkdirsSync(dir);
		objConfig.customBaseDir = dir;
	}
}

// load config after made the directories
log4js.configure(objConfig);

var logDebug = log4js.getLogger('logDebug');
var logInfo = log4js.getLogger('logInfo');
var logWarn = log4js.getLogger('logWarn');
var logErr = log4js.getLogger('logErr');

helper.writeDebug = function (msg) {
	if (msg == null)
		msg = "";
	logDebug.debug(msg);
};

helper.writeInfo = function (msg) {
	if (msg == null)
		msg = "";
	logInfo.info(msg);
};

helper.writeWarn = function (msg) {
	if (msg == null)
		msg = "";
	logWarn.warn(msg);
};

helper.writeErr = function (msg, exp) {
	if (msg == null)
		msg = "";
	if (exp != null)
		msg += "\r\n" + exp;
	logErr.error(msg);
};

// check and create the dir
function checkAndCreateDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
}


helper.writeConsole = function (msg) {
	if (msg == null)
		msg = "";
	log4js.getLogger('console').debug(msg);
};

/**
 * log in console and file
 * @param msg
 */
helper.logDebug = function () {
	var console = log4js.getLogger('console');
	console.debug.apply(console, arguments);
	logDebug.debug.apply(logDebug, arguments);

};

/**
 * log in console and file
 * @param msg
 */
helper.logError = function () {
	var console = log4js.getLogger('console');
	console.debug.apply(console, arguments);
	logErr.debug.apply(logErr, arguments);
};
