import express from "express"
import mongoose from "mongoose";
import {DB_NAME} from "./constants.js"
/*import dotenv from "dotenv";
dotenv.config();*/ //package.json me add kr diya direct;


const PORT=process.env.PORT||8000

const app = express();
( async () => {
    try{
      const mongoconnection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
     // console.log(mongoconnection)
       app.on("error" , (error)=>{
            console.log("ERROR: " ,error)
       })

       app.listen(PORT , ()=>{
        console.log("Server is running")
        
       })
    }
    catch(error){
        console.error("Error : " , error);
        
    }
})()
