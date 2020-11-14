fs = require('fs');

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

    updateGame(obj){
        return this.map.update(obj);
    }

    getMap(){
        return {
            response: {
                map: this.map.map,
                objects: this.map.objects
                }
            };
    }


}

class Map{
    constructor(name){
        let data = JSON.parse(fs.readFileSync(process.cwd() + `/maps/${name}.json`, {encoding:'utf8', flag:'r'}));
        this.objects = data.response.objects;
        this.map = data.response.map;
    }

    update(d){
        for(let i = 0; i < d.length; i++){
            let o = d[i];
            for(let j = 0; j < this.objects; j++){
                if(o.id == this.objects[i].id){
                    this.objects[i] = o;
                }
            }
        }
        return this.objects;
    }
}


module.exports = {ID, Room, Map};