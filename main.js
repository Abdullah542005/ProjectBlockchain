import FullNode from "./Core/Classes/FullNode.js";
import provideInterface from "./Core/Network/JSONRpc.js";
let Node = new FullNode("0x10b800853a93519015d2492f165d4a5c220ccbb5");

provideInterface(Node);

setInterval(() => {
   const [block,transaction]   =  Node.createNewBlock()
   console.log(block.toObject(),{transactions:transaction})
   Node.commitBlock();
}, 10000);
