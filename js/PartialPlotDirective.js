app.directive('partialPlot', function($window) {
	return function(scope, element, attrs) {

		var isPartialSelected = function(partial, box) {
			// Check if one of the points lies in the selection box
			var birth = partial['birth'];
			return _(partial['peaks'])
				.pluck('freq')
				.any(function(freq, idx, collection) {
					return box.minFreq <= freq && freq <= box.maxFreq
						&& box.minFrame <= idx+birth && idx+birth <= box.maxFrame;
				});
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

			svg.append('clipPath')
					.attr('id', 'chart-area')
				.append('rect')
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', w)
					.attr('height', h);

			// Main drag op
			var dragops = {
				'start': [0,0],
				// Event handlers for the different ops
				'select': {
					'dragstart': function(o) {
						d3.event.sourceEvent.stopPropagation();
						dragops['start'] = d3.mouse(d3.event.sourceEvent.target);
						svg.append('rect')
							.classed('selectionbox', true)
							.attr('x', dragops['start'][0])
							.attr('y', dragops['start'][1])
							.attr('width', 1)
							.attr('height',1);
					},
					'drag': function(o) {
						var x = dragops['start'][0],
							y = dragops['start'][1],
							dx = d3.event.x - x,
							dy = d3.event.y - y
							rect = { x: (dx < 0) ? x+dx : x,
									 y: (dy < 0) ? y+dy : y,
									 width: (dx < 0) ? -dx : dx,
									 height: (dy < 0) ? -dy : dy },
							selectionBox = { minFrame: xscale.invert(rect.x),
											 maxFrame: xscale.invert(rect.x+rect.width),
											 minFreq : yscale.invert(rect.y+rect.height),
											 maxFreq : yscale.invert(rect.y) };
						svg.selectAll('.selectionbox').attr(rect);
						d3.selectAll('.gmain path')
							.classed('selected', function(d) {
								return isPartialSelected(d, selectionBox);
							});
					},
					'dragend': function(o) {
						d3.selectAll('.selectionbox').remove();
					}
				},
				'movefree': {
					'dragstart': function(o) {
						d3.event.sourceEvent.stopPropagation();
						d3.selectAll('.gmain path.selected').classed('dragging', true);
					},
					'drag': function(o) {
						var dx = Math.round(dxfactor * d3.event.dx);
						var dy = Math.round(dyfactor * d3.event.dy);
						d3.selectAll('.gmain path.dragging')
							.each(function(partial) {
								partial['birth'] += dx;
								for (var i=0; i<partial['peaks'].length; ++i) {
									partial['peaks'][i]['freq'] += Math.round(dy);
								}
							})
							.attr('d', makelinefunc);
					},
					'dragend': function(o) {
						d3.selectAll('.gmain path.dragging').classed('dragging', false);
					}
				},
				'scaleh': {
					'dragstart': function(o) {
					},
					'drag': function(o) {
					},
					'dragend': function(o) {
					}
				},
				'scalev': {
					'dragstart': function(o) {
					},
					'drag': function(o) {
					},
					'dragend': function(o) {
					}
				}
			};
			var maindrag = d3.behavior.drag()
				.on('dragstart', function(o) { dragops[scope.opModel]['dragstart'](o); })
				.on('drag', function(o) { dragops[scope.opModel]['drag'](o); })
				.on('dragend', function(o) { dragops[scope.opModel]['dragend'](o); });

			// Main group
			var gmain = svg.append('g')
				.classed('gmain', true)
				.call(maindrag);
			gmain.append('rect')
				.classed('dragarea', true)
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', w)
				.attr('height', h);
			// Dealing with data
			gmain.selectAll('path')
					.data(partials)
				.enter().append('path')
					.attr('class', 'line')
					.attr('d', makelinefunc);

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

		scope.plotPartials = function() {
			var partials = scope.partials;
			var sampleRate = scope.sampleRate;
			var spectrogram = scope.spectrogram;
			plotPartials(element[0], partials, sampleRate, spectrogram);
		};
	};
});
