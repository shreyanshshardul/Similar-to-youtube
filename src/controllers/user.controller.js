import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler(async(req,res)=>{
    /* console.log("REGISTER ROUTE HIT");
    res.status(200).json({message:'Ok'})*/
//for validation
    let {username , email , password , fullname} = req.body;
    console.log("email" , email)

    if(
        [username , email , password , fullname].some((field)=>(
          !field || field.trim() === ""
        )
    )){
        throw new ApiError(400 , "All fields are required")
    }

    if(!email.includes("@")){
        throw new ApiError(401 , "Invalid email")
    }
//for user existing
    const existedUser = User.findOne({
        $or:[{username} , {email}]
    })

    if(!existedUser){
        throw new ApiError(409 , "Already exist");
    }
//for checking if user had uploaded avator image or not 
    const avatorLocalPath = req.files?.avator[0]?.path;

    if(!avatorLocalPath){
        throw new ApiError(400 , "Avator is mandatory")
    }
//uploading on cloudinary
    const avator = await uploadOnCloudinary(avatorLocalPath);
    if(!avator){
        throw new ApiError(400 , "Avator is mandatory")
    }

    //database pe upload 
    const User = await User.create({
        fullname,
        avator:avator.url,
        coverImage:coverImage?.url || "",
        email,
        username:username.toLowerCase(),
    })

    //checking wheather user is created or not

    const createdUser = await User.findById(User._id);
    if(!createdUser){
        throw new ApiError(409 , "Error occurs while registering the user");
    }
//sending success message 
    return res.status(201).json(
        new ApiResponse(200 , createdUser ,"User registered successfully")
    )
})

export {registerUser};