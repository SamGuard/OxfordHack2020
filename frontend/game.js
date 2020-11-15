const LEFT_KEY = 37;
const RIGHT_KEY = 39;
const UP_KEY = 38;
const DOWN_KEY = 40;

const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;

const TILE_SIZE = 16;

const ANIM_SPEED = 2; // The bigger the number, the slower.

class Set{
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

    constructor(isHost, conn, roomCode) {
        //make a game canvas using jquery in the game canvas container.
        $("#gameMenu").hide();
        $('#gameCanvasContainer').show();// Game canvas goes in here
        $('#gameEndScreen').hide();

        this.setupCanvas(window.innerWidth / 2, window.innerHeight / 2);
        this.keys = [];

        this.isHost = isHost;
        this.conn = conn;
        this.roomCode = roomCode;

        this.objectUpdateList = new Set();
    }

    // Function to start the game

    isEqual(item1, item2) {
        return item1.x1 == item2.x1 && item1.x2 == item2.x2 && item1.y1 == item2.y1 && item1.y2 == item2.y2;
    }

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
		this.charPlayer1 = new Image();
		this.charPlayer1.src = "assets/chars/player1.png";
		this.charPlayer2 = new Image();
		this.charPlayer2.src = "assets/chars/player1.png";
		this.charPlayer3 = new Image();
		this.charPlayer3.src = "assets/chars/player1.png";
		this.charPlayer4 = new Image();
		this.charPlayer4.src = "assets/chars/player1.png";
		this.charAppear = new Image();
        this.charAppear.src = "assets/chars/char-appear.png";
        this.charDisappear = new Image();
        this.charDisappear.src = "assets/chars/char-disappear.png";
        var map = this.level.map;

        // Initialises the physics engine
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        const visited = Array(map.height).fill(false).map(x => Array(map.width).fill(false));

