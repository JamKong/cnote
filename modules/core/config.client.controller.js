var electron = require('electron'),
	remote = electron.remote,
	dialog = remote.dialog,
	ipcRenderer = electron.ipcRenderer,
	path = require('path');
var package = require("./package.json");


var PATH_SEP = path.sep;


var cnoteApp = angular.module('cnoteApp');
cnoteApp.controller('ConfigController', ['$scope', 'localRespService', function ($scope, localRespService) {

	$scope.init = init;
	$scope.getDirPath = getDirPath;
	$scope.openModel = openModel; //open项目操作
	$scope.delLocalResp = delLocalResp; //删除项目记录
	$scope.selectedResp = selectedResp; //选中项目
	$scope.localRespList = [];
	$scope.version = package.version;
	$scope.appName = package.name;
	function init() {
		findLocalResps();
	}

	function findLocalResps(){
		localRespService.localRespList().then(function(result){
			$scope.localRespList = result;
			console.log("$scope.localRespList:",$scope.localRespList);
		}).catch(function(err){
			alert(err);
		})
	}
	function openModel() {
		var divPath = getDirPath("请选择你要打开的项目的根目录");
		if (!!divPath && divPath.length > 0) {
			var respName = divPath[0].substring(divPath[0].lastIndexOf(PATH_SEP) + 1);

			var model = {
				path: divPath[0],
				name: respName,
				activeDate: new Date()
			};
			localRespService.localRespList().then(function (rs) {
				console.log("rs:", rs);
				localRespService.saveLocalResp(model).then(function (result) {
					console.log("result:", result);
					findLocalResps();
				}).catch(function (err) {
					console.error("err:", err);
				})
			}).catch(function (err) {
				console.error("err:", err);
			});

		}
	}

	function getDirPath(title) {
		var dirPath = dialog.showOpenDialog({
			title: title,
			properties: ['openDirectory', 'createDirectory', 'promptToCreate', 'noResolveAliases']
		});
		console.log('dirPath:%o', dirPath);
		return dirPath;

	}

	function delLocalResp(respId){
		localRespService.deleteLocalResp(respId).then(function(){
			findLocalResps();
		}).catch(function(err){
			console.error(err);
		})
	}

	function selectedResp(respPath){
		ipcRenderer.send("selected-resp",respPath);
	}
}]);