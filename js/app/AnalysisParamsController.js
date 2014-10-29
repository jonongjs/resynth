app.controller('AnalysisParamsController', function($scope, $modalInstance, params) {

	$scope.params = params;

	$scope.ok = function() {
		$modalInstance.close($scope.params);
	};

	$scope.cancel = function() {
		$modalInstance.dismiss('cancel');
	};

});
