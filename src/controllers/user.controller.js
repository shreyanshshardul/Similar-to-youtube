import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

//ye function bana rahe hai access and refresh token generate krne ke liya user ke liya isleya userId dale hai or user._id dalenge jb isko call krenge tb
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const AccessToken = user.generateAccessToken();
    const RefreshToken = user.generateRefreshToken();

    user.refreshToken = RefreshToken;

    await user.save({ validateBeforeSave: false });

    return { AccessToken, RefreshToken };
  } catch (error) {
    throw new ApiError(
      404,
      "Something went wrong while generating access and refresh token",
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  console.log("BODY 👉", req.body);
  console.log("FILES 👉", req.files);

  const { username, email, password, fullname } = req.body || {};

  // validation
  if (
    [username, email, password, fullname].some(
      (field) => !field || field.trim() === "",
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  if (!email.includes("@")) {
    throw new ApiError(401, "Invalid email");
  }

  // check existing user
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // files
  const avatorLocalPath = req.files?.avator?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!avatorLocalPath) {
    throw new ApiError(400, "Avator is mandatory");
  }

  // upload avatar (mandatory)
  const avator = await uploadOnCloudinary(avatorLocalPath);
  if (!avator) {
    throw new ApiError(400, "Avator upload failed");
  }

  // upload cover image (optional)
  let coverImage = "";
  if (coverImageLocalPath) {
    const uploadedCover = await uploadOnCloudinary(coverImageLocalPath);
    coverImage = uploadedCover?.url || "";
  }

  // create user
  const newUser = await User.create({
    fullname,
    avator: avator.url,
    coverImage,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
  });

  // verify creation
  const createdUser = await User.findById(newUser._id).select("-password");
  if (!createdUser) {
    throw new ApiError(500, "Error while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email) {
    throw new ApiError(404, "username or email required");
  }
  //multiple value check
  const user = await User.findOne({ $or: [{ username }, { email }] });

  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  //password check
  const isPasswordVlaid = await user.isPasswordCorrect(password);
  if (!isPasswordVlaid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  //Refresh and Access Token dono lete hai ab

    const {AccessToken , RefreshToken} =await generateAccessAndRefreshTokens(user._id);
//cookie ke liya frr se database call kr rahe hai
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const option ={
        httpOnly:true,
        secure:true,
    }

    return res.
    status(200)
    .cookie("AccessToken" ,AccessToken, option)
    .cookie("RefreshToken" , RefreshToken , option)
    .json(
        new ApiResponse(200,
            {
                user : loggedInUser , AccessToken , RefreshToken
            },
            "User Loggined successfully"
        )
    )
});

const logoutUser = asyncHandler(async(req,res)=>{
    //logout ke baad update kr rahe hai refreshToken ko
   await User.findByIdAndUpdate(req.user._id,
    {
        $set:{
            refreshToken:undefined
        },
   })

   let option = {
    httpOnly:true,
    secure:true,
   }
   return res.
   status(200)
   .clearCookie("AccessToken" ,AccessToken , option)
   .clearCookie("RefreshToken" , RefreshToken , option)
   .json(200 , {} , "Logout Successfully")
})


export { registerUser, loginUser , logoutUser};
