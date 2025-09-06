import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema=new mongoose.Schema({
    username:{
        type: String,
        required: true,
        lowercase: true,
        unique: true,
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
        required: true,
    },
    avatar:{
        type:String,
        default: "https://res.cloudinary.com/dtobpysyt/image/upload/v1756734566/Screenshot_2025-09-01_191247_neldwb.png"
    },
},{timestamps: true});

userSchema.pre('save',async function(next){
    if(!this.isModified("password")){
        next();
        return;
    }

    this.password=await bcrypt.hash(this.password,10);
    next();
});

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.setUser=async function(){
    const payload={
        _id: this._id,
        username: this.username,
        email: this.email
    }

    return jwt.sign(payload,process.env.ACCESS_TOKEN_SECRET,{expiresIn: process.env.ACCESS_TOKEN_EXPIRY});
}

export const User=mongoose.model('User',userSchema);