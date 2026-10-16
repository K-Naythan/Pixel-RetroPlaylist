import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// A configuração Web do Firebase é pública por natureza. O acesso aos dados
// deve ser protegido pelas regras do Firebase, nunca por este ficheiro.
export const firebaseConfig = {
    apiKey: "AIzaSyAlmEQTnQM6UCMQbDBXkv-yeZVExqvuBtA",
    authDomain: "retro-play-list.firebaseapp.com",
    projectId: "retro-play-list",
    storageBucket: "retro-play-list.firebasestorage.app",
    messagingSenderId: "275741375910",
    appId: "1:275741375910:web:5af396a0d9ae84b4dce367",
    databaseURL: "https://retro-play-list-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const provedorGoogle = new GoogleAuthProvider();
