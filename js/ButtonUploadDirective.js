app.directive('buttonUpload', function($window) {
	return function(scope, element, attrs) {
		scope.buttonClicked = function() {
			element.children()[0].click();
		};
	}
});
