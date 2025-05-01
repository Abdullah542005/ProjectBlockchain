import sqlite3 from "sqlite3";

export default function connectDataBase(){
      const db = new sqlite3.Database("Core/Database/Blockchain.db");
      return db;
}
