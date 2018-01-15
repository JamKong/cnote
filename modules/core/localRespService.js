/**
 * Created by JamKong on 2017-04-30.
 */
'use strict';
var localRespDao = require('./modules/localRespDao'),
	fs = require('fs'),
	config = require('config'),
	path = require('path'),
	uuid = require('uuid'),
	_ = require('lodash'),
	utils = require('./modules/core/utils'),
	logger = require(path.resolve('./config/lib/logHelper.js')).helper,
	async = require('async')

;

angular.module("cnoteApp").service("localRespService", ["$q", function ($q) {
	return {
		localRespList:localRespList,
		saveLocalResp:saveLocalResp,
		deleteLocalResp:deleteLocalResp
	};
	// 本地项目地址 增删改查操作
	function localRespList(){
		var deferred = $q.defer();
		localRespDao.find(function (err, filedirs) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(filedirs);
			}
		});
		return deferred.promise;
	}

	function saveLocalResp(model){
		var deferred = $q.defer();
		localRespDao.save(model,function (err, result) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(result);
			}
		});
		return deferred.promise;
	}

	function deleteLocalResp(id){
		var deferred = $q.defer();
		localRespDao.delete(id,function (err) {
			if (err) {
				deferred.reject(err);
			} else {
				deferred.resolve(null);
			}
		});
		return deferred.promise;
	}



}]);


