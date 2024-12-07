const {initializeApp} = require("firebase/app")
const {getFirestore, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc} = require("firebase/firestore")

const firebaseConfig = {
  apiKey: "AIzaSyBalNrlpLjl71NYOQJRgsvAhRVXhH5nBLU",
  authDomain: "optimal-doc.firebaseapp.com",
  projectId: "optimal-doc",
  storageBucket: "optimal-doc.appspot.com",
  messagingSenderId: "632170282716",
  appId: "1:632170282716:web:fec27bcb020ca25ba7be19",
  measurementId: "G-9SYQ76FZDX",
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const firestoreDatabase = {
  db,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
}

module.exports = {
  app,
  firestoreDatabase
};