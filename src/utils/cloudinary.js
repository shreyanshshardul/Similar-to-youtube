import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRET
    });
    
    // Upload an image
     const uploadOnCloudinary = async(localFilePath)=>{
        try{
            if(!localFilePath) return null;
            //upload the file on cloudinary
          let response=await cloudinary.uploader.upload(
           localFilePath, {
                resource_type:"auto"
           })
           //file has be successfully uploaded
           console.log("File is uploaded on clodinary")
           console.log(response.url)
           return response;
        }
       catch(error){
        fs.unlinkSync(localFilePath)
           console.log(error);
       }
    }
    
    console.log(uploadOnCloudinary);
    
    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url('shoes', {
        fetch_format: 'auto',
        quality: 'auto'
    });
    
    console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url('shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    
    console.log(autoCropUrl);    
export { uploadOnCloudinary };