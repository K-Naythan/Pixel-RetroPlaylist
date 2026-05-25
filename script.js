import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded, onValue, get, update, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const painelBiblioteca = document.getElementById('painel-biblioteca');
const btnAbrirBiblioteca = document.getElementById('btn-abrir-biblioteca');
const btnFecharBiblioteca = document.getElementById('btn-fechar-biblioteca');

const painelHistorico = document.getElementById('painel-historico');
const btnAbrirHistorico = document.getElementById('btn-abrir-historico');
const btnFecharHistorico = document.getElementById('btn-fechar-historico');
const listaSalasHistorico = document.getElementById('lista-salas-historico');

let bibliotecaArquivosLocais = {};
let playlistOrdenada = [];
let salaAtual = null;
let nomeUsuarioLogado = null; 
const LIMITE_PESSOAS = 8;

function carregarCacheLocal() {
    try {
        const cacheSalva = localStorage.getItem('retro_playlist_cache');
        if (cacheSalva) {
            bibliotecaArquivosLocais = JSON.parse(cacheSalva);
        }
    } catch (e) {
        console.error(e);
    }
}

function salvarCacheLocal() {
    localStorage.setItem('retro_playlist_cache', JSON.stringify(bibliotecaArquivosLocais));
}

carregarCacheLocal();

btnAbrirBiblioteca.addEventListener('click', () => {
    painelBiblioteca.classList.remove('escondida');
});

btnFecharBiblioteca.addEventListener('click', () => {
    painelBiblioteca.classList.add('escondida');
});

btnAbrirHistorico.addEventListener('click', () => {
    painelHistorico.classList.remove('escondida');
    ouvirHistoricoSalas();
});

btnFecharHistorico.addEventListener('click', () => {
    painelHistorico.classList.add('escondida');
});

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
                ouvirHistoricoSalas();
            } else {
                alert("Palavra-passe incorreta!");
            }
        } else {
            await set(userRef, { senha: senha });
            nomeUsuarioLogado = usuario.toUpperCase();
            telaLogin.classList.add('escondido');
            alert("Conta criada e registada no servidor com sucesso!");
            adicionarAvisoSistema("Nova conta ativa: " + nomeUsuarioLogado);
            ouvirHistoricoSalas();
        }
    } catch (e) {
        alert("Erro de conexão com o servidor.");
    }
});

function ouvirHistoricoSalas() {
    if (!nomeUsuarioLogado) return;

    onValue(ref(db, 'salas'), (snapshot) => {
        listaSalasHistorico.innerHTML = '';
        let encontrouSalas = false;

        if (snapshot.exists()) {
            const salas = snapshot.val();
            Object.keys(salas).forEach(idSala => {
                const sala = salas[idSala];
                const participantes = sala.participantes ? Object.keys(sala.participantes) : [];
                
                const pertenceASala = sala.criador === nomeUsuarioLogado || participantes.includes(nomeUsuarioLogado);
                const salaAtiva = sala.quantidadePessoas > 0 && participantes.length > 0;

                if (pertenceASala && salaAtiva) {
                    encontrouSalas = true;
                    const div = document.createElement('div');
                    div.classList.add('item-sala-historico');
                    div.innerHTML = "<strong>Sala:</strong> " + idSala + "<br>" +
                                    "<strong>Criador:</strong> " + sala.criador + "<br>" +
                                    "<strong>Usuários (" + sala.quantidadePessoas + "/" + LIMITE_PESSOAS + "):</strong> " + participantes.join(', ');
                    listaSalasHistorico.appendChild(div);
                }
            });
        }

        if (!encontrouSalas) {
            listaSalasHistorico.innerHTML = "<p style='font-size:12px;'>Não estás vinculado a nenhuma sala ativa no momento.</p>";
        }
    });
}

async function sairDaSalaAtual() {
    if (!salaAtual || !nomeUsuarioLogado) return;

    try {
        const salaRef = ref(db, 'salas/' + salaAtual);
        const snapshot = await get(salaRef);

        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            const participantes = dadosSala.participantes || {};
            
            if (participantes[nomeUsuarioLogado]) {
                delete participantes[nomeUsuarioLogado];
                
                let novasPessoas = (dadosSala.quantidadePessoas || 1) - 1;
                if (novasPessoas < 0) novasPessoas = 0;

                if (novasPessoas === 0) {
                    await set(salaRef, null);
                } else {
                    await update(salaRef, {
                        quantidadePessoas: novasPessoas,
                        participantes: participantes
                    });
                    
                    push(ref(db, 'salas/' + salaAtual + '/chat'), {
                        tipo: "sistema",
                        texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " abandonou a sala."
                    });
                }
            }
        }
    } catch (e) {
        console.error(e);
    }

    salaAtual = null;
    codigoGeradoTxt.textContent = "-";
    listaPlaylist.innerHTML = '';
    caixaChat.innerHTML = '';
    playlistOrdenada = [];
}

