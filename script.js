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

const selectTipoSala = document.getElementById('select-tipo-sala');

let bibliotecaArquivosLocais = {};
let playlistOrdenada = [];
let salaAtual = null;
let nomeUsuarioLogado = null; 
const LIMITE_PESSOAS = 8;

function carregarCacheLocal() {
    try {
        const cacheSalva = localStorage.getItem('pixel_retro_playlist_cache');
        if (cacheSalva) {
            bibliotecaArquivosLocais = JSON.parse(cacheSalva);
        }
    } catch (e) {
        console.error(e);
    }
}

function salvarCacheLocal() {
    localStorage.setItem('pixel_retro_playlist_cache', JSON.stringify(bibliotecaArquivosLocais));
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
            
            if (dadosUser.statusSistema === "banimento") {
                alert("Esta conta foi BANIDA do Pixel-RetroPlaylist.\n\nMotivo: " + (dadosUser.motivoStatus || "Violação dos termos."));
                return;
            }

            if (dadosUser.senha === senha) {
                nomeUsuarioLogado = usuario.toUpperCase();
                telaLogin.classList.add('escondido');
                adicionarAvisoSistema("Bem-vindo ao Pixel-RetroPlaylist, " + nomeUsuarioLogado);
                
                if (dadosUser.statusSistema === "aviso") {
                    setTimeout(() => {
                        alert("AVISO DE INFRAÇÃO:\n\nSua conta possui um aviso ativo.\nMotivo: " + (dadosUser.motivoStatus || "Comportamento inadequado."));
                        adicionarAvisoSistema("[ALERTA DE SEGURANÇA] Conta sob aviso formal de moderação.");
                    }, 1000);
                }
                
                ouvirHistoricoSalas();
            } else {
                alert("Palavra-passe incorreta!");
            }
        } else {
            await set(userRef, { 
                senha: senha,
                statusSistema: "nenhuma",
                motivoStatus: ""
            });
            nomeUsuarioLogado = usuario.toUpperCase();
            telaLogin.classList.add('escondido');
            alert("Conta criada com sucesso no Pixel-RetroPlaylist!");
            adicionarAvisoSistema("Nova conta activa: " + nomeUsuarioLogado);
            ouvirHistoricoSalas();
        }
    } catch (e) {
        alert("Erro de conexão com o servidor do Pixel-RetroPlaylist.");
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
                if (!sala) return;

                const participantes = sala.participantes ? Object.keys(sala.participantes) : [];
                const pertenceASala = sala.criador === nomeUsuarioLogado || participantes.includes(nomeUsuarioLogado);
                const ehPublica = sala.tipoExibicao === "publica";
                const salaAtiva = (sala.quantidadePessoas >= 0);

                if ((pertenceASala || ehPublica) && salaAtiva) {
                    encontrouSalas = true;
                    const div = document.createElement('div');
                    div.classList.add('item-sala-historico');
                    div.style.position = "relative";
                    div.style.marginBottom = "10px";
                    div.style.padding = "10px";
                    div.style.border = ehPublica && !pertenceASala ? "2px dashed #00ff00" : "1px solid #808080";
                    
                    let htmlBotaoEliminar = "";
                    if (sala.criador === nomeUsuarioLogado) {
                        htmlBotaoEliminar = "<button class='botao-retro btn-eliminar-sala-remota' data-sala='" + idSala + "' style='position: absolute; right: 5px; top: 5px; padding: 2px 6px; font-size: 10px; cursor: pointer;'>Eliminar</button>";
                    }

                    let etiquetaTipo = ehPublica ? " <span style='color:#008000; font-weight:bold;'>[PÚBLICA]</span>" : " <span style='color:#a06000; font-weight:bold;'>[PRIVADA]</span>";

                    div.innerHTML = htmlBotaoEliminar +
                                    "<strong>Sala:</strong> " + idSala + etiquetaTipo + "<br>" +
                                    "<strong>Dono:</strong> " + sala.criador + "<br>" +
                                    "<strong>Ocupação (" + sala.quantidadePessoas + "/" + LIMITE_PESSOAS + "):</strong> " + participantes.join(', ');
                    
                    if (!pertenceASala && ehPublica) {
                        div.style.cursor = "pointer";
                        div.addEventListener('click', (e) => {
                            if (!e.target.classList.contains('btn-eliminar-sala-remota')) {
                                inputCodigoConvite.value = idSala;
                                btnEntrarSala.click();
                            }
                        });
                    }

                    listaSalasHistorico.appendChild(div);
                }
            });

            const botoesEliminar = document.querySelectorAll('.btn-eliminar-sala-remota');
            botoesEliminar.forEach(botao => {
                botao.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idSalaParaDeletar = e.target.getAttribute('data-sala');
                    if (confirm("Tens certeza que desejas eliminar a " + idSalaParaDeletar + " remotamente?")) {
                        await eliminarSalaRemotamente(idSalaParaDeletar);
                    }
                });
            });
        }

        if (!encontrouSalas) {
            listaSalasHistorico.innerHTML = "<p style='font-size:12px; color:#555;'>Nenhuma sala pública disponível no momento.</p>";
        }
    });
}

