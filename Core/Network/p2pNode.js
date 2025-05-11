import { Server } from "socket.io";
import { io } from "socket.io-client";
import { fromJsonDB, toJsonDB } from '../Database/DatabaseConnector.js';

export class ServerNode {
    instance;
    Node;
    peerList;
    ClientNodes;

    constructor(port, node, bootstrapAddress, ClientNodes) {
        this.instance = new Server(port, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        this.Node = node;
        this.peerList = [];
        this.peerList.push(bootstrapAddress);
        this.ClientNodes = ClientNodes;
    }

    listen() {
        this.instance.on("connection", (socket) => {
            socket.on("addPeer", async (peer) => {
                let list = new Set(this.peerList);
                if (!list.has(peer)) this.peerList.push(peer);

                const client = new ClientNode(peer, this.Node);
                await client.connect();
                if (client.instance.connected) this.ClientNodes.push(client);
            });

            socket.on("peerlist", () => {
                socket.emit("receivePeerList", this.peerList);
            });

            socket.on("RequestData", (blocknumber) => {
                let result = toJsonDB(blocknumber);
                socket.emit("ReceiveData", JSON.stringify(result, null, 2));
            });

            socket.on("broadcastTransaction", (data) => {
                this.Node.addTransactionToMempool(data[0], data[1], data[2]);
            });

            socket.on("broadcastBlock", (data) => {
                this.Node.addToBuffer(data[0], data[1], socket);
            });

            socket.on("getLastMinedBlock", () => {
                const { blocknumber, currentblockhash } = this.Node.getLastMinedBlockNonceAndHash();
                socket.emit("getLastMinedBlockResponse", blocknumber);
            });
        });
    }

    updatePeerList(newList) {
        for (let peer of newList) {
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
        this.instance = io(url);
        this.Node = Node;
    }

    async connect() {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                resolve(false);
            }, 40000);
            this.instance.on("connect", () => {
                resolve(true);
                clearTimeout(timer);
            });
        });
    }

    addPeer(url) {
        this.instance.emit("addPeer", url);
    }

    requestPeerList() {
        this.instance.emit("peerlist");
        return new Promise((resolve) => {
            this.instance.once("receivePeerList", (peerlist) => {
                resolve(peerlist);
            });
        });
    }

    async broadCastTransaction(transaction, signature, publicKey) {
        this.instance.emit("broadcastTransaction", [transaction, signature, publicKey]);
    }

    getLastBlockMined() {
        this.instance.emit("getLastMinedBlock");
        return new Promise((resolve) => {
            this.instance.once("getLastMinedBlockResponse", (data) => {
                resolve(data);
            });
        });
    }

    async broadCastBlock(block, transactions) {
        this.instance.emit("broadcastBlock", [block.toObject(), transactions]);
        return new Promise((resolve) => {
            this.instance.once("blockResult", (data) => {
                resolve(data);
            });
        });
    }

    requestData(blocknumber) {
        this.instance.emit("RequestData", blocknumber);
        return new Promise((resolve) => {
            this.instance.once("ReceiveData", (data) => {
                data = JSON.parse(data);
                fromJsonDB(this.Node, data);
                resolve();
            });
        });
    }
}