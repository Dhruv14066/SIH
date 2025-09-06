import jwt from "jsonwebtoken";
import {ApiError} from "../utils/apiError.js"
import {asyncHandler} from "../utils/asyncHandler.js";

const authenticate=asyncHandler(async (req,_,next)=>{
    const token=req.cookies?.accessToken;
    if(!token){
        throw new ApiError(400,"Token Not Found")
    }

    try{
        const user=jwt.verify(token,process.env.ACCESS_TOKEN_SECRET);
        req.user=user;
        next();

    }catch(err){
        throw new ApiError(401,"Invalid Token");
    }

});

export {authenticate}