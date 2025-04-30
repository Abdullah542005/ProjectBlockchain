class block
{
    constructor (block_Number, block_Nonce, current_Block_Hash, previous_Block_Hash, coinbase_Transaction, transactions)
    {
        this.block_Number = block_Number;
        this.time_Stamp = calculate_Time();
        this.block_Nonce = block_Nonce;
        this.current_Block_Hash = current_Block_Hash;
        this.previous_Block_Hash = previous_Block_Hash;
        this.coinbase_Transaction = coinbase_Transaction;
        this.transactions = transactions;
    }
    calculate_Time()
    {
        return Math.floor(Date.now() / 1000) 
    }
}