const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

const VERT_FILL_FACTOR = 0.8;
const HORZ_FILL_FACTOR = 0.8;

const TILE_SIZE = 16;

const ANIM_SPEED = 2; // The bigger the number, the slower.

class SetClass{
    constructor(){
        this.data = [];
    }

    push(val){
        for(let i = 0; i < this.data.length; i++){
            if(this.data[i] == val){
                return;
            }
        }
        this.data.push(val);
    }

    pop(){
        return this.data.pop();
    }
}

class Game {

    // ------------------
    // *** GAME SETUP ***
    // ------------------

    constructor(isHost, conn, roomCode, playerNumber) {
        this.setup(isHost, conn, roomCode, playerNumber);
    }

    setup(isHost, conn, roomCode, playerNumber){
        //make a game canvas using jquery in the game canvas container.
        $("#gameMenu").hide();
        $('#gameCanvasContainer').show();// Game canvas goes in here
        $('#gameEndScreen').hide();

        this.setupCanvas(window.innerWidth * HORZ_FILL_FACTOR, window.innerHeight * VERT_FILL_FACTOR);
        this.keys = [];

        this.isHost = isHost;
        this.conn = conn;
        this.roomCode = roomCode;

        this.objectUpdateList = new SetClass();
        
        this.idDebug = false;
        $("#gameCanvas2").hide();

        this.winner = false;
        this.alive = true; // main player alive
        this.score = 0;
        this.sentMessage = false; //used in endGame to see if the winner has sent the message to the server
        this.playerNumber = playerNumber;
        this.skinNumber = this.playerNumber;
        this.playerName = "PLAYER_" + this.playerNumber.toString();
    }

    reset(){
        this.setup(this.isHost, this.conn, this.roomCode, this.playerNumber);
    }

