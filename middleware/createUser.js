const { getAuth } = require("firebase-admin/auth");
const useFirebase = require("../firebase");

const firebase = useFirebase();
const fAuth = getAuth(firebase);
async function createUserForSignup(email, password) {
  try {
    const fUser = await fAuth.createUser({ email, password });
    return fUser.uid;
  } catch (e) {
    return e;
  }
}

module.exports = createUserForSignup; 