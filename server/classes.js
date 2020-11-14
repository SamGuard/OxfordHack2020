class ID {
    constructor(ip, id) {
        this.ip = ip;
        this.id = id;
    }
};

//Stores information about the 2 players
class Room {
    constructor(roomCode, hostID) {
        this.MAX_PLAYERS = 4
        this.code = roomCode;
        this.clients = [hostID];
        this.players = 1;
        this.map = new Map("map1");
    }

    getClients(){
        return this.clients;
    }

    addPlayer(id) {
        if(this.players < this.MAX_PLAYERS){
            this.clients.push(id);
            this.players++;
        }
    }


}

class Map{
    constructor(name){

    }
}


module.exports = {ID, Room, Map};