(function(exports) {

	// Peak = { freq:frequency, amp:magnitude }
	// detectPeaks() returns an Array of Peaks
	//
	// Track = [ { frame:frameNumber, peak:peak }, ... ]
	// trackPartials() returns an Array of Tracks, ordered by birth

	var abs = Math.abs;
	var sin = Math.sin;
	var PI  = Math.PI;
	var log10 = (Math.log10) ? Math.log10 : function(x) { return Math.log(x)/Math.log(10); };

	// Detect peaks in a amplitude spectrogram.
	// Inputs:
	// - spectrogram: 2D array, 1st axis as time, 2nd axis as frequency bins,
	//                values are magnitudes
	// - sampleRate: sampling rate (to get actual frequencies)
	// - threshold: minimum amplitude for a peak
	// - maxPeaks: (optional) maximum number of peaks to find
	// Outputs:
	// - 2D array of peak frequencies found over time,
	//   1st axis as time (frames), 2nd axis as ascending peak frequencies
	exports.detectPeaks = function(spectrogram, sampleRate, threshold, maxPeaks) {
		// Detection of peaks with polynomial interpolation
		var allPeaks = [];

		_(spectrogram).forEach(function(frame, idx, collection) {
			var framePeaks = [];

			var prevMag = frame[0];
			var curMag  = frame[1];
			var i;
			var bins = frame.length;
			var binFactor = sampleRate / (bins*2);
			for (i=1; i<bins-1; ++i) {
				var nextMag = frame[i+1];
				if (curMag > prevMag && curMag > nextMag && curMag > threshold) {
					// Found a peak; we interpolate the dB scale values
					var alpha = 20*log10((prevMag > 0) ? prevMag : 1e-6);
					var beta = 20*log10((curMag > 0) ? curMag : 1e-6);
					var gamma = 20*log10((nextMag > 0) ? nextMag : 1e-6);
					var centre = i + (alpha-gamma) * 0.5 / (alpha - 2*beta + gamma);
					var amp = Math.pow(10, (beta - 0.25*(alpha-gamma)*(centre-i))/20);
					framePeaks.push({ freq: centre*binFactor, amp: amp });
				}
				prevMag = curMag;
				curMag = nextMag;
			}

			framePeaks = _.sortBy(framePeaks, 'freq');

			if (maxPeaks !== void 0) {
				// Maximum number of peaks specified
				framePeaks = _.last(framePeaks, maxPeaks);
			}

			allPeaks.push(framePeaks);
		});

		return allPeaks;
	};

	// Finds the index of a candidate peak for the given frequency.
	// Assumes that nextPeaks is an array of peaks sorted by ascending freq.
	var findCandidateIndex = function(curPeak, nextPeaks, matchingThreshold) {
		var candidates = [];
		var m = _.sortedIndex(nextPeaks, curPeak); // Index around which to search
		if (m < nextPeaks.length && abs(nextPeaks[m]-curPeak) <= matchingThreshold) {
			candidates.push(m);
		}
		if (m > 0 && abs(nextPeaks[m-1]-curPeak) <= matchingThreshold) {
			candidates.push(m-1);
		}
		if (m+1 < nextPeaks.length && abs(nextPeaks[m]-curPeak) <= matchingThreshold) {
			candidates.push(m+1);
		}

		if (candidates.length == 0)
			return null;
		return _.min(candidates, function(val) {
			return abs(nextPeaks[val]-curPeak);
		});
	};


	// Track partials from detected peaks
	// Inputs:
	// - peaks: 2D array, 1st axis as time, 2nd axis as peaks
	// - matchingThreshold: max delta for a frequency match
	// Outputs:
	// - 
	exports.trackPartials = function(peaksFrames, matchingThreshold) {
		// Track = [ { frame:frameNumber, peak:Peak }, ... ]
		// Perform McAulay-Quatieri frame-to-frame peak matching 
		var tracks = [];
		var curTracks = [];

		var trackComparison = function(track) {
			return _.last(track)['peak']['freq'];
		};

		// Treat all the peaks in the first frame as a 'birth'
		_(peaksFrames[0]).forEach(function(peak) {
			curTracks.push([ { frame: 0, peak: peak } ]);
		});

		// Process the rest of the frames
		_(peaksFrames).rest().forEach(function(frame, frameIdx) {
			// Note: frameIdx == f corresponds peaksFrames[f+1]
			var nextPeaks = _.clone(frame);
			curTracks = _.sortBy(curTracks, trackComparison);

			// Clone curTracks so that we can modify it safely inside the foreach
			_(curTracks).clone()
			 .forEach(function(track, trackIdx, collection) {
				 // Look for a matching peak for this track
				 var curFreq = _.last(track)['peak']['freq'];
				 var nextFreqs = _(nextPeaks).pluck('freq').value();
				 var candidateIdx = findCandidateIndex(curFreq, nextFreqs, matchingThreshold);

				 if (candidateIdx == null) {
					 // No candidates within matchingThreshold, treat as death
					 track.push({ frame: frameIdx+1, peak: { freq: curFreq, amp: 0 } });
					 tracks.push(track);
					 _.pull(curTracks, track);
				 } else {
					 // Check if another track with a higher frequency
					 // could be matched with this peak
					 var unmatchedTrackFreqs = _(collection).rest(trackIdx)
						 									.map(_.last)
															.pluck('peak')
															.pluck('freq')
															.value();
					 var possibleTrackIdx = findCandidateIndex(
						 						nextFreqs[candidateIdx],
												unmatchedTrackFreqs,
												matchingThreshold);

					 if (unmatchedTrackFreqs[possibleTrackIdx] == curFreq) {
						 // Definitive match (no other tracks to match this candidate)
						 track.push({ frame: frameIdx+1, peak: nextPeaks[candidateIdx] });
						 _.pull(nextPeaks, nextPeaks[candidateIdx]);
					 } else {
						 // Candidate could match another track
						 // Check if there is a lower frequency match
						 var lowerIndex = candidateIdx-1;
						 if (lowerIndex<0 || abs(nextFreqs[lowerIndex]-curFreq) > matchingThreshold) {
							 // Lower frequency is not a possible match
							 // Treat this as death
							 track.push({ frame: frameIdx+1, peak: { freq: curFreq, amp: 0 } });
							 tracks.push(track);
							 _.pull(curTracks, track);
						 } else {
							 // Take the lower frequency instead
							 track.push({ frame: frameIdx+1, peak: nextPeaks[lowerIndex] });
							 _.pull(nextPeaks, nextPeaks[lowerIndex]);
						 }
					 }
				 }
			 });

			 // After all matches have been done, remaining peaks are treated as births
			 _(nextPeaks).forEach(function(peak) {
				 curTracks.push([
					 { frame: frameIdx, peak: {freq:peak.freq, amp:0} },
					 { frame: frameIdx+1, peak: peak }
				 ]);
			 });
		});

		_(curTracks).forEach(function(track) {
			tracks.push(track);
		});

		return tracks;
	};

	exports.synthesize = function(tracks, frameLen, samplingRate) {
		var numFrames = _(tracks)
					.map(function(track) { return _.last(track)['frame']; })
					.max()
					.value();
		numFrames = Math.ceil(numFrames);
		var FREQ_FACTOR = 2.0 * PI / samplingRate;
		var bufferSize  = numFrames * frameLen;
		var audioBuffer = new Float64Array(bufferSize);

		_(tracks).forEach(function(track, idx, col) {
			var i = Math.round(track[0].frame * frameLen);
			var instPhase = 0;
			// Go through all peaks except the last and linearly interpolate freq and amp
			_(track).forEach(function(framePeak, idxp, colp) {
				if (idxp == colp.length-1)
					return;

				// Linearly interpolate freq and amp between peaks
				var samplesTillNextPeak = Math.round(colp[idxp+1].frame - framePeak.frame) * frameLen;
				var startFreq = framePeak.peak.freq;
				var startAmp = framePeak.peak.amp;
				var instAmp  = startAmp;
				var stepFreq = (colp[idxp+1].peak.freq - startFreq) / samplesTillNextPeak;
				var stepAmp  = (colp[idxp+1].peak.amp - startAmp) / samplesTillNextPeak;
				var end = i+samplesTillNextPeak;
				var t = 0;
				while (i < end) {
					audioBuffer[i] += instAmp * sin(FREQ_FACTOR * t * (startFreq + stepFreq*0.5*t) + instPhase);
					instAmp  += stepAmp;
					++i;
					++t;
				}
				instPhase += FREQ_FACTOR * t * (startFreq + stepFreq*0.5*t);
			});
		});

		//TODO: figure out FFT factor
		// Normalize it
		var maxAmp = _(audioBuffer).map(abs).max().value();
		for (var i=0; i<bufferSize; ++i) {
			audioBuffer[i] = audioBuffer[i] / maxAmp * 0.5;
		}
		return audioBuffer;
	};

})(typeof exports === 'undefined' ? this['mqAudio']={} : exports);
