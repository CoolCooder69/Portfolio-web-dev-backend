const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { useFirebase } = require("../firebase");

const db = getFirestore(useFirebase);

const saveUserToDb = async (req, res, next) => {
  const email = req.body.email;
  try {
    await db.collection("users").doc(email).create({
      email,
      plan: "free",
      planExpiresAt: null,
      postsThisMonth: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log("Firestore user saved:", email);
  } catch (e) {
    if (e.code !== 6) {
      console.error("Firestore save error:", e);
      return res.status(500).json({ message: "Database error" });
    }
  }
  next();
};

module.exports = saveUserToDb;