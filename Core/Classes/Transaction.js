export default class transactions
{
    transaction_Hash;
    transaction_Nonce;
    sender_BlockChain_Address;
    receiver_BlockChain_Address;
    value;
    gas_Fee;
    constructor(transaction_Hash, transaction_Nonce, sender_BlockChain_Address, receiver_BlockChain_Address, value, gas_Fee)
    {
        this.transaction_Hash = transaction_Hash;
        this.transaction_Nonce = transaction_Nonce;
        this.sender_BlockChain_Address = sender_BlockChain_Address;
        this.receiver_BlockChain_Address = receiver_BlockChain_Address;
        this.value = value;
        this.gas_Fee = gas_Fee;
    }
}