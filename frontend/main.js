function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

class ConnectionHandler {
    constructor() {
        this.isHost = true;
        this.gameRunning = false;
        this.roomCode = "";
        this.game;
        this.id = makeid(6);
        console.log("Your id is: " + this.id);

        this.IP = null;

        //When testing this on my local machine the protocol is http so this 
        //automatically switches the connection type
        if (location.protocol == "https:") {
            this.IP = "wss://" + window.location.host;
        } else {
            this.IP = "ws://" + window.location.host;
        }
        this.socket = new WebSocket(this.IP);
        
    }

    createRoom() {
        let data = JSON.stringify({
            purp: "createroom",
            data: {},
            time: Date.now(),
            id: this.id
        });
        this.socket.send(data);
    }

    destroyRoom() {
        let data = JSON.stringify({
            purp: "destroyroom",
            data: { roomID: this.roomCode },
            time: Date.now(),
            id: this.id
        });
        this.socket.send(data);
    }

    joinRoom() {
        let data = JSON.stringify({
            purp: "joinroom",
            data: { roomCode: this.roomCode },
            time: Date.now(),
            id: this.id
        });
        this.socket.send(data);
    }

    causeStartGame(){
        let data = JSON.stringify({
            purp: "startroom",
            data: { roomCode: this.roomCode },
            time: Date.now(),
            id: this.id
        });
        this.socket.send(data);
    }

    startGame(map) {
        console.log("Start game");
        $('#createGamePage').hide();
        $('#homePage').hide();
        $('#waitingRoom').hide();

        $('#gamePage').show();
        this.gameRunning = true;

        console.log("Game running, isHost: " + this.isHost);
        this.game = new Game(this.isHost, this.socket, this.roomCode);
        this.game.start(map);
    }
};

let conHandler = new ConnectionHandler();
let audio = new Audio();

conHandler.socket.onopen = function (e) {
    let data = JSON.stringify({
        purp: "setid",
        data: {},
        time: Date.now(),
        id: conHandler.id
    });
    conHandler.socket.send(data);

    console.log("[open] Connection established");
};

conHandler.socket.onmessage = function (event) {
    //console.log(`[message] Data received from server: ${event.data}`);
    let data = JSON.parse(event.data);

    if (data.id != conHandler.id) {
        console.log("Invalid ID: " + data.id);
        return;
    }

    if(data.purp == "update"){
        conHandler.game.pull(data);
    } else if (data.purp == "createroom") {
        conHandler.roomCode = data.data.roomCode;
        console.log(conHandler.roomCode);
        $('#createGamePin').html(`<b>${conHandler.roomCode}</b><br>`);
    } else if (data.purp == "joinroom") {
        if (data.data.roomCode == -1) {
            console.log("Error joining room");
        } else {
            conHandler.roomCode = data.data.roomCode;
            conHandler.isHost = false;
        }
    } else if (data.purp == "start") {
        conHandler.startGame(data.data.map);
    } else if(data.purp == "end"){
        conHandler.game.endGame();
    } else if(data.purp == "updateWaitingRoom"){
        if(conHandler.isHost == true){
            $('#createGamePlayers').html(`Players: ${data.data.numPlayers}`);
        }else{
            $('#waitingRoomPlayers').html(`Players: ${data.data.numPlayers}`);
        }
    } else {
        console.log("Error purpose not recognise");
    }

};

conHandler.socket.onclose = function (event) {
    if (event.wasClean) {
        console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
    } else {
        console.log('[close] Connection died');
    }
    alert("Lost connection please refresh the page");
};

conHandler.socket.onerror = function (error) {
    console.log(`[error] ${error.message}`);
};

$(document).ready(function () {

    $('#homePage').show();
    $('#gamePage').hide();
    $('#helpScreen').hide();
    $('#createGamePage').hide();
    $('#waitingRoom').hide();

    $('#joinGameButton').click(function () {
        conHandler.roomCode = $('#codeInput').val().toLowerCase();
        conHandler.joinRoom();
        $('#homePage').hide();
        $('#gamePage').hide();
        $('#helpScreen').hide();
        $('#createGamePage').hide();
        $('#waitingRoom').show();

        $('#waitingRoomPin').html(conHandler.roomCode);
    });

    $('#createGameButton').click(function () {
        $('#homePage').hide();
        $('#gamePage').hide();
        $('#helpScreen').hide();
        $('#createGamePage').show();
        conHandler.createRoom();
        $('#createGamePlayers').html(`Players: ${1}`);
    });

    $('#createBackButton').click(function () {
        conHandler.destroyRoom();
        $('#homePage').show();
        $('#gamePage').hide();
        $('#helpScreen').hide();
        $('#createGamePage').hide();
    });

    $('#createStartButton').click(function () {
        conHandler.causeStartGame();
        $('#homePage').show();
        $('#gamePage').hide();
        $('#helpScreen').hide();
        $('#createGamePage').hide();
    });

    $('#newGameButton').click(function(){
        window.location = "";
    });

    $('#help').click(function(){
        $('#homePage').hide();
        $('#gamePage').hide();
        $('#helpScreen').show();
        $('#createGamePage').hide();
    });

    $('#helpScreenBack').click(function(){
        $('#homePage').show();
        $('#gamePage').hide();
        $('#helpScreen').hide();
        $('#createGamePage').hide();
    });
});