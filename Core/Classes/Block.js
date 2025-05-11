import { ethers, toUtf8Bytes } from "ethers";
export default class Block {
    blocknumber;
    nonce;
    currentblockhash;
    previousBlockhash;
    timestamp;
    merkleroot;

    constructor(blocknumber, nonce = 0, previousBlockhash, timestamp, currentblockhash, merkleroot) {
        this.blocknumber = blocknumber;
        this.timestamp = timestamp;
        this.currentblockhash = currentblockhash;
        this.nonce = nonce;
        this.previousBlockhash = previousBlockhash;
        this.merkleroot = merkleroot;
    }

    mineBlock(merkleroot) {
        let Block_Data = this.blocknumber + this.previousBlockhash + this.timestamp + merkleroot + this.nonce;
        let difficulty_Target = 2n ** 236n;
        let hash = ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data)));
        while (BigInt(hash) > difficulty_Target) {
            this.nonce++;
            Block_Data = this.blocknumber + this.previousBlockhash + this.timestamp + merkleroot + this.nonce;
            hash = ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data)));
        }
        this.currentblockhash = hash;
        this.merkleroot = merkleroot;
        return true;
    }

    verifyBlock() {
        let Block_Data = this.blocknumber + this.previousBlockhash + this.timestamp + this.merkleroot + this.nonce;
        const hash = BigInt(ethers.sha256(toUtf8Bytes(JSON.stringify(Block_Data))));
        return hash < 2n ** 236n;
    }

    toObject() {
        return {
            blocknumber: this.blocknumber,
            nonce: this.nonce,
            currentblockhash: this.currentblockhash,
            previousBlockhash: this.previousBlockhash,
            timestamp: this.timestamp,
            merkleroot: this.merkleroot
        };
    }
}