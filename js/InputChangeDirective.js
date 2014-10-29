app.directive('inputChange', function($window) {
	return function(scope, element, attrs) {
		scope.uploader = element[0];

		var resetFormElement = function(e) {
			angular.element(e).parent()[0].reset();
		};

		element[0].onchange = function(e) {
			var files = e.target.files || e.dataTransfer.files;
			if (files.length > 0) {
				scope.f = files[0];
				scope.$apply(function(){
					scope.$eval(attrs.inputChange)
				});
			}

			resetFormElement(element[0]);
		};
	}
});
