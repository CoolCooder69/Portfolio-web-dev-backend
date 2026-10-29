const { getAuth } = require("firebase-admin/auth");
const useFirebase = require("../firebase");

const app = useFirebase();
const fAuth = getAuth(app);

const checkUserEmail = async (req, res, next) => {
  const email = req.body?.email;
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    await fAuth.getUserByEmail(email);
    return res.status(409).json({ message: "Email already in use." });
  } catch (e) {
    if (e.code === "auth/user-not-found") {
      return next(); 
    }
    console.error(e);
    return res.status(500).json({ message: "Server error." });
  }
};

module.exports = checkUserEmail;