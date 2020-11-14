const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

class Game {
    constructor(isHost, conn, roomCode) {
        //make a game canvas using jquery in the game canvas container.
        $("#gameMenu").hide();
        $('#gameCanvasContainer').show();// Game canvas goes in here
        $('#gameEndScreen').hide();

        this.setupCanvas(window.innerWidth/2, window.innerHeight/2);
        this.keys = [];

        this.isHost = isHost;
        this.conn = conn;
        this.roomCode = roomCode;
    }

    // Function to start the game
    async start(map) {

        // Start the game tick loop
        this.gameUpdateInterval = setInterval(function () {
            conHandler.game.update();
        }, 20);

        // Imports level data
        //this.level = await $.get("assets/map.json");
        this.level = map;

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

        this.push({}, this.level.response.player.obj.position.x, this.level.response.player.obj.position.x);
    }

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


    pull(mess){
        //unpack the objects here
        let objects = mess.data.objects;
        let players = mess.data.players;
        console.log(objects);
        console.log(players);

        //Players contains the positions of every player, but ignore the player with an id == conHandler.id as this is you
    }

    push(objects, playerX, playerY){
        this.conn.send(JSON.stringify({
            purp: "update",
            data: { roomCode: this.roomCode, objects: objects, player: {id: conHandler.id, x: playerX, y: playerY} },
            time: Date.now(),
            id: conHandler.id
        }));
    }
}