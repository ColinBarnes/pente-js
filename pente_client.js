var DEBUG = false;

function log(text){
	if(DEBUG){
		console.log(text);
	}
}

var socket = io.connect('http://localhost:8080');

var View = {

	canvas: null,
	context: null,

	init: function() {
		canvas = document.getElementById("gameCanvas");
		context = canvas.getContext("2d");
	},

	draw: function(Model) {
		var xSpaces            = Model.board[0].length;
		var ySpaces            = Model.board.length;
		var boardWidth         = canvas.width;
		var boardHeight        = canvas.height;
		var spaceWidth         = boardWidth/xSpaces;
		var spaceHeight        = boardHeight/ySpaces;
		var backgroundColor    = "#dbba69";
		var firstPlayerColor   = "#000";
		var secondPlayerColor  = "#FFF";
		var lineColor          = "#000";
		var pieceRadius        = spaceWidth/2;
		context.fillStyle = backgroundColor;
		context.fillRect(0,0,boardWidth,boardHeight);

		var x,y;
		for(var i=0; i<xSpaces; i++){ // Draw the vertical lines
			x = spaceWidth/2 + i*spaceWidth;
			context.fillStyle = lineColor;
			context.beginPath();
			context.moveTo(x,spaceWidth/2);
			context.lineTo(x,boardHeight-spaceWidth/2);
			context.stroke();
		}

		for(var j=0; j<ySpaces; j++){ // Draw the horizontal lines
			y = spaceHeight/2 + j*spaceHeight;
			context.fillStyle = lineColor;
			context.beginPath();
			context.moveTo(spaceHeight/2, y);
			context.lineTo(boardWidth-spaceWidth/2, y);
			context.stroke();
		}

		for(i=0; i<xSpaces; i++){ // Draw the pieces
			for(j=0; j<ySpaces; j++){
				x = spaceWidth/2 + i*spaceWidth;
				y = spaceHeight/2 + j*spaceHeight;
				if(Model.board[i][j]===0){
					context.beginPath();
					context.fillStyle = firstPlayerColor;
					context.arc(x, y, pieceRadius, 0, 2*Math.PI, false);
					context.fill();
				} else if(Model.board[i][j]===1){
					context.beginPath();
					context.fillStyle = secondPlayerColor;
					context.arc(x, y, pieceRadius, 0, 2*Math.PI, false);
					context.fill();
				}
			}
		}
		if(Model.gameOver){
			context.font = "5em sans-serif";
			context.textAlign = "center";
			context.textBaseline = "bottom";
			context.fillStyle = "#FFF";
			context.fillText("Game Over", 251, 251);
			context.fillStyle = lineColor;
			context.fillText("Game Over", 250, 250);
		}
		
		$("#firstPlayerScore span").text(Model.score[0]);
		$("#secondPlayerScore span").text(Model.score[1]);

	}
};

var Controller = {
	canvas: null,
	xSpaces: null,
	ySpaces: null,

	init: function(xSpaces,ySpaces){
		canvas = document.getElementById("gameCanvas");
		canvas.addEventListener("click", Controller.onCanvasClick, false);
		$("#undo").click(function(){
			socket.emit('undo',{undo: true});
		});
		Controller.xSpaces = xSpaces;
		Controller.ySpaces = ySpaces;
	},

	onCanvasClick: function(ev){
		var spaceWidth = canvas.width/Controller.xSpaces;
		var spaceHeight = canvas.height/Controller.ySpaces;
		var x = ev.clientX - canvas.offsetLeft + $(window).scrollLeft();
		var y = ev.clientY - canvas.offsetTop + $(window).scrollTop();
		var xSpace = Math.round((x-(x%spaceWidth))/spaceWidth);
		var ySpace = Math.round((y-(y%spaceHeight))/spaceHeight);
		
		// Request to play at postion (xSpace, ySpace)
		socket.emit('play', {xPos: xSpace, yPos: ySpace});
		log("Request to play "+xSpace+", "+ySpace);
	}
};

// Server communication

// When the server is ready
socket.on('serverReady', function(gameStarted){
	log("Server is Ready");
	// Request a new game with board size xBoardSize by yBoard Size
	socket.emit('newBoard', {xBoardSize: 19, yBoardSize: 19});
	View.init();
	Controller.init(19,19);
});

// When the sever sends an update
socket.on('render', function(Model){
	log("Redraw");
	View.draw(Model);
});