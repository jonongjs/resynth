app.controller('TabController', ['$scope', '$rootScope', '$modal', '$log', function($scope, $rootScope, $modal, $log) {

	$scope.params = {
		threshold: 0.00001,
		maxPeaks: 60,
		matchDelta: 200,
		windowSize: 1024
	};

	$scope.alerts = [];

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
		$scope.processAudio($scope.plotPartials);
	}, function () {
		//$log.info('Modal dismissed at: ' + new Date());
		//TODO: remove tab
	});

	$scope.cutSelection = function() {
		var selection = $scope.getSelection();
		$scope.putInBuffer(selection);
		$scope.removePartials(selection);
		$scope.replotPartials($scope.partials);
	};
	$scope.copySelection = function() {
		$scope.putInBuffer($scope.getSelection());
	};
	$scope.pasteFromBuffer = function() {
		$scope.addPartials($scope.getBuffer());
		$scope.replotPartials($scope.partials);
	};

}]);
