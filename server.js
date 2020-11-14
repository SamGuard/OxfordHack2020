const http = require('http');//For the http server
const webSocketServer = require("websocket").server;
const app = require("./server/app");//Controls the http routing
const shortID = require("short-id");//Used to generate the room codes
const { isUndefined } = require('util');


const port = process.env.PORT || 3000;//Use port 3000 unless process.env.PORT is set as this variable is set when deployed to heroku

const server = http.createServer(app);//Creates the http server using app.js

server.listen(port);//Listen for incoming connections

console.log("listening on port " + port);


//WebSocketServer
/*

WebSocketServer message structure:
{
    purp (purpose of the message),
    data {} (object containing more information if needed),
    time (UTC time),
    id (id of the user the message if comming from or being sent to)
}

When the server recieves a message over the socket its purpose must have a purpose
of either:
createroom - to create a new room
joinroom - to join a room
start - to let the players know to start the game
pass - used to pass information from one player to the other
error - if something has gone wrong  
*/


//ID stores the ID of each user to connect, this is so people using the same IP
//Can play 
class ID {
    constructor(ip, id) {
        this.ip = ip;
        this.id = id;
    }
};

//Stores information about the 2 players
class Room {
    constructor(roomCode, hostID) {
        this.code = roomCode;
        this.hostID = hostID;
        this.clientID = null;
    }

    addPlayer(id) {
        if (this.clientID == null) {
            this.clientID = id;
            return 1;
        } else {
            return -1;
        }
    }


}

rooms = [];

function genCode() {
    return shortID.generate().toLowerCase();
}

function isOriginAllowed(ip) {
    return true;
}

function addRoom(id) {
    let code = genCode();
    rooms.push(new Room(code, id));
    console.log("Created room, IP: " + id.ip + " room code: " + code);
    return code;
}

function compareID(id1, id2) {
    if (id1.ip == id2.ip && id1.id == id2.id) {
        return true;
    }
    return false;
}

function findRoomByCode(roomCode) {
    for (let i = 0; i < rooms.length; i++) {
        if (rooms[i].code == roomCode) {
            return i;
        }
    }
    return -1;
}

function findRoomByPlayerID(id) {
    for (let i = 0; i < rooms.length; i++) {
        if (compareID(rooms[i].hostID, id) || (rooms[i].clientID != undefined && compareID(rooms[i].clientID, id))) {
            return i;
        }
    }
    return -1;
}

function findPlayerByID(id) {
    for (let i = 0; i < connections.length; i++) {
        if (connections[i].id && compareID(id, connections[i].id)) {
            return i;
        }
    }
    return -1;
}

function setID(mess, conn) {
    conn.id = new ID(conn.remoteAddress, mess.id);
}

function createRoom(mess, conn) {
    conn.sendUTF(JSON.stringify({
        purp: "createroom",
        data: { roomCode: addRoom(conn.id) },
        time: Date.now(),
        id: conn.id.id
    }));
}

function joinRoom(mess, conn) {
    conn.id = new ID(conn.remoteAddress, mess.id);
    let roomIndex = findRoomByCode(mess.data.roomCode);

    if (roomIndex != -1) {
        if (rooms[roomIndex].addPlayer(new ID(conn.remoteAddress, mess.id)) == -1) {
            conn.sendUTF(JSON.stringify({
                purp: "error",
                data: { error: "room full" },
                time: Date.now(),
                id: conn.id.id
            }));
            return;
        }
        conn.sendUTF(JSON.stringify({
            purp: "joinroom",
            data: { roomCode: rooms[roomIndex].code },
            time: Date.now(),
            id: conn.id.id
        }));

        let playerIndex = findPlayerByID(rooms[roomIndex].hostID);
        if (playerIndex != -1) {
            connections[playerIndex].sendUTF(JSON.stringify({
                purp: "start",
                data: {},
                time: Date.now(),
                id: connections[playerIndex].id.id
            }));
        } else {
            console.log("Error: could not find other player");
        }
    } else {
        conn.sendUTF(JSON.stringify({
            purp: "joinroom",
            data: { roomCode: -1 },
            time: Date.now(),
            id: conn.id.id
        }));
    }
}

function passMessage(mess, conn) {
    let sourcePlayerID = new ID(conn.remoteAddress, mess.id);
    let roomIndex = findRoomByPlayerID(sourcePlayerID);
    let destPlayerID = null;
    //Finding the ID of the other player in the room
    if (roomIndex == -1) {
        conn.sendUTF(JSON.stringify({
            purp: "error",
            data: { error: "Could not find room" },
            time: Date.now(),
            id: mess.id
        }));
        return;
    }

    if (compareID(rooms[roomIndex].hostID, sourcePlayerID) == true) {
        destPlayerID = rooms[roomIndex].clientID;
    } else {
        destPlayerID = rooms[roomIndex].hostID;
    }

    let connIndex = findPlayerByID(destPlayerID);
    if (connIndex == -1) {
        conn.sendUTF(JSON.stringify({
            purp: "error",
            data: { error: "Could not find other player" },
            time: Date.now(),
            id: mess.id
        }));
        return;
    }
    connections[connIndex].sendUTF(JSON.stringify({
        purp: "pass",
        data: mess.data,
        time: mess.time,
        id: destPlayerID.id
    }));
}

function destroyRoom(mess, conn) {
    let playerID = new ID(conn.remoteAddress, mess.id);
    let roomIndex = findRoomByPlayerID(playerID);
    if (roomIndex != -1) {
        rooms.splice(roomIndex, 1);
    }
}

function removePlayer(id) {
    let roomIndex = findRoomByPlayerID(id);
    if (roomIndex != -1) {
        rooms.splice(roomIndex, 1);
    }

    let playerIndex = findPlayerByID(id);

    if (playerIndex != -1) {
        connections.splice(playerIndex, 1);
    }
}

function handleMessage(mess, conn) {
    mess = JSON.parse(mess);
    if (mess.purp == "setid") {
        setID(mess, conn);
    } else if (mess.purp == "createroom") {
        createRoom(mess, conn);
    } else if (mess.purp == "joinroom") {
        joinRoom(mess, conn);
    } else if (mess.purp == "pass") {
        passMessage(mess, conn);
    } else if (mess.purp == "destroyroom") {
        destroyRoom(mess, conn);
    } else {
        conn.sendUTF(JSON.stringify({
            purp: "error",
            data: { error: "Purpose not recognise" },
            time: Date.now(),
            id: mess.id
        }));
    }
}

var WebSocketServer = require('websocket').server;

wss = new WebSocketServer({
    httpServer: server,
    autoAcceptConnections: false
});

let connections = [];

wss.on('request', function (request) {
    if (!isOriginAllowed(request.origin)) {
        // Make sure we only accept requests from an allowed origin
        request.reject();
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
        return;
    }

    var connection = request.accept(null, request.origin);
    console.log((new Date()) + ' Connection accepted. IP: ' + connection.remoteAddress);

    connection.on('message', function (message) {
        //console.log('Received Message: ' + message.utf8Data);
        handleMessage(message.utf8Data, connection);
    });
    connection.on('close', function (reasonCode, description) {
        removePlayer(connection.id);
        console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
    });

    connections.push(connection);

});