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

    async start() {

        this.gameUpdateInterval = setInterval(function () {
            conHandler.game.update();
        }, 20);

        this.level = await $.get("assets/map.json");

        this.image = new Image();
        this.image.src = "assets/" + this.level.response.map.tileset;

        this.charImage = new Image();
        this.charImage.src = "assets/mydude.png";

        var map = this.level.response.map;
        this.engine = Matter.Engine.create();
        this.world = this.engine.world;

        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                if (map.structure[row][col] != -1) {
                    Matter.World.add(this.world, [Matter.Bodies.rectangle(col*16,row*16,16,16, { isStatic: true })]);
                }
            }
        }

        var player = this.level.response.player;
        player.obj = Matter.Bodies.rectangle(player.startX*16, player.startY*16, 32, 32, { inertia: Infinity });
        Matter.World.add(this.world, [player.obj]);

        // var render = Matter.Render.create({
        //     canvas: this.ctx.canvas,
        //     engine: this.engine
        // });

        // Matter.Render.lookAt(render, {
        //     min: {x: -7, y: -8},
        //     max: {x: render.canvas.width, y: render.canvas.height}
        // });

        // Matter.Render.run(render);

        this.setupEvents();

        this.scale = (this.ctx.canvas.height) / (map.height * 16);

    }

    setupEvents() {
        $(window).resize(function() {
            conHandler.game.setupCanvas(window.innerWidth/2, window.innerHeight/2);

            // If map has been read in update map scaling
            if(conHandler.game.level.response != null) {
                console.log("Changed size");
                conHandler.game.scale = (conHandler.game.ctx.canvas.height) / (conHandler.game.level.response.map.height * 16);
            }
        });

        $(window).keydown(function(e) {
            conHandler.game.keys[e.keyCode] = true;
        });

        $(window).keyup(function(e) {
            conHandler.game.keys[e.keyCode] = false;
        });
    }

    async setupCanvas(width, height) {
        var canvas = $('#gameCanvas')[0];
        this.ctx = canvas.getContext("2d");
        this.ctx.canvas.width = width;
        this.ctx.canvas.height = height;

        this.ctx.fillStyle = "#F0F8FF";
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.imageSmoothingEnabled= false;
    }

    update(){
        var player = this.level.response.player.obj;

        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.ctx.setTransform(this.scale, 0, 0, this.scale, 0.5*this.ctx.canvas.width - this.scale*player.position.x, 0);

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

    showChar() {
        var player = this.level.response.player.obj;
        this.ctx.drawImage(this.charImage, player.position.x-7, player.position.y-8);
    }

    showMap() {
        var map = this.level.response.map;

        for (var col = 0; col < map.width; col++) {
            for (var row = 0; row < map.height; row++) {
                if (map.structure[row][col] != -1) {
                    this.drawTile(map.structure[row][col], col, row);
                }
            }
        }
    }

    drawTile(tileNum, x, y) {
        var colNum = Math.floor(tileNum/(this.image.width/16));
        var rowNum = tileNum % (this.image.width/16);
        this.ctx.drawImage(this.image, 16*rowNum, 16*colNum, 16, 16, x*16, y*16, 16, 16);
    }
}