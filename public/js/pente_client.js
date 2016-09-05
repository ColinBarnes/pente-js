var DEBUG = true;
var GAMECODE = null;
var socket = io.connect('http://localhost:3000');

function log(text){
	if(DEBUG){
		console.log(text);
	}
}

var View = {

	canvas: null,
	context: null,
	backgroundColor: "#ECF0F1",
	firstPlayerColor: "#3498DB",
	firstPlayerSecondaryColor: "#2980B9",
	secondPlayerColor: "#2ECC71",
	secondPlayerSecondaryColor: "#27AE60",
	lineColor: "#7F8C8D",
	pieceRadius: null,

	init: function() {
		View.canvas = document.getElementById("gameCanvas");
		View.canvas.style.width = "546px";
		View.canvas.style.height = "494px";
		View.context = View.canvas.getContext("2d");
	},

	resize: function() {
		var newWidth = window.innerWidth;
		var newHeight = window.innerHeight;

		if(newWidth<newHeight){
			View.canvas.style.width = newWidth+'px';
			View.canvas.style.height = newWidth+'px';
			View.canvas.width = newWidth;
			View.canvas.height = newWidth;
		} else {
			View.canvas.style.width = newHeight+'px';
			View.canvas.style.height = newHeight+'px';
			View.canvas.width = newHeight;
			View.canvas.height = newHeight;

		}
	},

	draw: function(Model) {
		log("View.draw");
		var xSpaces            = Model.board[0].length;
		var ySpaces            = Model.board.length;
		var boardWidth         = canvas.width;
		var boardHeight        = canvas.height;
		var boardSize          = canvas.height;
		var spaceSize          = boardHeight/ySpaces;
		var spaceWidth         = boardWidth/xSpaces;
		var spaceHeight        = boardHeight/ySpaces;
		View.pieceRadius        = spaceSize/2;
		View.context.fillStyle = View.backgroundColor;
		View.context.fillRect(0,0,boardWidth,boardHeight);

		// Display current Player
		if(Model.thisPlayer === 0){
			$("body").css("background", View.firstPlayerColor);
			if($("#title").hasClass("start")){
				$("#title").removeClass("start second").addClass("first");
			} else {
				$("#title").removeClass("second").addClass("first");
			}
		} else {
			$("body").css("background", View.secondPlayerColor);
			$("#title").removeClass("first").addClass("second");
		}

		var x,y;
		for(var i=0; i<xSpaces; i++){ // Draw the vertical lines
			x = spaceSize*1.5 + i*spaceSize;
			View.context.strokeStyle = View.lineColor;
			View.context.beginPath();
			View.context.moveTo(x,spaceSize/2);
			View.context.lineTo(x,boardSize-spaceSize/2);
			View.context.lineWidth = 3;
			View.context.stroke();

			// Highlight
			View.context.strokeStyle = "#FFFFFF";
			View.context.beginPath();
			View.context.moveTo(x+1,spaceSize/2);
			View.context.lineTo(x+1,boardSize-spaceSize/2);
			View.context.lineWidth = 3;
			View.context.stroke();
		}

		for(var j=0; j<ySpaces; j++){ // Draw the horizontal lines
			y = spaceSize/2 + j*spaceSize;
			View.context.strokeStyle = View.lineColor;
			View.context.beginPath();
			View.context.moveTo(spaceSize*1.5, y);
			View.context.lineTo(boardSize+spaceSize/2, y);
			View.context.lineWidth = 3;
			View.context.stroke();

			// Highlight
			View.context.strokeStyle = "#FFFFFF";
			View.context.beginPath();
			View.context.moveTo(spaceSize*1.5, y+1);
			View.context.lineTo(boardSize+spaceSize/2, y+1);
			View.context.lineWidth = 3;
			View.context.stroke();

		}

		for(i=0; i<xSpaces; i++){ // Draw the pieces
			for(j=0; j<ySpaces; j++){
				x = spaceSize*1.5 + i*spaceSize;
				y = spaceSize/2 + j*spaceSize;
				if(Model.board[i][j]===0){
					View.drawPiece(x,y,0);
				} else if(Model.board[i][j]===1){
					View.drawPiece(x,y,1);
				}
			}
		}

		var firstPlayerScore = Model.score[0];
		for(i=0; i<firstPlayerScore; i++){
			View.drawPiece(spaceSize/2,spaceSize/2 + i*spaceSize*2, 1);
			View.drawPiece(spaceSize/2,spaceSize*1.5 + i*spaceSize*2, 1);
		}

		var secondPlayerScore = Model.score[1];
		for(i=0; i<secondPlayerScore; i++){
			View.drawPiece(spaceSize*1.5 + boardSize, spaceSize/2 + i*spaceSize*2, 0);
			View.drawPiece(spaceSize*1.5 + boardSize, spaceSize*1.5 + i*spaceSize*2, 0);
		}

		$("#firstPlayerScore span").text(Model.score[0]);
		$("#secondPlayerScore span").text(Model.score[1]);

		View.context.save();

		if(Model.gameOver){
			View.context.font = "15em 'oswaldlight'";
			View.context.textAlign = "center";
			View.context.textBaseline = "bottom";
			View.context.fillStyle = "#7F8C8D";
			for(i=0; i<10; i++) {
				View.context.fillText("GAME OVER", boardWidth/2+i, boardHeight/2+i);
			}
			View.context.shadowColor = "#7F8C8D";
			View.context.shadowBlur = 10;
			View.context.fillStyle = "#FFFFFF";
			View.context.fillText("GAME OVER", boardWidth/2, boardHeight/2);
		}

		View.context.restore();

	},

	drawPiece: function(x, y, player){
		log("drawing");
		var primaryColor, secondaryColor;
		if(player===0){
			primaryColor = View.firstPlayerColor;
			secondaryColor = View.firstPlayerSecondaryColor;
		}else {
			primaryColor = View.secondPlayerColor;
			secondaryColor = View.secondPlayerSecondaryColor;
		}
		View.context.beginPath();
		View.context.fillStyle = secondaryColor;
		View.context.arc(x+2, y+2, View.pieceRadius-3, 0, 2*Math.PI, false);
		View.context.fill();
		View.context.beginPath();
		View.context.fillStyle = primaryColor;
		View.context.arc(x, y, View.pieceRadius-3, 0, 2*Math.PI, false);
		View.context.fill();
	}
};

