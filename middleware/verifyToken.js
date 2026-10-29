const { getAuth } = require("firebase-admin/auth");
const useFirebase = require("../firebase");

const fAuth = getAuth(useFirebase());

const verifyToken = (req, res, next) => {
  try {
    const token = req.body?.token;
    if (token === null) {
      res.status(401).json({
        msg: "Not Authroized.",
      });
    }
    const isVerified = fAuth.verifyIdToken(token).then(() => {
      next();
    });
  } catch (e) {
    res.status(401).json({
      msg: "Not Authroized.",
    });
  }
};

module.exports = verifyToken;
