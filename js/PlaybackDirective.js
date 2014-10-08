app.directive('playback', function($window) {
	return function(scope, element, attrs) {
		var btn = element[0];

		scope.isPlaying = false;

		var stopPlayback = function() {
			if (scope.sourceNode != null) {
				scope.sourceNode.stop();
				scope.sourceNode = null;
			}
			scope.isPlaying = false;

			scope.safeApply();
		};

		var startPlayback = function() {
			var buffer = scope.synthesize();

			var len = buffer.length;
			var webAudioBuf = scope.audioContext.createBuffer(1, len, scope.sampleRate);
			var arr = webAudioBuf.getChannelData(0);
			for (var i=0; i<len; ++i) {
				arr[i] = buffer[i];
			}

			var sourceNode = scope.audioContext.createBufferSource();
			sourceNode.buffer = webAudioBuf;
			sourceNode.connect(scope.audioContext.destination);
			sourceNode.onended = function() {
				scope.sourceNode = null;
				stopPlayback();
				btn.onclick = startPlayback;
			};
			sourceNode.start();
			scope.sourceNode = sourceNode;
			scope.isPlaying = true;

			scope.safeApply();
		};

		btn.onclick = startPlayback;
	};
});
