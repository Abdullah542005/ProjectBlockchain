import { ethers } from "ethers";

export default class TransactionsWrapper {

    Transactions;

    merkleRoot;

    constructor(){
        this.Transactions  = [];
        this.merkleRoot  = null;
    }

    add(transaction){
        this.Transactions.push(transaction)
    }

    clear(){
        this.Transactions = [];
    }

    totalGas(){
        let gasFee = 0;
        for(let x of this.Transactions)                  
             gasFee+= parseInt(x.gasfee);        
        return gasFee;
    }

    findMerkleRoot(){
       let hashes = this.Transactions.map(transaction=>ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(transaction))))
       if(hashes.length%2!=0)
          hashes.push(hashes[hashes.length-1])
       while(hashes.length>1){
           let temp = [];
           for(let i = 0; i < hashes.length; i=i+2)
             temp.push(ethers.sha256(ethers.concat([ethers.getBytes(hashes[i]) , ethers.getBytes(hashes[i+1])])))
           hashes = temp;
       }
       this.merkleRoot = hashes[0];
       return hashes[0];
    }

}

