const { initializeApp } = require('firebase-admin/app');
const admin = require("firebase-admin");

const serviceAccount = require("/home/ravneet/University Folder /Sem-3/Web Dev/Task P1/code2/privateKey.json");


const firebaseApp = admin.initializeApp({
    credential: admin.cert(serviceAccount) 
}); 

const useFirebase = ()=> {
    return firebaseApp;  
}; 

module.exports =  useFirebase; 