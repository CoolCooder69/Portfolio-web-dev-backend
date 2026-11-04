const express = require("express");
const redis = require("redis");
const bcrypt = require("bcrypt");
const client = require("../utils/redis");
const { default: isEmail } = require("validator/lib/isEmail");

const app = express();
app.use(express.json());

const verifyOTP = async (req, res, next) => {
  const email = req.body.email;
  const otp = req.body.otp;
  if (!isEmail(email) || otp === null)
    return res.status(500).json({
      Status: "Invalid request",
    });
  const storedOTP = await client.get(email);
  if (!storedOTP) {
    return res.status(401).json({
      Status: "Invalid Email",
    });
  }

  next(); 
  // Have to change email provider. 
  // if (await bcrypt.compare(otp, storedOTP)) {
  //   client.del(email); // one time password.
  // } else {
  //   return res.status(401).json({
  //     Status: "Invalid OTP",
  //   });
  // }
};

module.exports = verifyOTP;
