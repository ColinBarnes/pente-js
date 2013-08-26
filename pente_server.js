var DEBUG = true;

function log(text){
	if(DEBUG){
		console.log(text);
	}
}

var io = require('socket.io').listen(8080);

// On connection to the client
io.sockets.on('connection', function(socket){
	// Let the client know that the server is ready
	socket.emit('serverReady', GAMESTARTED);

	// On request for a new game
	socket.on('newBoard', function(board){
		log('New game requested');
		// Create new  game with requested board size
		if(!GAMESTARTED){
			Model.init(board.xBoardSize, board.yBoardSize);
		}
		io.sockets.emit('render',Model.getCurrentState());
	});

	// On request to play a postion
	socket.on('play', function(position){
		log('Play at '+position.xPos+", "+position.yPos);
		Model.play(position.xPos, position.yPos);
		io.sockets.emit('render',Model.getCurrentState());
	});

	// On request to undo
	socket.on('undo', function(data){
		gameState.undo();
		io.sockets.emit('render',Model.getCurrentState());
	});

});

var GAMESTARTED = false; // Has a game already started


var Model = {

	// board is a matrix that contains the current game state.
	// board[x][y] would contain the state of the board x places from
	// the left and y places from the top, zero-indexed.
	board: [],
	moves: [],
	score: {0: 0, 1:0},
	gameOver: false,
	thisPlayer: 0,

	// Initialize variable board to be a Matrix boardWidth by boardHeight in size
	init: function(boardWidth, boardHeight){
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

	getCurrentState: function(){
		var currentState = {
			board: Model.board,
			score: Model.score,
			gameOver: Model.gameOver,
			thisPlayer: Model.thisPlayer
		};
		return currentState;
	},

	undo: function(){ // WARNING: does not undo score.
		board = Model.board.pop();
	},

	display: function(){
		for (var i=0; i<Model.board[0].length; i++){
			var row = "|";
			for(var j=0; j<Model.board.length; j++){
				if (Model.board[j][i] === null)
					row += "_|";
				else {
					row += Model.board[j][i];
					row += "|";
				}
			}
			console.log(row);
		}
	},

	currentPlayer: function(){
		return Model.thisPlayer;
	},

	otherPlayer: function(){
		return Math.abs(Model.thisPlayer-1);
	},

	play: function(xPos,yPos) {
		if(Model.canPlay(xPos,yPos)){
			Model.place(xPos,yPos);
			Model.performKills(xPos,yPos);
			log("PLACE: "+xPos+", "+yPos);
			if(Model.isFive(xPos,yPos) || Model.score[0] >= 5 || Model.score[1] >= 5){
				//Model.gameOver = true;
				gameState.perform(new Action.gameOver(Model.gameOver));
			}
			//Model.thisPlayer = Math.abs(Model.thisPlayer-1); // Switch player
			gameState.perform(new Action.switchPlayer(Model.thisPlayer));
			gameState.newTurn();
		}
	},

	canPlay: function(xPos,yPos){
		if (Model.isEmpty(xPos,yPos) && !Model.isSuicide(xPos,yPos) && Model.onBoard(xPos,yPos) && !Model.gameOver){
			return true;
		} else {
			return false;
		}
	},

	place: function(xPos,yPos){
		//Model.board[xPos][yPos] = Model.currentPlayer();
		//Model.moves.push(Model.board);
		// Model.display();
		gameState.perform(new Action.place(xPos,yPos,Model.thisPlayer));
	},

	// Returns false if space is either taken or not on the board
	isEmpty: function(xPos,yPos){
		if(Model.board[xPos][yPos] === null)
			return true;
		else
			return false;
	},

	altSuicide: function(xPos,yPos){
		var isSuicide = false;
		for(var i=0; i<=1; i++){
			for(var j=0; j<=1; j++){ // Generate <i,j> vectors for each non-negative direction
				if(i===0 && j===0) // Skip the vector <0,0>
					continue;
				if(Model.onBoard(xPos+i, yPos+j) && Model.onBoard(xPos-i, yPos-j) && !Model.isEmpty(xPos+i,yPos+j) && !Model.isEmpty(xPos-i,yPos-j)){ // If there are pieces on both sides of the space in the orientation of the vector
					if(Model.board[xPos+i][yPos+j] !== Model.board[xPos-i][yPos-j]){ // If there are different colors on both sides [B][ ][W]
						if(Model.onBoard(xPos+i*2, yPos+i*2)){ // If there is a space two units out in the direction of the vector
							if(Model.board[xPos+i][yPos+j] === Model.currentPlayer() && Model.board[xPos+i*2][yPos+j*2] === Model.otherPlayer()){ // Check for [B][ ][W][B] assuming currentPlayer is white
								isSuicide = true;
							}
						}
						if(Model.onBoard(xPos-i*2,yPos-j*2)){ // If there is a space two units out in the opposite direction of the vector
							if(Model.board[xPos-i][yPos-j] === Model.currentPlayer() && Model.board[xPos-i*2][yPos-j*2] === Model.otherPlayer()){ // Check for [W][B][ ][W] assuming currentPlayer is black
								isSuicide = true;
							}
						}
					}
				}
			}
		}
		return isSuicide;
	},

	isSuicide: function(xPos, yPos){
		var isSuicide = false;
		var displace = [-1,0,1];
		for(var i=0; i<displace.length; i++){
			for(var j=0; j<displace.length; j++){ // Generate vectors <i,j> for every direction
				if(i===1 && j===1) // Skip the vector <0,0>
					continue;
				if(Model.onBoard(xPos+displace[i], yPos+displace[j]) && Model.onBoard(xPos-displace[i], yPos-displace[j]) && !Model.isEmpty(xPos+displace[i],yPos+displace[j]) && !Model.isEmpty(xPos-displace[i],yPos-displace[j])){ // If there are pieces on both sides of the space in the orientation of the vector
					if(Model.board[xPos+displace[i]][yPos+displace[j]] === Model.currentPlayer() && Model.board[xPos-displace[i]][yPos-displace[j]] === Model.otherPlayer()){ // If the piece in front is current player and behind is other player
						if(Model.onBoard(xPos+displace[i]*2,yPos+displace[j]*2)){ // If two places in front is on the board
							if(Model.board[xPos+displace[i]*2][yPos+displace[j]*2] === Model.otherPlayer()){ // If the piece two pieces in front is the other player
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
	onBoard: function(xPos,yPos){
		if(yPos<0 || yPos>Model.board[0].length-1 || xPos<0 || xPos>Model.board.length-1) {
			return false;
		}
		else
			return true;
	},

	performKills: function(xPos,yPos){
		var displace = [-1,0,1];
		for(var i=0; i<displace.length; i++){
			for(var j=0; j<displace.length; j++){ // Generate vectors <i,j> for every direction
				if(i===1 && j===1) // Skip the vector <0,0>
					continue;
				if(Model.onBoard(xPos+displace[i]*3, yPos+displace[j]*3)){ // If there is a place 3 spots away in this direction
					if(Model.currentPlayer() === Model.board[xPos+displace[i]*3][yPos+displace[j]*3]){ // If the current player has a piece 3 spots away
						if(Model.otherPlayer() === Model.board[xPos+displace[i]][yPos+displace[j]] && Model.otherPlayer() === Model.board[xPos+displace[i]*2][yPos+displace[j]*2]){ // Check if there are two of the other player's pieces next to the xPos & yPos
							//Model.score[Model.currentPlayer()]++;
							//Model.board[xPos+displace[i]][yPos+displace[j]] = null;
							//Model.board[xPos+displace[i]*2][yPos+displace[j]*2] = null;
							gameState.perform(new Action.removePieces(xPos+displace[i],yPos+displace[j],xPos+displace[i]*2,yPos+displace[j]*2,Model.thisPlayer,Model.score));
						}
					}
				}
			}
		}
	},

	isFive: function(xPos,yPos){
		var thereIsFive = false;
		for(var i=0; i<=1; i++){
			for(var j=-1; j<=1; j++){ // Generate <i,j> vectors for each non-negative direction
				if(i===0 && j===0) // Skip the vector <0,0>
					continue;
				var scalar = 1;
				var numberOfPieces = 1;
				var morePieces = true;
				while(morePieces){ // Check in the positive direction
					log("Check if "+(xPos+i*scalar)+", "+(yPos+j*scalar)+" is on the board.");
					if(Model.onBoard(xPos+i*scalar, yPos+j*scalar)){ // If the next piece is on the board
						log((xPos+i*scalar)+", "+(yPos+j*scalar)+" is on the board.");
						if(Model.board[xPos+i*scalar][yPos+j*scalar] === Model.currentPlayer()){ // If the next piece is the same as the current player
							log((xPos+i*scalar)+", "+(yPos+j*scalar)+" is current player's piece");
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
					log("Check if "+(xPos+i*-scalar)+", "+(yPos+j*-scalar)+" is on the board.");
					if(Model.onBoard(xPos+i*-scalar,yPos+j*-scalar)){ // If the next piece is on the board
						log((xPos+i*-scalar)+", "+(yPos+j*-scalar)+" is on the board.");
						if(Model.board[xPos+i*-scalar][yPos+j*-scalar] === Model.currentPlayer()){ // If the next piece is the same as the current player
							log((xPos+i*-scalar)+", "+(yPos+j*-scalar)+" is current player's piece");
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
				log("Number of pieces: "+numberOfPieces);
				if (numberOfPieces>=5)
					thereIsFive = true;
			}
		}
		return thereIsFive;
	}
};

// Module that contains every action and a corresponding undo
var Action = (function(Model){
	// Game Over
	function gameOver(isOver) {
		this.isOver = isOver;
	}

	gameOver.prototype = {
		execute: function(){
			Model.gameOver = !this.isOver;
		},

		unexecute: function(){
			Model.gameOver = this.isver;
		}
	};

	// Place
	function place(xPos, yPos, player) {
		this.xPos = xPos;
		this.yPos = yPos;
		this.player = player;
		this.oldVal = Model.board[xPos][yPos];
	}

	place.prototype = {
		execute: function(){
			Model.board[this.xPos][this.yPos] = this.player;
		},

		unexecute: function(){
			Model.board[this.xPos][this.yPos] = this.oldVal;
		}
	};

	// Change Player
	function switchPlayer(player){
		this.player = player;
	}

	switchPlayer.prototype = {
		execute: function(){
			Model.thisPlayer = Math.abs(this.player-1);
		},

		unexecute: function(){
			Model.thisPlayer = this.player;
		}
	};

	// Remove Pieces
	function removePieces(xPos_1, yPos_1, xPos_2, yPos_2, player, score){
		this.xPos_1   = xPos_1;
		this.yPos_1   = yPos_1;
		this.oldVal_1 = Model.board[xPos_1][yPos_1];
		this.xPos_2   = xPos_2;
		this.yPos_2   = yPos_2;
		this.oldVal_2 = Model.board[xPos_2][yPos_2];
		this.player   = player;
		this.score    = score;
	}

	removePieces.prototype = {
		execute: function(){
			Model.score[this.player]++;
			Model.board[this.xPos_1][this.yPos_1] = null;
			Model.board[this.xPos_2][this.yPos_2] = null;
		},

		unexecute: function(){
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
})(Model);

// Store the game state control undo operations
var gameState  = {
	gameStack: [],
	turnStack: [],
	perform: function(command){
		command.execute();
		gameState.turnStack.push(command);
	},
	newTurn: function(){
		gameState.gameStack.push(gameState.turnStack);
		gameState.turnStack = [];
	},
	undo: function(command){
		turn = gameState.gameStack.pop();
		log(turn);
		while(turn.length>0){
			turn.pop().unexecute();
		}
		View.draw();
	}
};
