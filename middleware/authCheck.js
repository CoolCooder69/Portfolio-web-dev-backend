const { getAuth } = require("firebase-admin/auth");
const { useFirebase } = require("../firebase");

const fAuth = getAuth(useFirebase);

const requireAuth = async (req, res, next) => {
  const idToken = req.headers.authorization?.replace("Bearer ", "");
  if (!idToken) return res.status(401).json({ message: "Not logged in" });

  try {
    const decoded = await fAuth.verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (e) {
    console.error("Token verify error:", e.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = requireAuth;