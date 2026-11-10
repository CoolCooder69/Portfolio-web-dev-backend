const { getFirestore } = require("firebase-admin/firestore");
const firebaseApp = require("./firebase");

const firestore = getFirestore(firebaseApp);

const useFireStore = () => firestore;

module.exports = useFireStore;