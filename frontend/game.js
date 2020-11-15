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
    start(map) {

        // Start the game tick loop
        this.gameUpdateInterval = setInterval(function () {
            conHandler.game.update();
        }, 20);

        // Imports level data
        this.level = map;

        // Imports the tile set
        this.tilesetImage = new Image();
        this.tilesetImage.src = "assets/" + this.level.map.tileset;

        // Import the character image
        // TODO: Change this to a tile set and add character animation
        this.charImage = new Image();
        this.charImage.src = "assets/mydude.png";

        var map = this.level.map;

        // Initialises the physics engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        // Add a rectangle to the physics engine for every tile in the map
        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                var tileType = map.structure[row][col];
                if (tileType != -1) {
                    if (tileType in this.level.map.customTiles) {
                        var custom = this.level.map.customTiles[tileType];
                        if ("boundingBox" in custom) {
                            console.log(Matter.Vertices.centre(custom.boundingBox));
                            Matter.World.add(this.world, [Matter.Bodies.fromVertices(col*16 - (16 - Matter.Vertices.centre(custom.boundingBox).x),row*16 - (16 - Matter.Vertices.centre(custom.boundingBox).y), custom.boundingBox, { isStatic: true })]);

                            continue;
                        }
                    }
                    Matter.World.add(this.world, [Matter.Bodies.rectangle(col*16-8,row*16-8,16,16, { isStatic: true })]);
                }
            }
        }

        var player = this.level.player;

        // Make player physics object
        player.obj = Matter.Bodies.fromVertices(player.startPositions[0].x*16-8, player.startPositions[0].y*16-8, player.boundingBox, {inertia: Infinity});

        //player.obj = Matter.Bodies.rectangle(player.startPositions[0].x*16-8, player.startPositions[0].y*16-8, 32, 32, { inertia: Infinity });
        Matter.World.add(this.world, [player.obj]);

        // Add all needed event listeners
        this.setupEvents();

        this.setupPhysics()

        // Sets the scale for the canvas (used in the renderer)
        this.scale = (this.ctx.canvas.height) / (map.height * 16);

        var render = Matter.Render.create({
            canvas: $("#gameCanvas2")[0],
            engine: this.engine
        });

        Matter.Render.run(render);

        //other players
        this.level.players = [];
    }

    // Adds any event handlers needed
    setupEvents() {
        // On a resize change size of canvas and redo scale
        $(window).resize(function() {
            conHandler.game.setupCanvas(window.innerWidth/2, window.innerHeight/2);
            // If map has been read in update map scaling
            if(conHandler.game.level != null) {
                console.log("Changed size");
                conHandler.game.scale = (conHandler.game.ctx.canvas.height) / (conHandler.game.level.map.height * 16);
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
        var player = this.level.player.obj;

        // Clear the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Transform the game to fill the canvas vertically
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5*this.ctx.canvas.width - this.scale * player.position.x, 0);

        this.updatePlayerPhysics();

        // Render tick
        this.showMap();
        this.showChars();

        this.showChar();

        // Physics tick
        Matter.Engine.update(this.engine, 20);
        this.push({}, this.level.player.obj.position.x, this.level.player.obj.position.y);
    }

    // -----------------------
    // *** PHYSICS STUFF ***
    // -----------------------

    // Sets physics perameters for the player
    setupPhysics() {
        var player = this.level.player.obj;
        player.mass = 100;
        player.frictionAir = 0.02;
        player.friction = 0.05;
    }

    // Player physics update
    updatePlayerPhysics() {

        const JUMP_SPEED = 12;
        const LEFT_RIGHT_SPEED = 2.5;
        const DROP_FORCE = 1;

        var player = this.level.player.obj;

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
            if(this.keys[LEFT_KEY] && this.keys[RIGHT_KEY]) {
                velocity.x = velocity.x / 2;
            } else if(this.keys[RIGHT_KEY]) {
                velocity.x = (velocity.x * 2 + LEFT_RIGHT_SPEED) / 3;
            } else if(this.keys[LEFT_KEY]) {
                velocity.x = (velocity.x * 2 - LEFT_RIGHT_SPEED) / 3;
            }
            Matter.Body.setVelocity(player, velocity)
        }
    }

    // Is player currently falling?
    isOnFloor() {
        var player = this.level.player.obj;

        var x = Math.round(player.position.x / TILE_SIZE);
        var y = Math.ceil((player.position.y + PLAYER_HEIGHT) / TILE_SIZE );
        var y1 = Math.ceil((player.position.y + PLAYER_HEIGHT / 2) / TILE_SIZE );

        var map = this.level.map;

        if( player.velocity.y > 0.02 ) {
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
        var player = this.level.player.obj;
        this.ctx.drawImage(this.charImage, player.position.x, player.position.y);
    }

    showChars(){
        for(let i = 0; i < this.level.players.length; i++){
            let player =  this.level.players[i];
            this.ctx.drawImage(this.charImage, player.x, player.y);
        }
    }

    // Renders the tiles
    showMap() {
        var map = this.level.map;

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

        for(let i = 0; i < players.length; i++){
            let found = false;
            for(let j = 0; j < this.level.players.length; j++){
                if(players[i].id == conHandler.id){
                    found = true;
                    break;
                } else if(players[i].id == this.level.players[j].id){
                    this.level.players[j].x = players[i].x;
                    this.level.players[j].y = players[i].y;
                    found = true;
                    break;
                }
            }

            if(!found && players[i].id != conHandler.id){
                let player = {id: players[i].id};
                player.x = players[i].x;
                player.y = players[i].y;

                this.level.players.push(player);
            }
        }

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