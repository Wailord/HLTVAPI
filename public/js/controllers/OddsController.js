var app = angular.module('OddsController', []);

app.controller('OddsController', ['$scope', 'OddsService', function($scope, OddsService)
	{
		$scope.message = "instantly get projected odds for any five-man roster using modified glicko2 rankings.";
		$scope.messageColor = 'black';
		$scope.t1color = 'black';
		$scope.t2color = 'black'

		$scope.res = 0;
		$scope.t1p0 = 429;
		$scope.t1p1 = 7170;
		$scope.t1p2 = 2469;
		$scope.t1p3 = 7347;
		$scope.t1p4 = 7398;
		$scope.t2p0 = 4954;
		$scope.t2p1 = 7592;
		$scope.t2p2 = 4959;
		$scope.t2p3 = 7168;
		$scope.t2p4 = 3055;

		$scope.getOdds = function()
		{
			var t1 = [$scope.t1p0, $scope.t1p1, $scope.t1p2, $scope.t1p3, $scope.t1p4];
			var t2 = [$scope.t2p0, $scope.t2p1, $scope.t2p2, $scope.t2p3, $scope.t2p4];

			OddsService.getOdds(t1, t2).then(function(response) {
				var odds = response.data.bo1 * 100;
				if(odds > 50) {
					$scope.message = 'Team 1 is favored and has a projected ' + (response.data.bo1 * 100).toFixed(2) + '% chance of winning a Bo1, ' + (response.data.bo3 * 100).toFixed(2) + '% chance of winning a Bo3, and ' + (response.data.bo5 * 100).toFixed(2) + '% chance of winning a Bo5.';
					$scope.res = 1;
					$scope.messageColor = 'black';
					$scope.t1color = 'green';
					$scope.t2color = 'red'
				}
				else if(odds < 50) {
					$scope.message = 'Team 2 is favored and has a projected ' + ((1 - response.data.bo1) * 100).toFixed(2) + '% chance of winning a Bo1, ' + ((1 - response.data.bo3) * 100).toFixed(2) + '% chance of winning a Bo3, and ' + ((1 - response.data.bo5) * 100).toFixed(2) + '% chance of winning a Bo5.';
					$scope.res = -1;
					$scope.messageColor = 'black';
					$scope.t1color = 'red';
					$scope.t2color = 'green'
				}
				else if(odds == 50){
					$scope.message = 'Too close to call!';
					$scope.res = 0;
					$scope.messageColor = 'black';
					$scope.t1color = 'black';
					$scope.t2color = 'black'
				}
				else
				{
					$scope.message = 'Please verify the player IDs you entered are correct.';
					$scope.messageColor = 'red';
				}
			});
		}
	}]
);
