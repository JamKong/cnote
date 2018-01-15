/**
 * Created by JamKong on 2017-03-01.
 */
var cnoteApp = angular.module("cnoteApp");
var config = require('config');
// var imagerServer = config.get("imageServer");
//images = require("images");
cnoteApp.directive('markdownEditor', ['$http', function ($http) {
	return {
		restrict: 'A',
		scope: {
			inputText: "="
		},
		link: function (scope, ele, attrs) {
			var startPoint = 0, endPoint = 0;
			var preStr = '', backStr = '';
			ele[0].onmousedown = function () {
				saveStartPoint()
			};
			ele[0].onmouseup = function () {
				saveEndPoint()
			};
			ele[0].onkeydown = function () {
				saveStartPoint();
				if (event.keyCode == 9) {//Tab键
					event.preventDefault();
					var indent = '    ';
					var start = ele[0].selectionStart;
					var end = ele[0].selectionEnd;
					var selected = window.getSelection().toString();
					selected = indent + selected.replace(/\n/g, '\n' + indent);
					scope.inputText = scope.inputText.substring(0, start) + selected
						+ scope.inputText.substring(end);
					ele[0].setSelectionRange(start + indent.length, start
						+ selected.length);
					scope.$apply();
				}
			};
			ele[0].onkeyup = function () {
				saveEndPoint()
			};

			//保存光标选择前位置
			function saveStartPoint() {
				startPoint = ele[0].selectionStart;
				// console.log("startPoint:", startPoint);
			}

			//保存光标选择后位置
			function saveEndPoint() {
				endPoint = ele[0].selectionEnd;
				//console.log("endPoint:", endPoint);
			}


			ele[0].onpaste = function (event) {
				var clipboardData = event.clipboardData, i = 0, items, item, types;
				if (clipboardData) {
					items = clipboardData.items;
					if (!items) {
						return;
					}
					item = items[0];
					// 保存在剪贴板中的数据类型
					types = clipboardData.types || [];
					for (; i < types.length; i++) {
						if (types[i] === 'Files') {
							item = items[i];
							break;
						}
					}
					// 判断是否为图片数据
					if (item && item.kind === 'file' && item.type.match(/^image\//i)) {
						imgReader(item);// 读取该图片
					}
				}
			};
			var imgReader = function (item) {
				var file = item.getAsFile(), reader = new FileReader();
				reader.readAsDataURL(file);
				reader.onload = function (e) {
					var base64Data = e.target.result;
					var bsDatas = base64Data.split(',');
					// var bsDatas = base64Data.split(',');
					// if (bsDatas.length >= 2) {
					//   var imgType = bsDatas[0].substring(bsDatas[0].indexOf('/') + 1, bsDatas[0].indexOf(';'));
					//   var fileName = uuid.v1().replace(/-/g, "") + '.' + imgType;//产生一个 v1 (基于时间的) id
					//   var bitmap = new Buffer(bsDatas[1], 'base64');
					//   var currentDate = new Date();
					//   var year = currentDate.getFullYear();
					//   var month = currentDate.getMonth() + 1;
					//   var day = currentDate.getDate();
					//   var dirPath = config.uploadImgPath + '/' + year + '/' + month + '/' + day + '/';
					//   var filePath = dirPath + fileName;
					//   if(!mkdirsSync(path.resolve('.'+dirPath))){
					//     alert("保存图片出错！");
					//   }else{
					//     fs.writeFile(path.resolve('.' + filePath), bitmap, function () {
					//       console.log("inputText:", scope.inputText);
					//       preStr = scope.inputText.substring(0, endPoint);//截取要插入位置的前半部分内容
					//       backStr = scope.inputText.substring(endPoint);//截取要插入位置的后半部分内容
					//       scope.inputText = preStr + '\r\n' + '![](' + '.' +filePath + ')' + '\r\n' + backStr;
					//       scope.$apply();
					//     });
					//   }
					// }
					// console.log("base64Data:",base64Data);
					$http.post(config.get("imageServer") + config.get("base64UploadApi"), {imgbase64: bsDatas[1]}).then(function (result) {
						if (result.data.flagCode == 1) {
							preStr = scope.inputText.substring(0, endPoint);//截取要插入位置的前半部分内容
							backStr = scope.inputText.substring(endPoint);//截取要插入位置的后半部分内容
							var imgUrl = config.get("imageServer") + result.data.result.picPath.substring(1);
							scope.inputText = preStr + '\r\n' + '![](' + imgUrl + ')' + '\r\n' + backStr;
							scope.$apply();
						} else {
							console.log(result);
							alert("出错了" + JSON.stringify(result.data));
						}
					}).catch(function (err) {
						console.error(err);
					})
				};
			};


			//创建多层文件夹 同步
			function mkdirsSync(dirpath, mode) {
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

		}
	}
}]);