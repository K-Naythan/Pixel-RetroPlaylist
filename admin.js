import { db, auth, provedorGoogle, ADMIN_EMAIL } from "./firebase-config.js";
import { ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginPanel = document.getElementById("admin-login-panel");
const loginForm = document.getElementById("admin-login-form");
const passwordInput = document.getElementById("admin-password");
const loginFeedback = document.getElementById("admin-auth-feedback");
const googleLoginButton = document.getElementById("btn-admin-google");
const adminContent = document.getElementById("admin-content");
const logoutButton = document.getElementById("btn-admin-logout");
const userList = document.getElementById("lista-usuarios-admin");
const userTargetInput = document.getElementById("admin-usuario-alvo");
const actionSelect = document.getElementById("admin-acao-tipo");
const reasonInput = document.getElementById("admin-motivo-texto");
const applyButton = document.getElementById("btn-aplicar-punicao");
const dataFeedback = document.getElementById("admin-data-feedback");
const actionFeedback = document.getElementById("admin-action-feedback");

let unsubscribeUsers = null;
let selectedUserKey = null;

function isAuthorizedAdmin(user = auth.currentUser) {
    return user?.email?.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

function showFeedback(element, message, isError = false) {
    if (!element) return;
    element.textContent = message;
    element.style.color = isError ? "#a00020" : "var(--accent-strong)";
}

function renderUsers(snapshot) {
    if (!userList) return;
    userList.replaceChildren();

    if (!snapshot.exists()) {
        const empty = document.createElement("li");
        empty.className = "item-utilizador-lista";
        empty.textContent = "Não há utilizadores registados.";
        userList.appendChild(empty);
        return;
    }

    Object.entries(snapshot.val()).forEach(([key, profile]) => {
        if (!profile || typeof profile !== "object") return;
        const item = document.createElement("li");
        item.className = "item-utilizador-lista";
        item.dataset.userKey = key;
        item.setAttribute("aria-selected", String(key === selectedUserKey));
        const name = String(profile.username || key).toUpperCase();
        const status = String(profile.statusSistema || "nenhuma").toUpperCase();
        item.textContent = `${name} — ${status}`;
        item.addEventListener("click", () => {
            selectedUserKey = key;
            if (userTargetInput) userTargetInput.value = name;
            if (actionSelect) actionSelect.value = profile.statusSistema || "nenhuma";
            if (reasonInput) reasonInput.value = profile.motivoStatus || "";
            if (applyButton) applyButton.disabled = false;
            userList.querySelectorAll("[data-user-key]").forEach((row) => {
                row.setAttribute("aria-selected", String(row.dataset.userKey === selectedUserKey));
            });
            showFeedback(actionFeedback, "");
        });
        userList.appendChild(item);
    });
}

function stopUserListener() {
    unsubscribeUsers?.();
    unsubscribeUsers = null;
}

function startUserListener() {
    stopUserListener();
    unsubscribeUsers = onValue(ref(db, "usuarios"), renderUsers, (error) => {
        console.error("Erro ao carregar utilizadores:", error);
        showFeedback(dataFeedback, "Sem acesso à lista. Aplica as regras de segurança de database.rules.json no Firebase.", true);
    });
}

onAuthStateChanged(auth, (user) => {
    const authorized = isAuthorizedAdmin(user);
    loginPanel?.classList.toggle("escondido", authorized);
    adminContent?.classList.toggle("escondido", !authorized);
    stopUserListener();

    if (authorized) {
        showFeedback(loginFeedback, "");
        startUserListener();
        return;
    }

    selectedUserKey = null;
    if (user) {
        showFeedback(loginFeedback, `A conta ${user.email || "atual"} não tem acesso. Entra como Kyra.`, true);
    }
});

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordInput?.value) return;
    showFeedback(loginFeedback, "A validar acesso…");
    const submitButton = loginForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
        const credential = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, passwordInput.value);
        if (!isAuthorizedAdmin(credential.user)) {
            await signOut(auth);
            showFeedback(loginFeedback, "Esta conta não está autorizada para o painel.", true);
        } else {
            passwordInput.value = "";
        }
    } catch (error) {
        console.error("Falha de autenticação do painel:", error);
        showFeedback(loginFeedback, "Não foi possível entrar. Confirma a palavra-passe, a conta e a ligação ao Firebase.", true);
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
});

googleLoginButton?.addEventListener("click", async () => {
    showFeedback(loginFeedback, "A abrir o acesso Google…");
    googleLoginButton.disabled = true;
    try {
        const credential = await signInWithPopup(auth, provedorGoogle);
        if (!isAuthorizedAdmin(credential.user)) {
            await signOut(auth);
            showFeedback(loginFeedback, `Só ${ADMIN_EMAIL} pode utilizar o painel.`, true);
        }
    } catch (error) {
        console.error("Falha no acesso Google do painel:", error);
        showFeedback(loginFeedback, "Não foi possível autenticar com o Google. Tenta novamente no navegador principal.", true);
    } finally {
        googleLoginButton.disabled = false;
    }
});

logoutButton?.addEventListener("click", async () => {
    await signOut(auth);
    selectedUserKey = null;
    if (userTargetInput) userTargetInput.value = "";
    if (applyButton) applyButton.disabled = true;
});

applyButton?.addEventListener("click", async () => {
    if (!isAuthorizedAdmin()) {
        showFeedback(actionFeedback, "A sessão não tem autorização para esta ação.", true);
        return;
    }

    const action = actionSelect?.value || "nenhuma";
    const reason = reasonInput?.value.trim() || "";
    if (!selectedUserKey) {
        showFeedback(actionFeedback, "Seleciona um utilizador da lista primeiro.", true);
        return;
    }
    if (action !== "nenhuma" && !reason) {
        showFeedback(actionFeedback, "Indica o motivo do aviso ou banimento.", true);
        return;
    }

    applyButton.disabled = true;
    try {
        await update(ref(db, `usuarios/${selectedUserKey}`), {
            statusSistema: action,
            motivoStatus: action === "nenhuma" ? "" : reason
        });
        showFeedback(actionFeedback, `Alteração guardada para ${userTargetInput?.value || selectedUserKey}.`);
    } catch (error) {
        console.error("Erro ao atualizar conta:", error);
        showFeedback(actionFeedback, "O Firebase recusou a alteração. Confirma que as regras estão aplicadas e tenta novamente.", true);
    } finally {
        applyButton.disabled = !selectedUserKey;
    }
});
