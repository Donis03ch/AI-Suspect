
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyACu1O8cP3OUZNJIkM_-jZ5-h-sWn3gYc4",
  authDomain: "ai-suspect.firebaseapp.com",
  projectId: "ai-suspect",
  storageBucket: "ai-suspect.firebasestorage.app",
  messagingSenderId: "935083456910",
  appId: "1:935083456910:web:625f30e09aade486c80cdf"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
