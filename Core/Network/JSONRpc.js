import e from "express";

export default function provideInterface(fnode){

    const app  = e();

    app.use(e.json);

    app.listen(3000);
  
app.post("/JsonRpc",(req,res)=>{

      const { method,params}  = req.body;

      switch(method){
          case 'getBlockByHash':
            res.json(fnode.getBlockByHash(params))
          break;
          
          case 'getBlockByNonce':
             res.json(fnode.getBlockByNonce(params))
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
      
          case 'getAverageGas':
            res.json(fnode.getAverageGas())
          break;

          case 'sendTransaction':{
           let {status,message} = fnode.addTransactionToMempool(params[0],params[1],params[2])
           if(!status)
               res.status(400).json({error:message})
           else 
              res.json(message); 
          }
          break;

          default :
          res.status(404).json({error:"Unknown Method Define"})
      } 

    })
}