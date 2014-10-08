app.controller('MainController', ['$scope', '$rootScope', function($scope, $rootScope) {

	$scope.tabs = [];
	$scope.opModel = 'movefree';

	$scope.setAllTabsInactive = function() {
		angular.forEach($scope.tabs, function(tab) {
			tab.active = false;
		});
	};

	$scope.addFile = function(f) {
		$scope.setAllTabsInactive();
		f['active'] = true;
		$scope.tabs.push(f);
	};

}]);
