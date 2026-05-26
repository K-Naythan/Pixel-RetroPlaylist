import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://retroplaylist-bcf3b-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const listaUsuariosAdmin = document.getElementById('lista-usuarios-admin');
const adminUsuarioAlvo = document.getElementById('admin-usuario-alvo');
const adminAcaoTipo = document.getElementById('admin-acao-tipo');
const adminMotivoTexto = document.getElementById('admin-motivo-texto');
const btnAplicarPunicao = document.getElementById('btn-aplicar-punicao');

onValue(ref(db, 'usuarios'), (snapshot) => {
    listaUsuariosAdmin.innerHTML = '';
    if (snapshot.exists()) {
        const usuarios = snapshot.val();
        Object.keys(usuarios).forEach(username => {
            const dados = usuarios[username];
            const li = document.createElement('li');
            li.classList.add('item-utilizador-lista');
            
            let status = "REGULAR";
            if (dados.statusSistema) {
                status = dados.statusSistema.toUpperCase();
            }
            
            li.innerHTML = "<strong>" + username.toUpperCase() + "</strong> — Estado: [" + status + "]";
            
            li.addEventListener('click', () => {
                adminUsuarioAlvo.value = username;
                adminAcaoTipo.value = dados.statusSistema || "nenhuma";
                adminMotivoTexto.value = dados.motivoStatus || "";
            });
            
            listaUsuariosAdmin.appendChild(li);
        });
    } else {
        listaUsuariosAdmin.innerHTML = "<li class='item-utilizador-lista'>Nenhum utilizador encontrado no banco de dados.</li>";
    }
});

btnAplicarPunicao.addEventListener('click', async () => {
    const usuario = adminUsuarioAlvo.value.trim();
    const acao = adminAcaoTipo.value;
    const motivo = adminMotivoTexto.value.trim();

    if (!usuario) {
        alert("Selecione um utilizador da lista primeiro!");
        return;
    }

    try {
        const userRef = ref(db, 'usuarios/' + usuario);
        
        await update(userRef, {
            statusSistema: acao,
            motivoStatus: acao === "nenhuma" ? "" : motivo
        });

        alert("Moderação aplicada com sucesso para o utilizador " + usuario.toUpperCase() + "!");
        
        adminUsuarioAlvo.value = "";
        adminAcaoTipo.value = "nenhuma";
        adminMotivoTexto.value = "";
    } catch (e) {
        alert("Erro ao aplicar restrições no banco de dados.");
    }
});
