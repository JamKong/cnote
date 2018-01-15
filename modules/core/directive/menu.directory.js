/**
 * 内容菜单（不是全局菜单）指令
 */
var cnoteApp = angular.module("cnoteApp");
cnoteApp.directive('contextMenu', function () {
    return {
        restrict: 'A',
        scope: {
            menu: "=",//（必须）菜单项对象数组
            currentWindow: "=",//（必须）remote.getCurrentWindow()
            menuModal: "="//（可选）可以给绑定该内容菜单的Dom节点存储一个对象，用于在进行内容菜单的时候需要使用到该对象要区分该内容菜单附着在哪个对象上
        },
        link: function (scope, element, attrs) {
            var className = "directive_contextmenu";
            element.addClass(className);
            element.on('contextmenu', function (event) {
                bubbleMatchClassName(event.target, className, function () {
                    event.preventDefault();
                    event.stopPropagation();
                    scope.$root.menuModal = scope.menuModal;
                    scope.menu.popup(scope.currentWindow);
                });
            });

            //console.log('element.parents(".child-menu"):', element.parents(".child-menu").length);
            element.children("li").css("padding-left", (element.parents(".child-menu").length + 1) * 10);

            /**
             * 事件委托
             * @param event 触发事件
             * @param matchClassName 用className来匹配当前节点是否符合条件进行绑定事件
             */
            function bubbleMatchClassName(target, matchClassName, cb) {
                if (!!target.classList && target.classList.length) {
                    for (var i = 0; i < target.classList.length; i++) {
                        if (target.classList[i] == matchClassName) {
                            return cb();
                        }
                    }
                }
                return bubbleMatchClassName(target.parentElement, matchClassName, cb);
            }

        }
    }
});


/**
 * 菜单折叠切换指令，单击选中不切换折叠状态，双击选中并改变折叠状态
 * options:{
 *                  isBindClick:boolean //默认为true,是否绑定单击事件
 *                  isBindDbClick:boolean//默认为true,是否绑定双击事件
 *                  iconIsBindClick:boolean//默认为true,图标是否绑定单击事件
 *                    }
 */
cnoteApp.directive('menuToggle', function () {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var children = angular.element(element.children("i")[0]);
            var options = {isBindClick: true, isBindDbClick: true, iconIsBindClick: true};
            if (!!attrs.menuToggle) {
                options = _.extend(options, JSON.parse(attrs.menuToggle));
            }

            element.on("selectstart", function () {
                return false;
            });
            if (options && options.isBindClick) {
                element.on("click", function (event) {
                    selectActive();
                });
            }

            if (options && options.isBindDbClick) {
                element.on("dblclick", function (event) {
                    selectActive();
                    collapsing();
                });
            }

            if (options && options.iconIsBindClick) {
                //给图标添加一个点击事件
                element.children('i')[0].onclick = function () {
                    selectActive();
                    collapsing();
                };

            }

            if (options.active) {
                selectActive();
                collapsing();
            }

            //选中当前活动菜单
            function selectActive() {
                angular.element('.menu-item').removeClass('menu-active');
                element.addClass("menu-active");
            }

            //折叠
            function collapsing() {
                if (children.hasClass("fa-caret-right")) {
                    children.removeClass("fa-caret-right");
                    children.addClass("fa-caret-down");
                    element.nextAll().css("display", "block");
                } else {
                    children.removeClass("fa-caret-down");
                    children.addClass("fa-caret-right");
                    element.nextAll().css("display", "none");
                }
            }


        }
    }
});