import fs from "fs/promises";
import { Server } from "socket.io";
import { io } from "socket.io-client";
import peerList from "./peerList.json" assert { type: 'json' };

export class ServerNode {
  instance;

  constructor(port) {
    this.instance = new Server(port);
  }

  listen() {
    this.instance.on("connection", (socket) => {

      socket.on("addPeer",async (peer)=>{
        let peerlist = new Set(peerList)
           if(!peerlist.has(peer))
               peerlist.add(peer)
           await fs.writeFile("./peerList.json",JSON.stringify(peerlist),"utf-8")
       })

       socket.on("peerlist",()=>{
           socket.emit("receivePeerList",peerList);
       })
       
    });
  }
}

export class ClientNode {
  instance;

  constructor(url = "http://localhost:4001") {
    this.instance = io(url);

    this.instance.on("connect");
  }

  listen(){
    this.instance.on("receivePeerList",async (peerlist)=>{
       await fs.writeFile("./peerList.json",JSON.stringify(peerlist),"utf-8");
    })

  }

  requestList(){
    this.instance.emit("peerlist");
  }
}
