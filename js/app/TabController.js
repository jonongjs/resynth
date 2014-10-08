app.controller('TabController', ['$scope', '$rootScope', '$modal', '$log', function($scope, $rootScope, $modal, $log) {

	$scope.opModel = 'movefree';
	$scope.params = {
		threshold: 0.0001,
		maxPeaks: 60,
		matchDelta: 200,
		windowSize: 4096
	};

	var modalInstance = $modal.open({
		templateUrl: 'analysisParams.html',
		controller: 'AnalysisParamsController',
		resolve: {
			params: function () {
				return $scope.params;
			}
		}
	});

	modalInstance.result.then(function (params) {
		// $scope.params has already been modified in the modal dialog
		$scope.processAudio();
	}, function () {
		//$log.info('Modal dismissed at: ' + new Date());
		//TODO: remove tab
	});

}]);
