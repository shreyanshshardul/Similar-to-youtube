import mongoose from "mongoose"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const UserSchema = new mongoose.Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        
         email:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true
        },
        fullname:{
            type:String,
            required:true,
            trim:true,
            index:true
        },
        avator:{
            type:String,
            required:true
        },
        coverImage:{
            type:String,
        },
        watchHistory:[
            {
                type:mongoose.Schema.Types.ObjectId,
                ref:"Video",
            }
        ],
        password:{
            type:String,
            require:[true , "Password is required"]
        },
        refreshToken:{
            type:String
        }
},{timestamps:true}
)

UserSchema.pre("save" , async function(next){
    if(!this.isModified("password"))next();
 
    this.password = bcrypt.hash(this.password , 10);
    next();
})

export const User = mongoose.model("User" , UserSchema);