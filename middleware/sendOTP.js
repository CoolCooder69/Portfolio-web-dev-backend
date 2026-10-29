const crypto = require("crypto");
const bcrypt = require("bcrypt");
require("dotenv").config();


const client = require("../redis");
const { sgMail } = require("../mailApi");
const checkUserEmail = require("./checkUser");

const OTP_EXP = 5000; // seconds

const emailSendOTP = async (email, otp) => {
  const msg = {
    to: email,
    from: process.env.SG_SENDER_EMAIL,
    subject: "OTP for NewsLetter",
    text: `Thanks for choosing us. Your one-time password is ${otp}`,
  };
  try {
    await sgMail.send(msg);
    console.log(`OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error("Mail Provider error:", error);
    return false;
  }
};

const generateOTP = async () => {
  const plainOTP = crypto.randomInt(100000, 1000000).toString();

  const hashedOTP = await bcrypt.hash(plainOTP, 12);

  console.log("OTP generated and hashed successfully");

  return {
    plainOTP,
    hashedOTP,
  };
};

const sendOTP = async (req, res) => {
  const email = req.body?.email;

  console.log(`sendOTP called for email: ${email}`);

  if (!email) {
    console.log("sendOTP - Email missing in request body");
    return res.status(400).json({
      error: "Email is required",
    });
  }
  try {
    const otp = await generateOTP();
    // Store hashed OTP in Redis for 200 seconds
    await client.set(email, otp.hashedOTP, {
      EX: OTP_EXP,
    });

    console.log(`Hashed OTP stored in Redis for ${email} (expires in ${OTP_EXP}s)`);

    // Send plain OTP through email
    const emailSent = await emailSendOTP(email, otp.plainOTP);

    if (!emailSent) {
      console.log(`sendOTP - Failed to send OTP email to ${email}`);
      return res.status(500).json({
        error: "Failed to send OTP",
      });
    }

    console.log(`sendOTP - OTP flow completed successfully for ${email}`);
    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server is down",
    });
  }
};

module.exports = sendOTP;