        for (var x = 0; x < map.width; x++) {
            for (var y = 0; y < map.height; y++) {
                if (visited[y][x]) continue;

                // we found an actual square - check surrounding squares iteratively.
                var currentPoly = []; // contains all squares confirmed to be connected
                var stack = []; // contains squares to be searched

                stack.push({"x": x, "y": y});

                while (stack.length > 0) {
                    var cur = stack.pop();

                    var tileType = map.structure[cur.y][cur.x];
                    if (tileType == -1) continue;
                    if (visited[cur.y][cur.x]) continue;
                    if (tileType in this.level.map.customTiles) continue;

                    currentPoly.push({"x": cur.x, "y": cur.y});
                    visited[cur.y][cur.x] = true;

                    if (cur.y > 0) {
                        if (!visited[cur.y-1][cur.x]) {
                            stack.push({"x": cur.x, "y": cur.y-1});
                        }
                    }
                    if (cur.y < map.height-1) {
                        if (!visited[cur.y+1][cur.x]) {
                            stack.push({"x": cur.x, "y": cur.y+1});
                        }
                    }
                    if (cur.x > 0) {
                        if (!visited[cur.y][cur.x-1]) {
                            stack.push({"x": cur.x-1, "y": cur.y});
                        }
                    }
                    if (cur.x < map.width-1) {
                        if (!visited[cur.y][cur.x+1]) {
                            stack.push({"x": cur.x+1, "y": cur.y});
                        }
                    }
                }
                if (currentPoly.length == 0) continue;

                var edges = [];

                for (var i in currentPoly) {
                    var square = currentPoly[i];
                    edges.push({"x1": square.x, "y1": square.y, "x2": square.x+1, "y2": square.y});
                    edges.push({"x1": square.x, "y1": square.y, "x2": square.x, "y2": square.y+1});
                    edges.push({"x1": square.x+1, "y1": square.y, "x2": square.x+1, "y2": square.y+1});
                    edges.push({"x1": square.x, "y1": square.y+1, "x2": square.x+1, "y2": square.y+1});
                }

                var uniqueEdges = [];

                for (var i in edges) {
                    var square = edges[i];
                    var count = 0;
                    for (var j in edges) {
                        var square2 = edges[j];
                        if (this.isEqual(square, square2)) {
                            count++;
                        }
                        if (count > 1) {
                            break;
                        }
                    }
                    if (count == 1) {
                        uniqueEdges.push(square);
                    }
                }
                var orderedUniqueEdges = [];
                orderedUniqueEdges.push({"x": uniqueEdges[0].x1, "y": uniqueEdges[0].y1});
                var toSearchFor = {"x": uniqueEdges[0].x2, "y": uniqueEdges[0].y2};
                uniqueEdges.splice(0, 1);
                var count = uniqueEdges.length;
                while (count > 0) {
                    for (var item in uniqueEdges) {
                        var square = uniqueEdges[item];

                        if (square.x1 == toSearchFor.x && square.y1 == toSearchFor.y) {
                            orderedUniqueEdges.push({"x": square.x1, "y": square.y1});
                            toSearchFor = {"x": square.x2, "y": square.y2};
                            uniqueEdges.splice(item, 1);
                            break;
                        }
                        else if (square.x2 == toSearchFor.x && square.y2 == toSearchFor.y) {
                            orderedUniqueEdges.push({"x": square.x2, "y": square.y2});
                            toSearchFor = {"x": square.x1, "y": square.y1};
                            uniqueEdges.splice(item, 1);
                            break;
                        }
                    }
                    count--;
                }
                console.log(orderedUniqueEdges);
                for (var item in orderedUniqueEdges) {
                    orderedUniqueEdges[item].x *=16;
                    orderedUniqueEdges[item].y *=16;
                }
                Matter.World.add(this.world, [Matter.Bodies.fromVertices(0 - (16 - Matter.Vertices.centre(orderedUniqueEdges).x), 0 - (16 - Matter.Vertices.centre(orderedUniqueEdges).y), orderedUniqueEdges, { isStatic: true })]);
            }
        }
        // Add a rectangle to the physics engine for every tile in the map
        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                var tileType = map.structure[row][col];
                if (tileType != -1) {
                    if (tileType in this.level.map.customTiles) {
                        var custom = this.level.map.customTiles[tileType];
                        if ("boundingBox" in custom) {
                            console.log(Matter.Vertices.centre(custom.boundingBox));
                            Matter.World.add(this.world, [Matter.Bodies.fromVertices(col * 16 - (16 - Matter.Vertices.centre(custom.boundingBox).x), row * 16 - (16 - Matter.Vertices.centre(custom.boundingBox).y), custom.boundingBox, { isStatic: true })]);

                            continue;
                        }
                    }
                }
            }
        }

        var player = this.level.player;

        // Make player physics object
        player.obj = Matter.Bodies.fromVertices(player.startPositions[0].x * 16 - 8, player.startPositions[0].y * 16 - 8, player.boundingBox, { inertia: Infinity });

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
        this.objectImages = {};
        for (let i = 0; i < this.level.objects.length; i++) {
            newObjects.push({});

            this.objectImages[this.level.objects[i].src] = new Image();
            this.objectImages[this.level.objects[i].src].src = "assets/" + this.level.objects[i].src;

            if (this.level.objects[i].actions.button == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - 8, this.level.objects[i].y * 16 - 8, this.level.objects[i].boundingBox, { isStatic: true, isSensor: true });
            } else if (this.level.objects[i].actions.door == true) {
                newObjects[i] = Matter.Bodies.fromVertices(this.level.objects[i].x * 16 - 8, this.level.objects[i].y * 16 - 8, this.level.objects[i].boundingBox, { isStatic: true });
            }

            newObjects[i].attr = this.level.objects[i];
            Matter.World.add(this.world, [newObjects[i]]);
        }

        this.level.objects = newObjects;
    }

    // Adds any event handlers needed
    setupEvents() {
        // On a resize change size of canvas and redo scale
        $(window).resize(function () {
            conHandler.game.setupCanvas(window.innerWidth / 2, window.innerHeight / 2);
            // If map has been read in update map scaling
            if (conHandler.game.level != null) {
                console.log("Changed size");
                conHandler.game.scale = (conHandler.game.ctx.canvas.height) / (conHandler.game.level.map.height * 16);
            }
        });

        // Store the current state of the keys in a dict so they can always be looked up
        $(window).keydown(function (e) {
            conHandler.game.keys[e.keyCode] = true;
        });

        $(window).keyup(function (e) {
            conHandler.game.keys[e.keyCode] = false;
        });

        Matter.Events.on(this.engine, 'collisionStart', function (event) {
            var pairs = event.pairs;

            for (var i = 0, j = pairs.length; i != j; ++i) {
                var pair = pairs[i];
                if (pair.bodyA.attr != undefined && pair.bodyA.attr.actions.button == true) {
                    conHandler.game.doButtonThings(pair.bodyA);
                } else if (pair.bodyB.attr != undefined && pair.bodyB.attr.actions.button == true) {
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
        this.ctx.imageSmoothingEnabled = false;
    }

    // ------------------
    // *** GAME TICKS ***
    // ------------------

    // This runs every game tick
    update() {
        var player = this.level.player.obj;

        // Clear the canvas
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        // Transform the game to fill the canvas vertically
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5 * this.ctx.canvas.width - this.scale * player.position.x, 0.5 * this.ctx.canvas.height - this.scale * player.position.y);

        this.updatePlayerPhysics();

        // Render tick
        this.showMap();

        this.showChars();

		let OutputChar = this.showChar(this.charPlayer1, this.endImage, player.position.x, player.position.y, this.keys[LEFT_KEY], this.keys[RIGHT_KEY], this.lastR, this.start, this.isOnFloor(), player.velocity.y);
		this.endImage = OutputChar[0];
		this.lastR = OutputChar[1];
		this.start = OutputChar[2];

        this.showObjects();

        // Physics tick
        Matter.Engine.update(this.engine, 20);
        this.push(this.level.player.obj.position.x, this.level.player.obj.position.y);
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


                console.log("switched");
            }
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

        if (this.isOnFloor()) {
            var velocity = { x: player.velocity.x, y: player.velocity.y }

            if (this.keys[UP_KEY]) {
                velocity.y = (velocity.y - JUMP_SPEED) / 2;
            }
            if(this.keys[LEFT_KEY] && this.keys[RIGHT_KEY] || (!this.keys[LEFT_KEY] && !this.keys[RIGHT_KEY])) {
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
            Matter.Body.setVelocity(player, velocity)
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

        if (player.velocity.y > 0.02) {
            return false;
        }

        if( x1 < 0 || x >= map.width || y1 < 0 || y >= map.height ||
            (map.structure[y][x] === -1 && map.structure[y1][x] === -1 && map.structure[y][x1] === -1 && map.structure[y1][x1] === -1)) {
            return false;
        } else {
            return true;
        }
    }

    // -----------------------
    // *** RENDERING STUFF ***
    // -----------------------

    // Renders the player icon
    showChar(playerImage, endImage, xPos, yPos, moveL, moveR, lastR, start, onFloor, yVel) {
        var curFrame = Math.floor(endImage / ANIM_SPEED);
        var introFrames = Math.floor(endImage / ANIM_SPEED / 2);
        endImage++;
		if(start){ // show appear animation
			this.ctx.drawImage(this.charAppear, 96*introFrames, 0, 96, 96, xPos-32, yPos-32, 96, 96);
			if(endImage >= 6*ANIM_SPEED*2) {
                endImage = 0;
				start = false;
			}
        }
        else if(moveR) {  // running right
            lastR = true;
            this.ctx.drawImage(playerImage, 32*curFrame, 32, 32, 32, xPos, yPos, 32, 32);
            if(endImage >= 11*ANIM_SPEED){
                endImage = 0;
            }
        }
        else if(moveL) { // running left
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
		return [endImage, lastR, start];
    }

    showChars() {
        for (let i = 0; i < this.level.players.length; i++) {
            let player = this.level.players[i];
            this.ctx.drawImage(this.objectImages["box.png"], player.x, player.y);
        }
    }

    showObjects() {
        for (let i = 0; i < this.level.objects.length; i++) {
            let object = this.level.objects[i];
            if (object.attr.visible == true) {
                this.ctx.drawImage(this.objectImages[object.attr.src], object.position.x, object.position.y);
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

    // Draws a tile from the tile set in a position
    drawTile(tileNum, x, y) {
        var colNum = Math.floor(tileNum / (this.tilesetImage.width / 16));
        var rowNum = tileNum % (this.tilesetImage.width / 16);
        this.ctx.drawImage(this.tilesetImage, 16 * rowNum, 16 * colNum, 16, 16, x * 16, y * 16, 16, 16);
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
                    found = true;
                    break;
                }
            }

            if (!found && players[i].id != conHandler.id) {
                let player = { id: players[i].id };
                player.x = players[i].x;
                player.y = players[i].y;

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

    push(playerX, playerY) {
        let objects = [];

        for(let i = 0; i < this.objectUpdateList.data.length; i++){
            let obj = this.objectUpdateList.pop();
            objects.push({attr: obj.attr, collisionFilter: obj.collisionFilter});
        }

        this.conn.send(JSON.stringify({
            purp: "update",
            data: { roomCode: this.roomCode, objects: objects, player: { id: conHandler.id, x: playerX, y: playerY } },
            time: Date.now(),
            id: conHandler.id
        }));

        this.objectUpdateList.data = [];
    }
}