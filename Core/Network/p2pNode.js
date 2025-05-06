// import fs from "fs/promises";
import { Server } from "socket.io";
import { io } from "socket.io-client";
// import peerList from "./peerList.json" assert { type: 'json' };
import { fromJsonDB, toJsonDB } from '../Database/DatabaseConnector.js';

export class ServerNode {

  instance;
  Node;
  peerList;

  constructor(port,node,bootstrapAddress) {
    this.instance = new Server(port);
    this.Node  = node;
    this.peerList  = [];
    this.peerList.push(bootstrapAddress)
  }

  listen() {
    this.instance.on("connection", (socket) => {

      socket.on("addPeer",async (peer)=>{
        let list = new Set(this.peerList)
           if(!list.has(peer))
               this.peerList.push(peer)
        //    await fs.writeFile("./peerList.json",JSON.stringify([...peerlist]),"utf-8")
       })

       socket.on("peerlist",()=>{
           socket.emit("receivePeerList",this.peerList);
       })

       socket.on("RequestData",(blockNumber)=>{
          let result = toJsonDB(blockNumber);

       })

       
      socket.on("broadcastTransaction", (data)=>{
         this.Node.addTransactionToMempool(data[0],data[1],data[2]);
      })

      socket.on("broadcastBlock",(data)=>{
         this.Node.addToBuffer(data[0],data[1],socket);
        //  socket.emit("blockResult", [status,message, data[0].blockNumber]);
      })

      socket.on("getLastMinedBlock",()=>{
        const {BlockNumber, BlockHash} = this.Node.getLastMinedBlockNonceAndHash();
        socket.emit("getLastMinedBlockResponse",[BlockNumber,BlockHash]);
      })

    });
  }

   updatePeerList(newList){
    for (let peer of newList){
      if (!this.peerList.includes(peer)) {
        this.peerList.push(peer);
      }
    }
   }
}

export class ClientNode {

  instance;
  Node;

  constructor(url, Node) {
    this.instance = io(url,{autoConnect:false,reconnectionAttempts:2});
    this.Node = Node;
  }

  async connect(){
    return new Promise((resolve)=>{
      const timer  = setTimeout(()=>{resolve(false)},10000);
      this.instance.on("connect",()=>{resolve(true);clearTimeout(timer)});
    })
  }

  addPeer(url){
   this.instance.emit("addPeer",url);
  }

  requestPeerList(){
    this.instance.emit("peerlist");
    return new Promise (async (resolve)=>{
      this.instance.once("receivePeerList",async (peerlist)=>{
        // await fs.writeFile("./peerList.json",JSON.stringify(peerlist),"utf-8");
        resolve(peerlist);
    }) 
   })
  }

 async broadCastTransaction(transaction,signature,publicKey){
     this.instance.emit("broadcastTransaction",[transaction,signature,publicKey]);
  }

  getLastBlockMined(){
      this.instance.emit("getLastMinedBlock");
      return new Promise((resolve)=>{
        this.instance.once("getLastMinedBlockResponse",(data)=>{
             resolve(data);
        }) 
      })
  }

  broadCastBlock(block,transactions){
     this.instance.emit("broadcastBlock",[block,transactions]);
     return new Promise((resolve)=>{
         this.instance.once("blockResult",(data)=>{
           resolve(data);
         })
     })
  }

  requestData(blockNumber){
     this.instance.emit("RequestData",blockNumber);
     this.instance.once("ReceiveData", (data) => {
     let receive = new Promise((resolve)=> {
        this.instance.once("ReceiveData", (data) =>{
          resolve(data);
        })
      })
     })
     fromJsonDB(Node, receive);
  }
}
