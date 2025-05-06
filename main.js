
import FullNode from "./Core/Classes/FullNode.js";
import provideInterface from "./Core/Network/JSONRpc.js";
import { ClientNode, ServerNode } from "./Core/Network/p2pNode.js";


let Node = new FullNode("0x10b800853a93519015d2492f165d4a5c220ccbb5", clientNodes);  //Address that will receive the block reward
let myDomain  = "http:abdullah.rpc"
let bootStrapDomain  = "https://three-women-cough.loca.lt:30001/"           //The  PreSet Node Domain that you will connect first to setup your node
let myServerNode;
let clientNodes = [];

provideInterface(Node);         //Starts JSONRpc Interface for Lite Node

async function setP2pNode(){

     myServerNode  =  new ServerNode("3001",Node,bootStrapDomain);
     myServerNode.listen();   //Server Start Listening for Requests
     let client  =  new ClientNode(myServerNode.peerList[0],Node)  //Try to Connect to Bootstrap Node
     await client.connect();
     if(client.instance.connected){
        clientNodes.push(client);
        myServerNode.updatePeerList(await clientNodes[0].requestPeerList());
        clientNodes[0].addPeer(myDomain)    //Ask Bootstrap Node to Add your address to his peerlist
     }
     
     for(let i = 1; i < myServerNode.peerList.length; i++){       //Establish Connection with all the peers in the peer list
         client = new ClientNode(myServerNode.peerList[i],Node);
         await client.connect();
         if(client.instance.connected)
            clientNodes.push(client);
     }
     console.log("Function Completed") 
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
    console.log("Function 2 Completed")
}

async function initializeAndStart(){
  await setP2pNode();
  await synchronizeBlockchain();
  await NodeStart();
}


initializeAndStart();


async function NodeStart(){
 while(true){

   const {block,transactions} = Node.createNewBlock();
    
   if(Node.bufferReceivedBlock.length>0){
        const receiveBlock = Node.bufferReceivedBlock[0];
        if(Node.bufferReceivedBlock[0].blockNumber == block.blockNumber){
                receiveBlock[2].emit("blockResult",{status:true,message:"Block Verified"})
                Node.createMinedBlock(receiveBlock[0],receiveBlock[1])
                Node.disposeBuffer(block.blockNumber)
                continue;
         }else if(receiveBlock[0].blockNumber > block.blockNumber){
                receiveBlock[2].emit("blockResult",{status:true,message:"Node Not Synchronized"})  //Send Verified Message
                Node.disposeBuffer(block.blockNumber);   //Dispose Buffer as we are falling behind the network and cannot verify block           
                await synchronizeBlockchain();   //Synchronize Again
                continue;
         } 
     }

     const {status,message}  = await Node.broadCastBlockToNodes(block, transactions)
     if(status){
          Node.createMinedBlock(block,transactions)
     }else {
          await synchronizeBlockchain();
     }   

    await wait(5);   //Wait For 5 seconds
 }
}



async function wait(timer){
     new Promise((resolve)=>{setTimeout(()=>{resolve()},timer*1000)})
}

