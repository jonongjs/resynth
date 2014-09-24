(function(exports) {

	// Peak = { freq:frequency, amp:magnitude }
	// detectPeaks() returns an Array of Peaks
	//
	// Track = { birth:frameNumber, peaks:ArrayOfPeaks }
	// trackPartials() returns an Array of Tracks


	var abs = Math.abs;

	var matchingThreshold = 200; //TODO: parameterize

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
		// Naive detection of peaks
		//TODO: polynomial interpolation

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
					framePeaks.push({ freq: i*binFactor, amp: curMag });
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
	var findCandidateIndex = function(curPeak, nextPeaks) {
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
	// Outputs:
	// - 
	exports.trackPartials = function(peaksFrames, maxPeaks) {
		// Track:
		//   { birth: frameNum, peaks: [peak1, peak2, ... peakN]
		// Perform McAulay-Quatieri frame-to-frame peak matching 
		var tracks = [];
		var curTracks = [];

		var trackComparison = function(track) {
			return _.last(track.peaks)['freq'];
		};

		// Treat all the peaks in the first frame as a 'birth'
		_(peaksFrames[0]).forEach(function(peak) {
			curTracks.push({ birth: 0, peaks: [peak] });
		});

		// Process the rest of the frames
		_(peaksFrames).rest().forEach(function(frame, frameIdx) {
			var nextPeaks = _.clone(frame);
			curTracks = _.sortBy(curTracks, trackComparison);

			// Clone curTracks so that we can modify it safely inside the foreach
			_(curTracks).clone()
			 .forEach(function(track, trackIdx, collection) {
				 // Look for a matching peak for this track
				 var curFreq = _.last(track.peaks)['freq'];
				 var nextFreqs = _(nextPeaks).pluck('freq').value();
				 var candidateIdx = findCandidateIndex(curFreq, nextFreqs);

				 if (candidateIdx == null) {
					 // No candidates within matchingThreshold, treat as death
					 tracks.push(track);
					 _.pull(curTracks, track);
				 } else {
					 // Check if another track with a higher frequency
					 // could be matched with this peak
					 var unmatchedTrackFreqs = _(collection).rest(trackIdx)
					 										.pluck('peaks')
						 									.map(_.last)
															.pluck('freq')
															.value();
					 var possibleTrackIdx = findCandidateIndex(
						 						nextFreqs[candidateIdx],
												unmatchedTrackFreqs);

					 if (unmatchedTrackFreqs[possibleTrackIdx] == curFreq) {
						 // Definitive match (no other tracks to match this candidate)
						 track.peaks.push(nextPeaks[candidateIdx]);
						 _.pull(nextPeaks, nextPeaks[candidateIdx]);
					 } else {
						 // Candidate could match another track
						 // Check if there is a lower frequency match
						 var lowerIndex = candidateIdx-1;
						 if (lowerIndex<0 || abs(nextFreqs[lowerIndex]-curFreq) > matchingThreshold) {
							 // Lower frequency is not a possible match
							 // Treat this as death
							 tracks.push(track);
							 _.pull(curTracks, track);
						 } else {
							 // Take the lower frequency instead
							 track.peaks.push(nextPeaks[lowerIndex]);
							 _.pull(nextPeaks, nextPeaks[lowerIndex]);
						 }
					 }
				 }
			 });

			 // After all matches have been done, remaining peaks are treated as births
			 _(nextPeaks).forEach(function(peak) {
				 curTracks.push({ birth: frameIdx+1, peaks: [peak] });
			 });
		});

		_(curTracks).forEach(function(track) {
			tracks.push(track);
		});

		return tracks;
	};

	exports.synthesize = function(tracks) {
		//TODO:
	};

})(typeof exports === 'undefined' ? this['mqAudio']={} : exports);
