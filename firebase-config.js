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

// Lista de emails que têm acesso ao painel de administração da aplicação.
// Prefere usar o nó `/administradores` na base de dados para gestão dinâmica
// (ver instruções no README). Esta lista funciona como fallback local.
export const ADMIN_EMAILS = [
    "trivyy777@gmail.com",
    "kyralovonny@gmail.com"
];

// Compatibilidade com código antigo que ainda usa ADMIN_EMAIL
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
export const provedorGoogle = new GoogleAuthProvider();
provedorGoogle.setCustomParameters({ prompt: "select_account" });
