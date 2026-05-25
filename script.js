import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    databaseURL: "https://playlist-retro-default-rtdb.firebaseio.com"
};

let app, db;
try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
} catch (erro) { 
    console.error("Erro Firebase, rodando em modo offline:", erro); 
}

// ELEMENTOS DE LOGIN
const telaLogin = document.getElementById('tela-login');
const inputUsuario = document.getElementById('login-usuario');
const inputSenha = document.getElementById('login-senha');
const btnEntrarSistema = document.getElementById('btn-entrar-sistema');

// ELEMENTOS DO APP
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

// 1. SISTEMA DE LOGIN E CADASTRO AUTOMÁTICO
btnEntrarSistema.addEventListener('click', async () => {
    const usuario = inputUsuario.value.trim().toLowerCase();
    const senha = inputSenha.value.trim();

    if (!usuario || !senha) {
        alert("Insira o usuário e a palavra-passe!");
        return;
    }

    if (!db) {
        nomeUsuarioLogado = usuario.toUpperCase();
        telaLogin.classList.add('escondido');
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
            alert("Conta criada com sucesso!");
            adicionarAvisoSistema("Nova conta ativa: " + nomeUsuarioLogado);
        }
    } catch (e) {
        nomeUsuarioLogado = usuario.toUpperCase();
        telaLogin.classList.add('escondido');
    }
});

// 2. CRIAR SALA (PADRÃO EXCLUSIVO: SALA-####)
btnCriarSala.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;
    
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const idSala = "SALA-" + numeros;
    
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;
    
    adicionarAvisoSistema("Criando sala online " + idSala + "...");

    if (db) {
        try {
            await set(ref(db, 'salas/' + idSala), { criador: nomeUsuarioLogado, quantidadePessoas: 1 });
            conectarAoChatEPlaylist(idSala);
        } catch (e) { 
            adicionarAvisoSistema("Sala criada localmente (Offline)."); 
        }
    }
});

// 3. ENTRAR NA SALA (CORRIGE ENTRADAS SEM "SALA-")
btnEntrarSala.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;
    
    let entrada = inputCodigoConvite.value.trim().toUpperCase();
    if (!entrada) return;

    // Se o usuário digitar apenas os números, o app monta o prefixo automaticamente
    if (!entrada.startsWith("SALA-")) {
        entrada = "SALA-" + entrada;
    }

    salaAtual = entrada;
    codigoGeradoTxt.textContent = entrada;

    if (db) {
        try {
            const snapshot = await get(ref(db, 'salas/' + entrada));
            if (snapshot.exists()) {
                const dadosSala = snapshot.val();
                if (dadosSala.quantidadePessoas >= LIMITE_PESSOAS) {
                    alert("A playlist está cheia! Limite: " + LIMITE_PESSOAS + " pessoas.");
                    return;
                }
                await set(ref(db, 'salas/' + entrada + '/quantidadePessoas'), (dadosSala.quantidadePessoas || 1) + 1);
            }
        } catch (e) { 
            console.log("Modo local ou erro de rede."); 
        }
    }
    conectarAoChatEPlaylist(entrada);
    adicionarAvisoSistema("Conectado com sucesso à sala " + entrada);
});

// 4. ESCUTAS EM TEMPO REAL
function conectarAoChatEPlaylist(idSala) {
    if (!db) return;
    try {
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
    } catch (e) { 
        console.error("Erro escutas:", e); 
    }
}

// 5. CARREGAR ARQUIVOS (MP3 E MP4)
inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) { 
        alert("Crie ou entre em uma sala primeiro!"); 
        return; 
    }

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);
        const novaMusica = { nome: arquivo.name, url: urlBlob };

        if (!playlist.some(m => m.nome === novaMusica.nome)) {
            playlist.push(novaMusica);
            atualizarInterfacePlaylist();
        }

        if (db) {
            push(ref(db, 'salas/' + salaAtual + '/musicas'), novaMusica);
            push(ref(db, 'salas/' + salaAtual + '/chat'), {
                tipo: "sistema",
                texto: "[" + nomeUsuarioLogado + "] adicionou a faixa: " + arquivo.name
            });
        }
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

// 6. CHAT COLETIVO
btnEnviarMensagem.addEventListener('click', enviarMensagemDoInput);
inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemDoInput(); });

function enviarMensagemDoInput() {
    const texto = inputMensagem.value.trim();
    if (!texto || !salaAtual) return;

    if (db) {
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "usuario",
            usuario: nomeUsuarioLogado,
            texto: texto
        });
    } else {
        adicionarMensagemNaTela(nomeUsuarioLogado + " (Offline)", texto);
    }
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
