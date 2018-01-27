/**
 * Created by JamKong on 2017-04-30.
 */
'use strict';
var localRespDao = require('./modules/localRespDao'),
	filedirsDao = require("./modules/filedirsDao"),
	fs = require('fs'),
	config = require('config'),
	path = require('path'),
	Filedir = require('./modules/core/Filedir'),
	Cson = require('cson'),
	uuid = require('uuid'),
	_ = require('lodash'),
	utils = require('./modules/core/utils'),
	logger = require(path.resolve('./config/lib/logHelper.js')).helper,
	async = require('async')


;

var PATH_SEP = "/";
var gitApi = require('./modules/git-api');
var rootPath = config.get("rootPath");
var articlesPath = utils.articlesPath; //文章目录的相对路径


angular.module("cnoteApp").service("cnoteAppService", ["$q", function ($q) {
	return {
		createFile: createFile,
		createDirectory: createDirectory,
		filedirList: filedirList,
		renameDir: renameDir,
		deleteDir: deleteDir,
		findFileById: findFileById,
		updateFileToDB: updateFileToDB,
		updateFileToDBAndDisk: updateFileToDBAndDisk,
		foreverDeleteFileSync: foreverDeleteFileSync,
		findFilesByDir: findFilesByDir,
		sync: sync,
		recoverDeleteFile: recoverDeleteFile,
		findHistorys: findHistorys,
		diffByCommitId: diffByCommitId,
		showFileContentByCommitId: showFileContentByCommitId,
		reset: reset
	};


	function createFile(parent) {
		var deferred = $q.defer();
		if (!!parent) {
			parent.parents.push(parent._id.toString());
		}
		var file = {
			name: uuid.v1().replace(/-/g, "") + '.cson',
			type: "file",
			parent: !!parent ? parent._id.toString() : null,
			parents: !!parent ? parent.parents : [],//所有的父级ID
			title: "无标题",
			content: ""
		};
		var date = new Date();

		// console.log("## articlesPath:", articlesPath);
		var dirPath = articlesPath + PATH_SEP + date.getFullYear() + PATH_SEP + (date.getMonth() + 1) + PATH_SEP + date.getDate() + PATH_SEP;
		file.path = dirPath + file.name;
		// console.log("dirPath:" + path.resolve(rootPath, "." + dirPath));
		if (!utils.mkdirsSync(path.resolve(rootPath, '.' + dirPath))) {
			deferred.reject(new Error("创建目录出错！"));
		} else {
			var article = _.pick(file, ['title', 'content']);
			//console.log("article:%o", article);
			var result = Cson.stringify(article, {});
			if (result instanceof Error) {
				logger.logError(result.stack);
				deferred.reject(result);
			} else {
				logger.logDebug("result:{}", result);
				try {
					//console.log("path.resolve(rootPath, \".\"+file.path):", path.resolve(rootPath, "." + file.path));
					fs.writeFileSync(path.resolve(rootPath, '.' + file.path), result, {encoding: 'utf8'});
					file = _.omit(file, ['content']);
					// console.log("omit file:%o", file);
					filedirsDao.create(file, function (err, newfile) {
						if (err) {
							deferred.reject(err);
						} else {
							gitApi.sync();
							deferred.resolve(newfile);
						}
					});
				} catch (err) {
					deferred.reject(err);
				}
			}
		}
		return deferred.promise;
	}


	function filedirList(query) {
		var deferred = $q.defer();
		filedirsDao.find(!!query ? query : {}, function (err, filedirs) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(filedirs);
			}
		});
		return deferred.promise;
	}


	function createDirectory(dirname, parent) {
		var deferred = $q.defer();
		var date = new Date();
		console.log("parent:%o", parent);
		if (!!parent) {
			parent.parents.push(parent._id.toString());
		}
		var dir = {
			name: dirname,
			type: "dir",
			parent: !!parent ? parent._id.toString() : null,
			parents: !!parent ? parent.parents : [],
			createDate: date,
			updateDate: date
		};
		console.log("## dir ## :%o", dir);
		filedirsDao.create(dir, function (err, newDir) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(newDir);
			}
		});
		return deferred.promise;
	}

	/**
	 * 目录重命名
	 * @param oldFiledir
	 * @param newPath
	 * @returns {promise|*|jQuery.promise|Promise}
	 */
	function renameDir(oldFiledir, newName) {
		var deferred = $q.defer();
		filedirsDao.update({_id: oldFiledir._id}, {name: newName}, {}, function (err) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(null);
			}
		});
		return deferred.promise;
	}

	function deleteDir(oldFiledir) {
		var deferred = $q.defer();
		filedirsDao.update({"$or": [{_id: oldFiledir._id}, {parent: oldFiledir._id}]}, {del_flag: true}, {multi: true}, function (err, updateNum) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(updateNum);
			}
		});
		return deferred.promise;
	}


	function findFileById(fileId) {
		var deferred = $q.defer();
		var query = {_id: fileId};
		filedirsDao.find(query, function (err, files) {
			if (err) {
				deferred.reject(err);
			} else {
				if (!files || files.length <= 0) {
					deferred.reject(new Error("该文章不存在！"))
				} else {
					var file = files[0];
					var result = Cson.parseCSONFile(path.resolve(rootPath, "." + file.path));
					if (result instanceof Error) {
						deferred.reject(result);
					} else {
						file.title = result.title;
						file.content = result.content;
						deferred.resolve(file);
					}
				}
			}
		});
		return deferred.promise;
	}

	function updateFileToDB(file) {
		var deferred = $q.defer();
		if (!fs.existsSync(path.resolve(rootPath, "." + file.path))) {
			deferred.reject(new Error("该文件不存在，路径是否正确？"));
		} else {
			saveFileToDB(file, function (err, newFile) {
				if (err) {
					deferred.reject(err);
				} else {
					deferred.resolve(newFile);
				}
			});
		}
		return deferred.promise;
	}

	/**
	 * 更新文件到数据库跟本地文件
	 * @param file  要更新的文件
	 * @param syncDelay 同步的延迟时间，默认值得看gitApi的定义，值为0时，立即执行
	 * @returns {Promise}
	 */
	function updateFileToDBAndDisk(file, syncDelay) {
		var deferred = $q.defer();
		if (!fs.existsSync(path.resolve(rootPath, "." + file.path))) {
			deferred.reject(new Error("该文件不存在，路径是否正确？"));
		} else {
			saveFileToDB(file, function (err, result) {
				if (err) {
					deferred.reject(err);
				} else {
					var err = saveFileToDiskSync(file.title, file.content, path.resolve(rootPath, "." + file.path));
					if (!!err) {
						deferred.reject(err);
					} else {
						gitApi.sync(syncDelay, function (err) {
							// if(err){
							// 	deferred.reject(err);
							// }else{
							// 	deferred.resolve(result);
							// }
						});//开始同步
						deferred.resolve(null);
					}
				}
			});
		}
		return deferred.promise;
	}

	//恢复废纸篓的文章
	function recoverDeleteFile(file) {
		var deferred = $q.defer();
		var updateIds = _.union([file._id.toString()], file.parents);
		logger.logDebug("updateIds:{}", updateIds);
		filedirsDao.update({_id: {"$in": updateIds}}, {"del_flag": false}, {multi: true}, function (err, results) {
			if (err) {
				deferred.reject(err);
			} else {
				logger.logDebug("recoverDeleteFile 更新记录：" + results);
				deferred.resolve(null);
			}
		});

		return deferred.promise;

	}

	//永久删除（同步操作）
	function foreverDeleteFileSync(file) {
		var deferred = $q.defer();
		if (!fs.existsSync(path.resolve(rootPath, "." + file.path))) {
			deferred.reject(new Error("该文件不存在，路径是否正确？"));
		} else {
			filedirsDao.foreverDeleteFile(file._id.toString(), function (err) {
				if (err) {
					return deferred.reject(err);
				} else {
					try {
						var result = fs.unlinkSync(path.resolve(rootPath, "." + file.path));
						if (result) {
							return deferred.reject(err);
						} else {
							return deferred.resolve();
						}
					} catch (err) {
						return deferred.reject(err);
					}
				}
			});
		}
		return deferred.promise;
	}

	/**
	 * 保存文件到硬盘
	 * 成功：返回null
	 * 失败：返回error
	 */
	function saveFileToDiskSync(title, content, path) {
		var article = {title: title, content: content};
		console.log("article:%o", article);
		var result = Cson.stringify(article, {});
		if (result instanceof Error) {
			console.log(result.stack);
			return result;
		} else {
			console.log("result:%o", result);
			try {
				fs.writeFileSync(path, result, {encoding: 'utf8'});
				return null;
			} catch (err) {
				return err;
			}
		}
	}


	function saveFileToDB(file, cb) {
		filedirsDao.updateOne(file, function (err, newfile) {
			if (err) {
				return cb(err, null);
			} else {
				return cb(null, newfile);
			}
		});
	}

	function findFilesByDir(dir) {
		var deferred = $q.defer();
		var filter = {type: 'file', del_flag: false};
		if (!!dir) {
			filter.parent = dir._id;
		}
		filedirsDao.find(filter, function (err, files) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(files);
			}
		});
		return deferred.promise;
	}

	//同步git
	function sync(_delay) {
		var deferred = $q.defer();
		var delay = !_delay || _delay <= 0 ? 0 : _delay;
		gitApi.sync(delay, function (err) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(null);
			}
		});

		return deferred.promise;
	}


	/**
	 * 查询文件的提交历史记录
	 * @param filePath 文件相对地址
	 */
	function findHistorys(filePath) {
		var deferred = $q.defer();
		gitApi.commitLogs(filePath, function (err, historys) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(historys);
			}
		});
		return deferred.promise;
	}

	/**
	 * 比较 根据 commitId
	 * @param filePath 文件相对地址
	 */
	function diffByCommitId(commitId1, commitId2) {
		var deferred = $q.defer();
		gitApi.diffByCommitId(commitId1, commitId2, function (err, diffTxt) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(diffTxt);
			}
		});
		return deferred.promise;
	}


	/**
	 * ******* shell 脚本返回的 content.trim().split("\n") 得到的数据， 如下格式
	 *
	 * 1.比较两个commit记录的差别
	 * 2.执行的脚本名：/Users/jamkong/workspace/webstorm/cnote/shell/show_commit_file.sh
	 * 3.参数1 - 根目录绝对地址： /Users/jamkong/Documents/cnote/jamkong/test
	 * 4.参数2 - commit_id： 2400fdccd5fcd9ba233cf62802c087abcabe736c
	 * 5.参数3 - filename： articles/2017/10/26/e9664570ba6011e7a379239f4def9448.cson
	 * 6.当前目录： /Users/jamkong/Documents/cnote/jamkong/test
	 * 7.title: "git diff"
	 * 8.content: "<p>a</p><p>2</p><p>c</p><p>d4</p><p>e</p><p>f</p><p>7</p>"
	 *
	 * *******
	 *
	 * @param commitId
	 * @param filename
	 * @returns {Promise}
	 */
	function showFileContentByCommitId(commitId, filename) {
		var deferred = $q.defer();
		gitApi.showFileContentByCommitId(commitId, filename, function (err, content) {
			if (err) {
				deferred.reject(err);
			} else {
				content = content.trim().split("\n");
				var jsonObj = {
					commitId: commitId,
					title: !!content[6] ? content[6].substring(content[6].indexOf('"') + 1, content[6].length - 1) : "",
					content: !!content[7] ? content[7].substring(content[7].indexOf('"') + 1, content[7].length - 1) : ""
				};
				deferred.resolve(jsonObj);
			}
		});
		return deferred.promise;
	}

	//恢复文件到某个版本
	function reset(file, historyFile) {
		var deferred = $q.defer();
		file.title = historyFile.title;
		file.content = historyFile.content;
		updateFileToDBAndDisk(file, 0).then(function (newFile) {
			deferred.resolve(newFile);
		}).catch(function (err) {
			deferred.reject(err);
		});
		return deferred.promise;
	}


}]);


