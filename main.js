import FullNode from "./Core/Classes/FullNode.js";
import provideInterface from "./Core/Network/JSONRpc.js";
import { ClientNode, ServerNode } from "./Core/Network/p2pNode.js";

let clientNodes = [];
let Node = new FullNode("0x10b800853a93519015d2492f165d4a5c220ccbb5", clientNodes); // Address that will receive the block reward
let myDomain = "http://localhost:3009";
let bootStrapDomain = "http://localhost:3005"; // The PreSet Node Domain that you will connect first to set up your node
let myServerNode;

provideInterface(Node); // Starts JSONRpc Interface for Lite Node

async function setP2pNode() {
    myServerNode = new ServerNode(3009, Node, bootStrapDomain, clientNodes);
    myServerNode.listen(); // Server Start Listening for Requests
    let client = new ClientNode(myServerNode.peerList[0], Node); // Try to Connect to Bootstrap Node
    await client.connect();
    if (client.instance.connected) {
        clientNodes.push(client);
        myServerNode.updatePeerList(await clientNodes[0].requestPeerList());
        clientNodes[0].addPeer(myDomain); // Ask Bootstrap Node to Add your address to its peer list
    }
    console.log("Node Connection Completed");
}

async function synchronizeBlockchain() {
    if (clientNodes.length == 0) return "No Active Node to Synchronize with";
    let blockMine = 0,
        nodeNumber = 0;
    for (let i = 0; i < clientNodes.length; i++) {
        // Ask every node for their last mined block
        let latestBlockNumber = await clientNodes[i].getLastBlockMined();
        console.log("Latest Block Avalible " ,latestBlockNumber);
        if (latestBlockNumber > blockMine) {
            blockMine = latestBlockNumber;
            nodeNumber = i;
        }
    }
    let myLatestBlockNumber = Node.getLastMinedBlockNonceAndHash().blocknumber;
    myLatestBlockNumber++;
    if (myLatestBlockNumber < blockMine) {
        clientNodes[nodeNumber].requestData(myLatestBlockNumber); // Query Data from the Node having the highest block
    }
    console.log("Synchronization Completed");
}

async function initializeAndStart() {
    await setP2pNode();
    await synchronizeBlockchain();
    NodeStart();
}

initializeAndStart();

async function NodeStart() {
    setInterval(async () => {
        const [block, transactions] = Node.createNewBlock();
        console.log(block.toObject());
        if (clientNodes.length == 0) {
            console.log("Clients are zero");
            Node.commitBlock();
            return;
        }

        if (Node.bufferReceivedBlock.length > 0) {
            const receiveBlock = Node.bufferReceivedBlock[0];
            if (receiveBlock.blockHeader.blocknumber == block.blocknumber) {
                receiveBlock.socket.emit("blockResult", { status: true, message: "Block Verified" });
              const {status,message}  =  Node.createMinedBlock(receiveBlock.blockHeader, receiveBlock.Transactions);
                console.log(message);  
                Node.disposeBuffer(block.blocknumber);
                console.log("Condition 1 Executed");
                return;
            } else if (receiveBlock.blockHeader.blocknumber > block.blocknumber) {
                receiveBlock.socket.emit("blockResult", { status: true, message: "Node Not Synchronized" }); // Send Verified Message
                await Node.disposeBuffer(block.blocknumber); // Dispose Buffer as we are falling behind the network and cannot verify block
                console.log("Condition 2 Executed");
                await synchronizeBlockchain(); // Synchronize Again
                return;
            }
        }
        console.log("Broadcasting Block");
        const { status, message } = await Node.broadCastBlockToNodes(block, transactions);
        console.log("Response from broadcast", status, message);
        if (status) {
            Node.commitBlock();
        } else {
            await synchronizeBlockchain();
        }
    }, 30000);
}

async function wait(timer) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, timer * 1000);
    });
}