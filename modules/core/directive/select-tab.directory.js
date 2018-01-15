/**
 * Created by JamKong on 2017-03-01.
 * 动态选择tab页面，用来辅助uitab标签的
 */
var cnoteApp = angular.module("cnoteApp");
cnoteApp.directive('initTab', ['$timeout',function ($timeout) {
  return {
    restrict: 'A',
    scope:false,
    link: function (scope, ele, attrs) {
      $timeout(function(){
        angular.element(ele[0]).children('a')[0].click();
      })
    }
  }
}])
  .directive('selectTab', function () {
  return {
    restrict: 'A',
    scope:false,
    link: function (scope, ele, attrs) {
      ele.click(function(){
        var tab = angular.element("#"+attrs['selectTab']).children('a')[0];
        if(!!tab){
          tab.click();
        }
      });
    }
  }
});