btnCriarSala.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;
    
    if (salaAtual) {
        await sairDaSalaAtual();
    }
    
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const idSala = "SALA-" + numeros;
    
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;

    try {
        const salaRef = ref(db, 'salas/' + idSala);
        
        await set(salaRef, { 
            criador: nomeUsuarioLogado, 
            quantidadePessoas: 1,
            participantes: { [nomeUsuarioLogado]: true },
            comandoPlayer: { acao: "parado", nomeMusica: "", enviadoPor: "" }
        });

        configurarPresencaOnDisconnect(idSala);
        conectarAoChatEPlaylist(idSala);
        
        push(ref(db, 'salas/' + idSala + '/chat'), {
            tipo: "sistema",
            texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " iniciou a sessão na sala."
        });
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

    if (salaAtual === entrada) {
        alert("Já estás dentro desta sala!");
        return;
    }

    if (salaAtual) {
        await sairDaSalaAtual();
    }

    try {
        const salaRef = ref(db, 'salas/' + entrada);
        const snapshot = await get(salaRef);
        
        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            const participantes = dadosSala.participantes || {};
            
            if (!participantes[nomeUsuarioLogado] && dadosSala.quantidadePessoas >= LIMITE_PESSOAS) {
                alert("A playlist está cheia! Limite de 8 usuários atingido.");
                return;
            }
            
            salaAtual = entrada;
            codigoGeradoTxt.textContent = entrada;
            
            if (!participantes[nomeUsuarioLogado]) {
                participantes[nomeUsuarioLogado] = true;
                const novasPessoas = dadosSala.quantidadePessoas + 1;
                await update(salaRef, { 
                    quantidadePessoas: novasPessoas,
                    participantes: participantes
                });
            }
            
            configurarPresencaOnDisconnect(entrada);
            conectarAoChatEPlaylist(entrada);
            
            push(ref(db, 'salas/' + entrada + '/chat'), {
                tipo: "sistema",
                texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " entrou na playlist."
            });
        } else {
            alert("Esta sala não existe no servidor!");
        }
    } catch (e) { 
        alert("Erro ao procurar a sala.");
    }
});

function configurarPresencaOnDisconnect(idSala) {
    const participanteRef = ref(db, 'salas/' + idSala + '/participantes/' + nomeUsuarioLogado);
    onDisconnect(participanteRef).remove();
}

function conectarAoChatEPlaylist(idSala) {
    playlistOrdenada = [];
    listaPlaylist.innerHTML = '';
    caixaChat.innerHTML = '';

    const salaRef = ref(db, 'salas/' + idSala);
    get(salaRef).then((snapshot) => {
        if (snapshot.exists()) {
            const dados = snapshot.val();
            if (dados.musicas) {
                Object.keys(dados.musicas).forEach(key => {
                    const musica = dados.musicas[key];
                    if (!playlistOrdenada.some(m => m.nome === musica.nome)) {
                        playlistOrdenada.push(musica);
                    }
                });
                atualizarInterfaceBiblioteca();
            }
        }
    });

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
        if (!playlistOrdenada.some(m => m.nome === musica.nome)) {
            playlistOrdenada.push(musica);
            atualizarInterfaceBiblioteca();
        }
    });

    onValue(ref(db, 'salas/' + idSala + '/comandoPlayer'), (snapshot) => {
        const comando = snapshot.val();
        if (!comando || comando.enviadoPor === nomeUsuarioLogado) return;

        if (comando.acao === "play") {
            const arquivoLocal = bibliotecaArquivosLocais[comando.nomeMusica];
            if (arquivoLocal) {
                player.src = arquivoLocal.url;
                player.play().catch(() => {});
            } else {
                adicionarAvisoSistema("[AVISO] " + comando.enviadoPor + " deu play em '" + comando.nomeMusica + "', mas tu precisas carregar essa mídia no teu botão para sincronizar!");
                atualizarInterfaceBiblioteca();
            }
        }
    });
}

inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) return alert("Entra numa sala primeiro!");

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);
        
        bibliotecaArquivosLocais[arquivo.name] = { nome: arquivo.name, url: urlBlob };

        push(ref(db, 'salas/' + salaAtual + '/musicas'), { nome: arquivo.name });
        
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "sistema",
            texto: "[SISTEMA] " + nomeUsuarioLogado + " adicionou a mídia: " + arquivo.name
        });
    }
    salvarCacheLocal();
    atualizarInterfaceBiblioteca();
});

function atualizarInterfaceBiblioteca() {
    listaPlaylist.innerHTML = ''; 
    playlistOrdenada.forEach((musica) => {
        const item = document.createElement('li');
        item.textContent = musica.nome;
        item.classList.add('item-musica');
        
        if (bibliotecaArquivosLocais[musica.nome]) {
            item.style.borderLeft = "4px solid #00ff00";
            item.style.paddingLeft = "5px";
        } else {
            item.style.borderLeft = "4px solid #ff0000";
            item.style.paddingLeft = "5px";
        }

        item.addEventListener('click', () => forcarReproducaoSincronizada(musica.nome));
        listaPlaylist.appendChild(item);
    });
}

function forcarReproducaoSincronizada(nomeMusica) {
    const arquivoLocal = bibliotecaArquivosLocais[nomeMusica];
    
    if (!arquivoLocal) {
        alert("Carrega o arquivo '" + nomeMusica + "' primeiro para ouvirem juntos!");
        return;
    }

    player.src = arquivoLocal.url;
    player.play().catch(() => {});

    set(ref(db, 'salas/' + salaAtual + '/comandoPlayer'), {
        acao: "play",
        nomeMusica: nomeMusica,
        enviadoPor: nomeUsuarioLogado
    });

    push(ref(db, 'salas/' + salaAtual + '/chat'), {
        tipo: "sistema",
        texto: "[SISTEMA] " + nomeUsuarioLogado + " escolheu para ouvir: " + nomeMusica
    });
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
    div.textContent = texto;
    caixaChat.appendChild(div);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}
