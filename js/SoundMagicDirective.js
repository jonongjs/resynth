app.directive('soundMagic', function($window) {

	return function(scope, element, attrs) {

		var rectangularWindow = function(windowSize) {
			var samples = new Float64Array(windowSize);
			for (var i=0; i<windowSize; ++i) {
				samples[i] = 1.0;
			}
			return samples;
		};

		var hammingWindow = function(windowSize) {
			var sum = 0.0;
			var samples = new Float64Array(windowSize);

			var TAU = Math.PI * 2.0;
			var i;
			for (i=0; i<windowSize; ++i) {
				samples[i] = 0.54 - (0.46 * Math.cos(TAU * i / (windowSize - 1)));
				sum += samples[i];
			}
			for (i=0; i<windowSize; ++i) {
				samples[i] /= sum;
			}

			return samples;
		};

		var plotWaveform = function(canvas, buffer) {
			var context = canvas.getContext('2d');
			context.moveTo(0, canvas.height/2);
			var increment = canvas.width/buffer.length;
			_(buffer)
			.each(function(value, idx, collection) {
				context.lineTo(idx*increment, (value+1)*canvas.height/2);
			});
			context.lineWidth = 1;
			context.strokeStyle = "rgb(0,0,200)";
			context.stroke();
		};
		var plotSpectrogram = function(canvas, spectrogram) {
			var context = canvas.getContext('2d');
			var height = canvas.height;
			var numFrames = spectrogram.length;
			var binPixelWidth = Math.max(~~(canvas.width/spectrogram.length), 2);
			var binPixelHeight = Math.max(~~(canvas.height/spectrogram[0].length), 1);
			var normFactor = 10.0 / _(spectrogram).map(_.max).max().value();
			for (var f=0; f<numFrames; ++f) {
				var frame = spectrogram[f];
				var numBins = frame.length;
				for (var i=0; i<numBins; ++i) {
					var intensity = Math.min(~~(frame[i]*255 * normFactor), 255);
					context.fillStyle = 'rgb('+intensity+','+intensity+','+intensity+')';
					context.fillRect(f*binPixelWidth, height-(i-1)*binPixelHeight, binPixelWidth, binPixelHeight);
				}
			}
		};
		var plotPartials = function(canvas, partials, sampleRate, spectrogram) {
			var context = canvas.getContext('2d');
			var width = canvas.width;
			var height = canvas.height;
			var xfactor = width/spectrogram.length;
			var yfactor = 2.0 * height/sampleRate;
			_(partials)
			.each(function(partial, idx, collection) {
				var birth = partial['birth'];
				var firstFreq = partial['peaks'][0]['freq'];
				context.moveTo(birth*xfactor, height-firstFreq*yfactor);

				_(partial['peaks'])
				.rest()
				.each(function(peak, pidx) {
					var freq = peak['freq'];
					context.lineTo((birth+pidx)*xfactor, height-freq*yfactor);
				});
			});
			context.lineWidth = 1;
			context.strokeStyle = "rgb(0,0,200)";
			context.stroke();
		};

		var getSpectrogram = function(buffer, sampleRate, fftsize) {
			var spectrogram = [];
			var fft = audioLib.FFT(sampleRate, fftsize);
			var bufferLen  = buffer.length;
			var numBuffers = Math.ceil(bufferLen / fftsize);

			var windowSamples = hammingWindow(fftsize);

			var index = 0;
			var i,j;
			for (i=0; i<numBuffers-1; ++i) {
				for (j=0; j<fftsize; ++j) {
					fft.pushSample(buffer[index++]*windowSamples[j]);
				}
				//NOTE: audioLib.FFT gives us the magnitude spectrum
				spectrogram.push(new Float64Array(fft.spectrum));
			}
			// Handle the final frame as a special case to deal with padding
			for (j=0; j<fftsize; ++j) {
				if (index < bufferLen) {
					fft.pushSample(buffer[index++]*windowSamples[j]);
				} else {
					fft.pushSample(0);
				}
			}
			spectrogram.push(new Float64Array(fft.spectrum));

			return spectrogram;
		};


		var soundFile = scope.tab;
		var soundAsset = AV.Asset.fromFile(soundFile);
		soundAsset.on('error', function(e) {
			console.log(e);
		});

		var timeDomainCanvas = document.createElement('canvas');
		timeDomainCanvas.style.width = '100%';
		timeDomainCanvas.style.height = '9em';
		var spectrogramCanvas = document.createElement('canvas');
		spectrogramCanvas.style.width = '100%';
		spectrogramCanvas.style.height = '9em';
		var partialsCanvas = document.createElement('canvas');
		partialsCanvas.style.width = '100%';
		partialsCanvas.style.height = '9em';

		element.append(timeDomainCanvas);
		element.append(spectrogramCanvas);
		element.append(partialsCanvas);

		soundAsset.decodeToBuffer(function(buffer) {
			if (buffer.length > 0) {
				var fftsize = parseInt(attrs.fftsize);
				var maxPeaks = 60;
				var sampleRate = soundAsset.format.sampleRate;

				var spectrogram = getSpectrogram(buffer, sampleRate, fftsize);
				var peaks;
				var partials;

				peaks = mqAudio.detectPeaks(spectrogram, sampleRate, 0.00001, maxPeaks);
				partials = mqAudio.trackPartials(peaks);

				// Draw waveform
				plotWaveform(timeDomainCanvas, buffer);
				// Draw spectrogram
				plotSpectrogram(spectrogramCanvas, spectrogram);
				// Draw partials
				plotPartials(partialsCanvas, partials, sampleRate, spectrogram);
			}
		});
	}

});
