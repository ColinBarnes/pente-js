var adler32 = require('./lib/adler32');
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
			Game.perform(new Action.switchPlayer(ALLGAMES[socket.gameCode]), ALLGAMES[socket.gameCode]);
			Game.newTurn(ALLGAMES[socket.gameCode]);
			io.sockets.in(socket.gameCode).emit('render',ALLGAMES[socket.gameCode]);
		}
	});

});


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


/*****************
    Game Logic
*****************/

var Game = {

	// Initialize variable board to be a Matrix boardWidth by boardHeight in size
	init: function(boardWidth, boardHeight, Model){
		Model.board = new Array(boardWidth);
		for (var i=0; i<boardWidth; i++) {
			Model.board[i] = new Array(boardHeight);
			var len = boardHeight;
			while (--len>=0) {
				Model.board[i][len] = null;
			}
		}
		GAMESTARTED = true;
	},

	getCurrentState: function(Model){
		var currentState = {
			board: Model.board,
			score: Model.score,
			gameOver: Model.gameOver,
			thisPlayer: Model.thisPlayer
		};
		return currentState;
	},

	perform: function(command, Model){
		command.execute(Model);
		Model.turnStack.push(command);
	},
	newTurn: function(Model){
		Model.gameStack.push(Model.turnStack);
		Model.turnStack = [];
	},
	undo: function(Model){
		while(Model.turnStack.length>0){
			Model.turnStack.pop().unexecute(Model);
		}
	},

	currentPlayer: function(Model){
		return Model.thisPlayer;
	},

	otherPlayer: function(Model){
		return Math.abs(Model.thisPlayer-1);
	},

	play: function(xPos, yPos, Model) {
		if(Model.alreadyPlayed){
			Game.undo(Model);
		}
		if(Game.canPlay(xPos, yPos, Model)){
			Game.place(xPos, yPos, Model);
			Game.performKills(xPos, yPos, Model);
			if(Game.isFive(xPos, yPos, Model) || Model.score[0] >= 5 || Model.score[1] >= 5){
				Game.perform(new Action.gameOver(Model), Model);
			}
			Model.alreadyPlayed = true;
			//Game.perform(new Action.switchPlayer(Model), Model);
			//Game.newTurn(Model);
		}
	},

	canPlay: function(xPos, yPos, Model){
		if (Game.isEmpty(xPos, yPos, Model) && !Game.isSuicide(xPos, yPos, Model) && Game.onBoard(xPos, yPos, Model) && !Model.gameOver){
			return true;
		} else {
			return false;
		}
	},

	place: function(xPos, yPos, Model){
		Game.perform(new Action.place(xPos, yPos, Model), Model);
	},

	// Returns false if space is either taken or not on the board
	isEmpty: function(xPos,yPos, Model){
		if(Model.board[xPos][yPos] === null)
			return true;
		else
			return false;
	},

	isSuicide: function(xPos, yPos, Model){ // Server crash
		var isSuicide = false;
		var displace = [-1,0,1];
		for(var i=0; i<displace.length; i++){
			for(var j=0; j<displace.length; j++){ // Generate vectors <i,j> for every direction
				if(i===1 && j===1) // Skip the vector <0,0>
					continue;
				if(Game.onBoard(xPos+displace[i], yPos+displace[j], Model) && Game.onBoard(xPos-displace[i], yPos-displace[j], Model) && !Game.isEmpty(xPos+displace[i],yPos+displace[j], Model) && !Game.isEmpty(xPos-displace[i],yPos-displace[j], Model)){ // If there are pieces on both sides of the space in the orientation of the vector
					if(Model.board[xPos+displace[i]][yPos+displace[j]] === Game.currentPlayer(Model) && Model.board[xPos-displace[i]][yPos-displace[j]] === Game.otherPlayer(Model)){ // If the piece in front is current player and behind is other player
						if(Game.onBoard(xPos+displace[i]*2,yPos+displace[j]*2, Model)){ // If two places in front is on the board
							if(Model.board[xPos+displace[i]*2][yPos+displace[j]*2] === Game.otherPlayer(Model)){ // If the piece two pieces in front is the other player
								isSuicide = true;
							}
						}
					}
				}
			}
		}
		return isSuicide;
	},

	// Return true if board[xPos][yPos] exists
	onBoard: function(xPos, yPos, Model){
		if(yPos<0 || yPos>Model.board[0].length-1 || xPos<0 || xPos>Model.board.length-1) {
			return false;
		}
		else
			return true;
	},

	performKills: function(xPos, yPos, Model){
		var displace = [-1,0,1];
		for(var i=0; i<displace.length; i++){
			for(var j=0; j<displace.length; j++){ // Generate vectors <i,j> for every direction
				if(i===1 && j===1) // Skip the vector <0,0>
					continue;
				if(Game.onBoard(xPos+displace[i]*3, yPos+displace[j]*3, Model)){ // If there is a place 3 spots away in this direction
					if(Game.currentPlayer(Model) === Model.board[xPos+displace[i]*3][yPos+displace[j]*3]){ // If the current player has a piece 3 spots away
						if(Game.otherPlayer(Model) === Model.board[xPos+displace[i]][yPos+displace[j]] && Game.otherPlayer(Model) === Model.board[xPos+displace[i]*2][yPos+displace[j]*2]){ // Check if there are two of the other player's pieces next to the xPos & yPos
							//Model.score[Model.currentPlayer()]++;
							//Model.board[xPos+displace[i]][yPos+displace[j]] = null;
							//Model.board[xPos+displace[i]*2][yPos+displace[j]*2] = null;
							Game.perform(new Action.removePieces(xPos+displace[i],yPos+displace[j],xPos+displace[i]*2,yPos+displace[j]*2,Model), Model);
						}
					}
				}
			}
		}
	},

	isFive: function(xPos, yPos, Model){
		var thereIsFive = false;
		for(var i=0; i<=1; i++){
			for(var j=-1; j<=1; j++){ // Generate <i,j> vectors for each non-negative direction
				if(i===0 && j===0) // Skip the vector <0,0>
					continue;
				var scalar = 1;
				var numberOfPieces = 1;
				var morePieces = true;
				while(morePieces){ // Check in the positive direction
					if(Game.onBoard(xPos+i*scalar, yPos+j*scalar, Model)){ // If the next piece is on the board
						if(Model.board[xPos+i*scalar][yPos+j*scalar] === Game.currentPlayer(Model)){ // If the next piece is the same as the current player
							numberOfPieces++;
							scalar++;
						}
						else{
							morePieces = false;
						}
					}
					else{
						morePieces = false;
					}
				}

				morePieces = true;
				scalar = 1;
				while(morePieces){ // Check in the negative direction
					if(Game.onBoard(xPos+i*-scalar,yPos+j*-scalar, Model)){ // If the next piece is on the board
						if(Model.board[xPos+i*-scalar][yPos+j*-scalar] === Game.currentPlayer(Model)){ // If the next piece is the same as the current player
							numberOfPieces++;
							scalar++;
						}
						else{
							morePieces = false;
						}
					}
					else{
						morePieces = false;
					}

				}
				if (numberOfPieces>=5)
					thereIsFive = true;
			}
		}
		return thereIsFive;
	}
};

