'use strict'
process.chdir(__dirname);
var electron = require('electron'),
	app = electron.app,
	dialog = electron.dialog,
	BrowserWindow = electron.BrowserWindow
	, path = require('path')
	, webContents = electron.webContents
	, Menu = electron.Menu
	, MenuItem = electron.MenuItem
	, ContextMenu = require('electron-context-menu')
	, localRespDao = require('./modules/localRespDao')
	, Tray = electron.Tray
	, ipc = electron.ipcMain
	, config = require('config')
	, fs = require('fs');


var utils = require('./modules/core/utils');
var configWindow = null;//配置窗口，用来配置Git仓库地址，以及存储到本地位置
var mainWindow = null;
var appIcon = null;


function openConfigWindow(closeCallback) {
	configWindow = new BrowserWindow({icon: null, width: 780, height: 480, resizable: false});

	configWindow.loadURL('file://' + __dirname + '/config.html');
	//开发模式
	// configWindow.webContents.openDevTools();

	ipc.on("selected-resp", function (event, respPath) {
		var logger = require(path.resolve(process.cwd(), './config/lib/logHelper.js')).helper;
		var cf = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './config/default.json')).toString());
		cf.rootPath = respPath;
		try {
			fs.writeFileSync('./config/default.json', JSON.stringify(cf));
		} catch (e) {
			logger.logDebug(e);
		}
		// 重新获取config
		delete require.cache[require.resolve('config')];
		config = require('config');
		// dialog.showMessageBox({message: JSON.stringify(config)});
		configWindow.close();
		configWindow = null;
		openMainWindow();
	});

	if (process.platform === 'darwin') {
		var forceQuit = false;
		app.on('before-quit', function () {
			forceQuit = true;
		});
		configWindow.on('close', function (event) {
			if (!forceQuit) {
				event.preventDefault();
				configWindow.hide();
			}
			closeCallback();
		});
	}

	configWindow.setMenu(null);
}

function openMainWindow() {
	mainWindow = new BrowserWindow({icon: null});
	mainWindow.loadURL('file://' + __dirname + '/index.html');
	//开发模式
	mainWindow.webContents.openDevTools();

	if (process.platform === 'darwin') {
		var forceQuit = false;
		app.on('before-quit', function () {
			forceQuit = true;
		});
		mainWindow.on('close', function (event) {
			if (!forceQuit) {
				event.preventDefault();
				mainWindow.hide();
			}
		});
	}
	mainWindow.setMenu(null);

}

app.on('ready', function () {
	//显示配置窗口
	openConfigWindow(function () {
		// init();
	});

	if (process.platform === 'win32') {
		showTray();
		ipc.on('put-in-tray', function (event) {
			showTray();
		});
		ipc.on('remove-tray', function () {
			appIcon.destroy()
		});
	}

	//托盘代码
	function showTray() {
		var iconName = process.platform === 'win32' ? 'resources/images/cnote.ico' : 'resources/images/cnote.ico';
		var iconPath = path.join(__dirname, iconName);
		appIcon = new Tray(iconPath);
		var contextMenu = Menu.buildFromTemplate([{
			label: '退出',
			click: function () {
				if (!!mainWindow) {
					mainWindow.close();
					mainWindow.destroy();
				}
			}
		}]);
		appIcon.setToolTip('CNote');
		appIcon.setContextMenu(contextMenu);
		appIcon.on('click', function (event) {
			if (!mainWindow) {
				openMainWindow();
			} else {
				mainWindow.show();
			}
		});
	}
});

function setRootPath() {
	console.log("setRootPath config:%o", config);
	if (!config.has('rootPath')) {
		var rootPath = dialog.showOpenDialog({
			title: "请选择你要存放文件的目录(需要空目录)",
			properties: ['openDirectory', 'createDirectory', 'promptToCreate', 'noResolveAliases']
		});
		if (!rootPath) {
			app.quit();
		}
		var logger = require(path.resolve(process.cwd(), './config/lib/logHelper.js')).helper;
		console.log('rootPath:%o', rootPath);
		var cf = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), './config/default.json')).toString());

		cf.rootPath = rootPath[0];
		try {
			fs.writeFileSync('./config/default.json', JSON.stringify(cf));
		} catch (e) {
			logger.logDebug(e);
		}
		// 重新获取config
		delete require.cache[require.resolve('config')];
		config = require('config');
		console.log(config);
	}

	if (!config.has('rootPath')) {
		return app.quit();
	}
}

// app.on('window-all-closed', function () {
//   // On macOS it is common for applications and their menu bar
//   // to stay active until the user quits explicitly with Cmd + Q
//   if (appIcon) appIcon.destroy();
//   if (process.platform !== 'darwin') {
//     app.quit();
//   }
// });

app.on('activate', function () {
	// On macOS it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (configWindow !== null) {
		return;
	}
	if (mainWindow === null) {
		openMainWindow()
	} else {
		mainWindow.show();
	}
});

// app.on('before-quit', function (event) {
//   event.preventDefault();
//   logger.logDebug("退出应用前进行同步操作....");
//   gitApi.sync(0);
//   app.exit(0);
// });

//TODO 先实现根据在default.json中配置好远程仓库地址，进行版本控制；后期改成数据库获取远程仓库地址，可以多个~
function init() {
	console.log("path.resolve(utils.userPath):" + path.resolve(utils.userPath));
	dirCheckAndAdd(path.resolve(config.get('rootPath'), '.' + utils.userPath));
	// dirCheckAndAdd(path.resolve(utils.articlesPath));
	// dirCheckAndAdd(path.resolve(utils.imagsPath));
	// dirCheckAndAdd(path.resolve(utils.dbsPath));

	if (!fs.existsSync(path.resolve(config.get('rootPath'), '.' + utils.gitFilePath))) {//判断是否有.git文件，来判断是否已经创建好了Git仓库
		console.log('初始化...');
		var gitApi = require(path.resolve(process.cwd(), './modules/git-api'));
		gitApi.initRemoteRepo();
	} else {
		//一启动就同步
		// gitApi.sync(0);

	}

}


function dirCheckAndAdd(dirPath) {
	if (!fs.existsSync(dirPath)) {
		if (utils.mkdirsSync(dirPath)) {
			console.log("创建 " + dirPath + " 目录成功！");
		} else {
			console.log("创建 " + dirPath + " 目录失败！");
		}
	} else {
		console.log('目录 ' + dirPath + ' 已存在.')
	}
}

