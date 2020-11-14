const http = require('http');//For the http server
//const webSocketServer = require("websocket").server;
const app = require("./server/app");//Controls the http routing
const shortID = require("short-id");//Used to generate the room codes


const port = process.env.PORT || 3000;//Use port 3000 unless process.env.PORT is set as this variable is set when deployed to heroku

const server = http.createServer(app);//Creates the http server using app.js

server.listen(port);//Listen for incoming connections

console.log("listening on port " + port);