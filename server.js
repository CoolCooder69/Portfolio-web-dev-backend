require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const dbclient = require("./utils/redis");

app.use(cors());
app.use(express.json());
app.use(express.static("."));
app.use(express.urlencoded({ extended: true }));

const isEmail = require("validator/lib/isEmail");
const sendOTP = require("./middleware/sendOTP");
const verifyOTP = require("./middleware/verifyOTP");
const { sgMail, sgMailClient } = require("./utils/mailApi");
const createUserToken = require("./utils/helper/createToken");
const checkUserEmail = require("./middleware/checkUser");

const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { useFirebase } = require("./utils/firebase");
const requireAuth = require("./middleware/authCheck");
const saveUserToDb = require("./middleware/saveUser");
const db = getFirestore(useFirebase);

const addToNewLetter = async (email) => {
  const data = { contacts: [{ email: email }] };
  const request = {
    url: "/v3/marketing/contacts",
    method: "PUT",
    body: data,
  };
  try {
    await sgMailClient.request(request);
    return true;
  } catch (error) {
    console.error("newsletter error", error.response?.body?.errors);
    return false;
  }
};

const notifyUser = async (userEmail) => {
  const msg = {
    to: userEmail,
    from: process.env.SG_SENDER_EMAIL,
    subject: "Activated to newsletter.",
    text: "Thanks for Choosing us, you have been registered to our newletter.",
  };
  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

app.post("/api/verifyForNewLetter", sendOTP, async (req, res) => {
  console.log("POST /api/verifyForNewLetter - Status: 200");
  return res.status(200).json({ Status: "OTP sended to email." });
});

app.post("/api/addToNewsLetter", verifyOTP, async (req, res) => {
  try {
    const userEmail = req.body.email;

    if (!isEmail(userEmail)) {
      console.log("POST /api/addToNewsLetter - Status: 400");
      return res.status(400).json({ message: "Email is required" });
    }

    const checkAddToNewLetter = await addToNewLetter(userEmail);
    if (!checkAddToNewLetter) {
      console.log("POST /api/addToNewsLetter - Status: 500");
      return res.status(500).json({ message: "API error newsletter" });
    }

    const checkNotifyUser = await notifyUser(userEmail);
    if (!checkNotifyUser) {
      console.log("POST /api/addToNewsLetter - Status: 500");
      return res.status(500).json({ message: "API error mail" });
    }

    console.log("POST /api/addToNewsLetter - Status: 200");
    return res.status(200).json({ message: "Email joined" });
  } catch (e) {
    console.error(e);
    console.log("POST /api/addToNewsLetter - Status: 400");
    return res.status(400).json({ status: "Bad Request." });
  }
});

app.post("/api/signup", checkUserEmail, saveUserToDb, sendOTP, (req, res) => {
  return res.status(200).json({ Status: "Otp sent" });
});

app.post("/api/verifyForSignup", verifyOTP, async (req, res) => {
  const { email, password } = req.body;

  try {
    const token = await createUserToken(email, password);
    return res.status(200).json({ token });
  } catch (e) {
    if (e.code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Email already in use." });
    }
    if (e.code === "auth/invalid-password") {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }
    console.error("Signup token error:", e);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/upgrade", requireAuth, async (req, res) => {
  try {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await db.collection("users").doc(req.email).set(
      {
        plan: "premium",
        planExpiresAt: Timestamp.fromDate(expiresAt),
        upgradedAt: Timestamp.now(),
      },
      { merge: true }
    );

    console.log("Plan upgraded:", req.email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Upgrade error:", e);
    return res.status(500).json({ message: "Upgrade failed" });
  }
});

dbclient.connect().then(() => {
  console.log("Connected to database.");
});

app.listen(3000, () => {
  console.log("App started at port 3000");
});