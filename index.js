var adler32 = require('./lib/adler32');
var Game = require('./lib/game');
var express = require('express');
var app = express();
var http = require('http').Server(app);

app.use(express.static(__dirname + '/public'));

http.listen(3000, function(){
  console.log('listening on *:3000');
});


var DEBUG = true;
var ALLGAMES = {}; //

function log(text){
	if(DEBUG){
		console.log(text);
	}
}

/*****************
    Game State
*****************/

function gameState(hash) {
	this.hash = hash;
	this.board = [];
	this.gameStack = [];
	this.turnStack = [];
	this.score = {0:0, 1:0};
	this.gameOver = false;
	this.thisPlayer = 0;
	this.alreadyPlayed = false;
}


/***************************
    Socket Communication
***************************/

var io = require('socket.io')(http);

// On connection to the client
io.sockets.on('connection', function(socket){
	log('client connected');
	// Let the client know that the server is ready
	socket.emit('serverReady');
	// Socket hasn't joined a game
	socket.inGame = false;

	// On request for a new game
	socket.on('newBoard', function(board){
		log('New game requested');

		// Use the current time and date as the input to the hash
		var hashInput = new Date();
		hashInput = hashInput.toISOString();
		// Generate hash
		var hash = adler32(hashInput);
		// Prevent collision with an existing hash
		while(ALLGAMES.hasOwnProperty(hash)){
			hashInput = new Date();
			hashInput = hashInput.toISOString();
			hash = adler32(hashInput);
		}
		// Add a new game to the ALLGAMES hash table
		ALLGAMES[hash] = new gameState(hash);
		// Store the hash in the socket
		socket.gameCode = hash;
		socket.inGame = true;
		socket.player = 0;
		log("Hash is "+socket.gameCode);
		// Join the room with that hash
		socket.join(socket.gameCode);
		Game.init(board.xBoardSize, board.yBoardSize, ALLGAMES[socket.gameCode]);
		socket.emit('joinedGame', socket.gameCode);
		io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
	});

	socket.on('joinGame', function(hash){
		log("Received hash: "+hash);
		if(ALLGAMES.hasOwnProperty(hash)){
			socket.gameCode = hash;
			socket.inGame = true;
			socket.player = 1;
			socket.join(socket.gameCode);
			log("Sending joinedGame");
			socket.emit('joinedGame', socket.gameCode);
			io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
		} else {
			log("hash doesn't exist");
			socket.emit('doesNotExist', hash);
		}
	});

	// On request to play a postion
	socket.on('play', function(position){
		// If in a game
		if(socket.inGame){
			// And if it's that player's turn
			if(socket.player === ALLGAMES[socket.gameCode].thisPlayer){
				log('Play at '+position.xPos+", "+position.yPos);
				Game.play(position.xPos, position.yPos, ALLGAMES[socket.gameCode]);
				io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
			}
		}
	});

	// On request to undo
	socket.on('undo', function(data){
		Game.undo(ALLGAMES[socket.gameCode]);
		io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
	});

	// On request to end turn
	socket.on('endTurn', function(){
		if(socket.player === ALLGAMES[socket.gameCode].thisPlayer){
			ALLGAMES[socket.gameCode].alreadyPlayed = false;
      Game.switchPlayer(ALLGAMES[socket.gameCode]);
			Game.newTurn(ALLGAMES[socket.gameCode]);
			io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
		}
	});

});
