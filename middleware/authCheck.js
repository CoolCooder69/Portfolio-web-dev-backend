const { getAuth } = require("firebase-admin/auth");
require("../utils/firebase"); 

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not logged in" });
  }
  const idToken = header.slice(7);

  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (e) {
    console.error("Token verify error:", e.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = requireAuth;