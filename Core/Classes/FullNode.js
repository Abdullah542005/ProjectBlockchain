import pkg from "elliptic";
import { ethers, ZeroAddress } from "ethers";
import connectDataBase from "../Database/DatabaseConnector.js";
import Block from "./Block.js";
import TransactionsWrapper from "./TransactionsWrapper.js";
const {ec}  = pkg;

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
        if("0x"+publicKey.slice(-40)!=transaction.sender)
             return {status:false,message:"Failed,Inauthorized User"}
        if(!this.verifyTransactionSignature(transaction,signature,publicKey))
             return {status:false,message:"Failed, Invalid Transaction Signature"};
        if(this.getUserBalance(transaction.sender) < transaction.value + transaction.gasfee)
             return {status:false,message:"Failed, User Do Not have Enough Balance"};
        if(transaction.nonce != this.getUserTransactionNonce(transaction.sender))
             return {status:false,message:"Invalid Nonce Or Please Wait for the Previous Transaction To Complete"};
        this.mempool.push(transaction);
        this.mempool = this.mempool.sort((a,b) => b.gasfee - a.gasfee);  //Sort Transaction on Basis of High GasFee
        return {status:true,message:"Transaction Added To Mempool"}
    }

    verifyTransactionSignature(transaction, signature, publicKey){  //Verify a Transaction, is Internal Function
         const hash  =  ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction)))
         const Ec =  new ec("secp256k1");
         return Ec.keyFromPublic(publicKey,'hex').verify(hash,signature);
    }
  

     createNewBlock() {   //Create and mine a New block
       this.transactionsWrapper.clear();   //Clears up the Wrapper
       this.block  = null //Clears last active block
       const {BlockNumber, BlockHash} = this.getLastMinedBlockNonceAndHash();
       this.block  = new Block(BlockNumber+1,0,BlockHash,Math.floor(Date.now()/1000),null);
       for(let i = 0; i < this.mempool.length && i <=10; i++)
         this.transactionsWrapper.add(this.mempool[i]);   //Copying Transaction from Mempool to Wrapper that will be included in the block
       const coinBaseTransaction  = {
          sender:ethers.ZeroAddress,
          receiver:this.nodeBlockchainAddress,
          nonce:this.getUserTransactionNonce(ZeroAddress),
          value:this.transactionsWrapper.totalGas() + 50,
          gasfee:0
       }
       this.transactionsWrapper.add(coinBaseTransaction);
       this.block.mineBlock(this.transactionsWrapper.findMerkleRoot());  // Mine the Block;
       return [this.block, this.transactionsWrapper.Transactions]  //Return the block To Be BroadCasted;
     } 
   
    createMinedBlock(block, transactions){   //Create a Block from Mined Block  Data received by other Full Node
      
    }

    broadcastBlock(p2pNode){   //Broadcast mined block to the network, //Receives Libp2p Class Object
    }
       
    getBlockByHash(hash){}    //Query Block Data By its Hash

    getBlockByNonce(nonce){}   //Query Block Data By its Nonce

    getTransaction(hash){}   //Query Transaction by its hash

    getUserTransactions(blockchainAddress){}  //Query all Transactions of a user
    
    getUserBalance(blockchainAddress){   //Query Balance of a User
        const balance = this.Database.prepare("Select balance from user where blockchainAddress = ?").get(blockchainAddress)
        return balance
    }

    getUserTransactionNonce(blockchainAddress){ //Query transaction nonce of a user
       const nonce =  this.Database.prepare(`Select nonce As nonce from User Where blockchainAddress = ?`).get(blockchainAddress)
       return nonce?nonce.nonce:0;
    } 

    getAverageGas(){ //Calculates average gas cost from the mempool
      if(this.mempool.length == 0)
            return 0
       let avgGas = 0;
       for(let x in this.mempool)
         avgGas+= x.gasfee;
        return avgGas/this.mempool.length;
    }    

     getLastMinedBlockNonceAndHash(){
     const blockNumber  = this.Database.prepare(`
       Select max(blocknumber) AS number from block`).get()
     if(!blockNumber.number)
          return {BlockNumber:0 , BlockHash:ethers.ZeroHash};  //Incase Of Undefined, It means we have no mined block, so the 
     //hash will the zero Hash and this block is called the Genesis Block
     const hash =  this.Database.prepare(`
     Select currentblockhash AS Hash from block where blocknumber = ${blockNumber.number}   
     `).get();
     return  {BlockNumber:blockNumber.number,BlockHash:hash.Hash};
    }


    commitBlock(){    // Store the verified block in the database

     let statement = this.Database.prepare(`Insert into Block (currentblockhash,previousblockhash,nonce,timestamp,blocknumber,merkleroot) values(?,?,?,?,?,?)`)
       
       statement.run(this.block.current_Block_Hash, this.block.previous_Block_Hash,  //Adding Block to the Database
       this.block.block_Nonce,this.block.time_Stamp,this.block.block_Number,this.transactionsWrapper.merkleRoot);

       statement = this.Database.prepare(`Select balance from User where blockchainAddress = ?`)
       let statement2  = this.Database.prepare(`Update User set balance = ? where blockchainAddress = ?`)
       let  statement3 = this.Database.prepare('Insert into Transactions (transactionHash,blockHash,senderBlockchainAddress,receiverBlockchainAddress,value,gasfee,transactionNonce) values(?,?,?,?,?,?,?)')

       for(let transaction of this.transactionsWrapper.Transactions){   //Adding Transactions to the database and Updating Balances
         let senderBalance = statement.get(transaction.sender);
         let receiverBalance = statement.get(transaction.receiver);
         if(!receiverBalance)
           this.Database.prepare("Insert into User (blockchainAddress,balance,nonce) values(?,?,?)").run(transaction.receiver,transaction.value,0);
         else 
           statement2.run(receiverBalance.balance+ transaction.value,transaction.receiver);
         statement2.run(senderBalance.balance-transaction.value-transaction.gasfee,transaction.sender);
       
         statement3.run(ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction))), this.block.current_Block_Hash,
         transaction.sender, transaction.receiver,transaction.value,transaction.gasfee,transaction.nonce)

         this.Database.prepare('Update User set nonce = ? where blockchainAddress = ?').run(transaction.nonce + 1,transaction.sender)
       
      }
      
      // this.Database.prepare('Update User set nonce = ? where blockchainAddress = ?').run(this.getUserTransactionNonce(ZeroAddress) + 1,ZeroAddress)
     
      //Clearing the mempool 
      const hashes = new Set(this.transactionsWrapper.Transactions.
        map((transaction)=>ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction))))
      )
      this.mempool = this.mempool.filter((memPoolTransaction)=>
         !hashes.has(ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(memPoolTransaction))))
      )

    }
}
