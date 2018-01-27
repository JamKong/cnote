'use strict';


var cnoteApp = angular.module("cnoteApp");
var path = require('path');
var config = require('config');
var imagerServer = config.get("imageServer");
cnoteApp.directive("standardEditor", ["$window", "$sce", "$timeout", function ($window, $sce, $timeout) {
	return {
		restrict: 'A',
		scope: {
			currentFile: "="
		},
		link: function (scope, ele, attrs, ctrl) {
			// console.log("content:" + content);
			//ele[0].id = attrs['standardEditor'];
			if (ele.children('#toolbar_' + attrs['standardEditor']).length == 0) {
				ele.append('<div id="toolbar_' + attrs['standardEditor'] + '"></div>');
				ele.append('<div id="text_' + attrs['standardEditor'] + '" style="height: 100%;"></div>');
				var editor = createEditor();
				editor.create();
				// 禁止编辑
				editor.$textElem.attr('contenteditable', false);

				scope.currentFile.editor = editor;

				// console.log("attrs['standardEditor']:"+attrs['standardEditor'])
				scope.currentFile.editor.onlyRead = function () {
					// console.log(ele.children(".w-e-toolbar"))
					scope.currentFile.editor.$textElem.attr('contenteditable', false);
					ele.children(".w-e-toolbar").addClass("hide");
				};
				scope.currentFile.editor.edit = function () {
					scope.currentFile.editor.$textElem.attr('contenteditable', true);
					ele.children(".w-e-toolbar").removeClass("hide");
				};

				if(!!scope.currentFile.isEditer){
					scope.currentFile.editor.edit();
				}else{
					scope.currentFile.editor.onlyRead();
				}
			}
			var content = scope.currentFile.content;

			editor.txt.html($sce.trustAsHtml(content));

			editor.customConfig.onchange = function (html) {
				// html 即变化之后的内容
				// console.log(html);
				scope.currentFile.content = html;
				scope.$apply();
			};





			function createEditor(){
				var E = $window.wangEditor;
				var editor = new E("#toolbar_" + attrs['standardEditor'], "#text_" + attrs['standardEditor']);
				// 关闭粘贴样式的过滤
				editor.customConfig.pasteFilterStyle = false;
				// editor.customConfig.uploadImgShowBase64 = true;  // 使用 base64 保存图片
				editor.customConfig.uploadImgServer = imagerServer + config.get("wangeditUploadApi");
				editor.customConfig.uploadImgHooks = {
					before: function (xhr, editor, files) {
						// 图片上传之前触发
						// xhr 是 XMLHttpRequst 对象，editor 是编辑器对象，files 是选择的图片文件

						// 如果返回的结果是 {prevent: true, msg: 'xxxx'} 则表示用户放弃上传
						// return {
						//     prevent: true,
						//     msg: '放弃上传'
						// }
					},
					success: function (xhr, editor, result) {
						// 图片上传并返回结果，图片插入成功之后触发
						// xhr 是 XMLHttpRequst 对象，editor 是编辑器对象，result 是服务器端返回的结果
					},
					fail: function (xhr, editor, result) {
						// 图片上传并返回结果，但图片插入错误时触发
						// xhr 是 XMLHttpRequst 对象，editor 是编辑器对象，result 是服务器端返回的结果
					},
					error: function (xhr, editor) {
						// 图片上传出错时触发
						// xhr 是 XMLHttpRequst 对象，editor 是编辑器对象
					},
					timeout: function (xhr, editor) {
						// 图片上传超时时触发
						// xhr 是 XMLHttpRequst 对象，editor 是编辑器对象
					},

					// 如果服务器端返回的不是 {errno:0, data: [...]} 这种格式，可使用该配置
					// （但是，服务器端返回的必须是一个 JSON 格式字符串！！！否则会报错）
					customInsert: function (insertImg, result, editor) {
						// 图片上传并返回结果，自定义插入图片的事件（而不是编辑器自动插入图片！！！）
						// insertImg 是插入图片的函数，editor 是编辑器对象，result 是服务器端返回的结果

						// 举例：假如上传图片成功后，服务器端返回的是 {url:'....'} 这种格式，即可这样插入图片：

						if (result && result.data && result.data.length > 0) {
							for (var i = 0; i < result.data.length; i++) {
								// console.log(imagerServer + result.data[i].substring(1));
								insertImg(imagerServer + result.data[i].substring(1));
							}

						}
						// var url = result.;
						// insertImg(url)

						// result 必须是一个 JSON 格式字符串！！！否则报错
					}
				};


				return editor;
			}
		}
	}
}]);