const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

class Game {
    constructor(isHost, conn) {
        //make a game canvas using jquery in the game canvas container.
        $("#gameMenu").hide();
        $('#gameCanvasContainer').show();// Game canvas goes in here
        $('#gameEndScreen').hide();

        this.setupCanvas(window.innerWidth/2, window.innerHeight/2);
        this.keys = [];
    }

    // Function to start the game
    async start() {
		this.endImageR = 0;//there are 12 images
		this.endImageL = 0;
		this.endImageIR = 0;
		this.endImageIL = 0;
		this.lastR = true;
		this.start = true;
		this.appear = 0;
		
        // Start the game tick loop
        this.gameUpdateInterval = setInterval(function () {
            conHandler.game.update();
        }, 20);

        // Imports level data
        this.level = await $.get("assets/map.json");

        // Imports the tile set
        this.tilesetImage = new Image();
        this.tilesetImage.src = "assets/" + this.level.response.map.tileset;

        // Import the character image
        // TODO: Change this to a tile set and add character animation
        this.charImage = new Image();
        this.charImage.src = "assets/mydude.png";
		this.charRunRight = new Image();
		this.charRunRight.src = "assets/Run (32x32).png";
		this.charRunLeft = new Image();
		this.charRunLeft.src = "assets/runLeft.png";
		this.charIdelRight = new Image();
		this.charIdelRight.src = "assets/Idle (32x32).png";
		this.charIdelLeft = new Image();
		this.charIdelLeft.src = "assets/idelLeft.png";
		this.charAppear = new Image();
		this.charAppear.src = "assets/Appearing (96x96).png";

        var map = this.level.response.map;

        // Initialises the physics engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Add a rectangle to the physics engine for every tile in the map
        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                if (map.structure[row][col] != -1) {
                    Matter.World.add(this.world, [Matter.Bodies.rectangle(col*16,row*16,16,16, { isStatic: true })]);
                }
            }
        }

        var player = this.level.response.player;

        // Make player physics object
        player.obj = Matter.Bodies.rectangle(player.startX*16, player.startY*16, 32, 32, { inertia: Infinity });
        Matter.World.add(this.world, [player.obj]);

        // Add all needed event listeners
        this.setupEvents();

        // Sets the scale for the canvas (used in the renderer)
        this.scale = (this.ctx.canvas.height) / (map.height * 16);
    }

    // Adds any event handlers needed
    setupEvents() {
        // On a resize change size of canvas and redo scale
        $(window).resize(function() {
            conHandler.game.setupCanvas(window.innerWidth/2, window.innerHeight/2);
            // If map has been read in update map scaling
            if(conHandler.game.level.response != null) {
                console.log("Changed size");
                conHandler.game.scale = (conHandler.game.ctx.canvas.height) / (conHandler.game.level.response.map.height * 16);
            }
        });

        // Store the current state of the keys in a dict so they can always be looked up
        $(window).keydown(function(e) {
            conHandler.game.keys[e.keyCode] = true;
        });

        $(window).keyup(function(e) {
            conHandler.game.keys[e.keyCode] = false;
        });
    }

    // Sets all the needed properties of the canvas
    async setupCanvas(width, height) {
        var canvas = $('#gameCanvas')[0];
        this.ctx = canvas.getContext("2d");
        this.ctx.canvas.width = width;
        this.ctx.canvas.height = height;

        this.ctx.fillStyle = "#F0F8FF";
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.imageSmoothingEnabled= false;
    }

    // This runs every game tick
    update(){
        var player = this.level.response.player.obj;

        // Clear the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Transform the game to fill the canvas vertically
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5*this.ctx.canvas.width - this.scale*player.position.x, 0);

        // Apply player movement
        // TODO: move this into a function
        if(conHandler.game.keys[LEFT_KEY]) {
            Matter.Body.setVelocity(player, {x: -3, y: 0})
        }            
        if(conHandler.game.keys[RIGHT_KEY]) {
            Matter.Body.setVelocity(player, {x: 3, y: 0})
        }            
        if(conHandler.game.keys[UP_KEY]) {
            Matter.Body.setVelocity(player, {x: 0, y: -3})
        }            
        if(conHandler.game.keys[DOWN_KEY]) {
            Matter.Body.setVelocity(player, {x: 0, y: 3})
        }

        // Physics tick
        Matter.Engine.update(this.engine, 20);

        // Render tick
        this.showMap();
        this.showChar();
    }

    // Renders the player icon
    showChar() {
        var player = this.level.response.player.obj;
		if(this.start){
			conHandler.game.ctx.drawImage(conHandler.game.charAppear,96*Math.floor(this.appear/3),0,96,96,player.position.x-39,player.position.y-40, 96, 96);
			if(this.appear == 18){
				this.start = false;
			}
			this.appear++;
		}else{
			if(this.keys[RIGHT_KEY]){
				this.endImageR++;
				this.lastR = true;
				conHandler.game.ctx.drawImage(conHandler.game.charRunRight,32*Math.floor(this.endImageR/2),0,32,32,player.position.x-7, player.position.y-8, 32, 32);
				if(this.endImageR == 22){
					this.endImageR = 0;
				}
			}else if(conHandler.game.keys[LEFT_KEY]) {
				this.endImageL++;
				this.lastR = false;
				conHandler.game.ctx.drawImage(conHandler.game.charRunLeft,32*Math.floor(this.endImageL/2),0,32,32,player.position.x-7, player.position.y-8, 32, 32);
				if(this.endImageL == 22){
					this.endImageL = 0;
				}
			}else{
				if(this.lastR){
					this.endImageIR++;
					conHandler.game.ctx.drawImage(conHandler.game.charIdelRight,32*Math.floor(this.endImageIR/2),0,32,32,player.position.x-7, player.position.y-8, 32, 32);
					if(this.endImageIR == 20){
						this.endImageIR = 0;
					}
				}else{
					this.endImageIL++;
					conHandler.game.ctx.drawImage(conHandler.game.charIdelLeft,32*Math.floor(this.endImageIL/2),0,32,32,player.position.x-7, player.position.y-8, 32, 32);
					if(this.endImageIL == 20){
						this.endImageIL = 0;
					}
				}
			}
		}
    }

    // Renders the tiles
    showMap() {
        var map = this.level.response.map;

        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                if (map.structure[row][col] !== -1) {
                    this.drawTile(map.structure[row][col], col, row);
                }
            }
        }
    }

    // Draws a tile from the tile set in a position
    drawTile(tileNum, x, y) {
        var colNum = Math.floor(tileNum/(this.tilesetImage.width/16));
        var rowNum = tileNum % (this.tilesetImage.width/16);
        this.ctx.drawImage(this.tilesetImage, 16*rowNum, 16*colNum, 16, 16, x*16, y*16, 16, 16);
    }
}