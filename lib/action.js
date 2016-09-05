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

module.exports = Action;
