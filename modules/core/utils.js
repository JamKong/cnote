'use strict';
var fs = require('fs'),
	config = require('config'),
	path = require('path'),
	_ = require('lodash')
;
var PATH_SEP = "/";

var remoteRepo = config.remoteRepo||"";//TODO 以后改成数据库存储，而不是用配置文件
var username = remoteRepo.substring(remoteRepo.indexOf(":") + 1, remoteRepo.indexOf("/")).toLocaleLowerCase();
var repoName = remoteRepo.substring(remoteRepo.indexOf("/") + 1, remoteRepo.indexOf(".git")).toLocaleLowerCase();
console.log("username:", username);
console.log("repoName:", repoName);

// 各种相对路径
// var userPath = '/' + username;         //用户目录
// var localRepoPath = path.resolve(userPath, "./" + repoName);    //该用户的仓库目录
var articlesPath = "/articles";   //该用户的当前仓库下的文章目录
var imagsPath = '/imags';         //图片目录地址
var dbsPath = '/dbs';             //数据库目录地址
// var gitFilePath = path.resolve(localRepoPath, './.git');        //该用户的仓库目录下的.git文件地址

//创建多层文件夹 同步
function mkdirsSync(dirpath, mode) {
	console.log('dirpath:', dirpath);
	if (!fs.existsSync(dirpath)) {
		var pathtmp;
		var isRootPath = false;
		if (dirpath.indexOf(path.sep) == 0) {
			isRootPath = true;
		}
		dirpath.split(path.sep).forEach(function (dirname) {
			if (pathtmp) {
				pathtmp = path.join(pathtmp, dirname);
			} else {
				pathtmp = isRootPath ? path.sep + dirname : dirname;
			}
			if (pathtmp.length > 0) {
				if (!fs.existsSync(pathtmp)) {
					if (!fs.mkdirSync(pathtmp, mode)) {
						return false;
					}
				}
			}

		});
	}
	return true;
}

module.exports.mkdirsSync = mkdirsSync;
module.exports.remoteRepo = remoteRepo;
module.exports.username = username;
module.exports.repoName = repoName;
// module.exports.userPath = userPath;
// module.exports.localRepoPath = localRepoPath;
module.exports.articlesPath = articlesPath;
module.exports.imagsPath = imagsPath;
module.exports.dbsPath = dbsPath;
// module.exports.gitFilePath = gitFilePath;