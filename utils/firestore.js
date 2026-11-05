const { getFirestore } = require("firebase-admin/firestore");
const { useFirebase } = require("../utils/firebase");

const firestore = getFirestore(useFirebase);

const useFireStore = () => {
  return firestore;
};

module.exports = useFireStore;
