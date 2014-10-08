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
		var plotPartials = function(canvas, partials, sampleRate, spectrogram) {
			// Setup
			var margin = { top: 20, right: 40, bottom: 20, left: 40 };
			var w = 960 - margin.left - margin.right;
			var h = 500 - margin.top - margin.bottom;

			var svg = d3.select(canvas)
						.attr('width', w + margin.left + margin.right)
						.attr('height', h + margin.top + margin.bottom)
						.append('g')
						.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

			var xscale = d3.scale.linear()
								.domain([0, spectrogram.length])
								.range([0, w]);
			var yscale = d3.scale.linear()
								.domain([0, sampleRate*0.5])
								.range([h, 0]);
			//HACK: get scaling factors
			var dxfactor = 1.0/(xscale(2)-xscale(1));
			var dyfactor = 1.0/(yscale(2)-yscale(1));

			var makelinefunc = function(partial) {
				var line = d3.svg.line()
					.x(function(d, i) { return xscale(partial['birth'] + i); })
					.y(function(d) { return yscale(d['freq']); });
				return line(partial['peaks']);
			};

			// Behaviours
			var ondragstarted = function(partial) {
				d3.event.sourceEvent.stopPropagation();
				d3.select(this).classed('dragging', true);
			};
			var ondragged = function(partial) {
				var dx = Math.round(dxfactor * d3.event.dx);
				var dy = Math.round(dyfactor * d3.event.dy);
				partial['birth'] += dx;
				for (var i=0; i<partial['peaks'].length; ++i) {
					partial['peaks'][i]['freq'] += Math.round(dy);
				}
				d3.select(this)
					.attr('d', makelinefunc);
			};
			var ondragended = function(partial) {
				d3.select(this).classed('dragging', false);
			};

			var drag = d3.behavior.drag()
				.origin(function(d) { return d; })
				.on('dragstart', ondragstarted)
				.on('drag', ondragged)
				.on('dragend', ondragended);

			svg.append('clipPath')
					.attr('id', 'chart-area')
				.append('rect')
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', w)
					.attr('height', h);

			// Dealing with data
			svg.append('g')
				.selectAll('path')
					.data(partials)
				.enter().append('path')
					.attr('class', 'line')
					.attr('d', makelinefunc)
					.call(drag);

			var xaxis = d3.svg.axis()
							.scale(xscale)
							.orient('bottom')
							.ticks(5);
			var yaxis = d3.svg.axis()
							.scale(yscale)
							.orient('left')
							.ticks(5)
							.tickFormat(d3.format('s'));

			svg.append('g')
				.attr('class', 'axis')
				.attr('transform', 'translate(0,'+h+')')
				.call(xaxis);
			svg.append('g')
				.attr('class', 'axis')
				.call(yaxis);
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


		var soundFile = scope.tab.file;
		var soundAsset = AV.Asset.fromFile(soundFile);
		soundAsset.on('error', function(e) {
			console.log(e);
		});

		var SVGNS = "http://www.w3.org/2000/svg";
		var timeDomainCanvas = document.createElement('canvas');
		timeDomainCanvas.style.width = '100%';
		timeDomainCanvas.style.height = '9em';
		var spectrogramCanvas = document.createElement('canvas');
		spectrogramCanvas.style.width = '100%';
		spectrogramCanvas.style.height = '9em';
		var partialsPlot = document.createElementNS(SVGNS, 'svg');

		element.append(timeDomainCanvas);
		element.append(spectrogramCanvas);
		element.append(partialsPlot);

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
				plotPartials(partialsPlot, partials, sampleRate, spectrogram);

				// Create playback parameters
				scope.sampleRate = sampleRate;
				scope.synthesize = function() {
					return mqAudio.synthesize(partials, fftsize, sampleRate);
				};
			}
		});
	}

});
