import express from "express"
const app = express();
import cookieParser from "cookie-parser"
import cors from "cors";


app.use(core());
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended:true , limit:"16kb"}))
app.use(cookieParser())
export {app};