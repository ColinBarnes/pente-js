// Command Interface
// Should contain a contstructor, an execute, and unexecute method.
// Will need one for each action

// Game Over

var gameOver = Class.extend({
	init: function(isOver){
		this.gameState = isOver;
	},

	execute: function(){
		Model.gameOver = !this.gameState;
	},

	unexecute: function(){
		Model.gameOver = this.gameState;
	}
});

// Place

var place = Class.extend({
	init: function(xPos, yPos, player){
		this.xPos = xPos;
		this.yPos = yPos;
		this.player = player;
		this.oldVal = Model.board[xPos][yPos];
	},

	execute: function(){
		Model.board[this.xPos][this.yPos] = player;
	},

	unexecute: function(){
		Model.board[this.xPos][this.yPos] = this.oldVal;
	}
});

// Change Player
var switchPlayer = Class.extend({
	init: function(player){
		this.player = player;
	},

	execute: function(){
		Model.thisPlayer = Math.abs(this.player-1);
	},

	unexecute: function(){
		Model.thisPlaye = player;
	}
});

// Remove Pieces
var removePieces = Class.extend({
	init: function(xPos_1, yPos_1, xPos_2, yPos_2, player, score){
		this.xPos_1   = xPos_1;
		this.yPos_1   = yPos_1;
		this.oldVal_1 = Model.board[xPos_1][yPos_1];
		this.xPos_2   = xPos_2;
		this.yPos_2   = yPos_2;
		this.oldVal_2 = Model.board[xPos_2][yPos_2];
		this.player   = player;
		this.score    = score;
	},

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
});









