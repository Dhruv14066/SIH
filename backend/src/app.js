import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();

//setup inbuilt middlewares and imported ones
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));
app.use(express.json({
    limit: "16kb",
}));
app.use(express.urlencoded({
    limit: "16kb",
    extended: true,
}));
app.use(express.static("public"));
app.use(cookieParser());

app.get('/',(req,res)=>{
    res.send('HOMEPAGE');
})


//USER ROUTES SETUP
import userRouter from "./routes/user.route.js";
app.use("/api/user",userRouter);


//Global Error Handler
app.use((err, req, res, next) => {
    console.log(err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
        data: err.data || null
    });
});

export {app};