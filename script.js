import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://retroplaylist-bcf3b-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const telaLogin = document.getElementById('tela-login');
const inputUsuario = document.getElementById('login-usuario');
const inputSenha = document.getElementById('login-senha');
const btnEntrarSistema = document.getElementById('btn-entrar-sistema');

const inputArquivo = document.getElementById('importar-arquivo');
const player = document.getElementById('player-mp4');
const listaPlaylist = document.getElementById('lista-playlist');
const btnCriarSala = document.getElementById('btn-criar-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');
const inputCodigoConvite = document.getElementById('input-codigo-convite');
const codigoGeradoTxt = document.getElementById('codigo-gerado');
const caixaChat = document.getElementById('caixa-chat');
const inputMensagem = document.getElementById('input-mensagem');
const btnEnviarMensagem = document.getElementById('btn-enviar-mensagem');

let playlist = [];
let musicaAtualIndex = 0;
let salaAtual = null;
let nomeUsuarioLogado = null; 
const LIMITE_PESSOAS = 2;

btnEntrarSistema.addEventListener('click', async () => {
    const usuario = inputUsuario.value.trim().toLowerCase();
    const senha = inputSenha.value.trim();

    if (!usuario || !senha) {
        alert("Insira o usuário e a palavra-passe!");
        return;
    }

    try {
        const userRef = ref(db, 'usuarios/' + usuario);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const dadosUser = snapshot.val();
            if (dadosUser.senha === senha) {
                nomeUsuarioLogado = usuario.toUpperCase();
                telaLogin.classList.add('escondido');
                adicionarAvisoSistema("Bem-vindo de volta, " + nomeUsuarioLogado);
            } else {
                alert("Palavra-passe incorreta!");
            }
        } else {
            await set(userRef, { senha: senha });
            nomeUsuarioLogado = usuario.toUpperCase();
            telaLogin.classList.add('escondido');
            alert("Conta criada e registada no servidor com sucesso!");
            adicionarAvisoSistema("Nova conta ativa: " + nomeUsuarioLogado);
        }
    } catch (e) {
        alert("Erro de conexão com o servidor. Verifica as tuas regras do Firebase.");
        console.error(e);
    }
});

btnCriarSala.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;
    
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const idSala = "SALA-" + numeros;
    
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;
    
    adicionarAvisoSistema("A iniciar cache da sala " + idSala + " no servidor...");

    try {
        await set(ref(db, 'salas/' + idSala), { criador: nomeUsuarioLogado, quantidadePessoas: 1 });
        conectarAoChatEPlaylist(idSala);
    } catch (e) { 
        console.error(e);
    }
});

btnEntrarSala.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;
    
    let entrada = inputCodigoConvite.value.trim().toUpperCase();
    if (!entrada) return;

    if (!entrada.startsWith("SALA-")) {
        entrada = "SALA-" + entrada;
    }

    try {
        const snapshot = await get(ref(db, 'salas/' + entrada));
        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            if (dadosSala.quantidadePessoas >= LIMITE_PESSOAS) {
                alert("A playlist está cheia!");
                return;
            }
            
            salaAtual = entrada;
            codigoGeradoTxt.textContent = entrada;
            
            await set(ref(db, 'salas/' + entrada + '/quantidadePessoas'), (dadosSala.quantidadePessoas || 1) + 1);
            conectarAoChatEPlaylist(entrada);
            adicionarAvisoSistema("Conectado à sala: " + entrada);
        } else {
            alert("Esta sala não existe no servidor!");
        }
    } catch (e) { 
        alert("Erro ao procurar a sala.");
    }
});

function conectarAoChatEPlaylist(idSala) {
    playlist = [];
    listaPlaylist.innerHTML = '';
    caixaChat.innerHTML = '';

    onChildAdded(ref(db, 'salas/' + idSala + '/chat'), (snapshot) => {
        const dados = snapshot.val();
        if (dados.tipo === "sistema") {
            adicionarAvisoSistema(dados.texto);
        } else {
            adicionarMensagemNaTela(dados.usuario, dados.texto);
        }
    });

    onChildAdded(ref(db, 'salas/' + idSala + '/musicas'), (snapshot) => {
        const musica = snapshot.val();
        if (!playlist.some(m => m.nome === musica.nome)) {
            playlist.push(musica);
            atualizarInterfacePlaylist();
        }
    });
}

inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) return alert("Entra numa sala primeiro!");

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);
        const novaMusica = { nome: arquivo.name, url: urlBlob };

        if (!playlist.some(m => m.nome === novaMusica.nome)) {
            playlist.push(novaMusica);
            atualizarInterfacePlaylist();
        }

        push(ref(db, 'salas/' + salaAtual + '/musicas'), novaMusica);
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "sistema",
            texto: "[" + nomeUsuarioLogado + "] adicionou a faixa: " + arquivo.name
        });
    }
});

function atualizarInterfacePlaylist() {
    listaPlaylist.innerHTML = ''; 
    playlist.forEach((musica, index) => {
        const item = document.createElement('li');
        item.textContent = musica.nome;
        item.classList.add('item-musica');
        item.addEventListener('click', () => tocarMusica(index));
        listaPlaylist.appendChild(item);
    });
}

function tocarMusica(index) {
    if (index >= 0 && index < playlist.length) {
        musicaAtualIndex = index;
        player.src = playlist[index].url;
        player.play().catch(() => {});
    }
}

btnEnviarMensagem.addEventListener('click', enviarMensagemDoInput);
inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemDoInput(); });

function enviarMensagemDoInput() {
    const texto = inputMensagem.value.trim();
    if (!texto || !salaAtual) return;

    push(ref(db, 'salas/' + salaAtual + '/chat'), {
        tipo: "usuario",
        usuario: nomeUsuarioLogado,
        texto: texto
    });
    inputMensagem.value = '';
}

function adicionarMensagemNaTela(usuario, texto) {
    const p = document.createElement('p');
    p.classList.add('mensagem');
    p.innerHTML = "<strong>" + usuario + ":</strong> " + texto;
    caixaChat.appendChild(p);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}

function adicionarAvisoSistema(texto) {
    const div = document.createElement('div');
    div.classList.add('sistema-aviso');
    div.textContent = "[SISTEMA] " + texto;
    caixaChat.appendChild(div);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}

player.addEventListener('ended', () => {
    if (musicaAtualIndex + 1 < playlist.length) { tocarMusica(musicaAtualIndex + 1); }
});
