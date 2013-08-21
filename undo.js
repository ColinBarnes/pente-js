// Command Interface
// Should contain a contstructor, an execute, and unexecute method.
// Will need one for each action

// Game Over
function gameOver(gameState) {
	this.gameState = gameState;
}

gameOver.prototype = {
	execute: function(){
		Model.gameOver = !this.gameState;
	},

	unexecute: function(){
		Model.gameOver = this.gameState;
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