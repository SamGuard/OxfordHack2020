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
        this.mapNames = ["map1", "map2", "map3"];
        this.mapIndex = 0;
        this.MAX_PLAYERS = 4
        this.code = roomCode;
        this.clients = [];
        this.players = 0;
        
        this.map = new Map(this.mapNames[this.mapIndex]);

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
        return this.players-1;
    }

    updateGame(obj, p){
        return this.map.update(obj, p);
    }

    getMap(){
        return {
            map: this.map.map,
            objects: this.map.defaultObjects,
            player: this.map.player
        };
    }

    newMap(){
        this.mapIndex = (this.mapIndex + 1) % 3;
        this.map = new Map(this.mapNames[this.mapIndex]);

        for(let i = 0; i < this.clients.length; i++){
            this.map.players.push({id: this.clients[i].id, x: 0, y: 0});
        }
    }
}

class Map{
    constructor(name){
        let data = JSON.parse(fs.readFileSync(process.cwd() + `/maps/${name}.json`, {encoding:'utf8', flag:'r'}));
        this.defaultObjects = data.objects;
        this.objects = [];
        this.map = data.map;
        this.player = data.player;
        this.players = [];
    }

    update(d, p){
        let newObjects = [];
        for(let i = 0; i < d.length; i++){
            let o = d[i];
            let found = false;
            for(let j = 0; j < this.objects.length; j++){
                if(o.attr.name == this.objects[j].attr.name){
                    this.objects[i] = o;
                }
            }
            if(found == false){
                this.objects.push(o);
            }
        }

        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].id == p.id){
                this.players[i] = p;
            }
        }

        return {objects: d, players: this.players};
    }
}


module.exports = {ID, Room, Map};