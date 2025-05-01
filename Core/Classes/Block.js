
export default class Block
{
    block_Number;
    block_Nonce;
    current_Block_Hash;
    previous_Block_Hash; 

    constructor (block_Number, block_Nonce, previous_Block_Hash,time_Stamp,current_Block_Hash)
    {
        this.block_Number = block_Number;
        this.time_Stamp = time_Stamp;
        this.current_Block_Hash = current_Block_Hash;
        this.block_Nonce = block_Nonce;
        this.previous_Block_Hash = previous_Block_Hash;
    }

    mineBlock(merkleRoot){ 

    }

    verifyBlock(){         
    }

    toObject(){
      return {
        blockNumber:this.block_Number,
        blockNonce:this.block_Nonce,
        currentHash:this.current_Block_Hash,
        prevHash:this.previous_Block_Hash,
      }
    }
}