import { ethers, toUtf8Bytes } from "ethers";
export default class Block
{
    block_Number;
    block_Nonce;
    current_Block_Hash;
    previous_Block_Hash;
    time_Stamp; 

    constructor (block_Number, block_Nonce = 0, previous_Block_Hash, time_Stamp, current_Block_Hash)
    {
        this.block_Number = block_Number;
        this.time_Stamp = time_Stamp
        this.current_Block_Hash = current_Block_Hash;
        this.block_Nonce = block_Nonce;
        this.previous_Block_Hash = previous_Block_Hash;
    }

    mineBlock(merkleRoot)
    { 
        let Block_Data = this.block_Number + this.previous_Block_Hash + this.time_Stamp + merkleRoot + this.block_Nonce; // Stringify Block Data
        let difficulty_Target = 2n ** 236n;
        let hash = ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data)));
        while (BigInt(hash) > difficulty_Target)
        {
          this.block_Nonce++;
          Block_Data = this.block_Number + this.previous_Block_Hash + this.time_Stamp + merkleRoot + this.block_Nonce; // Stringify Block Data
          hash = ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data)));
        }
        this.current_Block_Hash = hash;
        return true;
    }

    verifyBlock(merkleRoot){         
       let Block_Data = this.block_Number + this.previous_Block_Hash + this.time_Stamp + merkleRoot + this.block_Nonce;
       return BigInt(ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data))) < 2n ** 240n);
    }

    toObject(){
      return {
        blockNumber:this.block_Number,
        blockNonce:this.block_Nonce,
        currentHash:this.current_Block_Hash,
        prevHash:this.previous_Block_Hash,
        timestamp:this.time_Stamp
      }
    }
}