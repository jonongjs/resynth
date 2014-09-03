app.directive('inputChange', function($window) {
	return function(scope, element, attrs) {
		element[0].onchange = function(e) {
			var files = e.target.files || e.dataTransfer.files;
			scope.f = files[0];
			 scope.$apply(function(){
				 scope.$eval(attrs.inputChange)
			 });
		};
	}
});
