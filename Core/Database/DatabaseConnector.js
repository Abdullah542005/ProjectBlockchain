import Database from "better-sqlite3";
export default function connectDataBase(){
      const db = new Database("Core/Database/Blockchain.db");
      return db;
}
