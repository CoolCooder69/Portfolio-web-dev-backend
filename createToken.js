const { getAuth } = require("firebase-admin/auth");
const { useFirebase } = require("./firebase");
const { Router } = require("express");
const createUserForSignup = require("./middleware/createUser");

const fApp = useFirebase;
const fAuth = getAuth(fApp);

async function createUserToken(
  email,
  password,
  { createIfMissing = false } = {},
) {
  try {
    const res = await createUserForSignup(email, password);
    return fAuth.createCustomToken(res);
  } catch (e) {
    if (e.code === "auth/email-already-exists")
      return res.status(409).json({ message: "Email already in use." });
    if (e.code === "auth/invalid-password")
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
}

module.exports = createUserToken;
