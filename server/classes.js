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
        this.clients = [];
        this.players = 0;
        
        this.map = new Map("map1");

        this.addPlayer(hostID);
    }

    getClients(){
        return this.clients;
    }

    addPlayer(id) {
        if(this.players < this.MAX_PLAYERS){
            this.clients.push(id);
            this.map.players.push({id: id.id, x: 0, y: 0});
            this.players++;
        }
    }

    updateGame(obj, p){
        return this.map.update(obj, p);
    }

    getMap(){
        return {
            response: {
                map: this.map.map,
                objects: this.map.objects,
                player: this.map.player
                }
            };
    }


}

class Map{
    constructor(name){
        let data = JSON.parse(fs.readFileSync(process.cwd() + `/maps/${name}.json`, {encoding:'utf8', flag:'r'}));
        this.objects = data.response.objects;
        this.map = data.response.map;
        this.player = data.response.player;
        this.players = [];
    }

    update(d, p){
        for(let i = 0; i < d.length; i++){
            let o = d[i];
            for(let j = 0; j < this.objects; j++){
                if(o.id == this.objects[i].id){
                    this.objects[i] = o;
                }
            }
        }

        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].id == p.id){
                this.players[i] = p;
            }
        }

        return {objects: this.objects, players: this.players};
    }
}


module.exports = {ID, Room, Map};