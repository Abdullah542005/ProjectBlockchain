import TransactionsWrapper from "./TransactionsWrapper";

export default class FullNode{

    mempool;

    block;

    nodeBlockchainAddress;    //Blockchain address for a node that

    TransactionsWrapper;   //Wraps all the transaction that are going to be added to the block

    constructor(nodeBlockchainAddress){
        this.mempool = [];
        this.block = null;
        this.nodeBlockchainAddress = nodeBlockchainAddress;
        this.TransactionsWrapper = new TransactionsWrapper();
    }

    addTransactionToMempool(transaction) {   //Adds a transaction  to Mempool
    }

    verifyTransaction(transaction, signature, publicKey){  //Verify a Transaction, is Internal Function
    }
  
    createBlock() {   //Create A New block
    } 
   
    createBlock(block, transactions){   //Create a Block from Mined Block  Data received by other Full Node
    }

    broadcastBlock(p2pNode){          //Broadcast mined block to the network, //Receives Libp2p Class Object
    }
       
    getBlock(hash){}    //Query Block Data By its Hash

    getBlock(nonce){}   //Query Block Data By its Nonce

    getTransaction(hash){}   //Query Transaction by its hash

    getTransactions(blockchainAddress){}  //Query all Transactions of a user

    getTransactionNonce(blockchainAddress){} //Query the next transaction nonce of a user

    getAverageGas(){}    //Calculates average gas cost from the mempool

    
}