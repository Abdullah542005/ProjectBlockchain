
import { ec } from "elliptic";
import { ethers } from "ethers";
import connectDataBase from "../Database/DatabaseConnector";
import Block from "./Block";
import TransactionsWrapper from "./TransactionsWrapper";
export default class FullNode{

    mempool;

    block;

    nodeBlockchainAddress;    //Blockchain address for a node that

    transactionsWrapper;   //Wraps all the transaction that are going to be added to the block

    Database;             // Database for Storing Transaction

    constructor(nodeBlockchainAddress){
        this.mempool = [];
        this.block = null;
        this.nodeBlockchainAddress = nodeBlockchainAddress;
        this.transactionsWrapper = new TransactionsWrapper();
        this.Database = connectDataBase();
    }

    addTransactionToMempool(transaction, signature, publicKey) {   //Adds a transaction  to Mempool
        if(!this.verifyTransactionSignature(transaction,signature,publicKey))
             return (false,"Failed, Invalid Transaction Signature");
        if(transaction.nonce + 1 != this.getUserTransactionNonce(transaction.sender))
             return (false,"Invalid Nonce Or Please Wait for the Previous Transaction To Complete");
        this.mempool.push(transaction);
        this.mempool = this.mempool.sort((a,b) => b.gasfee - a.gasfee);
        return (true,"Transaction SuccessFully added")
    }

    verifyTransactionSignature(transaction, signature, publicKey){  //Verify a Transaction, is Internal Function
         const hash  =  ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction)))
         const Ec =  new ec("secp256k1");
         return Ec.keyFromPublic(publicKey,'hex').verify(hash,signature);
    }
  

    async createNewBlock() {   //Create and mine a New block
       this.transactionsWrapper.clear();   //Clears up the Wrapper
       const [blockNumber, prevHash] = await  this.getLastMinedBlockNonceAndHash();
       this.block  = new Block(blockNumber,0,prevHash,Math.floor(Date.now/1000),null);
       for(let i = 0; i < this.mempool.length && i <=10; i++)
        this.transactionsWrapper.add(this.mempool[i]);   //Copying Transaction from Mempool to Wrapper that will be included in the block
       this.block.mineBlock(this.transactionsWrapper.findMerkleRoot());  // Mine the Block;
       return (this.block, this.transactionsWrapper.Transactions)  //Return the block To Be BroadCasted;
    } 
   
    createMinedBlock(block, transactions){   //Create a Block from Mined Block  Data received by other Full Node
      
    }

    broadcastBlock(p2pNode){          //Broadcast mined block to the network, //Receives Libp2p Class Object
    }
       
    getBlockByHash(hash){}    //Query Block Data By its Hash

    getBlockByNonce(nonce){}   //Query Block Data By its Nonce

    getTransaction(hash){}   //Query Transaction by its hash

    getUserTransactions(blockchainAddress){}  //Query all Transactions of a user
    
    getUserBalance(blockchainAddress){}

    async getUserTransactionNonce(blockchainAddress){ //Query transaction nonce of a user
       return await this.Database.all(`Select nonce from User Where blockchainAddress <=> ${blockchainAddress}`
        ,(err,result)=>result
       )
    } 

    getAverageGas(){ //Calculates average gas cost from the mempool
       let avgGas = 0;
       for(let x in this.mempool)
         avgGas+= x.gasfee;
        return avgGas/this.mempool.length;
    }    

    async getLastMinedBlockNonceAndHash(){
     const blockNumber  = await this.Database.all(`
       Select max(blocknumber) from block`,(err,result)=>result)
     if(!nonce)
          return (0,ethers.ZeroHash);  //Incase Of Undefined, It means we have no mined block, so the 
     //hash will the zero Hash and this block is called the Genesis Block
     const hash = await this.Database.all(`
     Select currentblockhash from block where blocknumber <=> ${blockNumber}   
     `,(err,result)=>result)
     return  (blockNumber,hash);
    }

    commitBlock(){    // Store the verified block in the database
    }
    
}