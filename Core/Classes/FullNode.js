import pkg from "elliptic";
import { ethers, ZeroAddress } from "ethers";
import connectDataBase from "../Database/DatabaseConnector.js";
import Block from "./Block.js";
import TransactionsWrapper from "./TransactionsWrapper.js";

const { ec } = pkg;

export default class FullNode {
    mempool;
    block;
    nodeBlockchainAddress;
    transactionsWrapper;
    Database;
    bufferReceivedBlock;
    clientNodes;

    constructor(nodeBlockchainAddress, clientNodes) {
        this.mempool = [];
        this.block = null;
        this.nodeBlockchainAddress = nodeBlockchainAddress;
        this.transactionsWrapper = new TransactionsWrapper();
        this.Database = connectDataBase();
        this.bufferReceivedBlock = [];
        this.clientNodes = clientNodes;
    }

    addTransactionToMempool(transaction, signature, publicKey) {
        if ("0x" + publicKey.slice(-40) != transaction.sender)
            return { status: false, message: "Failed, Unauthorized User" };
        if (!this.verifyTransactionSignature(transaction, signature, publicKey))
            return { status: false, message: "Failed, Invalid Transaction Signature" };
        if (transaction.nonce != this.getUserTransactionNonce(transaction.sender))
            return { status: false, message: "Invalid Nonce Or Please Wait for the Previous Transaction To Complete" };
        if (this.getUserBalance(transaction.sender) < (parseInt(transaction.value) + parseInt(transaction.gasfee)))
            return { status: false, message: "Failed, User Does Not Have Enough Balance" };
        this.mempool.push(transaction);
        this.mempool = this.mempool.sort((a, b) => b.gasfee - a.gasfee);
        this.broadCastTransaction(transaction, signature, publicKey);
        return { status: true, message: "Transaction Added To Mempool" };
    }

    async broadCastTransaction(transaction, signature, publicKey) {
        if (this.clientNodes.length > 0)
            this.clientNodes.forEach((node) => {
                node.broadCastTransaction(transaction, signature, publicKey);
            });
    }

   async broadCastBlockToNodes(block, transactions) {
    const confirmationsNeeded = Math.ceil((this.clientNodes.length + 1) / 2);
    let confirmations = 0;
    let rejections = 0;

    return new Promise((resolve) => {
        let resolved = false;

        this.clientNodes.forEach((node) => {
            node.broadCastBlock(block, transactions).then(({status, message}) => {
                if (resolved) return;

                if (status) {
                    confirmations++;
                    if (confirmations >= confirmationsNeeded) {
                        resolved = true;
                        resolve({status:true, message:message});
                    }
                } else {
                    rejections++;
                    if ((this.clientNodes.length - rejections) < confirmationsNeeded) {
                        resolved = true;
                        resolve({status:false, message:message});
                    }
                }
            }).catch((err) => {
                rejections++;
                if (!resolved && (this.clientNodes.length - rejections) < confirmationsNeeded) {
                    resolved = true;
                    resolve({status:false, message:"Node error or unresponsive"});
                }
            });
        });
    });
}


    async disposeBuffer(blocknumber) {
        this.bufferReceivedBlock.forEach((req) => {
            req.socket.emit("blockResult", { status: false, message: "synchronize" });
            console.log("Request Disposed");
        });
        this.bufferReceivedBlock = [];
    }

