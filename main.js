import FullNode from "./Core/Classes/FullNode.js";      //Added .js to the end of the FullNode since prior to that it was making import error
import provideInterface from "./Core/Network/JSONRpc.js";


let Node = new FullNode();  //Added new prior to FullNode() to ensure it run's perfectly, Syntax Error

provideInterface(Node);