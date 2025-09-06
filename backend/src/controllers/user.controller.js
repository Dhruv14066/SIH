import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser=asyncHandler(async(req,res)=>{
    const {username,email,password}=req.body;

    const existedUser=await User.findOne({
        $or: [{username},{email}]
    })

    if(existedUser){
        throw new ApiError(400,"User already exists");
    }

    let avatarUrl;
    if(req.file?.path){
        const uploaded=await uploadOnCloudinary(req.file.path);
        avatarUrl=uploaded?.url||"";
    }

    const user=await User.create({
        username,
        email,
        password,
        avatar: avatarUrl,
    });

    const createdUser=await User.findById(user._id).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,createdUser,"User Registered"));

});

const loginUser=asyncHandler(async (req,res)=>{
    //get username email password
    const {username,email,password}=req.body;

    //check validation
    if(!username && !email){
        throw new ApiError(400,"Give either email or username");
    }
    if(!password){
        throw new ApiError(400,"Password is required");
    }

    //find user in database
    const user=await User.findOne({
        $or: [{username},{email}]
    });

    if(!user){
        throw new ApiError(404,"No user found with that username or email");
    }

    //check for correct password
    const matchPassword=await user.isPasswordCorrect(password);

    if(!matchPassword){
        throw new ApiError(400,"Password Not Matched");
    }

    //create token and cookie
    const token=await user.setUser();

    res.cookie("accessToken", token, {
        httpOnly: true,
        secure: false,
        maxAge: 24*60*60*1000 // 1 day
    });

    //remove password field from user and return it
    const loggedInUser=await User.findById(user._id).select("-password");

    return res
    .status(200)
    .json(new ApiResponse(200,loggedInUser,"User Logged In Successfully"));

});

const authMe=asyncHandler(async(req,res)=>{
    const user=await User.findById(req.user._id).select("-password")
    if(!user){
        throw new ApiError(404,"User Not Found");
    }
    return res
    .status(200)
    .json(new ApiResponse(200,user,"User Fetched"));
});

export {
    registerUser,
    loginUser,
    authMe
}