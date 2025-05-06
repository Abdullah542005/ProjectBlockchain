import Database from "better-sqlite3";

let db;

export default function connectDataBase(){
      db = new Database("Core/Database/Blockchain.db");
      return db;
}

export function toJsonDB(blockNumber)
{
      let lastBlockNumber = db.prepare('Select max(blockNumber) As number from block').get();
      lastBlockNumber = lastBlockNumber.number;       //Since the query returns an Object {number : xyz} so .number convert it
      
      let results = []
      
      for (let i = blockNumber; i <= lastBlockNumber; i++)
      {
            let block = db.prepare('select * from Block where blockNumber = ?').get(i);
            let blockTransaction = db.prepare('select * from Transactions where blockhash = ?').get(block.currentblockhash);
            const BlockData = {BlockHeader: block, Transactions: blockTransaction};
            results.push(BlockData);            //Test can remove
      }
      return results;
}

export function fromJsonDB(Node, data)     
{
      for (let i = 0; i < data.length; i++)
      {
            let block = data[i].BlockHeader;
            let transaction = data[i].Transactions;
            Node.createMinedBlock(block, transaction);
      }
}
