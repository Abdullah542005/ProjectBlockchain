import FullNode from "./Core/Classes/FullNode";
import provideInterface from "./Core/Network/JSONRpc";


let Node = FullNode();

provideInterface(Node);