    // Function to start the game
    start(map) {
        this.endImage = 0; // image loop iterator

        this.lastR = true; // was the char last facing right?
        this.startAnim = true; // Have we played the appear animation?
        this.appear = 0; // appear loop iterator
        this.endAnim = true; // main player hasn't disappeared

        this.animCounter = 0; // Alfie's anim counter

        this.isPlayerOnBox = false;

        // Start the game tick loop
        this.gameUpdateInterval = setInterval(function () {
            conHandler.game.update()
        }, 20);

        // Imports level data
        this.level = map;

        // Imports the tile set
        this.tilesetImage = new Image();
        this.tilesetImage.src = "assets/" + this.level.map.tileset;

        // Import the character images
        this.charImages = [new Image(), new Image(), new Image(), new Image()];
		this.charImages[0].src = "assets/chars/player1.png";
		this.charImages[1].src = "assets/chars/player2.png";
		this.charImages[2].src = "assets/chars/player3.png";
		this.charImages[3].src = "assets/chars/player4.png";
        // charPlayer1 - charPlayer4

		this.charAppear = new Image();
        this.charAppear.src = "assets/chars/char-appear.png";
        this.charDisappear = new Image();
        this.charDisappear.src = "assets/chars/char-disappear.png";
		this.charDeadR = new Image();
        this.charDeadR.src = "assets/chars/spookyscary.png";
		this.charDeadL = new Image();
        this.charDeadL.src = "assets/chars/spookyscaryL.png";
        this.backgroundImage = new Image();
        this.backgroundImage.src = "assets/backgroundImage.png";
        var map = this.level.map;

        this.backgroundTileNum = Math.floor(Math.random() * 6);

        // Initialises the physics engine
        this.engine = Matter.Engine.create(
       );
        this.world = this.engine.world;
        this.world.gravity.y = 0.4;

        // Add rectangles to contain world

        let width = 16*(this.level.map.width);
        let height = 16*(this.level.map.height);
        Matter.World.add(this.world, [
            Matter.Bodies.rectangle(0, height/2, 8, height, {isStatic: true}),
            Matter.Bodies.rectangle(width/2, 0, width, 8, {isStatic: true}),
            Matter.Bodies.rectangle(width, height/2, 8, height, {isStatic: true}),
            Matter.Bodies.rectangle(width/2, height, width, 8 , {isStatic: true}),
        ]);


        this.platforms = [];

        // Add a rectangle to the physics engine for every tile in the map
        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                var tileType = map.structure[row][col];
                if (tileType != -1) {
                    if (tileType in this.level.map.customTiles) {
                        var custom = this.level.map.customTiles[tileType];
                        if ("boundingBox" in custom) {
                            var tempX = col * 16  + Matter.Vertices.centre(custom.boundingBox).x - 8;
                            var tempY = row * 16 + Matter.Vertices.centre(custom.boundingBox).y - 8;
                            var body = Matter.Bodies.fromVertices(tempX, tempY, custom.boundingBox, { isStatic: true });
                            Matter.World.add(this.world, [body]);
                            if("jumpThrough" in custom) {
                                this.platforms.push(body);
                            }
                            continue;
                        }
                    }
                    Matter.World.add(this.world, [Matter.Bodies.rectangle(col*16, row*16, 16, 16, { isStatic: true, friction: 0})]);
                }
            }
        }

        var player = this.level.player;

        // Make player physics object
        var tempX = player.startPositions[0].x * 16 + Matter.Vertices.centre(player.boundingBox).x;
        var tempY = player.startPositions[0].y * 16 + Matter.Vertices.centre(player.boundingBox).y;
        player.obj = Matter.Bodies.fromVertices(tempX, tempY, player.boundingBox, { inertia: Infinity });
        //player.obj = Matter.Bodies.rectangle(player.startPositions[0].x * 16, player.startPositions[0].y * 16, 32, 32, { inertia: Infinity });

        //player.obj = Matter.Bodies.rectangle(player.startPositions[0].x*16-8, player.startPositions[0].y*16-8, 32, 32, { inertia: Infinity });
        Matter.World.add(this.world, [player.obj]);

        // Add all needed event listeners
        this.setupEvents();

        this.setupPhysics()

        // Sets the scale for the canvas (used in the renderer)
        this.scale = (this.ctx.canvas.height) / ((map.height-1) * 16);

        var render = Matter.Render.create({
            canvas: $("#gameCanvas2")[0],
            engine: this.engine
        });

        Matter.Render.run(render);

        //other players
        this.level.players = [];

        //Objects
        let newObjects = [];
        this.objectImages = {};
        for (let i = 0; i < this.level.objects.length; i++) {
            newObjects.push({});

            if(!this.level.objects[i].animated || this.level.objects[i].animated == undefined) {
                this.objectImages[this.level.objects[i].src] = new Image();
                this.objectImages[this.level.objects[i].src].src = "assets/" + this.level.objects[i].src;
            } else {
                for (const state in this.level.objects[i].states) {
                    this.objectImages[this.level.objects[i].states[state].src] = new Image();
                    this.objectImages[this.level.objects[i].states[state].src].src = "assets/" + this.level.objects[i].states[state].src;

                }
            }

            if (this.level.objects[i].actions.button == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16, this.level.objects[i].y * 16, this.level.objects[i].boundingBox, { isStatic: true, isSensor: true });
            } else if (this.level.objects[i].actions.door == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - 8, this.level.objects[i].y * 16 - 8, this.level.objects[i].boundingBox, { isStatic: true });
            }  else if (this.level.objects[i].actions.end == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - 8, this.level.objects[i].y * 16 - 8, this.level.objects[i].boundingBox, { isStatic: true, isSensor: true });
            } else if (this.level.objects[i].actions.collectable == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - 8, this.level.objects[i].y * 16 - 8, this.level.objects[i].boundingBox, { isStatic: true, isSensor: true });
            } else if (this.level.objects[i].actions.kills == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16, this.level.objects[i].y * 16, this.level.objects[i].boundingBox, { isStatic: true, isSensor: true});
            } else if (this.level.objects[i].actions.firelighter == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16, this.level.objects[i].y * 16, this.level.objects[i].boundingBox, { isStatic: true});
            }
            newObjects[i].attr = this.level.objects[i];
            Matter.World.add(this.world, [newObjects[i]]);
        }

        this.level.objects = newObjects;
    }

    isEqual(item1, item2) {
        return item1.x1 == item2.x1 && item1.x2 == item2.x2 && item1.y1 == item2.y1 && item1.y2 == item2.y2;
    }

    // Adds any event handlers needed
    setupEvents() {
        // On a resize change size of canvas and redo scale
        $(window).resize(function () {
            conHandler.game.setupCanvas(window.innerWidth * HORZ_FILL_FACTOR, window.innerHeight * VERT_FILL_FACTOR);
            // If map has been read in update map scaling
            if (conHandler.game.level != null) {
                conHandler.game.scale = (conHandler.game.ctx.canvas.height) / ((conHandler.game.level.map.height-1) * 16);
            }
        });

        // Store the current state of the keys in a dict so they can always be looked up
        $(window).keydown(function (e) {
            conHandler.game.keys[e.keyCode] = true;

            if(e.keyCode == 84) {
                conHandler.game.idDebug = !conHandler.game.idDebug;
                if(conHandler.game.idDebug) { 
                    $("#gameCanvas2").show();
                } else {
                    $("#gameCanvas2").hide();
                }
            }
        });

        $(window).keyup(function (e) {
            conHandler.game.keys[e.keyCode] = false;
        });

        Matter.Events.on(this.engine, 'collisionStart', function (event) {
            var pairs = event.pairs;

            for (var i = 0, j = pairs.length; i != j; ++i) {
                var pair = [pairs[i].bodyA, pairs[i].bodyB];
                for(let p = 0; p < 2; p++){
                    if(pair[p].attr != undefined){
                        if (pair[p].attr.actions.button == true) {
                            conHandler.game.doButtonThings(pair[p]);
                        }else if(pair[p].attr.actions.end == true){
                            conHandler.game.winner = true;
                            conHandler.game.endGame();
                        }else if(pair[p].attr.actions.collectable == true){
                            conHandler.game.getObject(pair[p].attr);
                        } else if(pair[p].attr.actions.kills == true) {
                            conHandler.game.alive = false;
                        } else if(pair[p].attr.actions.firelighter == true) {
                            if (pair[p].attr.state == "on") {
                                conHandler.game.alive = false;
                            } else if (pair[p].attr.state == "off") {
                                pair[p].attr.state = "hit";
                                conHandler.game.objectUpdateList.push(pair[p]);
                            }
                        }
                    }
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
        this.ctx.imageSmoothingEnabled = false;
        let f = new FontFace('the8bit', 'url(assets/font/SuperLegendBoy-4w8Y.ttf)');
        f.load().then(function() {
            conHandler.game.ctx.font = "4px the8bit";


        });
    }

    // ------------------
    // *** GAME TICKS ***
    // ------------------

    // This runs every game tick
    update() {
        var player = this.level.player.obj;

        this.animCounter += 1;

        // Clear the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Transform the game to fill the canvas vertically
        var hPan = 0.5 * this.ctx.canvas.width - this.scale * player.position.x;
        if (hPan > 0) {
            hPan = 0;
        }
        this.ctx.setTransform(this.scale, 0, 0, this.scale, hPan, 0);

        // Player control physics
        this.updatePlayerPhysics();
        this.checkPlatforms();

        // Render tick
        this.showBackground(this.backgroundTileNum);
        this.showMap();
        this.showObjects();

        this.showChars();

        var image = this.charImages[this.skinNumber];
		let OutputChar = this.showChar(image, this.endImage, player.position.x, player.position.y, this.keys[LEFT_KEY], this.keys[RIGHT_KEY], this.lastR, this.startAnim, this.isOnFloor(), player.velocity.y, this.alive, this.endAnim, this.playerName, this.playerNumber);
		this.endImage = OutputChar[0];
		this.lastR = OutputChar[1];
		this.startAnim = OutputChar[2];
		this.endAnim = OutputChar[3];


        // Physics tick
        Matter.Engine.update(this.engine, 20);
        this.push();
    }

    doButtonThings(obj) {
        this.objectUpdateList.push(obj);
        if (obj.attr.state == 0) {
            obj.attr.state = 1;
        } else {
            obj.attr.state = 0;
        }

        for (let i = 0; i < this.level.objects.length; i++) {
            let o = this.level.objects[i];
            if (o.attr.name == obj.attr.target) {
                this.objectUpdateList.push(o);
                if (o.attr.state == 0) {
                    o.attr.state = 1;

                    o.collisionFilter.group =  -1;
                    o.collisionFilter.category =  2;
                    o.collisionFilter.mask =  0;
                        
                    o.attr.visible = false;
                } else {
                    o.attr.state = 0;

                    o.collisionFilter.group =  0;
                    o.collisionFilter.category =  1;
                    o.collisionFilter.mask =  4294967295;

                    o.attr.visible = true;
                }
            }
        }
    }

    getObject(obj){
        if(obj.state == 1){
            return;
        }
        obj.state = 1;
        obj.visible = false;
        this.score++;

    }

    // -----------------------
    // *** PHYSICS STUFF ***
    // -----------------------

    // Sets physics perameters for the player
    setupPhysics() {
        var player = this.level.player.obj;
        player.mass = 100;
        player.frictionAir = 0.01;
        player.friction = 0.0;
    }

    // Player physics update
    updatePlayerPhysics() {

        if(this.alive) {

            const JUMP_SPEED = 5;
            const LEFT_RIGHT_SPEED = 2.5;
            const DROP_FORCE = 5;

            var player = this.level.player.obj;

            if (this.isOnFloor()) {
                var velocity = {x: player.velocity.x, y: player.velocity.y}

                if (this.keys[UP_KEY]) {
                    velocity.y = (velocity.y - JUMP_SPEED) / 2;
                }
                if (this.keys[LEFT_KEY] && this.keys[RIGHT_KEY] || (!this.keys[LEFT_KEY] && !this.keys[RIGHT_KEY])) {
                    velocity.x = velocity.x / 2;
                } else if (this.keys[RIGHT_KEY]) {
                    velocity.x = (velocity.x + LEFT_RIGHT_SPEED) / 2;
                } else if (this.keys[LEFT_KEY]) {
                    velocity.x = (velocity.x - LEFT_RIGHT_SPEED) / 2;
                }
                Matter.Body.setVelocity(player, velocity);
                player.force = {x: 0, y: player.force.y};
            } else {
                var velocity = player.velocity;
                if (this.keys[LEFT_KEY] && this.keys[RIGHT_KEY]) {
                    velocity.x = velocity.x / 2;
                } else if (this.keys[RIGHT_KEY]) {
                    velocity.x = (velocity.x * 2 + LEFT_RIGHT_SPEED) / 3;
                } else if (this.keys[LEFT_KEY]) {
                    velocity.x = (velocity.x * 2 - LEFT_RIGHT_SPEED) / 3;
                }
                if (this.keys[DOWN_KEY]) {
                    velocity.y = Math.max(velocity.y, (velocity.y + DROP_FORCE) / 2);
                }
                Matter.Body.setVelocity(player, velocity)
            }
        } else {
            const GHOST_SPEED = 1;
            let playerOb =  this.level.player.obj;
            playerOb.collisionFilter.category = 0;
            var velocity = {x: 0, y: 0};

            if (this.keys[UP_KEY]) {
                velocity.y -= GHOST_SPEED;
            }
            if (this.keys[DOWN_KEY]) {
                velocity.y += GHOST_SPEED;
            }
            if (this.keys[LEFT_KEY]) {
                velocity.x -= GHOST_SPEED;
            }
            if (this.keys[RIGHT_KEY]) {
                velocity.x += GHOST_SPEED;
            }
            Matter.Body.setVelocity(playerOb, velocity);
            playerOb.force = {x:0, y:-0.04};

        }
    }

    // Is player currently falling?
    isOnFloor() {
        var player = this.level.player.obj;

        var x = Math.ceil(player.position.x / TILE_SIZE);
        var x1 = Math.floor((player.position.x / TILE_SIZE));
        var y = Math.ceil((player.position.y + PLAYER_HEIGHT) / TILE_SIZE );
        var y1 = Math.ceil((player.position.y + PLAYER_HEIGHT / 2) / TILE_SIZE );

        var map = this.level.map;

        let objects = this.level.objects;
        for(var i in objects) {
            if((player.bounds.max.x >= objects[i].bounds.min.x && player.bounds.max.x <= objects[i].bounds.max.x ) ||
                (player.bounds.min.x >= objects[i].bounds.min.x && player.bounds.min.x <= objects[i].bounds.max.x ) ||
                (player.bounds.min.x <= objects[i].bounds.min.x && player.bounds.max.x >= objects[i].bounds.max.x ))
            {
                if(player.bounds.max.y > objects[i].bounds.min.y - 10 && player.bounds.max.y < objects[i].bounds.min.y + 2) {
                    if(objects[i].attr !== undefined && objects[i].attr.actions.door == true && objects[i].attr.visible === true) {
                        return true;
                    }
                }

            }
        }

        if (player.velocity.y > 0.02) {
            return false;
        }

        if( x1 < 0 || x >= map.width || y1 < 0 || y >= map.height || isNaN(x) || isNaN(y) || isNaN(x1) || isNaN(x)) {
            return false;
        }
        if(map.structure[y][x] === -1 && map.structure[y1][x] === -1 && map.structure[y][x1] === -1 && map.structure[y1][x1] === -1) {
            return false;
        }
        return true;
    }

    checkPlatforms() {
        // var doPlatformsExist = (this.level.player.obj.velocity !== null && this.level.player.obj.velocity.y > -0.05);
        for(var plat in this.platforms) {
            if(this.level.player.obj.bounds.max.y - 5 < this.platforms[plat].bounds.min.y) {
                this.platforms[plat].collisionFilter.category = 1;
            } else {
                this.platforms[plat].collisionFilter.category = 0;
            }
        }
    }

    // -----------------------
    // *** RENDERING STUFF ***
    // -----------------------

    // Renders the player icon
    showChar(playerImage, endImage, xPos, yPos, moveL, moveR, lastR, start, onFloor, yVel, alive, end, playerName, playerNumber) {

        xPos -= Matter.Vertices.centre(this.level.player.boundingBox).x;
        yPos -= Matter.Vertices.centre(this.level.player.boundingBox).y;
        var curFrame = Math.floor(endImage / ANIM_SPEED);
        var introFrames = Math.floor(endImage / ANIM_SPEED / 2);
        endImage++;
        this.ctx.strokeText(playerName, xPos+16-this.ctx.measureText(playerName).width/2, yPos);

        this.ctx.fillText(playerName, xPos+16-this.ctx.measureText(playerName).width/2, yPos);
        
        if (this.playerNumber != playerNumber) {
            this.ctx.filter = "opacity(50%)";
        }
		if(start){ // show appear animation
			this.ctx.drawImage(this.charAppear, 96*introFrames, 0, 96, 96, xPos-32, yPos-32, 96, 96);
			if(endImage >= 6*ANIM_SPEED*2) {
                endImage = 0;
				start = false;
			}
        }
        else if(!alive){ // dead
            if (end) { // if we haven't played the end animation
                this.ctx.drawImage(this.charDisappear, 96*introFrames, 0, 96, 96, xPos-32, yPos-32, 96, 96);
                if (endImage >= 6*ANIM_SPEED*2) {
                    endImage = 0;
                    end = false;
                }
            }
            else {
                if(moveR){
                    lastR = true;
                }
                else if(moveL){
                    lastR = false;
                }
                if(lastR){
                    this.ctx.drawImage(this.charDeadL, 44*introFrames, 0, 44, 30, xPos, yPos, 44, 30);
                }else{
                    this.ctx.drawImage(this.charDeadR, 44*introFrames, 0, 44, 30, xPos, yPos, 44, 30);
                }
                if(endImage >= 9*ANIM_SPEED*2) {
                    endImage = 0;
                }
            }
		}
        else if(moveR && onFloor) {  // running right
            lastR = true;
            this.ctx.drawImage(playerImage, 32*curFrame, 32, 32, 32, xPos, yPos, 32, 32);
            if(endImage >= 11*ANIM_SPEED){
                endImage = 0;
            }
        }
        else if(moveL && onFloor) { // running left
            lastR = false;
            this.ctx.drawImage(playerImage, 32*curFrame, 0, 32, 32, xPos, yPos, 32, 32);
            if(endImage >= 11*ANIM_SPEED){
                endImage = 0;
            }
        }
        else if (!onFloor) {
            endImage--;
            if (yVel < 0) { // jumping
                if (lastR) {
                    this.ctx.drawImage(playerImage, 0, 224, 32, 32, xPos, yPos, 32, 32);
                }
                else {
                    this.ctx.drawImage(playerImage, 0, 192, 32, 32, xPos, yPos, 32, 32);
                }
            }
            else { // falling
				if(moveR){
					lastR = true;
				}
				else if(moveL){
					lastR = false;
				}
				
                if (lastR) {
                    this.ctx.drawImage(playerImage, 0, 160, 32, 32, xPos, yPos, 32, 32);
                }
                else {
                    this.ctx.drawImage(playerImage, 0, 128, 32, 32, xPos, yPos, 32, 32);
                }            
            }
        }
        else if(lastR) { // idle right
            this.ctx.drawImage(playerImage, 32*curFrame, 96, 32, 32, xPos, yPos, 32, 32);
            if(endImage >= 10*ANIM_SPEED){
                endImage = 0;
            }
        }
        else if(!lastR){ // idle left
            this.ctx.drawImage(playerImage, 32*curFrame, 64, 32, 32, xPos, yPos, 32, 32);
            if(endImage >= 10*ANIM_SPEED){
                endImage = 0;
            }
        }
        this.ctx.filter = "none"; 
		return [endImage, lastR, start, end];
    }

    showChars() {
        for (let i = 0; i < this.level.players.length; i++) {
            let player = this.level.players[i];

            let moveL, moveR;
            if(Math.abs(player.vx) <= 0.001){
                moveL = false;
                moveR = false;
            }else if(player.vx < 0){
                moveL = true;
                moveR = false;
            }else{
                moveL = false;
                moveR = true;
            }
            var img = this.charImages[player.skinNumber];

            //showChar(playerImage, endImage, xPos, yPos, moveL, moveR, lastR, start, onFloor, yVel, end)
            if(player.alive != undefined){
                let OutputChar = this.showChar(img, player.endImage, player.x,
                    player.y, moveL, moveR,
                    player.lastR, player.start, (Math.abs(player.vy) > 0.01) ? false : true, player.vy, player.alive, player.end, player.playerName, player.playerNumber);//to run disappear set last value to true
                player.endImage = OutputChar[0];
                player.lastR = OutputChar[1];
                player.start = OutputChar[2];
                player.end = OutputChar[3];
            }
            

            //this.ctx.drawImage(this.objectImages["box.png"], player.x, player.y);

            this.level.players[i] = player;
        }
    }

    // newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - (16 - Matter.Vertices.centre(this.level.objects[i].boundingBox).x), this.level.objects[i].y * 16 - (16 - Matter.Vertices.centre(this.level.objects[i].boundingBox).y), this.level.objects[i].boundingBox, { isStatic: true, isSensor: true });

    showObjects() {
        for (let i = 0; i < this.level.objects.length; i++) {
            let obj = this.level.objects[i];
            if (obj.attr.visible == true) {
                if(obj.attr.animated) {
                    var tempX = obj.position.x - Matter.Vertices.centre(obj.attr.boundingBox).x;
                    var tempY = obj.position.y - Matter.Vertices.centre(obj.attr.boundingBox).y;

                    var ticks = Math.floor(this.animCounter / obj.attr.speed);
                    var state = obj.attr.state;
                    var frame = ticks % obj.attr.states[state].len;

                    var image = this.objectImages[obj.attr.states[state].src]
                    //this.ctx.drawImage(image, tempX, tempY);

                    if(!obj.attr.states[state].rep) {
                        if(obj.attr.states[state].counter === 0) {
                            obj.attr.states[state].counter = this.animCounter;
                        }
                        frame = Math.floor((this.animCounter - obj.attr.states[state].counter ) / obj.attr.speed);

                        if(frame >= obj.attr.states[state].len) {
                            obj.attr.state = obj.attr.states[state].next;
                        }
                    }

                    this.ctx.drawImage(image, frame * obj.attr.sizeX, 0, obj.attr.sizeX, obj.attr.sizeY,
                        tempX, tempY, obj.attr.sizeX, obj.attr.sizeY);
                } else {
                    var tempX = obj.position.x - Matter.Vertices.centre(obj.attr.boundingBox).x;
                    var tempY = obj.position.y - Matter.Vertices.centre(obj.attr.boundingBox).y;
                    this.ctx.drawImage(this.objectImages[obj.attr.src], tempX, tempY);
                }
            }
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

    // Draws a repeating background
    showBackground(tileNum) {
        for (var w = 0; w < this.ctx.canvas.width; w += 64) {
            for (var h = 0; h < this.ctx.canvas.height; h  += 64) {
                this.ctx.drawImage(this.backgroundImage, tileNum*64, 0, 64, 64, w, h, 64, 64);
            }
        }
    }

    // Draws a tile from the tile set in a position
    drawTile(tileNum, x, y) {
        var colNum = Math.floor(tileNum / (this.tilesetImage.width / 16));
        var rowNum = tileNum % (this.tilesetImage.width / 16);
        this.ctx.drawImage(this.tilesetImage, 16 * rowNum, 16 * colNum, 16, 16, x * 16 - 8, y * 16 - 8, 16, 16);
    }

    endGame(){
        if(this.winner == true){
            if(this.sentMessage == false){
                this.sentMessage = true;
                this.conn.send(JSON.stringify({
                    purp: "end",
                    data: { roomCode: this.roomCode},
                    time: Date.now(),
                    id: conHandler.id
                }));
                $('#WinOrLoseText').html("You Win");
            }
        }else{
            $('#WinOrLoseText').html("You Lose");
        }

        scores = [];

        for(let i = 0; i < this.level.players.length; i++){
            let player =  this.level.players[i];

            $('#scoresContainer').html();
            $('#scoresContainer').append(`
                <div>${player.playerName} ${player.score}</div>
            `);
            //scores.push({name: player.playerName, score: player.score});
        }

        $('#gameCanvasContainer').hide();
        $('#gameEndScore').html(`Score: ${this.score}`);
        $('#gameEndScreen').show();

        clearTimeout(this.gameUpdateInterval);
        this.engine.events = {};
    }

    pull(mess) {
        //unpack the objects here
        let objects = mess.data.objects;
        let players = mess.data.players;

        for (let i = 0; i < players.length; i++) {
            let found = false;
            for (let j = 0; j < this.level.players.length; j++) {
                if (players[i].id == conHandler.id) {
                    found = true;
                    break;
                } else if (players[i].id == this.level.players[j].id) {
                    this.level.players[j].x = players[i].x;
                    this.level.players[j].y = players[i].y;
                    this.level.players[j].vx = players[i].vx;
                    this.level.players[j].vy = players[i].vy;
                    this.level.players[j].alive = players[i].alive;
                    this.level.players[j].skinNumber = players[i].skinNumber;
                    this.level.players[j].playerName = players[i].playerName;
                    this.level.players[j].score = players[i].score;
                    found = true;
                    break;
                }
            }

            if (!found && players[i].id != conHandler.id) {
                let player = { id: players[i].id };
                player.x = players[i].x;
                player.y = players[i].y;
                player.vx = players[i].vx;
                player.vy = players[i].vy;
                player.alive = players[i].alive;
                player.skinNumber = players[i].skinNumber;
                player.score = players[i].score;
                player.playerName = players[i].playerName;

                player.lastR = true; // was the char last facing right?
                player.start = true; // Have we played the appear animation?
                player.endImage = 0;
                player.appear = 0; // appear loop iterator

                this.level.players.push(player);
            }
        }

        for(let i = 0; i < objects.length; i++){
            for(let j = 0; j < this.level.objects.length; j++){
                if(objects[i].attr.name == this.level.objects[j].attr.name){
                    this.level.objects[j].attr = objects[i].attr;
                    this.level.objects[j].collisionFilter = objects[i].collisionFilter;

                    if(this.objectImages[this.level.objects[j].src] == undefined){
                        this.objectImages[this.level.objects[j].src] = new Image();
                        this.objectImages[this.level.objects[j].src].src = "assets/" + this.level.objects[j].src;
                    }
                }
            }
        }

        //Players contains the positions of every player, but ignore the player with an id == conHandler.id as this is you
    }

    push() {
        let objects = [];

        for(let i = 0; i < this.objectUpdateList.data.length; i++){
            let obj = this.objectUpdateList.pop();
            objects.push({attr: obj.attr, collisionFilter: obj.collisionFilter});
        }

        this.conn.send(JSON.stringify({
            purp: "update",
            data: { roomCode: this.roomCode, objects: objects, player: { id: conHandler.id, 
                x: this.level.player.obj.position.x,
                y: this.level.player.obj.position.y, 
                vx: this.level.player.obj.velocity.x,
                vy: this.level.player.obj.velocity.y,
                alive: this.alive,
                skinNumber: this.skinNumber,
                playerName: this.playerName,
                score: this.score
                } 
            },
            time: Date.now(),
            id: conHandler.id
        }));

        this.objectUpdateList.data = [];
    }
}