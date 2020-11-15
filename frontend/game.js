const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

const TILE_SIZE = 16;

const ANIM_SPEED = 2; // The bigger the number, the slower.


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
        this.endImage = 0; // image loop iterator

		this.lastR = true; // was the char last facing right?
		this.start = true; // Have we played the appear animation?
        this.appear = 0; // appear loop iterator
        
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
		this.charRunRight = new Image();
		this.charRunRight.src = "assets/chars/char1-runRight.png";
		this.charRunLeft = new Image();
		this.charRunLeft.src = "assets/chars/char1-runLeft.png";
		this.charIdleRight = new Image();
		this.charIdleRight.src = "assets/chars/char1-idleRight.png";
		this.charIdleLeft = new Image();
        this.charIdleLeft.src = "assets/chars/char1-idleLeft.png";
        this.charJumpLeft = new Image();
        this.charJumpLeft.src = "assets/chars/char1-jumpLeft.png";
        this.charJumpRight = new Image();
        this.charJumpRight.src = "assets/chars/char1-jumpRight.png";
        this.charFallLeft = new Image();
		this.charFallLeft.src = "assets/chars/char1-fallLeft.png";
        this.charFallRight = new Image();
		this.charFallRight.src = "assets/chars/char1-fallRight.png";
		this.charAppear = new Image();
        this.charAppear.src = "assets/chars/char-appear.png";
        this.charDisappear = new Image();
        this.charDisappear.src = "assets/chars/char-disappear.png";
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


        //Objects
        let newObjects = [];
        for(let i = 0; i < this.level.objects.length; i++){
            newObjects.push({});

            this.level.objects[i].image = new Image();
            this.level.objects[i].image.src = "assets/" + this.level.objects[i].src;
            
            newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x*16-8, this.level.objects[i].y*16-8, this.level.objects[i].boundingBox, {isStatic: true, isSensor: true});
            newObjects[i].attr = this.level.objects[i];

            Matter.World.add(this.world, [newObjects[i]]);
        }

        this.level.objects = newObjects;
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

        Matter.Events.on(this.engine, 'collisionStart', function(event) {
            var pairs = event.pairs;
            
            for (var i = 0, j = pairs.length; i != j; ++i) {
                var pair = pairs[i];
                if (pair.bodyA.attr != undefined && pair.bodyA.attr.actions.toggle == true) {
                    conHandler.game.doButtonThings(pair.bodyA);
                } else if (pair.bodyB.attr != undefined && pair.bodyB.attr.actions.toggle == true) {
                    conHandler.game.doButtonThings(pair.bodyB);
                }
            }
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
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5*this.ctx.canvas.width - this.scale * player.position.x, 0.5*this.ctx.canvas.height - this.scale * player.position.y);

        this.updatePlayerPhysics();

        // Render tick
        this.showMap();
        
        this.showChars();

        this.showChar();
        this.showObjects();

        // Physics tick
        Matter.Engine.update(this.engine, 20);
        this.push(this.level.player.obj.position.x, this.level.player.obj.position.y);
    }

    doButtonThings(obj){
        if(obj.attr.state == 0){
            obj.attr.state = 1;
        }else{
            obj.attr.state = 0;
        }
        console.log(obj.attr.name, obj.attr.state);
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
        var curFrame = Math.floor(this.endImage / ANIM_SPEED);
        var introFrames = Math.floor(this.endImage / ANIM_SPEED / 2);
        var player = this.level.player.obj;

        this.endImage++;
		if(this.start){ // show appear animation
			this.ctx.drawImage(this.charAppear, 96*introFrames, 0, 96, 96, player.position.x-32, player.position.y-32, 96, 96);
			if(this.endImage >= 6*ANIM_SPEED*2) {
                this.endImage = 0;
				this.start = false;
			}
        }
        else if(this.keys[RIGHT_KEY]) {  // running right
            this.lastR = true;
            this.ctx.drawImage(this.charRunRight, 32*curFrame, 0, 32, 32, player.position.x, player.position.y, 32, 32);
            if(this.endImage >= 11*ANIM_SPEED){
                this.endImage = 0;
            }
        }
        else if(this.keys[LEFT_KEY]) { // running left
            this.lastR = false;
            this.ctx.drawImage(this.charRunLeft, 32*curFrame, 0, 32, 32, player.position.x, player.position.y, 32, 32);
            if(this.endImage >= 11*ANIM_SPEED){
                this.endImage = 0;
            }
        }
        else if (!this.isOnFloor()) {
            this.endImage--;
            if (player.velocity.y < 0) { // jumping
                if (this.lastR) {
                    this.ctx.drawImage(this.charJumpRight, 0, 0, 32, 32, player.position.x, player.position.y, 32, 32);
                }
                else {
                    this.ctx.drawImage(this.charJumpLeft, 0, 0, 32, 32, player.position.x, player.position.y, 32, 32);
                }
            }
            else { // falling
                if (this.lastR) {
                    this.ctx.drawImage(this.charFallRight, 0, 0, 32, 32, player.position.x, player.position.y, 32, 32);
                }
                else {
                    this.ctx.drawImage(this.charFallLeft, 0, 0, 32, 32, player.position.x, player.position.y, 32, 32);
                }            }
        }
        else if(this.lastR) { // idle right
            this.ctx.drawImage(this.charIdleRight, 32*curFrame, 0, 32, 32, player.position.x, player.position.y, 32, 32);
            if(this.endImage >= 10*ANIM_SPEED){
                this.endImage = 0;
            }
        }
        else if(!this.lastR){ // idle left
            this.ctx.drawImage(this.charIdleLeft, 32*curFrame, 0, 32, 32, player.position.x, player.position.y, 32, 32);
            if(this.endImage >= 10*ANIM_SPEED){
                this.endImage = 0;
            }
        }
    }

    showChars(){
        for(let i = 0; i < this.level.players.length; i++){
            let player =  this.level.players[i];
            this.ctx.drawImage(this.charImage, player.x, player.y);
        }
    }

    showObjects(){
        for(let i = 0; i < this.level.objects.length; i++){
            let object = this.level.objects[i];

            this.ctx.drawImage(object.attr.image, object.position.x, object.position.y);
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

    push(playerX, playerY){
        
        this.conn.send(JSON.stringify({
            purp: "update",
            data: { roomCode: this.roomCode, objects: [], player: {id: conHandler.id, x: playerX, y: playerY} },
            time: Date.now(),
            id: conHandler.id
        }));
    }
}