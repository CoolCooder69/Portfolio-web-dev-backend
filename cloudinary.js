const cloudinary = require("cloudinary");
require("dotenv").config();

cloudinary.v2.config({
  cloud_name: process.env.SB_CLOUD_NAME,
  api_key: process.env.SB_CLOUD_API,
  api_secret: process.env.SB_CLOUD_API_SECRET,
});

export const CreateSignatureForPhoto =async () => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "reddit-posts";
  return await cloudinary.v2.utils.api_sign_request(
    { timestamp, folder },
    process.env.SB_CLOUD_API_SECRET,
  );
};
