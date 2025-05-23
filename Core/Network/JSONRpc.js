import cors from "cors";
import express from "express";

export default function provideInterface(fnode){

    const app  = express();

    app.use(express.json());
    app.use(cors());

    app.listen(4001);

    app.post("/JsonRpc",(req,res)=>{

      const { method,params}  = req.body;
       
      switch(method){
          case 'getBlockByHash':
            res.json(fnode.getBlockByHash(params))
          break;
          
          case 'getBlockByNumber':
             res.json(fnode.getBlockByNumber(params))
          break;
          
          case 'getTransaction':
             res.json(fnode.getTransaction(params))
          break;

          case  'getUserTransactions':
            res.json(fnode.getUserTransactions(params))
          break;

          case 'getUserBalance':
            res.json(fnode.getUserBalance(params))
          break;

          case 'getUserData':
            res.json(fnode.getUserData(params))
          break;

          /*I think we need to introduce a case with getUserTransactionNonce since it exist in FullNode but not in JSONRpc.js
          From line 38-40 I believe this code might exist so added it*/
          case 'getUserTransactionNonce':
            res.json(fnode.getUserTransactionNonce(params))
          break;
      
          case 'getAverageGas':
            res.json(fnode.getAverageGas())
          break;

          case 'sendTransaction':{
           let {status,message} = fnode.addTransactionToMempool(params[0],params[1],params[2])
           if(!status){
               res.status(400).json({status:status,message:message})
           }
           else 
              res.json({status:status,message:message}); 
          }
          break;

          case "getBlockchainInfo":{
              res.json(fnode.getBlockchainInfo())    
          }
          break;

          default :
          res.status(404).json({error:"Unknown Method Define"})
      } 

    })
}