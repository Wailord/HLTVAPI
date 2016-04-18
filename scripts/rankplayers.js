var glicko = require('./glicko')
var Player = require('../app/models/player');
var Match = require('../app/models/match')
var async = require('async');

var rankplayers = module.exports = {};

rankplayers.runPlayerRanker = function() {
	console.log('ranking all players');
	Player.remove({}, function() {
	var ninetyDaysAgo = new Date();
   	ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 180);
   	Match.find({"date": {"$gte": ninetyDaysAgo}}).sort({date: 1}).exec(function (err, docs) {
   		if(err)
   			console.log('Error finding matches: ' + err);
   		else {
			async.eachSeries(docs, function(match, callback)
			{
	   			updateMatch(match, callback);
	    	},
	    	function(err) {
	    		console.log('done running through all matches');
	    	});
		}
   	});
   });
}

var updateMatch = function(match, callback) {
	console.log('updating match from ' + match.date + ' (' + match.id + ')');
	var team1 = match.team1;
	var team2 = match.team2;
        
        team2.ryansteam = 13;

	var team1players = team1[0].players;
	var team2players = team2[0].players;

	var team1won = team1[0].score > team2[0].score;
	var teamsTied = team1[0].score == team2[0].score;
	var players = [];

	// some matches don't correctly parse players (unfortunately); until it's fixed, just skip those matches
	// when ranking players
	if(teamsTied || team1players.length != 5 || team2players.length != 5) callback();
	else
	{
		async.forEach(team1players, function(player, c) {
			getPlayer(player, players, team1won, callback);
		});

		async.forEach(team2players, function(player, c) {
			getPlayer(player, players, !team1won, callback);
		});
	}
}

var getPlayer = function(player, players, teamWon, callback)
{
	Player.findOne({id : player.id}, function (err, p) {
		if(err)
			console.log('Mongo error: ' + err);
		else
		{
			// new player, we need to create a new skillrating and add to database
			var newPlayer = {};
			newPlayer.name = player.name;
			newPlayer.id = player.id;
			newPlayer.url = player.url;
			newPlayer.rating = 0;
			
			if(!p)
			{
				newPlayer.rating = 1500;
				newPlayer.rd = 350;
				newPlayer.vol = 0.06;
				newPlayer.wins = 0;
				newPlayer.losses = 0;
				//console.log("couldn't find " + player.id + " in database");
			}
			else {
				newPlayer.wins = p.wins;
				newPlayer.losses = p.losses;
				newPlayer.rating = p.rating;
				newPlayer.rd = p.rd;
				newPlayer.vol = p.vol;
				console.log('found existing skill for ' + player.id + ' (' + player.name + '), rating: ' + newPlayer.rating);
			}
			
			if(isNaN(parseInt(newPlayer.id)))
			{
				if(teamWon)
				{
					newPlayer.rank = 1;
				}
				else
				{
					newPlayer.rank = 2;
				}

				players.push(newPlayer);
				if(players.length == 10)
					savePlayers(players, callback);
			}
			else
			{
				Player.update({id: newPlayer.id}, newPlayer, {upsert:true}, function(err, inserted)
				{
					if(err)
						console.log('Error inserting player ' + newPlayer.id + ' into database: ' + err);
					else
					{
						console.log('inserted ' + newPlayer.id + ' into database');
						if(teamWon)
						{
							newPlayer.rank = 1;
							newPlayer.wins++;
						}
						else
						{
							newPlayer.rank = 2;
							newPlayer.losses++;
						}

						players.push(newPlayer);
						if(players.length == 10)
							savePlayers(players, callback);
					}
				});
			}
		}
	});
}

var savePlayers = function(players, callback)
{
	//console.log('saving players');
	async.series([
		function(next)
		{
			var winners = [];
			var losers = [];

			async.forEach(players, function(player, next){
				if(player.rank == 1)
					winners.push(player);
				else if(player.rank == 2)
					losers.push(player);
			})

			var team1 = {};
			team1.players = winners;
			team1.rank = 1;
			team1.name = "Team 1";
			
			var team2 = {};
			team2.players = losers;
			team2.rank = 2;
			team2.name = "Team 2";

			var teams = [team1, team2];
			glicko.teamMatch(teams);
			next(null);
		},
		function(next)
		{
			async.forEach(players, function(player, next2) {
				delete player.rank
				if(isNaN(parseInt(player.id)))
					next2();
				else
				{
					Player.update({id: player.id}, player, {upsert:true}, function(err, inserted)
					{
						if(err) {
							console.log('error updating player ranking: ' + err);
						}
						else {
 							console.log('updated ranking for player ' + player.name + ' (wins: ' + player.wins + ', losses: ' + player.losses + ')');
						}
						next2();
					});
				}
			}, function(err) {
				next(null);
			});
		},
		function(next)
		{
			callback();
		}
	]);
}
