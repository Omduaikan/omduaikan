// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVqzVqfu9QBK9tM9twekDbSr_Iemm3jFE",
  authDomain: "omduaikan.firebaseapp.com",
  projectId: "omduaikan",
  storageBucket: "omduaikan.firebasestorage.app",
  messagingSenderId: "122703450364",
  appId: "1:122703450364:web:9c9f7bc699f67a0c8f8779"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();