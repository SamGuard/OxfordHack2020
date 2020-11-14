class Game {
    constructor(isHost, conn) {
        //make a game canvas using jquery in the game canvas container.
        $("#gameMenu").show();
        $('#gameCanvasContainer').hide();// Game canvas goes in here
        $('#gameEndScreen').hide();
        this.conn = conn;
        this.count = 0;
    }

    update(){
        if(this.count == 100){
            this.conn.send(JSON.stringify({
                purp: "update",
                data: { roomCode: conHandler.roomCode, objects: [{id: 1}, {id: 2}] },
                time: Date.now(),
                id: this.id
            }));
            this.count = 0;
        }else{
            this.count++;
        }
    }
}