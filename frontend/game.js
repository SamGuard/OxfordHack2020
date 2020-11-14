const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

const TILE_SIZE = 16;

class Game {

    // ------------------
    // *** GAME SETUP ***
    // ------------------

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

        var map = this.level.response.map;

        // Initialises the physics engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Add a rectangle to the physics engine for every tile in the map
        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                if (map.structure[row][col] != -1) {
                    Matter.World.add(this.world, [Matter.Bodies.rectangle(col*16,row*16,16,16, { isStatic: true, friction: 0 })]);
                }
            }
        }

        var player = this.level.response.player;

        // Make player physics object
        player.obj = Matter.Bodies.rectangle(player.startX*16, player.startY*16, 32, 32, { inertia: Infinity });
        Matter.World.add(this.world, [player.obj]);

        // Add all needed event listeners
        this.setupEvents();

        this.setupPhysics()

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

    // ------------------
    // *** GAME TICKS ***
    // ------------------

    // This runs every game tick
    update(){
        var player = this.level.response.player.obj;

        // Clear the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Transform the game to fill the canvas vertically
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5*this.ctx.canvas.width - this.scale * player.position.x, 0);

        this.updatePlayerPhysics();

        // Render tick
        this.showMap();
        this.showChar();

        // Physics tick
        Matter.Engine.update(this.engine, 20);
    }

    // -----------------------
    // *** PHYSICS STUFF ***
    // -----------------------

    // Sets physics perameters for the player
    setupPhysics() {
        var player = this.level.response.player.obj;
        player.mass = 100;
        player.frictionAir = 0.05;
        player.friction = 0;

    }

    // Player physics update
    updatePlayerPhysics() {

        const JUMP_SPEED = 12;
        const LEFT_RIGHT_SPEED = 2.5;
        const DROP_FORCE = 1;

        var player = this.level.response.player.obj;

        if(this.isOnFloor()) {
            var velocity = {x: player.velocity.x, y: player.velocity.y}

            if(this.keys[UP_KEY]) {
                velocity.y = (velocity.y - JUMP_SPEED) /2;
            }
            if(this.keys[LEFT_KEY] && this.keys[RIGHT_KEY]) {
                velocity.x = velocity.x / 2;
            } else if(this.keys[RIGHT_KEY]) {
                velocity.x = (velocity.x + LEFT_RIGHT_SPEED) /2;
            } else if(this.keys[LEFT_KEY]) {
                velocity.x = (velocity.x - LEFT_RIGHT_SPEED) / 2;
            }
            Matter.Body.setVelocity(player, velocity)
        } else {
            var velocity = player.velocity;
            if(this.keys[RIGHT_KEY]) {
                velocity.x = LEFT_RIGHT_SPEED;
            }

            if(this.keys[LEFT_KEY]) {
                velocity.x = -LEFT_RIGHT_SPEED;
            }
            Matter.Body.setVelocity(player, velocity)
        }
    }

    // Is player currently falling?
    isOnFloor() {
        var player = this.level.response.player.obj;

        var x = Math.round(player.position.x / TILE_SIZE);
        var y = Math.ceil((player.position.y + PLAYER_HEIGHT) / TILE_SIZE );
        var y1 = Math.ceil((player.position.y + PLAYER_HEIGHT / 2) / TILE_SIZE );

        var map = this.level.response.map;

        if( player.velocity.y > 0 ) {
            return false;
        }

        if( x < 0 || x >= map.width || y1 < 0 || y >= map.height || (map.structure[y][x] === -1 && map.structure[y1][x] === -1)) {
            return false;
        } else {
            return true;
        }
    }

    // -----------------------
    // *** RENDERING STUFF ***
    // -----------------------

    // Renders the player icon
    showChar() {
        var player = this.level.response.player.obj;
        this.ctx.drawImage(this.charImage, player.position.x-7, player.position.y-8);
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