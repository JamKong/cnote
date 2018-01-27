/**
 * Created by JamKong on 2017-07-19.
 */
var spawn = require('child_process').spawn,
    fs = require('fs'),
    uuid = require('uuid'),
    path = require('path'),
    config = require('config'),
    _ = require("lodash")
    , shell = require('shelljs')
    , logger = require(path.resolve('./config/lib/logHelper.js')).helper;

var rootPath = config.get("rootPath");

var task = null;
var delay = 2 * 60 * 1000;//
//初始化远程仓库 TODO 未完成
exports.initRemoteRepo = function () {
    // logger.logDebug('执行初始化远程仓库脚本');
    // shell.exec('sh ' + path.resolve(process.cwd(), './shell/init_repo.sh') + ' ' + userPath + ' ' + remoteRepo, function (code, stdout, stderr, st1, st2) {
    //     logger.logDebug('Exit code:', code);
    //     //logger.logDebug('Program output:', stdout);
    //     if (stderr && stderr.indexOf('Cloning into') != 0) {
    //         logger.logDebug("初始化远程仓库出错！");
    //         logger.logDebug('Program stderr:', stderr);
    //         logger.logError('执行脚本 init_repo 出错：%o', stderr);
    //     }
    // });
};


//同步笔记
exports.sync = function (_delay, cb) {
    logger.logDebug("_delay:" + _delay);
    var delayTime =( _delay!=undefined && _delay >= 0 )? _delay : delay;
    if (!!task) {
        clearTimeout(task);
    }
    logger.logDebug("delayTime：" + delayTime);
    task = setTimeout(function () {
        logger.logDebug('该目录已经与远程分支进行了链接');
        logger.logDebug("同步开始");
        shell.exec('sh ' + path.resolve(process.cwd(), './shell/sync_repo.sh') + ' ' + rootPath, function (code, stdout, stderr, st1, st2) {
            logger.logDebug('Exit code:', code);
            //logger.logDebug('Program output:', stdout);
            if (code == 0) {
                logger.logDebug('同步完成');
                if (cb) {
                    cb(null);
                }
            } else {
                logger.logError('执行脚本 sync_repo 出错：' + stderr);
                if (cb) {
                    cb(stderr);
                }
            }
        });
    }, delayTime);
};

exports.commitLogs = function (filePath,cb) {
	logger.logDebug('执行获取提交历史记录脚本');
	shell.exec('sh ' + path.resolve(process.cwd(), './shell/commit_log.sh') + ' ' + rootPath + ' ' +  filePath, function (code, stdout, stderr, st1, st2) {
		console.log('Exit code:', code);
		console.log('Program stdout:', stdout);
		console.log('Program stderr:', stderr);
		// console.log("记录："+stdout.substring(stdout.indexOf("["),stdout.indexOf("]")));
		if(code == 0){
			logger.logDebug("执行 commit_log 脚本成功");
			var historys = stdout.substring(stdout.indexOf("[") + 1, stdout.indexOf("]")).trim();
			historys = historys.split("\n");
			console.log("historys:%o",historys);
			var result = [];
			if(historys && historys.length>0){
                historys.forEach(function(item,index){
                    var datas = item.split(" ");
					result.push({"commitId": datas[0], "date": datas[1], "time": datas[2]});
                });

            }
			return cb(null,result);
		}else {
			if (stderr && stderr.indexOf('Cloning into') != 0) {
				logger.logError('执行脚本 commitLogs 出错：%o', stderr);
				return cb(stderr);
			}
		}


	});

};

exports.diffByCommitId = function (commitId1,commitId2,cb) {
	logger.logDebug('执行比较脚本');
	shell.exec('sh ' + path.resolve(process.cwd(), './shell/diff_commit.sh') + ' ' + rootPath + ' ' +  commitId1 +" " + commitId2 , function (code, stdout, stderr, st1, st2) {
		console.log('Exit code:', code);
		console.log('Program stdout:', stdout);
		console.log('Program stderr:', stderr);
		// console.log("记录："+stdout.substring(stdout.indexOf("["),stdout.indexOf("]")));
		if(code == 0){
			logger.logDebug("执行 diff_commit 脚本成功");
			var diffTxt = stdout.substring(stdout.indexOf("[") + 1, stdout.indexOf("]")).trim();
			console.log("diffTxt:%o",diffTxt);
			return cb(null,diffTxt);
		}else {
			logger.logError('执行脚本 diff_commit 出错：' + stderr);
			if (stderr && stderr.indexOf('Cloning into') != 0) {
				// logger.logDebug("执行比较脚本出错！");
				// logger.logDebug('Program stderr:', stderr);
				logger.logError('执行脚本 diff_commit 出错：%o', stderr);
				return cb(stderr);
			}
		}


	});

};

exports.showFileContentByCommitId = function (commitId,filename,cb) {
	logger.logDebug('执行 获取该文件的某个历史版本内容 脚本');
	filename = filename.substring(1);//去掉头个字符 "/"
	shell.exec('sh ' + path.resolve(process.cwd(), './shell/show_commit_file.sh') + ' ' + rootPath + ' ' +  commitId +" " + filename , function (code, stdout, stderr, st1, st2) {
		console.log('Exit code:', code);
		console.log('Program stdout:', stdout);
		console.log('Program stderr:', stderr);
		// console.log("记录："+stdout.substring(stdout.indexOf("["),stdout.indexOf("]")));
		if(code == 0){
			logger.logDebug("执行 show_commit_file 脚本成功");
			return cb(null,stdout);
		}else {
			logger.logError('执行脚本 show_commit_file 出错：' + stderr);
			if (stderr && stderr.indexOf('Cloning into') != 0) {
				logger.logError('执行脚本 show_commit_file 出错：%o', stderr);
				return cb(stderr);
			}
		}


	});

};

//创建多层文件夹 同步
function mkdirsSync(dirpath, mode) {
    if (!fs.existsSync(dirpath)) {
        var pathtmp;
        dirpath.split(path.sep).forEach(function (dirname) {
            if (pathtmp) {
                pathtmp = path.join(pathtmp, dirname);
            }
            else {
                pathtmp = dirname;
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


