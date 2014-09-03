app.controller('MainController', ['$scope', '$rootScope', function($scope, $rootScope) {

	$scope.tabs = [];

	$scope.currentTab;

	$scope.setTab = function(tab) {
		$scope.currentTab = tab;
	};

	$scope.addFile = function(f) {
		$scope.tabs.push(f);
		if (!$scope.currentTab) {
			$scope.setTab(f);
		}
	};

}]);
