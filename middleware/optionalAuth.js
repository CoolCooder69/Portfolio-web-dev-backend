// middleware/optionalAuth.js
const { getAuth } = require("firebase-admin/auth");
const { useFirebase } = require("../utils/firebase");

const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) return next(); 

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Invalid token" });
  }

  try {
    const decoded = await getAuth(useFirebase).verifyIdToken(header.slice(7));
    req.uid = decoded.uid;
    req.email = decoded.email;
    next();
  } catch (e) {
    console.log(e); 
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = optionalAuth;