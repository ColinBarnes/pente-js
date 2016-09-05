var Action = require('./action');

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

  switchPlayer: function(Model) {
    Game.perform(new Action.switchPlayer(Model), Model);
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

module.exports = Game;