/***********************
    Undoable Actions
************************/

var Action = (function(){
	// Game Over
	function gameOver(Model) {
		this.isOver = Model.gameOver;
	}

	gameOver.prototype = {
		execute: function(Model){
			Model.gameOver = !this.isOver;
		},

		unexecute: function(Model){
			Model.gameOver = this.isver;
		}
	};

	// Place
	function place(xPos, yPos, Model) {
		this.xPos = xPos;
		this.yPos = yPos;
		this.player = Model.thisPlayer;
		this.oldVal = Model.board[xPos][yPos];
	}

	place.prototype = {
		execute: function(Model){
			Model.board[this.xPos][this.yPos] = this.player;
		},

		unexecute: function(Model){
			Model.board[this.xPos][this.yPos] = this.oldVal;
		}
	};

	// Change Player
	function switchPlayer(Model){
		this.player = Model.thisPlayer;
	}

	switchPlayer.prototype = {
		execute: function(Model){
			Model.thisPlayer = Math.abs(this.player-1);
		},

		unexecute: function(Model){
			Model.thisPlayer = this.player;
		}
	};

	// Remove Pieces
	function removePieces(xPos_1, yPos_1, xPos_2, yPos_2, Model){
		this.xPos_1   = xPos_1;
		this.yPos_1   = yPos_1;
		this.oldVal_1 = Model.board[xPos_1][yPos_1];
		this.xPos_2   = xPos_2;
		this.yPos_2   = yPos_2;
		this.oldVal_2 = Model.board[xPos_2][yPos_2];
		this.player   = Model.thisPlayer;
		this.score    = Model.score;
	}

	removePieces.prototype = {
		execute: function(Model){
			Model.score[this.player]++;
			Model.board[this.xPos_1][this.yPos_1] = null;
			Model.board[this.xPos_2][this.yPos_2] = null;
		},

		unexecute: function(Model){
			Model.score[this.player]--;
			Model.board[this.xPos_1][this.yPos_1] = this.oldVal_1;
			Model.board[this.xPos_2][this.yPos_2] = this.oldVal_2;
		}
	};

	return {
		gameOver: gameOver,
		place: place,
		switchPlayer: switchPlayer,
		removePieces: removePieces
	};
})();
