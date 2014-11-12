app.controller('TabController', ['$scope', '$rootScope', '$modal', '$log', function($scope, $rootScope, $modal, $log) {

	$scope.params = {
		threshold: 0.01,
		maxPeaks: 60,
		matchDelta: 200,
		windowSize: 1024,
		hopSize: 512
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

	$scope.downloadWav = function() {
		var samples = $scope.synthesize($scope.partials);
		var wavdata = $scope.exportWav(samples, $scope.sampleRate, 1);
		var blob = new Blob([wavdata], { type: 'audio/wav' });
		var url = URL.createObjectURL(blob);

		var lastDot = $scope.tab.title.lastIndexOf('.');
		var saveName = (lastDot >= 0) ? $scope.tab.title.substring(0, lastDot) : $scope.tab.title;
		saveName = saveName + '-resynth.wav';

		var link = document.createElement('a');
		link.href = url;
		link.download = saveName;
		link.innerText = saveName;
		link.click();
	}

	$scope.downloadPd = function() {
		var partials = $scope.partials;
		var hopsize = Math.max(1, $scope.params.hopSize);
		var sampleRate = $scope.sampleRate;

		var pddata = '';
		pddata += '#N canvas 328 222 675 482 10;\r\n';
		pddata += '#X obj 196 82 bng 15 250 50 0 empty empty empty 17 7 0 10 -262144 -1 -1;\r\n'; // Object 0
		pddata += '#X obj 197 181 dac~;\r\n'; // Object 1
		pddata += '#X obj 195 153 *~ 0.4;\r\n'; // Object 2

		_(partials).each(function(track, i) {
			var patchname = 'partial-' + i;
			var x = 194 + 50*i, y = 114;
			pddata += '#N canvas 99 300 320 177 '+ patchname +' 0;\r\n';
			pddata += '#X obj 47 65 vline~;\r\n';
			pddata += '#X obj 53 163 outlet~;\r\n';
			pddata += '#X obj 48 101 osc~;\r\n';
			pddata += '#X obj 53 5 inlet;\r\n';

			// Send frequencies
			pddata += '#X msg 106 35 0 0';
			_(track).each(function(peak, pi) {
				var frame = peak['frame'];
				var prevframe = (pi == 0) ? 0 : track[pi-1]['frame'];
				var interval = (pi == 0) ? 0 : Math.round((frame-prevframe)*hopsize*1000/sampleRate);
				var delay = (pi == 0) ? 0 : Math.round(prevframe*hopsize*1000/sampleRate);
				pddata += ' \\, '+peak['peak']['freq']+' '+interval+' '+delay;
				//'0 0 \\, 440 2000 0 \\, 220 2000 2000 \\, 440 2000 4000;\r\n';
			});
			pddata += ';\r\n';

			pddata += '#X obj 96 93 vline~;\r\n';
			pddata += '#X obj 63 135 *~;\r\n';

			// Send amplitudes
			pddata += '#X msg 131 64 0 0'
			_(track).each(function(peak, pi) {
				var frame = peak['frame'];
				var amp = peak['peak']['amp'];
				var prevframe = (pi == 0) ? 0 : track[pi-1]['frame'];
				var interval = (pi == 0) ? 0 : Math.round((frame-prevframe)*hopsize*1000/sampleRate);
				var delay = (pi == 0) ? 0 : Math.round(prevframe*hopsize*1000/sampleRate);
				pddata += ' \\, '+amp+' '+interval+' '+delay;
				//'0 0 \\, 0.2 2000 0 \\, 0.5 2000 2000 \\, 0 2000 4000;\r\n';
			});
			pddata += ';\r\n';

			pddata += '#X connect 0 0 2 0;\r\n';
			pddata += '#X connect 2 0 6 0;\r\n';
			pddata += '#X connect 3 0 4 0;\r\n';
			pddata += '#X connect 3 0 7 0;\r\n';
			pddata += '#X connect 4 0 0 0;\r\n';
			pddata += '#X connect 5 0 6 1;\r\n';
			pddata += '#X connect 6 0 1 0;\r\n';
			pddata += '#X connect 7 0 5 0;\r\n';
			pddata += '#X restore '+x+' '+y+' pd ' + patchname + ';\r\n';
		});

		// Connect bangs and outlets
		_(partials).each(function(p, i) {
			var pd_index = 3+i;
			pddata += '#X connect 0 0 ' + pd_index + ' 0;\r\n';
			pddata += '#X connect ' + pd_index + ' 0 2 0;\r\n';
		});
		// Connect *~ to dac~
		pddata += '#X connect 2 0 1 0;\r\n';
		pddata += '#X connect 2 0 1 1;\r\n';

		var blob = new Blob([pddata], { type: 'text/plain' });
		var url = URL.createObjectURL(blob);

		var lastDot = $scope.tab.title.lastIndexOf('.');
		var saveName = (lastDot >= 0) ? $scope.tab.title.substring(0, lastDot) : $scope.tab.title;
		saveName = saveName + '-resynth.pd';

		var link = document.createElement('a');
		link.href = url;
		link.download = saveName;
		link.innerText = saveName;
		link.click();
	}

}]);
