app.directive('buttonUpload', function($window) {
	return function(scope, element, attrs) {
		scope.buttonClicked = function() {
			scope.uploader.click();
		};
	}
});
