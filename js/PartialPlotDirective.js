app.directive('partialPlot', function($window) {
	return function(scope, element, attrs) {

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
					.attr('d', makelinefunc);
//					.call(drag);

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
						var x = dragops['start'][0], y = dragops['start'][1];
						var dx = d3.event.x - x;
						var dy = d3.event.y - y;
						svg.selectAll('.selectionbox')
							.attr('x', (dx < 0) ? x+dx : x)
							.attr('y', (dy < 0) ? y+dy : y)
							.attr('width', (dx < 0) ? -dx : dx)
							.attr('height', (dy < 0) ? -dy : dy);
					},
					'dragend': function(o) {
						d3.selectAll('.selectionbox').remove();
					}
				},
				'movefree': {
					'dragstart': function(o) {
					},
					'drag': function(o) {
					},
					'dragend': function(o) {
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
			var dragarea = svg.append('rect')
				.classed('dragarea', true)
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', w)
				.attr('height', h)
				.call(maindrag);


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
