app.directive('soundMagic', function($window) {

	return function(scope, element, attrs) {

		var plotColumn = function(canvas, spectrum, column) {
			var context = canvas.getContext('2d');
			var height = canvas.height;
			var length = spectrum.length;
			for (var i=0; i<length; ++i) {
				var intensity = ~~(spectrum[i]*255*100);
				context.fillStyle = 'rgb('+intensity+','+intensity+','+intensity+')';
				context.fillRect(column*2, height-i*2-2, 2, 2);
			}
		};

		var fftsize = parseInt(attrs.fftsize);

		var soundFile = scope.tab;
		var soundAsset = AV.Asset.fromFile(soundFile);

		soundAsset.on('error', function(e) {
			console.log(e);
		});

		var canvas = document.createElement('canvas');
		console.log(element[0]);
		canvas.style.width = '100%';
		canvas.style.height = '8em';
		var spectrogram = document.createElement('canvas');
		spectrogram.style.width = '100%';
		spectrogram.style.height = '8em';

		element.append(canvas);
		element.append(spectrogram);

		soundAsset.decodeToBuffer(function(buffer) {
			var context = canvas.getContext('2d');
			if (buffer.length > 0) {
				// Draw waveform
				context.moveTo(0, canvas.height/2);
				var increment = canvas.width/buffer.length;
				_(buffer)
				//						.groupBy(function(value, idx, collection) {
				//							return Math.floor(idx/canvas.width);
				//						})
				//						.map(function(value, idx, collection) {
				//							var max = _.max(value);
				//							var min = _.min(value);
				//							return (Math.abs(max) > Math.abs(min)) ? max : min;
				//						})
				.each(function(value, idx, collection) {
					context.lineTo(idx*increment, (value+1)*canvas.height/2);
				});
				context.lineWidth = 1;
				context.strokeStyle = "rgb(0,0,200)";
				context.stroke();

				// Draw spectrogram
				var fft = audioLib.FFT(soundAsset.format.sampleRate, fftsize);
				var index = 0;
				for (var i=0; i<buffer.length/fftsize; ++i) {
					for (var j=0; j<fftsize; ++j) {
						fft.pushSample(buffer[index++]);
					}
					plotColumn(spectrogram, fft.spectrum, i);
				}
			}
		});
	}

});
