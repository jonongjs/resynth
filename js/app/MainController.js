app.controller('MainController', ['$scope', '$rootScope', function($scope, $rootScope) {

	$scope.tabs = [];

	$scope.audioContext = null;
	// WebAudio stuff
	if (typeof AudioContext !== "undefined") {
		$scope.audioContext = new AudioContext();
	} else if (typeof webkitAudioContext !== "undefined") {
		$scope.audioContext = new webkitAudioContext();
	} else {
		throw new Error('AudioContext not supported.');
	}

	$scope.setAllTabsInactive = function() {
		angular.forEach($scope.tabs, function(tab) {
			tab.active = false;
		});
	};

	$scope.addFile = function(f) {
		$scope.setAllTabsInactive();
		$scope.tabs.push({
			title: f.name,
			file: f,
			active: true
		});
	};

	$scope.removeTab = function (index) {
		$scope.tabs.splice(index, 1);
	};

	var pasteBuffer = [];
	$scope.putInBuffer = function(selection) {
		pasteBuffer = _.cloneDeep(selection);
	};
	$scope.getBuffer = function() {
		return pasteBuffer;
	};

}]);
