app.directive('dragUpload', function($window) {
	return function(scope, element, attrs) {
		//  Drag and drop
		var uploadDiv = element.find('.drag-upload');
		function FileDragHover(e) {
			e.stopPropagation();
			e.preventDefault();
			if (e.type == "dragover")
				uploadDiv.css('opacity',1);
			else 
				uploadDiv.css('opacity',0);
		}

		function FileSelectHandler(e) {
			e.stopPropagation();
			e.preventDefault();

//			// cancel event and hover styling
//			uploadDiv.animate({'opacity':0}, 300);

			// fetch FileList object
			var files = e.target.files || e.dataTransfer.files;

//			// process all File objects
//			var list = ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 
//				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
//				'application/vnd.ms-powerpoint', 'application/msword', 'application/pdf', 
//				'image/jpg', 'image/jpeg', 'image/gif', 'image/png', 'image/bmp'];
//				for (var i = 0, f; f = files[i]; i++) {
//					if (list.indexOf(f.type) != -1)
//						scope.requestUploadFile(f, f.name);
//				}

			for (var i=0; i<files.length; ++i) {
				scope.addFile(files[i]);
			}
			scope.$apply();
		}

		element[0].addEventListener("dragover", FileDragHover, false);
		element[0].addEventListener("dragleave", FileDragHover, false);
		element[0].addEventListener("drop", FileSelectHandler, false);

	}
});