    verifyTransactionSignature(transaction, signature, publicKey) {
        const hash = ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction)));
        const Ec = new ec("secp256k1");
        return Ec.keyFromPublic(publicKey, 'hex').verify(hash, signature);
    }

    createNewBlock() {
        this.transactionsWrapper.clear();
        this.block = null;
        const { blocknumber, currentblockhash } = this.getLastMinedBlockNonceAndHash();
        this.block = new Block(blocknumber + 1, 0, currentblockhash, Math.floor(Date.now() / 1000), null);
        for (let i = 0; i < this.mempool.length && i <= 10; i++)
            this.transactionsWrapper.add(this.mempool[i]);
        const coinBaseTransaction = {
            sender: ethers.ZeroAddress,
            receiver: this.nodeBlockchainAddress,
            nonce: this.getUserTransactionNonce(ZeroAddress),
            value: this.transactionsWrapper.totalGas() + 50,
            gasfee: 0
        };
        this.transactionsWrapper.add(coinBaseTransaction);
        this.block.mineBlock(this.transactionsWrapper.findMerkleRoot());
        return [this.block, this.transactionsWrapper.Transactions];
    }

    createMinedBlock(block, transactions) {
        this.block = new Block(block.blocknumber, block.nonce, block.previousBlockhash, block.timestamp, block.currentblockhash, block.merkleroot);
        console.log(this.block.toObject());
        this.transactionsWrapper.clear();
        for (let x of transactions)
            this.transactionsWrapper.add(x);
        if (!this.block.verifyBlock())
            return { status: false, message: "Invalid Block Received" };
        this.commitBlock();
        return { status: true, message: "Block Verified" };
    }

    addToBuffer(block, transactions, socket) {
        console.log(block.blocknumber);
        this.bufferReceivedBlock.push({ blockHeader: block, Transactions:transactions, socket });
        this.bufferReceivedBlock = this.bufferReceivedBlock.sort((a, b) => b.blocknumber - a.blocknumber);
    }

    getBlockByHash(hash) {
        return this.Database.prepare('SELECT * FROM Block WHERE currentblockhash = ?').get(hash);
    }

    getBlockByNumber(number) {
        return this.Database.prepare('SELECT * FROM Block WHERE blocknumber = ?').get(number);
    }

    getTransaction(hash) {
        return this.Database.prepare('SELECT * FROM Transactions WHERE transactionHash = ?').get(hash);
    }

    getUserTransactions(blockchainAddress) {
        const Transactions  =  this.Database.prepare(`SELECT * FROM Transactions 
            WHERE senderBlockchainAddress = ? OR receiverBlockchainAddress = ? `).all(blockchainAddress,blockchainAddress);
        return Transactions;
    }

    getUserBalance(blockchainAddress) {
        const balance = this.Database.prepare("SELECT balance FROM User WHERE blockchainAddress = ?").get(blockchainAddress);
        return balance?balance:0;
    }

    getUserTransactionNonce(blockchainAddress) {
        const nonce = this.Database.prepare(`SELECT nonce AS nonce FROM User WHERE blockchainAddress = ?`).get(blockchainAddress);
        return nonce ? nonce.nonce : 0;
    }

    getUserData(blockchainAddress){
        const balance = this.getUserBalance(blockchainAddress);
        const nonce  = this.getUserTransactionNonce(blockchainAddress);
        return {
            balance:balance.balance,
            nonce:nonce,
            transactions:this.getUserTransactions(blockchainAddress)
        }
    }


    getBlockchainInfo(){
        const blocknumber = this.Database.prepare(`SELECT MAX(blocknumber) AS number FROM Block`).get();
        let blocksToFetch  =    parseInt(blocknumber.number) - 10;
        if(blocksToFetch<0)
              blocksToFetch = 0;
        const blocks   = this.Database.prepare(`Select * from Block where blocknumber >= ?`).all(blocksToFetch)
        const address = "0x0000000000000000000000000000000000000000";
        const remainingTokens  = this.Database.prepare("Select balance as balance from user where blockchainAddress =  ? ").get(address)    
        let tokensMined  = 10**8 - parseInt(remainingTokens.balance);
        return  { 
             AvgGasFee: this.getAverageGas(),
             TotalTransactions:this.getTransactionCount(),
             MempoolTransactions:this.mempool,
             LatestBlocksMined:blocks,
             blocksMined:blocknumber.number,
             TotaltokensMined:tokensMined
        }
    }


    getTransactionCount(){
        let statement   =  this.Database.prepare("Select count(*) as count from Transactions").get();
        return statement.count;
    }

    getAverageGas() {
        if (this.mempool.length == 0)
            return 0;
        let avgGas = 0;
        for (let x of this.mempool)
            avgGas += parseInt(x.gasfee);
        return avgGas / this.mempool.length;
    }

    getLastMinedBlockNonceAndHash() {
        const blocknumber = this.Database.prepare(`SELECT MAX(blocknumber) AS number FROM Block`).get();
        if (!blocknumber.number)
            return { blocknumber: 0, currentblockhash: ethers.ZeroHash };
        const hash = this.Database.prepare(`SELECT currentblockhash AS Hash FROM Block WHERE blocknumber = ${blocknumber.number}`).get();
        return { blocknumber: blocknumber.number, currentblockhash: hash.Hash };
    }

    commitBlock() {
        let statement = this.Database.prepare(`INSERT INTO Block (currentblockhash, previousBlockhash, nonce, timestamp, blocknumber, merkleroot) VALUES (?, ?, ?, ?, ?, ?)`);
        statement.run(this.block.currentblockhash, this.block.previousBlockhash, this.block.nonce, this.block.timestamp, this.block.blocknumber, this.block.merkleroot);

        statement = this.Database.prepare(`SELECT balance FROM User WHERE blockchainAddress = ?`);
        let statement2 = this.Database.prepare(`UPDATE User SET balance = ? WHERE blockchainAddress = ?`);
        let statement3 = this.Database.prepare('INSERT INTO Transactions (transactionHash, blockHash, senderBlockchainAddress, receiverBlockchainAddress, value, gasfee, transactionNonce, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?,?)');

        for (let transaction of this.transactionsWrapper.Transactions) {
            console.log(transaction);
            let senderBalance = statement.get(transaction.sender || transaction.senderBlockchainAddress);
            let receiverBalance = statement.get(transaction.receiver || transaction.receiverBlockchainAddress);
            if (!receiverBalance)
                this.Database.prepare("INSERT INTO User (blockchainAddress, balance, nonce) VALUES (?, ?, ?)").run(transaction.receiver || transaction.receiverBlockchainAddress, transaction.value, 0);
            else
                statement2.run((parseInt(receiverBalance.balance) + parseInt(transaction.value)), transaction.receiver || transaction.receiverBlockchainAddress);
            statement2.run((parseInt(senderBalance.balance) - parseInt(transaction.value) - parseInt(transaction.gasfee)), transaction.sender || transaction.senderBlockchainAddress);

            statement3.run(ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction))), this.block.currentblockhash,
                transaction.sender || transaction.senderBlockchainAddress, transaction.receiver || transaction.receiverBlockchainAddress, transaction.value, transaction.gasfee, (transaction.nonce ?? transaction.transactionNonce)
            ,this.block.timestamp);

            this.Database.prepare('UPDATE User SET nonce = ? WHERE blockchainAddress = ?').run(transaction.nonce + 1, transaction.sender);
        }

        const hashes = new Set(this.transactionsWrapper.Transactions.map((transaction) => ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction)))));
        this.mempool = this.mempool.filter((memPoolTransaction) =>
            !hashes.has(ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(memPoolTransaction))))
        );

        return true;
    }
}