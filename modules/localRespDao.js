'use strict';
/**
 *  * 数据库模型
 - 本地仓库位置
 localResp:
 {
 	_id : ObjectId	(ID)
 	path : String	(仓库绝对路径)
 	name : String 	(仓库名称)
 	activeDate : Date (活跃时间，即最近被打开时间)
 }
 */
var path = require('path'),
	config = require('config'),
	utils = require(path.resolve(__dirname, '../modules/core/utils.js'))
	, logger = require(path.resolve(__dirname, '../config/lib/logHelper.js')).helper;

var appDbFullPath = path.resolve(process.cwd(),'./dbs');// 应用数据库，保存一些应用上的信息
var Datastore = require('nedb'),
	//localResp 主要保存一些应用的数据，只要保存在应用的数据库，而不需要保存到用户的数据
	localResp = new Datastore({filename: appDbFullPath + '/localResp.db', autoload: true}),
	_ = require('lodash'),
	async = require('async');

var localRespModel = {
	find: function (cb) {
		localResp.find({}).sort({activeDate: -1}).exec(function (err, docs) {
			cb(err, docs);
		})
	},
	save: function (model, cb) {
		localResp.insert(model, function (err, r) {
			if (cb) {
				cb(err, r);
			}
		})
	},
	delete: function (id, cb) {
		localResp.remove({_id: id}, function (err) {
			if (cb) {
				cb(err);
			}
		})
	}
};

module.exports = localRespModel;