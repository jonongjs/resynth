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

			var TAU_FACTOR = Math.PI * 2.0 / (windowSize - 1);
			var i;
			for (i=0; i<windowSize; ++i) {
				samples[i] = 0.54 - (0.46 * Math.cos(TAU_FACTOR * i));
				sum += samples[i];
			}
			for (i=0; i<windowSize; ++i) {
				samples[i] /= sum;
			}

			return samples;
		};

		var plotWaveform = function(canvas, buffer) {
			canvas.width = canvas.width; // Clear the canvas
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
			canvas.width = canvas.width; // Clear the canvas
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


		scope.processAudio = function(processedCallback) {
			var soundFile = scope.tab.file;
			var soundAsset = AV.Asset.fromFile(soundFile);
			soundAsset.on('error', function(e) {
				scope.alerts.push({ msg: 'An error occurred while reading the file: ' + e, type: 'danger' });
			});

//			var timeDomainCanvas = document.createElement('canvas');
//			timeDomainCanvas.style.width = '100%';
//			timeDomainCanvas.style.height = '9em';
//			var spectrogramCanvas = document.createElement('canvas');
//			spectrogramCanvas.style.width = '100%';
//			spectrogramCanvas.style.height = '9em';
//
//			element.append(timeDomainCanvas);
//			element.append(spectrogramCanvas);

			soundAsset.decodeToBuffer(function(buffer) {
				if (buffer.length > 0) {
					var fftsize = scope.params.windowSize;
					var sampleRate = soundAsset.format.sampleRate;

					scope.spectrogram = getSpectrogram(buffer, sampleRate, fftsize);
					scope.peaks = mqAudio.detectPeaks(scope.spectrogram, sampleRate, scope.params.threshold, scope.params.maxPeaks);
					scope.partials = mqAudio.trackPartials(scope.peaks, scope.params.matchDelta);

					// Create playback parameters
					scope.sampleRate = sampleRate;
					scope.synthesize = function(partials) {
						return mqAudio.synthesize(partials, fftsize, sampleRate);
					};

					if (processedCallback) {
						processedCallback();
					}
				}
			});
		};

		scope.addPartials = function(partials) {
			scope.partials = scope.partials.concat(partials);
		};
		scope.removePartials = function(partials) {
			scope.partials = _.difference(scope.partials, partials);
		};

		// Takes in audio samples (in floating-point representation)
		// and generates a 16-bit PCM .wav buffer with given sample rate
		// and the specified number of channels (1 if unspecified)
		scope.exportWav = function(samples, sampleRate, numChannels) {
			numChannels = numChannels || 1;
			// Adapted from RecorderJS
			var sampleBytes = samples.length * 2;
			var blockAlign = numChannels * 2; // Channel count * bytes per sample
			var buffer = new ArrayBuffer(44 + sampleBytes);
			var view = new DataView(buffer);

			// RIFF
			view.setUint8(0, 'R'.charCodeAt(0))
			view.setUint8(1, 'I'.charCodeAt(0))
			view.setUint8(2, 'F'.charCodeAt(0))
			view.setUint8(3, 'F'.charCodeAt(0))
			// RIFF chunk length
			view.setUint32(4, 36 + sampleBytes, true);
			// RIFF type
			view.setUint8(8,  'W'.charCodeAt(0))
			view.setUint8(9,  'A'.charCodeAt(0))
			view.setUint8(10, 'V'.charCodeAt(0))
			view.setUint8(11, 'E'.charCodeAt(0))

			// Format chunk identifier
			view.setUint8(12, 'f'.charCodeAt(0))
			view.setUint8(13, 'm'.charCodeAt(0))
			view.setUint8(14, 't'.charCodeAt(0))
			view.setUint8(15, ' '.charCodeAt(0))
			// Format chunk length
			view.setUint32(16, 16, true);
			// Sample format (raw)
			view.setUint16(20, 1, true);
			// Channel count
			view.setUint16(22, numChannels, true);
			// Sample rate
			view.setUint32(24, sampleRate, true);
			// Byte rate (sample rate * block alignment)
			view.setUint32(28, sampleRate * blockAlign, true);
			// Block alignment (channel count * bytes per sample)
			view.setUint16(32, blockAlign, true);
			// Bits per sample
			view.setUint16(34, 16, true);

			// Data chunk identifier
			view.setUint8(36, 'd'.charCodeAt(0))
			view.setUint8(37, 'a'.charCodeAt(0))
			view.setUint8(38, 't'.charCodeAt(0))
			view.setUint8(39, 'a'.charCodeAt(0))
			// Data chunk length
			view.setUint32(40, sampleBytes, true);
			// Write the data
			// Convert from floating-point PCM to 16-bit PCM and write
			var offset = 44;
			for (var i=0; i<samples.length; i++, offset+=2){
				var s = Math.max(-1, Math.min(1, samples[i]));
				view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
			}

			return view;
		};
	}

});
