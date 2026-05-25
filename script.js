import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, onChildAdded, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// CONFIGURAÇÃO DO BANCO DE DADOS (Provisório para rodar)
const firebaseConfig = {
    databaseURL: "https://playlist-retro-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// SELEÇÃO DE ELEMENTOS DA TELA
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
const LIMITE_PESSOAS = 2; // Limite que você pediu

// 1. FUNÇÃO PARA CRIAR CÓDIGO DE CONVITE
btnCriarSala.addEventListener('click', () => {
    const idSala = "SALA-" + Math.floor(1000 + Math.random() * 9000);
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;

    set(ref(db, 'salas/' + idSala), {
        criador: true,
        quantidadePessoas: 1
    });

    conectarAoChatEPlaylist(idSala);
    adicionarAvisoSistema("Você criou a playlist " + idSala);
});

// 2. FUNÇÃO PARA ENTRAR COM CÓDIGO DE CONVITE
btnEntrarSala.addEventListener('click', async () => {
    const idSala = inputCodigoConvite.value.trim().toUpperCase();
    if (!idSala) return;

    const snapshot = await get(ref(db, 'salas/' + idSala));
    
    if (snapshot.exists()) {
        const dadosSala = snapshot.val();
        
        // Verifica o limite de pessoas
        if (dadosSala.quantidadePessoas >= LIMITE_PESSOAS) {
            alert("A playlist está cheia! Limite de " + LIMITE_PESSOAS + " pessoas.");
            return;
        }

        salaAtual = idSala;
        codigoGeradoTxt.textContent = idSala;

        // Atualiza contador de pessoas na sala
        set(ref(db, 'salas/' + idSala + '/quantidadePessoas'), dadosSala.quantidadePessoas + 1);

        conectarAoChatEPlaylist(idSala);
        adicionarAvisoSistema("Você entrou na playlist compartilhada!");
    } else {
        alert("Código de playlist inválido!");
    }
});

// 3. CONECTAR CHAT E PLAYLIST EM TEMPO REAL
function conectarAoChatEPlaylist(idSala) {
    // Escuta novas mensagens do chat
    onChildAdded(ref(db, 'salas/' + idSala + '/chat'), (snapshot) => {
        const dados = snapshot.val();
        if (dados.tipo === "sistema") {
            adicionarAvisoSistema(dados.texto);
        } else {
            adicionarMensagemNaTela(dados.usuario, dados.texto);
        }
    });

    // Escuta novas músicas adicionadas na playlist por qualquer um dos dois
    onChildAdded(ref(db, 'salas/' + idSala + '/musicas'), (snapshot) => {
        const musica = snapshot.val();
        playlist.push(musica);
        atualizarInterfacePlaylist();
    });
}

// 4. LOGICA DE IMPORTAR E MANDAR PRO BANCO
inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) {
        alert("Crie ou entre em uma playlist primeiro usando o código!");
        return;
    }

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);

        const novaMusica = {
            nome: arquivo.name,
            url: urlBlob
        };

        // Salva no banco de dados para o outro celular ver
        push(ref(db, 'salas/' + salaAtual + '/musicas'), novaMusica);

        // Envia aviso automático no chat
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "sistema",
            texto: "A música '" + arquivo.name + "' foi adicionada à playlist!"
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
    musicaAtualIndex = index;
    player.src = playlist[index].url;
    player.play();
}

// 5. ENVIAR MENSAGEM NO CHAT
btnEnviarMensagem.addEventListener('click', enviarMensagemDoInput);
inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemDoInput(); });

function enviarMensagemDoInput() {
    const texto = inputMensagem.value.trim();
    if (!texto || !salaAtual) return;

    push(ref(db, 'salas/' + salaAtual + '/chat'), {
        tipo: "usuario",
        usuario: "Usuário",
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
    if (musicaAtualIndex + 1 < playlist.length) {
        tocarMusica(musicaAtualIndex + 1);
    }
});