$("#inGame").hide();
var Controller = {
	canvas: null,
	xSpaces: null,
	ySpaces: null,

	init: function(xSpaces,ySpaces){
		canvas = document.getElementById("gameCanvas");
		canvas.addEventListener("click", Controller.onCanvasClick, false);
		$("#endTurn").click(function(){
			log("clicked end turn");
			socket.emit('endTurn');
		});
		$("#newGame").click(function(){
			log("clicked new game");
			$("#entryBox").hide("slide");
			$("#inGame").show();
			socket.emit('newBoard', {xBoardSize: 19, yBoardSize: 19});
		});
		$("#join").click(function(){
			log("clicked join game");
			GAMECODE = $("#gameCode").val();
			log("Entered code: "+GAMECODE);
			$("#entryBox").hide("slide");
			$("#inGame").show();
			log("join slide");
			socket.emit('joinGame', GAMECODE);
		});
		Controller.xSpaces = xSpaces;
		Controller.ySpaces = ySpaces;
	},

	onCanvasClick: function(ev){
		var spaceWidth = canvas.width/Controller.xSpaces;
		var spaceHeight = canvas.height/Controller.ySpaces;
		var spaceSize = 494/Controller.ySpaces;
		log("spaceSize: "+spaceSize);
		var x = ev.clientX - canvas.offsetLeft + $(window).scrollLeft();
		log("x: "+x);
		var y = ev.clientY - canvas.offsetTop + $(window).scrollTop();
		log("y: "+y);
		var xSpace = Math.round((x-(x%spaceSize)-spaceSize)/spaceSize);
		var ySpace = Math.round((y-(y%spaceSize))/spaceSize);

		// Request to play at postion (xSpace, ySpace)
		socket.emit('play', {xPos: xSpace, yPos: ySpace});
		log("Request to play "+xSpace+", "+ySpace);
	},

	doesNotExist: function(hash){
		$("#gameCode").val(hash+" is not an existing game");
	}
};

/********************
    URL Handeling
********************/

if(window.location.hash) {
	var hash = window.location.hash.substring(2);
	View.init();
	Controller.init(19,19);
	socket.emit('joinGame', hash);
	$("#entryBox").hide();
	$("#inGame").show();
}

window.onhashchange = function(){
	if(!window.location.hash){
	$("#entryBox").show();
	$("#inGame").hide();
	}
};

/***************************
    Socket Communication
***************************/

// When the server is ready
socket.on('serverReady', function(){
	log("Server is Ready");
	// Request a new game with board size xBoardSize by yBoard Size
	View.init();
	Controller.init(19,19);
});

// When joining a new game
socket.on('joinedGame', function(gameCode){
	log("joined game: "+gameCode);
	GAMECODE = gameCode;
	// If the url already has a hash
	if(window.location.hash){
		// Remove the prievous has and put the new one in its place
		window.location.href = window.location.href.split("#")[0]+"#/"+GAMECODE;
	} else {
		// Otherwise, add the hash
		window.location.href = window.location.href+"#/"+GAMECODE;
	}
});

// When the sever sends an update
socket.on('render', function(Model){
	log("Redraw");
	View.draw(Model);
});

socket.on('doesNotExist', function(hash){
	Controller.doesNotExist(hash);
});
