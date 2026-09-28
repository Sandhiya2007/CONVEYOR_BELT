class WebSocketManager {
  constructor(){ this.clients=new Set(); this.latestPacket=null; }
  add(ws){ this.clients.add(ws); if(this.latestPacket) ws.send(JSON.stringify(this.latestPacket)); }
  remove(ws){ this.clients.delete(ws); }
  broadcast(message){
    this.latestPacket=message;
    const payload=JSON.stringify(message);
    for(const ws of this.clients){
      if(ws.readyState===1){ try{ws.send(payload);}catch{this.clients.delete(ws);} }
      else this.clients.delete(ws);
    }
  }
}
module.exports={WebSocketManager};
