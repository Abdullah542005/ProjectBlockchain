
export default class block
{
    block_Number;
    block_Nonce;
    current_Block_Hash;
    previous_Block_Hash; 
    constructor (block_Number, block_Nonce, current_Block_Hash, previous_Block_Hash)
    {
        this.block_Number = block_Number;
        this.time_Stamp = calculate_Time();
        this.block_Nonce = block_Nonce;
        this.current_Block_Hash = current_Block_Hash;
        this.previous_Block_Hash = previous_Block_Hash;
    }
    calculate_Time()
    {
        return Math.floor(Date.now() / 1000) 
    }
}