import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, increment, query, where, orderBy, limit, onSnapshot, getDoc, setDoc, deleteDoc, getCountFromServer } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyA2LYZVIBBvhX0QWnkXvYtufDXc-GTkqls",
    authDomain: "bardo-total.firebaseapp.com",
    projectId: "bardo-total",
    storageBucket: "bardo-total.firebasestorage.app",
    messagingSenderId: "364429663514",
    appId: "1:364429663514:web:f004bbe27c2d9baf2220a3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider, collection, addDoc, getDocs, doc, updateDoc, increment, query, where, orderBy, limit, onSnapshot, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, getDoc, setDoc, deleteDoc, getCountFromServer };