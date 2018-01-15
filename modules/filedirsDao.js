/**
 * Created by JamKong on 2017-04-30.
 */

'use strict';
var path = require('path'),
	config = require('config'),
	utils = require(path.resolve(__dirname, '../modules/core/utils.js'))
	, logger = require(path.resolve(__dirname, '../config/lib/logHelper.js')).helper;

var appDbFullPath = path.resolve(process.cwd(),'./dbs');// 应用数据库，保存一些应用上的信息

/**
 * 数据库模型
 - 文件目录
 filedirs：
 {
	_id : ObjectId	(ID)
	name : String	(文件名)
	type : Enum['dir','file']	(文件类型)
	parent : ObjectId	(父级目录ID)
	parents : Array[ObjectId]	(所有父级目录ID)
	createDate : Date	(创建日期)
	updateDate : Date	(修改日期)
	del_flag : Boolean	(删除标记：0 未删除 1 已删除)
 }
 *
 */
var Datastore = require('nedb'),
	_ = require('lodash'),
	async = require('async'),
	userDbFullPath = path.resolve(config.get('rootPath'), '.' + (utils.dbsPath ? utils.dbsPath : './db')),//用户数据库地址，保存用户信息
	filedirs = new Datastore({filename: userDbFullPath + '/filedirs.db', autoload: true});
;

var filedirModel = {
	//新增文件
	create: function (file, cb) {
		file.del_flag = false;
		file.createDate = new Date();
		file.updateDate = file.createDate;
		filedirs.insert(file, function (err, newFile) {
			cb(err, newFile);
		});
	}
	,
	//查询文件或目录
	find: function (query, cb) {
		return filedirs.find(query).sort({createDate: 1}).exec(function (err, docs) {
			cb(err, docs);
		});
	}
	,
	//根据id查询目录对象
	findById: function (filedirId, cb) {
		return filedirs.find({_id: filedirId}, function (err, filedirs) {
			if (!!filedirs && filedirs.length > 0) {
				return cb(err, filedirs[0]);
			}
			return cb(err, null);
		})
	},

	//真实删除所有文件或目录
	removeAll: function (filter, cb) {
		return filedirs.remove(filter, {multi: true}, function (err) {
			cb(err);
		});
	}
	,
	//真实删除
	deleteDir: function (filedirId, cb) {
		return filedirs.remove({$or: [{_id: filedirId}, {parent: filedirId}]}, {multi: true}, function (err, result) {
			logger.logDebug("deleteDir:" + filedirId + " , result:" + result + "," + (result > 0 ? "删除成功" : "删除失败"));
			cb(err);
		});
	},

	//真实删除
	foreverDeleteFile: function (fileId, cb) {
		return filedirs.remove({_id: fileId}, function (err, result) {
			logger.logDebug("deleteDir:" + fileId + " , result:" + result + "," + (result > 0 ? "删除成功" : "删除失败"));
			cb(err);
		});
	},

	updateOne: function (newFiledir, cb) {
		if (!newFiledir._id) {
			return cb(new Error("id不能为空！"));
		}
		newFiledir.updateDate = new Date();
		var updateParams = _.pick(newFiledir, ['name', 'type', 'parent', 'path', 'title', 'del_flag', 'updateDate']);
		// logger.logDebug("updateParams:%o", updateParams);
		filedirs.update({_id: newFiledir._id}, {$set: updateParams}, function (err, newResult) {
			cb(err, newResult);
		})
	}
	,
	update: function (query, update, options, cb) {
		filedirs.update(query, {'$set': update}, options, function (err, results) {
			// logger.logDebug("result:%o", results);
			cb(err, results);
		});
	}
	,
	//递归查询文件的所有父级目录
	findParents: function (fileDir) {
		var myCursor = filedirs.find({"_id": fileDir.parent});
		var fileDirs = [];
		while (myCursor.hasNext()) {
			var myJsonObject = myCursor.next();
			fileDirs.push(myJsonObject._id);
			fileDirs = _.union(fileDirs, this.findParents(myJsonObject));
		}
		return fileDirs;
	}

};

module.exports = filedirModel;

