/**
 * Created by JamKong on 2017-04-30.
 */
var electron = require('electron'),
	remote = electron.remote,
	Menu = remote.Menu,
	MenuItem = remote.MenuItem,
	fs = require('fs'),
	uuid = require('uuid'),
	path = require('path'),
	// config = require('electron-node-config'),
	_ = require("lodash"),
	spawn = require('child_process').spawn
;
var PATH_SEP = "/";
var cnoteApp = angular.module('cnoteApp', ['mgcrea.ngStrap.modal', 'mgcrea.ngStrap.aside', 'mgcrea.ngStrap.tooltip', 'angular-drag', 'ui.router', 'ui.bootstrap', 'ui.tab.scroll']);

cnoteApp.filter('to_trusted', ['$sce', function ($sce) {
	return function (text) {
		return $sce.trustAsHtml(text);
	};
}]);
cnoteApp.controller('FileSystemController', ['$rootScope', '$scope', 'cnoteAppService', '$modal', '$sce', '$timeout', function ($rootScope, $scope, cnoteAppService, $modal, $sce, $timeout) {
	//内容菜单初始化
	var rootDirMenu = new Menu(),
		childDirMenu = new Menu(),
		fileMenu = new Menu(),
		currentWindow = remote.getCurrentWindow(),

		menuItem_separator = new MenuItem({type: "separator"}),
		menuItem_addFolder = new MenuItem({
			label: "新增目录", click: function () {
				$scope.showCreateDirectoryModal();
			}
		}),
		menuItem_addFile = new MenuItem({
			label: "新增文件",
			click: function (event) {
				$scope.createFile();
			}
		}),
		menuItem_Rename = new MenuItem({
			label: "重命名", click: function () {
				$scope.showRenameModal();
			}
		}),
		menuItem_Delete = new MenuItem({
			label: "删除目录", click: function () {
				$scope.showDeleteDirModal();
			}
		}),
		menuItem_file_showHistory = new MenuItem({
			label:"历史版本",click:function(){
				$scope.showHistoryModel();
			}
		});



	rootDirMenu.append(menuItem_addFolder);

	childDirMenu.append(menuItem_addFile);
	childDirMenu.append(menuItem_separator);
	childDirMenu.append(menuItem_addFolder);
	childDirMenu.append(menuItem_separator);
	childDirMenu.append(menuItem_Rename);
	childDirMenu.append(menuItem_separator);
	childDirMenu.append(menuItem_Delete);

	fileMenu.append(menuItem_file_showHistory);

	$scope.dirs = [];
	$scope.rootDirMenu = rootDirMenu;
	$scope.childDirMenu = childDirMenu;
	$scope.fileMenu = fileMenu;
	$scope.currentWindow = currentWindow;
	$scope.currentDirMenu = "";
	$scope.files = [];//当前进行查看或编辑的文件
	$scope.currentDir = {};//当前目录
	$scope.currentDir.childFiles = [];//当前目录下的文件
	$scope.currentFile = {};//当前编辑查看的文件
	$scope.scrollableApi = null;//滚动tab页的api调用入口
	$scope.busy = false;
	$scope.respAddr = "";//远程仓库地址
	$scope.respAddrList = [];
	$scope.isSyncStatus = false;//是否正在执行同步中
	$scope.updateTitleTiemout = null;
	$scope.historys = []; // 文件提交历史记录
	// $scope.isMarkdownFile = false;//当前编辑的文件格式是否是Markdown文件

	$scope.init = init;
	$scope.showCreateDirectoryModal = showCreateDirectoryModal;
	$scope.createDirectory = createDirectory;
	$scope.showRenameModal = showRenameModal;
	$scope.rename = rename;
	$scope.showDeleteDirModal = showDeleteDirModal;
	$scope.deleteDir = deleteDir;
	$scope.setCurrentDir = setCurrentDir;
	$scope.setCurrentFile = setCurrentFile;
	$scope.createFile = createFile;
	$scope.editorToggle = editorToggle;
	$scope.closeTabItem = closeTabItem;
	$scope.indexOf = indexOf;
	$scope.deleteFile = deleteFile;
	$scope.updateTitle = updateTitle;
	$scope.foreverDeleteFile = foreverDeleteFile;

	$scope.showSetGitConfigModel = showSetGitConfigModel;
	$scope.showHistoryModel = showHistoryModel;

	$scope.findHistorys = findHistorys;
	$scope.showFileContentByCommitId = showFileContentByCommitId;
	$scope.reset = reset;
	$scope.diffByCommitId = diffByCommitId;

	$scope.saveRespAddr = saveRespAddr;
	$scope.sync = sync;
	$scope.isMarkdownFile = isMarkdownFile;
	$scope.recoverDeleteFile = recoverDeleteFile;


	function init() {
		// removeAll();
		loadDirs();
	}

	function loadDirs(cb) {
		$scope.dirs = [];
		cnoteAppService.filedirList({type: 'dir', del_flag: false}).then(function (dirs) {
			if (dirs && dirs.length > 0) {
				var isNext = true;
				var index = 0;
				while (isNext) {
					if (!dirs[index]['parent']) {
						$scope.dirs.push(dirs[index]);
						dirs.splice(index, 1);
						index--;
					}
					if (++index > dirs.length - 1) {
						isNext = false;
					}
				}
				for (var i = 0; i < $scope.dirs.length; i++) {
					handlerToTree($scope.dirs[i], dirs);
				}
				//console.log("$scope.dirs:%o", $scope.dirs);
			}
			if (cb) {
				cb();
			}
		}).catch(function (err) {
			console.error(err);
			if (cb) {
				cb(err);
			}
		});
	}

	//处理文档菜单的树形结构
	function handlerToTree(parentDir, dirs) {
		if (!parentDir || !dirs || dirs.length <= 0) {
			return;
		}
		var isNext = true;
		var index = 0;
		if (!parentDir['childrens']) parentDir.childrens = [];
		while (isNext) {
			if (dirs[index].parent.toString() == parentDir._id.toString()) {
				parentDir.childrens.push(dirs[index]);
				dirs.splice(index, 1);
				index = index <= 0 ? 0 : index--;
				handlerToTree(parentDir.childrens[parentDir.childrens.length - 1], dirs);
			}
			if (++index > dirs.length - 1) {
				isNext = false;
			}
		}
	}

	//动态追加子菜单
	function appendChildren(parentDirs, childrenDir) {
		if (!parentDirs) {
			return;
		}
		for (var i = 0; i < parentDirs.length; i++) {
			if (parentDirs[i]._id.toString() == childrenDir.parent) {
				parentDirs[i].childrens = !!parentDirs[i].childrens ? parentDirs[i].childrens : [];
				parentDirs[i].childrens.push(childrenDir);
				return;
			} else {
				appendChildren(parentDirs[i].childrens, childrenDir);
			}
		}

	}

	//删除所有菜单
	function removeAllDir() {
		cnoteAppService.removeAll({type: 'dir'}).then(function () {
			console.log("removeAllDir");
		}).catch(function (err) {
			console.error(err);
		});
	}

	function removeAll() {
		cnoteAppService.removeAll({}).then(function () {
			console.log("removeAllFile");
		}).catch(function (err) {
			console.error(err);
		});


	}

	//创建菜单
	function createDirectory(dirname, parent) {
		if (!dirname) {
			alert("目录名不能为空！");
			return;
		}
		cnoteAppService.createDirectory(dirname, parent).then(function (newDir) {
			if (!!newDir.parent && $scope.dirs && $scope.dirs.length > 0) {
				appendChildren($scope.dirs, newDir);
			} else {
				$scope.dirs = !!$scope.dirs ? $scope.dirs : [];
				$scope.dirs.push(newDir);
			}
			if (!!$scope.createDirectoryModal) {
				$scope.createDirectoryModal.hide();
			}
		}).catch(function (err) {
			console.error(err);
			$scope.createDirectoryModal.hide();
		})
	}

	//显示新建菜单modal
	function showCreateDirectoryModal() {
		var scope = $scope.$new();
		scope.dirname = null;
		$scope.createDirectoryModal = $modal({
			scope: scope,
			templateUrl: "modules/core/template/add-directory-modal.html",
			show: true
		});
	}

	//重命名
	function rename(newName) {
		var oldFiledir = $rootScope.menuModal;
		cnoteAppService.renameDir(oldFiledir, newName).then(function (result) {
			oldFiledir.name = newName;
			if ($scope.renameModal) {
				$scope.renameModal.hide();
			}
		}).catch(function (err) {
			console.error(err);
			if ($scope.renameModal) {
				$scope.renameModal.hide();
			}
		});
	}

	//显示重命名modal
	function showRenameModal() {
		var scope = $scope.$new();
		scope.filename = $rootScope.menuModal.name;
		$scope.renameModal = $modal({
			scope: scope,
			templateUrl: "modules/core/template/rename-modal.html",
			show: true
		});
	}

	//显示删除目录窗口
	function showDeleteDirModal() {
		var scope = $scope.$new();
		$scope.deleteDirModal = $modal({
			scope: scope,
			templateUrl: "modules/core/template/delete-modal.html",
			show: true
		});
	}

	//删除目录
	function deleteDir(dir) {
		if (!dir) {
			alert("删除目录出错，传入的参数有误！");
			return;
		}
		cnoteAppService.deleteDir(dir).then(function (updateNum) {
			//alert("更新条数：" + updateNum);
			loadDirs();
			if ($scope.currentDir == dir) {
				$scope.currentDir = {};
			}
			$scope.deleteDirModal.hide();
		}).catch(function (err) {
			if (err) {
				alert("删除目录出错了！");
				console.error(err);
			}
			$scope.deleteDirModal.hide()
		})
	}

	//设置当前操作的目录
	function setCurrentDir(dir) {
		var filter = {type: 'file', del_flag: false};
		if (dir === 'root') {
			$scope.currentDir = {};
		} else if (dir === 'trash') {
			$scope.currentDir = {};
			filter.del_flag = true;
		} else {
			$scope.currentDir = dir;
			filter.parent = dir._id;
		}
		cnoteAppService.filedirList(filter).then(function (childFiles) {
			$scope.currentDir.childFiles = childFiles;
			//console.log("childFiles:%o", childFiles);
		}).catch(function (err) {
			alert(err.stack);
			console.log(err);
		})

	}

	//设置当前正在操作的文件
	function setCurrentFile(file) {
		if ($scope.busy) {
			return;
		}
		$scope.busy = true;
		if (!$scope.currentFile || ($scope.currentFile && $scope.currentFile !== file)) {
			cnoteAppService.findFileById(file._id).then(function (f) {
				f.title = f.title ? f.title : '无标题';
				f.content = f.content ? f.content : '';
				var tabIndex = indexOf(f, $scope.files);
				if (tabIndex == -1) {
					$scope.files.push(f);
				} else {
					if (file.isEditer) {
						f.title = $scope.files[tabIndex].title;
						f.content = $scope.files[tabIndex].content;
						$scope.files[tabIndex] = _.extend($scope.files[tabIndex], f);
					} else {
						$scope.files[tabIndex] = _.extend($scope.files[tabIndex], f);
					}
					f = $scope.files[tabIndex];
				}
				$scope.currentFile = f;
				$scope.currentFile.titleTemp = $scope.currentFile.title;//增加标题副本，在对标题进行修改的时候，先修改该副本，再把副本的内容更新到数据库中的去
				if (isMarkdownFile()) {
					$scope.currentFile.outputText = $sce.trustAsHtml(marked(f.content));
				} else {
					console.log("$scope.currentFile.content:" + $scope.currentFile.content);
					$scope.currentFile.outputText = $sce.trustAsHtml(f.content);
					// $scope.standardEditor.txt.html($scope.currentFile.outputText);
				}
				$scope.busy = false;
			}).catch(function (err) {
				alert(err.track);
				console.log(err.track);
				$scope.busy = false;
			});
		} else {
			$scope.busy = false;
			if (isMarkdownFile()) {
				$scope.currentFile.outputText = $sce.trustAsHtml(marked($scope.currentFile.content));
			} else {
				$scope.currentFile.outputText = $sce.trustAsHtml($scope.currentFile.content);
				// $scope.standardEditor.txt.html($scope.currentFile.outputText);
			}
			$scope.currentFile.titleTemp = $scope.currentFile.title;//增加标题副本，在对标题进行修改的时候，先修改该副本，再把副本的内容更新到数据库中的去
		}
		$scope.scrollableApi.doRecalculate();//重新计算tab宽度
	}

	//创建文件
	function createFile() {
		var parent = $rootScope.menuModal || null;
		cnoteAppService.createFile(parent).then(function (newFile) {
			newFile.isEditer = true;//是否正在编辑
			$scope.files.push(newFile);
			$scope.currentFile = newFile;
			$scope.currentFile.destroy = $scope.$watch('currentFile.content', function (current, original) {
				if (!!current) {
					if (isMarkdownFile()) {
						$scope.currentFile.outputText = $sce.trustAsHtml(marked(current));
					} else {
						$scope.currentFile.outputText = $sce.trustAsHtml(current);
					}
				}
			});

			$scope.currentDir.childFiles.push(newFile);
			//console.log("$scope.files:%o", $scope.files);
			$scope.scrollableApi.doRecalculate();//重新计算tab宽度
		}).catch(function (err) {
			if (err) {
				alert("新增文件出错了！");
				console.error(err);
			}
		});
	}

	//文件编辑状态切换
	function editorToggle() {
		$scope.currentFile.isEditer = !$scope.currentFile.isEditer;

		if (!$scope.currentFile.isEditer) {
			if (!!$scope.currentFile.destroy) {
				$scope.currentFile.destroy();//销毁监听器
				$scope.currentFile.destroy = null;
			}
			cnoteAppService.updateFileToDBAndDisk($scope.currentFile).then(function (newFile) {
				//alert("保存成功！");
			}).catch(function (err) {
				console.error(err.stack);
				alert(err.stack);
			});
		} else {
			if ($scope.currentFile.isEditer) {
				$scope.currentFile.destroy = $scope.$watch('currentFile.content', function (current, original) {
					if (!!current) {
						if (isMarkdownFile()) {
							$scope.currentFile.outputText = $sce.trustAsHtml(marked(current));
						} else {
							$scope.currentFile.outputText = $sce.trustAsHtml(current);
						}

					}
				});
			}
		}
	}

	//判断当前文章是否是markdown文件
	function isMarkdownFile() {
		return !!($scope.currentFile && $scope.currentFile.title.lastIndexOf(".md") != -1);
	}

	//更新标题
	function updateTitle(fileId, title) {
		// if (!!$scope.updateTitleTimeout) {
		// 	$timeout.cancel($scope.updateTitleTimeout);
		// }
		// $scope.updateTitleTimeout = $timeout(function () {
		//
		// }, 2 * 1000);
		cnoteAppService.filedirList({_id: fileId, type: 'file', del_flag: false}).then(function (files) {
			if (files && files.length > 0) {
				var file = files[0];
				file.title = title;
				cnoteAppService.updateFileToDBAndDisk(file).then(function () {
					console.log("保存标题成功！");
					if ($scope.currentDir && $scope.currentDir.childFiles && $scope.currentDir.childFiles.length > 0) {
						var index = indexOf(file, $scope.currentDir.childFiles);
						if (index != -1) {
							$scope.currentDir.childFiles[index] = file;
						}
						isMarkdownFile();
						// console.log("### currentFile:",file);
					}
					if($scope.currentFile._id.toString() === file._id.toString()){
						$scope.currentFile.title = file.title;
					}
				}).catch(function (err) {
					console.error(err.stack);
					alert(err.stack);
				})
			} else {
				alert("该文章不存在！")
			}
		}).catch(function (err) {
			console.error(err.stack);
			alert(err.stack);
		})
	}

	//永远删除
	function foreverDeleteFile(file) {
		if (confirm("该操作后，文件将无法复原？")) {
			cnoteAppService.foreverDeleteFileSync(file).then(function () {
				if ($scope.files && $scope.files.length > 0) {
					var index = indexOf(file, $scope.files);
					if (index >= 0) {
						$scope.files.splice(index, 1);
					}
				}
				if ($scope.currentDir && $scope.currentDir.childFiles && $scope.currentDir.childFiles.length > 0) {
					var index = indexOf(file, $scope.currentDir.childFiles);
					if (index >= 0) {
						$scope.currentDir.childFiles.splice(index, 1);
					}
				}
				//alert("删除文件成功！");
			}).catch(function (err) {
				if (err) {
					alert("删除文件出错了！");
					console.error(err);
				}
			});
		}

	}

	//恢复删除文件
	function recoverDeleteFile(file) {
		if (confirm("是否要恢复该文章？")) {
			cnoteAppService.recoverDeleteFile(file).then(function () {
				console.log(file.title + " 文件，恢复成功！");
				loadDirs();
				setCurrentDir($scope.currentDir);
				setCurrentFile({_id: $scope.currentFile._id});
			}).catch(function (err) {
				console.log("err:", err);
			});
		}
	}

	/**
	 * 标记删除，移动到回收站
	 * @param file
	 */
	function deleteFile(file) {
		if (confirm("确定要删除该篇文章吗？")) {
			var f = _.pick(file, ['_id', 'path']);
			f.del_flag = true;
			cnoteAppService.updateFileToDB(f).then(function () {
				if ($scope.files && $scope.files.length > 0) {
					var index = indexOf(file, $scope.files);
					if (index >= 0) {
						$scope.files.splice(index, 1);
					}
				}
				if ($scope.currentDir && $scope.currentDir.childFiles && $scope.currentDir.childFiles.length > 0) {
					var index = indexOf(file, $scope.currentDir.childFiles);
					if (index >= 0) {
						$scope.currentDir.childFiles.splice(index, 1);
					}
				}
				//alert("删除文件成功！");
			}).catch(function (err) {
				if (err) {
					alert("删除文件出错了！");
					console.error(err);
				}
			});
		}

	}

	//关闭tab页
	function closeTabItem(file) {
		var tabIndex = indexOf(file, $scope.files);
		if (tabIndex == -1) {
			alert('出错了，关闭一个不存在的页面！');
		} else {
			if (file.isEditer) {
				if (confirm("是否保存修改?")) {
					cnoteAppService.updateFileToDBAndDisk($scope.currentFile).then(function (newFile) {
						callback();
						//alert("保存成功！");
					}).catch(function (err) {
						console.error(err.stack);
						alert(err.stack);
					});
				} else {
					callback();
				}
			} else {
				callback();
			}
		}


		function callback() {
			file.isEditer = false;
			if ($scope.files.length > 1) {
				if (tabIndex > 0) {
					$scope.setCurrentFile($scope.files[tabIndex - 1]);
				} else {
					$scope.setCurrentFile($scope.files[1]);
				}
			} else {
				$scope.currentFile = {};
			}
			$scope.files.splice(tabIndex, 1);
			$scope.scrollableApi.doRecalculate();//重新计算tab宽度
		}
	}


	function indexOf(file, files) {
		//console.log("currentFile:%o", file);
		if (files && files.length > 0) {
			for (var i = 0; i < files.length; i++) {
				if (files[i]._id.toString() == file._id.toString()) {
					return i;
				}
			}
		}
		return -1;
	}


	//同步到Git
	function sync(_delay) {
		$scope.isSyncStatus = true;
		console.log("##############  手动调用同步操作");
		cnoteAppService.sync(_delay || 0).then(function () {
			alert("同步成功！");
			$scope.isSyncStatus = false;
		}).catch(function (err) {
			console.log("同步出错了:{}", err);
			alert("同步出错了：" + err);
			$scope.isSyncStatus = false;
		});
	}


	function showSetGitConfigModel() {
		$scope.respAddr = "http://";
		cnoteAppService.findRespAddrs().then(function (respAddrs) {
			$scope.respAddrList = respAddrs;
			var scope = $scope.$new();
			$scope.createDirectoryModal = $modal({
				scope: scope,
				templateUrl: "modules/core/template/setGitConfig-modal.html",
				show: true
			});
		}).catch(function (err) {
			alert("获取仓库列表出错了");
			console.error(err);
		});

	}
	// 显示历史版本窗口
	function showHistoryModel() {
		var scope = $scope.$new();
		var file = $rootScope.menuModal;
		console.log("当前要查看历史记录的文件为:%o",file);
		scope.file = file;
		$scope.historyModal = $modal({
			scope: scope,
			templateUrl: "modules/core/template/history-modal.html",
			show: true
		});
	}

	function findHistorys(filePath,cb){
		cnoteAppService.findHistorys(filePath).then(function (historys) {
			$scope.historys = historys;
			$scope.historyFile = null;
			if (cb) {
				return cb(null,historys);
			}
		}).catch(function (err) {
			if (cb) {
				cb(err);
			} else {
				alert(err);
			}
		});
	}
	// 显示文章在某次提交的内容
	function showFileContentByCommitId(commitId,filename,cb){
		cnoteAppService.showFileContentByCommitId(commitId,filename).then(function(file){
			$scope.historyFile = file;
			if(cb){
				return cb(null);
			}
		}).catch(function(err){
			if(cb){
				return cb(null);
			}else{
				alert(err);
			}

		})
	}

	function reset(file,historyFile){
		if ($scope.busy) {
			alert("正在恢复，请稍等！");
		} else {
			$scope.busy = true;
			file.title = historyFile.title;
			file.content = historyFile.content;
			cnoteAppService.updateFileToDBAndDisk(file,0).then(function (newFile) {
				findHistorys(file.path, function (err, historys) {
					if (err) {
						console.log(err);
						alert(err);
					} else {
						showFileContentByCommitId(historys[0].commitId, file.path, function (err) {
							if (err) {
								console.log(err);
								alert(err);
							} else {
								console.log($scope.historyFile);
								console.log($scope.$parent.historyFile);
								console.log("##################");
								console.log(file);
								$scope.busy = false;
								alert("恢复成功！");
							}
						});
					}
				});
			}).catch(function (err) {
				console.error(err.stack);
				alert(err.stack);
			});
		}
	}
	function diffByCommitId(commitId1,commitId2){
		cnoteAppService.diffByCommitId(commitId1,commitId2).then(function(diffTxt){
			// var compareAIndex = diffTxt.substring(diffTxt.indexOf(" a/"),); //给该文件的旧版本取得别名所在位置
			// var compareBIndex = diffTxt.indexOf(" b/");
			diffTxt = diffTxt.replace(/[\r\n]+/gi,'<br/>');
			var diffInfo = diffTxt.substring(diffTxt.indexOf("@@"),diffTxt.indexOf("@@",diffTxt.indexOf("@@")));
			var firstDiffIndex = diffTxt.substring(diffInfo.length).indexOf("-");//第一个不同点位置
			$scope.diffTxts = diffTxt.replace(/[\r\n]+/gi,'<br/>').split('\\ No newline at end of file');
			console.log("diffTxt:"+diffTxt);
		}).catch(function(err){
			alert(err);
		})
	}

	function saveRespAddr(respAddr) {
		$scope.respAddr = respAddr;
		console.log("$scope.respAddr:" + $scope.respAddr);
		cnoteAppService.saveRespAddr(respAddr);
	}


}]);
