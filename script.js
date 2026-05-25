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
    console.error("Erro ao iniciar Firebase, rodando em modo offline:", erro);
}

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
const LIMITE_PESSOAS = 2;

// 1. CRIAR SALA (BLINDADO COM FALLBACK LOCAL)
btnCriarSala.addEventListener('click', async () => {
    const idSala = "SALA-" + Math.floor(1000 + Math.random() * 9000);
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;
    
    adicionarAvisoSistema("Criando sala " + idSala + "...");

    if (db) {
        try {
            await set(ref(db, 'salas/' + idSala), {
                criador: true,
                quantidadePessoas: 1
            });
            conectarAoChatEPlaylist(idSala);
        } catch (e) {
            adicionarAvisoSistema("Aviso: Sem conexão com o servidor. Rodando local.");
        }
    } else {
        adicionarAvisoSistema("Modo offline ativo. Sala criada no dispositivo.");
    }
});

// 2. ENTRAR NA SALA (BLINDADO)
btnEntrarSala.addEventListener('click', async () => {
    const idSala = inputCodigoConvite.value.trim().toUpperCase();
    if (!idSala) return;

    if (!db) {
        alert("Sem conexão com o servidor para buscar salas online.");
        return;
    }

    try {
        const snapshot = await get(ref(db, 'salas/' + idSala));
        
        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            
            if (dadosSala.quantidadePessoas >= LIMITE_PESSOAS) {
                alert("A playlist está cheia! Limite de " + LIMITE_PESSOAS + " pessoas.");
                return;
            }

            salaAtual = idSala;
            codigoGeradoTxt.textContent = idSala;

            await set(ref(db, 'salas/' + idSala + '/quantidadePessoas'), (dadosSala.quantidadePessoas || 1) + 1);
            conectarAoChatEPlaylist(idSala);
            adicionarAvisoSistema("Conectado com sucesso à sala online!");
        } else {
            alert("Código de playlist não encontrado.");
        }
    } catch (e) {
        alert("Erro ao tentar conectar. Verifique sua rede.");
    }
});

// 3. CONEXÃO EM TEMPO REAL (PROTEGIDA)
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
            // Evita duplicar músicas que já estão na lista local
            if (!playlist.some(m => m.nome === musica.nome)) {
                playlist.push(musica);
                atualizarInterfacePlaylist();
            }
        });
    } catch (e) {
        console.error("Erro nas escutas em tempo real:", e);
    }
}

// 4. IMPORTAR MP4 (BLINDADO)
inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) {
        alert("Crie ou entre em uma playlist primeiro!");
        return;
    }

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);
        const novaMusica = { nome: arquivo.name, url: urlBlob };

        // Adiciona local imediatamente para não travar a experiência do usuário
        if (!playlist.some(m => m.nome === novaMusica.nome)) {
            playlist.push(novaMusica);
            atualizarInterfacePlaylist();
        }

        // Tenta sincronizar com o banco se ele estiver disponível
        if (db) {
            push(ref(db, 'salas/' + salaAtual + '/musicas'), novaMusica).catch(e => console.log("Erro ao sincronizar música."));
            push(ref(db, 'salas/' + salaAtual + '/chat'), {
                tipo: "sistema",
                texto: "A música '" + arquivo.name + "' foi adicionada!"
            }).catch(e => console.log("Erro ao enviar aviso."));
        } else {
            adicionarAvisoSistema("A música '" + arquivo.name + "' foi adicionada localmente.");
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
        player.play().catch(e => console.log("Erro ao dar play automático (necessita interação do usuário)."));
    }
}

// 5. CHAT (BLINDADO)
btnEnviarMensagem.addEventListener('click', enviarMensagemDoInput);
inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemDoInput(); });

function enviarMensagemDoInput() {
    const texto = inputMensagem.value.trim();
    if (!texto || !salaAtual) return;

    if (db) {
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "usuario",
            usuario: "Usuário",
            texto: texto
        }).catch(e => {
            adicionarMensagemNaTela("Você (Local)", texto);
        });
    } else {
        adicionarMensagemNaTela("Você (Offline)", texto);
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
