const { getAuth } = require("firebase-admin/auth");
const { useFirebase } = require("../firebase");
const createUserForSignup = require("../../middleware/createUser");

const fAuth = getAuth(useFirebase);

async function createUserToken(email, password) {
  const uid = await createUserForSignup(email, password);
  return fAuth.createCustomToken(uid);
}

module.exports = createUserToken;