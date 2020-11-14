const http = require('http');//For the http server
const webSocketServer = require("websocket").server;
const app = require("./server/app");//Controls the http routing
const shortID = require("short-id");//Used to generate the room codes
const { isUndefined } = require('util');
const {ID, Room, Map} = require('./server/classes.js')


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
    } else {
        conn.sendUTF(JSON.stringify({
            purp: "joinroom",
            data: { roomCode: -1 },
            time: Date.now(),
            id: conn.id.id
        }));
    }
}

function startRoom(mess, conn){
    let roomID = findRoomByCode(mess.data.roomCode);
    if(roomID != -1){
        let clients = rooms[roomID].getClients();
        let mapData = rooms[roomID].getMap();
        for(let i = 0; i < clients.length; i++){
            let conn = findPlayerByID(clients[i]);
            connections[conn].sendUTF(JSON.stringify({
                purp: "start",
                data: {map: mapData},
                time: Date.now(),
                id: connections[conn].id.id
            }));
        }
    }
}

function destroyRoom(mess, conn) {
    let roomID = new ID(conn.remoteAddress, mess.roomID);
    let roomIndex = findRoomByCode(roomID);
    if (roomIndex != -1) {
        rooms.splice(roomIndex, 1);
    }
}

function removePlayer(id) {
    let playerIndex = findPlayerByID(id);

    if (playerIndex != -1) {
        connections.splice(playerIndex, 1);
    }
}

function gameUpdate(mess, conn){
    let roomID = mess.data.roomCode;
    let data = mess.data.objects;

    let room = findRoomByCode(roomID);
    let newObjects = rooms[room].updateGame(data);
    let clients = rooms[room].getClients();
    for(let i = 0; i < clients.length; i++){
        let conn = findPlayerByID(clients[i]);
        connections[conn].sendUTF(JSON.stringify({
            purp: "update",
            data: {objects: newObjects},
            time: Date.now(),
            id: connections[conn].id.id
        }));   
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
    } else if(mess.purp == "startroom"){
        startRoom(mess, conn);
    } else if (mess.purp == "destroyroom") {
        destroyRoom(mess, conn);
    } else if(mess.purp == "update"){
        gameUpdate(mess, conn);
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