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

const { useFirebase } = require("./utils/firebase");
const requireAuth = require("./middleware/authCheck");
const saveUserToDb = require("./middleware/saveUser");
const useFireStore = require("./utils/firestore");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const optionalAuth = require("./middleware/optionalAuth");
const { CreateSignatureForPhoto } = require("./utils/cloudinary");

const db = useFireStore();

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

    await db
      .collection("users")
      .doc(req.email)
      .set(
        {
          plan: "premium",
          planExpiresAt: Timestamp.fromDate(expiresAt),
          upgradedAt: Timestamp.now(),
        },
        { merge: true },
      );

    console.log("Plan upgraded:", req.email);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Upgrade error:", e);
    return res.status(500).json({ message: "Upgrade failed" });
  }
});

app.post("/api/posts", requireAuth, async (req, res) => {
  const { title, content, thumbnailURL } = req.body;

  let cleanThumbnail = null;
  if (thumbnailURL !== undefined && thumbnailURL !== null && thumbnailURL !== "") {
    if (
      typeof thumbnailURL !== "string" ||
      !thumbnailURL.startsWith(`http://res.cloudinary.com/${process.env.SB_CLOUD_NAME}/`)
    ) {
      return res.status(400).json({ message: "Invalid thumbnail URL." });
    }
    cleanThumbnail = thumbnailURL;
  }

  if (typeof title !== "string" || typeof content !== "string") {
    return res.status(400).json({ message: "Title and content are required." });
  }
  
  const cleanTitle = title.trim();
  const cleanContent = content.trim();

  if (!cleanTitle || !cleanContent) {
    return res
      .status(400)
      .json({ message: "Title and content cannot be empty." });
  }
  if (cleanTitle.length > 50 || cleanContent.length > 200) {
    return res.status(400).json({ message: "Title or content is too long." });
  }

  try {
    const userRef = db.collection("users").doc(req.email);
    const postRef = db.collection("posts").doc();

    const tier = await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const user = userSnap.data() || {};

      const expiresAt = user.planExpiresAt?.toDate();
      const isPremium =
        user.plan === "premium" && expiresAt && expiresAt > new Date();
      const tier = isPremium ? "paid" : "free";
      tx.set(postRef, {
        title: cleanTitle,
        content: cleanContent,
        tier,
        authorId: req.uid,
        createdAt: FieldValue.serverTimestamp(),
        thumbnailURL: cleanThumbnail
      });

      tx.set(
        userRef,
        { postsThisMonth: FieldValue.increment(1) },
        { merge: true },
      );

      return tier;
    });

    console.log("Post created:", postRef.id, "by", req.email);
    return res.status(201).json({ id: postRef.id, tier });
  } catch (e) {
    console.error("Create post error:", e);
    return res.status(500).json({ message: "Failed to create post." });
  }
});

app.post("/api/uploadPhoto", requireAuth, async (req, res) => {
  try {
    const { signature, timestamp, folder } =await CreateSignatureForPhoto();
    return res.status(200).json({ signature, timestamp, folder});
  } catch (e) { 
    return res.status(500).json({ msg: "something went wrong." });
  }
});

const isActivePremium = (user) => {
  const expiresAt = user?.planExpiresAt?.toDate();
  return user?.plan === "premium" && !!expiresAt && expiresAt > new Date();
};

app.get("/api/posts", optionalAuth, async (req, res) => {
  try {
    let tiers = ["free"];

    if (req.email) {
      const userSnap = await db.collection("users").doc(req.email).get();
      if (isActivePremium(userSnap.data())) tiers = ["free", "paid"];
    }

    const snap = await db
      .collection("posts")
      .where("tier", "in", tiers)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const posts = snap.docs.map((d) => {
      const p = d.data();
      return {
        id: d.id,
        title: p.title,
        content: p.content,
        thumbnailURL: p.thumbnailURL, 
        label: p.tier === "paid" ? "Premium" : null,
        createdAt: p.createdAt?.toDate().toISOString() ?? null,
      };
    });

    return res.status(200).json({ posts });
  } catch (e) {
    console.error("List posts error:", e);
    return res.status(500).json({ message: "Failed to load posts." });
  }
});

dbclient.connect().then(() => {
  console.log("Connected to database.");
});

app.listen(3000, () => {
  console.log("App started at port 3000");
});