async function eliminarSalaRemotamente(idSala) {
    try {
        await set(ref(db, 'salas/' + idSala), null);
        if (salaAtual === idSala) {
            salaAtual = null;
            codigoGeradoTxt.textContent = "-";
            listaPlaylist.innerHTML = '';
            caixaChat.innerHTML = '';
            playlistOrdenada = [];
            alert("A sala em que estavas foi removida do servidor principal.");
        } else {
            alert("A sala " + idSala + " foi removida com sucesso!");
        }
    } catch (e) {
        alert("Erro ao tentar remover a sala.");
    }
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

                await update(salaRef, {
                    quantidadePessoas: novasPessoas,
                    participantes: participantes
                });
                
                push(ref(db, 'salas/' + salaAtual + '/chat'), {
                    tipo: "sistema",
                    texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " desconectou-se da sala."
                });
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
    
    const tipoVisibilidade = selectTipoSala ? selectTipoSala.value : "privada";
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const idSala = "SALA-" + numeros;
    
    salaAtual = idSala;
    codigoGeradoTxt.textContent = idSala;

    try {
        const salaRef = ref(db, 'salas/' + idSala);
        await set(salaRef, { 
            criador: nomeUsuarioLogado, 
            quantidadePessoas: 1,
            tipoExibicao: tipoVisibilidade,
            participantes: { [nomeUsuarioLogado]: true },
            comandoPlayer: { acao: "parado", nomeMusica: "", enviadoPor: "" }
        });

        configurarPresencaOnDisconnect(idSala);
        conectarAoChatEPlaylist(idSala);
        
        push(ref(db, 'salas/' + idSala + '/chat'), {
            tipo: "sistema",
            texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " abriu o servidor local."
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
            let novasPessoas = dadosSala.quantidadePessoas || 0;

            if (!participantes[nomeUsuarioLogado]) {
                if (novasPessoas >= LIMITE_PESSOAS) {
                    alert("Sala cheia! Limite de 8 utilizadores atingido.");
                    return;
                }
                participantes[nomeUsuarioLogado] = true;
                novasPessoas = novasPessoas + 1;
            }
            
            salaAtual = entrada;
            codigoGeradoTxt.textContent = entrada;

            await update(salaRef, { 
                quantidadePessoas: novasPessoas,
                participantes: participantes
            });
            
            configurarPresencaOnDisconnect(entrada);
            conectarAoChatEPlaylist(entrada);
            
            push(ref(db, 'salas/' + entrada + '/chat'), {
                tipo: "sistema",
                texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " conectou-se à playlist."
            });
        } else {
            alert("Esta sala não foi encontrada no Pixel-RetroPlaylist!");
        }
    } catch (e) { 
        alert("Erro ao sincronizar com a sala.");
    }
});

function configurarPresencaOnDisconnect(idSala) {
    const salaRef = ref(db, 'salas/' + idSala);
    get(salaRef).then((snapshot) => {
        if (snapshot.exists()) {
            const dados = snapshot.val();
            let futurasPessoas = (dados.quantidadePessoas || 1) - 1;
            if (futurasPessoas < 0) futurasPessoas = 0;

            const participantes = dados.participantes || {};
            if (participantes[nomeUsuarioLogado]) {
                delete participantes[nomeUsuarioLogado];
            }

            onDisconnect(salaRef).update({
                quantidadePessoas: futurasPessoas,
                participantes: participantes
            });
        }
    });
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
                adicionarAvisoSistema("[AVISO] " + comando.enviadoPor + " reproduziu '" + comando.nomeMusica + "', mas precisas carregar este arquivo para sincronizar!");
                atualizarInterfaceBiblioteca();
            }
        }
    });
}

inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;
    if (!salaAtual) return alert("Conecta-te a uma sala primeiro!");

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);
        
        bibliotecaArquivosLocais[arquivo.name] = { nome: arquivo.name, url: urlBlob };
        push(ref(db, 'salas/' + salaAtual + '/musicas'), { nome: arquivo.name });
        
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            tipo: "sistema",
            texto: "[SISTEMA] " + nomeUsuarioLogado + " carregou a mídia: " + arquivo.name
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
        texto: "[SISTEMA] " + nomeUsuarioLogado + " iniciou a faixa: " + nomeMusica
    });
}

btnEnviarMensagem.addEventListener('click', enviarMensagemDoInput);
inputMensagem.addEventListener('keypress', (e) => { if (e.key === 'Enter') enviarMensagemDoInput(); });

function enviarMensagemDoInput() {
    const texto = inputMensagem.value.trim();
    if (!texto || !salaAtual) return;

    if (texto === "/admin-painel") {
        inputMensagem.value = '';
        window.location.href = "admin.html";
        return;
    }

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
    
    if (usuario !== nomeUsuarioLogado) {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            
            osc.type = "sine"; 
            osc.frequency.setValueAtTime(580, audioCtx.currentTime); 
            
            osc.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.045); 
        } catch (e) {
            console.warn("AudioContext não suportado no navegador atual.");
        }
    }
}

function adicionarAvisoSistema(texto) {
    const div = document.createElement('div');
    div.classList.add('sistema-aviso');
    div.textContent = texto;
    caixaChat.appendChild(div);
    caixaChat.scrollTop = caixaChat.scrollHeight;
        }
