import multer from "multer";
//multer → temporary → cloudinary → permanent
const storage=multer.diskStorage({
    destination: function (req,file,cb) {
      cb(null,"./public/temp")
    },
    filename: function (req,file,cb) {
      
      cb(null,file.originalname)
    }
  })
  
export const upload=multer({storage})
//upload.fields([{name: "" , maxCount: n},{name: "" , maxCount: n}]) % upload.single("name")