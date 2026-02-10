import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


//ye function bana rahe hai access and refresh token generate krne ke liya user ke liya isleya userId dale hai or user._id dalenge jb isko call krenge tb
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
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

  if (!(username || email)) {
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

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );
  //cookie ke liya frr se database call kr rahe hai
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Loggined successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //logout ke baad update kr rahe hai refreshToken ko
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    },
  );
//frontend se cookie edit na paiye || cookie security policy.
  let option = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "Logout Successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //refresh token nekal raha hai
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Please login again. Fail to access refresh token");
  }
  try {//verify kr raha hu token same hai jwt ke help se
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET,
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
//verify kr raha hu user_token and collected_token same hai.
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token used or expired");
    }
//new refresh_token generate kr rahe hai
    let options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newrefreshToken } =
      await generateAccessAndRefreshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newrefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "Access token refreshed",
        ),
      );
  } catch (error) {
    throw new ApiError(401, "Invalid refreshToken");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //body se dono password nekal rahe hai
  let { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  //user jo oldPassword dala hai wo shi hai
  const correctPassword = await isPasswordCorrect(oldPassword);
  if (!correctPassword) {
    throw new ApiError(401, "incorrect password");
  }
  //existing user me newPassword set kr rahe hai
  user.password = newPassword;
  //database me save
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  let { fullname, email } = req.body;
  if (!(fullname || email)) {
    throw new ApiError(401, "Both field are mandatory");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true },
  );
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateAvator = asyncHandler(async(req,res)=>{
  let avatorPath = req.file?.path;
  if(!avatorPath){
    throw new ApiError(401 , "Avator not found")
  }
  //ab clodinary pe upload bhi to kro
  const avator = await uploadOnCloudinary(avatorPath);
  if(!avator.url){
    throw new ApiError(404 , "Error while uploading in cloudinary")
  }
  
//ab batabase pe update
  const user = await User.findByIdAndUpdate(req.user?._id , 
    {
      $set:{
        avator:avator.url
      }
    }
     , {new : true}).select("-password")

     return res
    .status(200)
    .json(new ApiResponse(200 , user , "Avator updated successfully"))
})

const updateCoverImage = asyncHandler(async(req,res)=>{
  let coverImagePath = req.file.path;
  if(!coverImagePath){
    throw new ApiError(404 , "Can't find coverImage");
  }

  //ab cloudinary pe upload kro
  const coverImage = uploadOnCloudinary(coverImagePath);
  if(!coverImage.url){
    throw new ApiError(404 , "error while uploading on clodinary");
  }

  //ab batabase pe updata
  const user = await User.findByIdAndUpdate(req.user?._id , 
    {
      $set:{
        coverImage:coverImage.url
      }
    },
    {new:true}).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200 , user , "CoverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async (req,res)=>{
  let {username} = req.params;//basically mai url se username le raha hu;\
  if(!username?.trim()){
    throw new ApiError(400 , "Username not found!")
  }

  const channel = await User.aggregate([
    {
      $match:{
        username:username?.toLowerCase(),
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscriber"
      },
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscriber",
        as:"subscribedTo"
      },
    },
    {
      $addFields:{
        subscriberCount:{
          $size:"$subscriber"
        },
        channelsSubscribedToCount:{
          $size :"$subscribedTo"
        },
        isSubscribed:{
          $cond:{
            if:{$in: [req.user?._id, "subscriber.subscribers"]},
            then:true,
            else:false
          }
        }
      }
    },
    {   //mai sari chig ni dunga but selected chig dunga
      $project:{
          fullname:1,
          username:1,
          subscriberCount,
          channelsSubscribedToCount,
          isSubscribed,
          email:1,
          avator:1,
          coverImage:1,
      }
    }
  ])

  if(!channel?.length){
    throw new ApiError(404 , "Account doesn't exist!")
  }

  return res
  .status(200)
  .json(new ApiResponse(200 , channel[0] , "User channel fetched successfully"));
})

const getWatchHistory = asyncHandler(async(req,res)=>{
  const user = await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user._id)
      }
    },
    {
      $lookup:{
        from :"videos",
        localField:"watchhistory",
        foreignField:"_id",
        as:"watchGistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localFields:"owner",
              foreignFields:"_id",
              owner:"owner",
              pipeline:[
                  {
                    $project:{
                      fullname:1,
                      username:1,
                      avator:1,
                    }
                  }
                ]
            }
          }
        ]
      }
    }
  ])

  return res
  .status(200)
  .json(new ApiResponse(201 , user[0].watchHistory ,"Watch hsitory fetched successfully"));
})

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvator,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
