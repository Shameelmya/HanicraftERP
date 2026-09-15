import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDBIhZ9XqyFQnrcc-mzmdzTBXfK2K77DtU",
  authDomain: "hanicraft-erp.firebaseapp.com",
  projectId: "hanicraft-erp",
  storageBucket: "hanicraft-erp.firebasestorage.app",
  messagingSenderId: "1008485906044",
  appId: "1:1008485906044:web:62f3c5b0fc37359e3c7bf9"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
