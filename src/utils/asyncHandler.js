const asyncHandler = (requestHandler)=>{
    (req,res,next)=>{
        promise.resolve(requestHandler(req,res,next))
        .catch((error)=>next(error))
    }
}

export {asyncHandler}

/* 
 const asyncHandler = (fun)=>async(req,res,next)=>{
    try{
            fun(req,res,next)  
    }
            catch(error){
            res.status(error.code||500).json({success:false , message:error.message})
            }
    }
*/ 