
import FullNode from "./Core/Classes/FullNode.js";
import provideInterface from "./Core/Network/JSONRpc.js";
import { ClientNode, ServerNode } from "./Core/Network/p2pNode.js";


let Node = new FullNode("0x10b800853a93519015d2492f165d4a5c220ccbb5");  //Address that will receive the block reward
let myDomain  = "http:abdullah.rpc"
let bootStrapDomain  = "http:faisal.rpc"           //The  PreSet Node Domain that you will connect first to setup your node
let myServerNode;
let clientNodes = [];

provideInterface(Node);         //Starts JSONRpc Interface for Lite Node

async function setP2pNode(){

     myServerNode  =  new ServerNode(Node,bootStrapDomain);
     myServerNode.listen();   //Server Start Listening for Requests
     let client  =  new ClientNode(myServerNode.peerList[0],Node)  //Try to Connect to Bootstrap Node

     if(client.instance.connected){
        clientNodes.push(client);
        myServerNode.updatePeerList(await clientNodes[0].requestPeerList());
        clientNodes[0].addPeer(myDomain)    //Ask Bootstrap Node to Add your address to his peerlist
     }
     
     for(let i = 1; i < myServerNode.peerList.length; i++){       //Establish Connection with all the peers in the peer list
         client = new ClientNode(myServerNode.peerList[i],Node);
         if(client.instance.connected)
            clientNodes.push(client);
     }
}

async function  synchronizeBlockchain(){
    if(clientNodes.length == 0)
         return "No Active Node to Synchronize with"
    let latestBlockNumber  = await clientNodes[0].getLastBlockMined()[0];  //Request the Last Block Mined from The BootStrap Address
    let myLatestBlockNumber  = Node.getLastMinedBlockNonceAndHash()[0]
    if(myLatestBlockNumber != 0)
         myLatestBlockNumber++;

    if(myLatestBlockNumber < latestBlockNumber){ 
       clientNodes[0].requestData(myLatestBlockNumber + 1)
    }
            // To be completed once required functions are added.
}


function NodeStart(){
    
}







async function wait(timer){
     new Promise((resolve)=>{setTimeout(()=>{resolve()},timer*1000)})
}