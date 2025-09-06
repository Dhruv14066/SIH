import {app} from "./app.js";
import {connectDb} from "./db/mongodb.js";
import dotenv from "dotenv";

dotenv.config({
    path: './.env'
});
const port=process.env.PORT || 8000;

connectDb()
.then(
    app.listen(port,()=>{
        console.log(`Listening at port ${port}`);
    })
)
.catch((err)=>{
    console.log(err);
});

