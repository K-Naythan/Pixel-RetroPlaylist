import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, push, onChildAdded, onValue, get, update, onDisconnect } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuração completa do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAlmEQTnQM6UCMQbDBXkv-yeZVExqvuBtA",
  authDomain: "retro-play-list.firebaseapp.com",
  projectId: "retro-play-list",
  storageBucket: "retro-play-list.firebasestorage.app",
  messagingSenderId: "275741375910",
  appId: "1:275741375910:web:5af396a0d9ae84b4dce367",
  databaseURL: "https://retroplaylist-bcf3b-default-rtdb.firebaseio.com/"
};

// Inicialização dos serviços do Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provedorGoogle = new GoogleAuthProvider();

// Elementos da interface
const telaLogin = document.getElementById('tela-login');
const telaTermos = document.getElementById('tela-termos');
const btnAceitarTermos = document.getElementById('btn-aceitar-termos');

const formAutenticacao = document.getElementById('form-autenticacao');
const authFeedback = document.getElementById('auth-feedback');
const btnAbaLogin = document.getElementById('btn-aba-login');
const btnAbaRegistro = document.getElementById('btn-aba-registro');
const containerUsuario = document.getElementById('container-usuario');
const containerEmail = document.getElementById('container-email');
const inputEmail = document.getElementById('login-email');

const inputUsuario = document.getElementById('login-usuario');
const inputSenha = document.getElementById('login-senha');
const btnEntrarSistema = document.getElementById('btn-entrar-sistema');
const btnGoogleLogin = document.getElementById('btn-google-login');

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
let modoAtual = "login";
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

btnAbrirBiblioteca.addEventListener('click', () => { painelBiblioteca.classList.remove('escondida'); });
btnFecharBiblioteca.addEventListener('click', () => { painelBiblioteca.classList.add('escondida'); });

btnAbrirHistorico.addEventListener('click', () => {
    painelHistorico.classList.remove('escondida');
    ouvirHistoricoSalas();
});
btnFecharHistorico.addEventListener('click', () => { painelHistorico.classList.add('escondida'); });

btnAbaLogin.addEventListener('click', () => {
    definirModoAutenticacao("login");
});

btnAbaRegistro.addEventListener('click', () => {
    definirModoAutenticacao("registro");
});

function definirModoAutenticacao(modo) {
    modoAtual = modo;
    const estaARegistar = modo === "registro";

    btnAbaLogin.setAttribute('aria-pressed', String(!estaARegistar));
    btnAbaRegistro.setAttribute('aria-pressed', String(estaARegistar));
    btnAbaLogin.style.background = estaARegistar ? "#c0c0c0" : "#e0e0e0";
    btnAbaRegistro.style.background = estaARegistar ? "#e0e0e0" : "#c0c0c0";
    btnAbaLogin.style.fontWeight = estaARegistar ? "normal" : "bold";
    btnAbaRegistro.style.fontWeight = estaARegistar ? "bold" : "normal";
    
    // Mostra o nome de utilizador apenas ao criar conta
    containerUsuario.classList.toggle('escondido', !estaARegistar);
    inputUsuario.required = estaARegistar;

    inputEmail.required = true;
    inputSenha.autocomplete = estaARegistar ? "new-password" : "current-password";
    inputSenha.minLength = estaARegistar ? 6 : -1;
    btnEntrarSistema.textContent = estaARegistar ? "Criar conta" : "Iniciar sessão";
    limparMensagemAutenticacao();
}

function mostrarMensagemAutenticacao(mensagem, tipo = "erro") {
    authFeedback.textContent = mensagem;
    authFeedback.dataset.tipo = tipo;
    authFeedback.hidden = false;
}

function limparMensagemAutenticacao() {
    authFeedback.textContent = "";
    authFeedback.hidden = true;
    delete authFeedback.dataset.tipo;
}

function traduzirErroAutenticacao(erro) {
    const mensagens = {
        "auth/invalid-api-key": "A autenticação Firebase ainda não está configurada por completo.",
        "auth/operation-not-allowed": "Este método de entrada ainda não está ativado no Firebase.",
        "auth/invalid-credential": "Os dados de acesso não estão corretos. Confirma o e-mail e a palavra-passe.",
        "auth/invalid-email": "Introduz um endereço de e-mail válido.",
        "auth/email-already-in-use": "Este e-mail já está associado a uma conta.",
        "auth/weak-password": "A palavra-passe deve ter pelo menos 6 caracteres.",
        "auth/user-not-found": "Não encontrámos nenhuma conta com este e-mail.",
        "auth/wrong-password": "A palavra-passe está incorreta.",
        "auth/network-request-failed": "Não foi possível ligar ao serviço de autenticação. Verifica a ligação à Internet.",
        "auth/unauthorized-domain": "Este domínio ainda não está autorizado nas definições do Firebase.",
        "auth/popup-blocked": "O navegador bloqueou a janela de acesso Google.",
        "auth/popup-closed-by-user": "O acesso Google foi fechado antes de terminar.",
        "auth/too-many-requests": "Foram feitas demasiadas tentativas. Aguarda um pouco."
    };
    return mensagens[erro.code] || "Não foi possível concluir a autenticação. Tenta novamente.";
}

formAutenticacao.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = inputEmail.value.trim();
    const senha = inputSenha.value.trim();
    const usuario = inputUsuario.value.trim().toLowerCase();

    if (!email || !senha) {
        mostrarMensagemAutenticacao("Preenche o e-mail e a palavra-passe.");
        return;
    }

    if (modoAtual === "registro" && !usuario) {
        mostrarMensagemAutenticacao("Preenche o nome de utilizador para criares a conta.");
        return;
    }

    btnEntrarSistema.disabled = true;
    btnGoogleLogin.disabled = true;
    btnEntrarSistema.textContent = modoAtual === "registro" ? "A criar conta…" : "A iniciar sessão…";
    limparMensagemAutenticacao();

    try {
        if (modoAtual === "login") {
            // Iniciar sessão diretamente com Firebase Auth (E-mail e Palavra-passe)
            const credencial = await signInWithEmailAndPassword(auth, email, senha);
            const uid = credencial.user.uid;

            // Procurar nome de utilizador associado na base de dados
            const snapshot = await get(ref(db, 'usuarios'));
            let nomeEncontrado = null;

            if (snapshot.exists()) {
                const todosUsuarios = snapshot.val();
                Object.keys(todosUsuarios).forEach(nome => {
                    if (todosUsuarios[nome].uid === uid || todosUsuarios[nome].email === email) {
                        nomeEncontrado = nome;
                        if (todosUsuarios[nome].statusSistema === "banimento") {
                            throw { code: "auth/banned", message: todosUsuarios[nome].motivoStatus };
                        }
                    }
                });
            }

            nomeUsuarioLogado = nomeEncontrado ? nomeEncontrado.toUpperCase() : email.split('@')[0].toUpperCase();
            telaLogin.classList.add('escondido');
            chamarFluxoTermos({ statusSistema: "nenhuma" });

        } else {
            // Criar nova conta
            const userRef = ref(db, 'usuarios/' + usuario);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                mostrarMensagemAutenticacao("Este nome de utilizador já está a ser utilizado. Escolhe outro.");
                return;
            }

            const credencial = await createUserWithEmailAndPassword(auth, email, senha);
            
            await set(userRef, { 
                uid: credencial.user.uid,
                email: email,
                statusSistema: "nenhuma",
                motivoStatus: ""
            });

            nomeUsuarioLogado = usuario.toUpperCase();
            telaLogin.classList.add('escondido');
            mostrarMensagemAutenticacao("Conta criada com sucesso.", "sucesso");
            
            chamarFluxoTermos({ statusSistema: "nenhuma" });
        }
    } catch (e) {
        console.error("Erro na autenticação:", e);
        if (e.code === "auth/banned") {
            mostrarMensagemAutenticacao("Esta conta foi suspensa. Motivo: " + (e.message || "Violação dos termos."));
        } else {
            mostrarMensagemAutenticacao(traduzirErroAutenticacao(e));
        }
    } finally {
        btnEntrarSistema.disabled = false;
        btnGoogleLogin.disabled = false;
        btnEntrarSistema.textContent = modoAtual === "registro" ? "Criar conta" : "Iniciar sessão";
    }
});

btnGoogleLogin.addEventListener('click', async () => {
    limparMensagemAutenticacao();
    btnGoogleLogin.disabled = true;
    btnEntrarSistema.disabled = true;
    mostrarMensagemAutenticacao("A abrir o acesso Google…", "informacao");
    try {
        const resultado = await signInWithPopup(auth, provedorGoogle);
        const usuarioFirebase = resultado.user;
        
        let usernameBase = usuarioFirebase.displayName ? usuarioFirebase.displayName.split(' ')[0] : "USER";
        let usuarioLimpo = usernameBase.toLowerCase().replace(/[^a-z0-9]/g, "");
        
        const userRef = ref(db, 'usuarios/' + usuarioLimpo);
        const snapshot = await get(userRef);
        
        if (snapshot.exists() && snapshot.val().statusSistema === "banimento") {
            mostrarMensagemAutenticacao("Esta conta Google foi suspensa do sistema.");
            return;
        }

        let dadosUsuarioSalvar = snapshot.exists() ? snapshot.val() : null;

        if (!snapshot.exists()) {
            dadosUsuarioSalvar = {
                uid: usuarioFirebase.uid,
                email: usuarioFirebase.email,
                statusSistema: "nenhuma",
                motivoStatus: ""
            };
            await set(userRef, dadosUsuarioSalvar);
        }

        nomeUsuarioLogado = usuarioLimpo.toUpperCase();
        telaLogin.classList.add('escondido');
        
        chamarFluxoTermos(dadosUsuarioSalvar);
    } catch (e) {
        console.error("Erro no acesso Google:", e);
        mostrarMensagemAutenticacao(traduzirErroAutenticacao(e));
    } finally {
        btnGoogleLogin.disabled = false;
        btnEntrarSistema.disabled = false;
    }
});

function chamarFluxoTermos(dadosUser) {
    telaTermos.classList.remove('escondido');
    
    btnAceitarTermos.onclick = () => {
        telaTermos.classList.add('escondido');
        adicionarAvisoSistema("Bem-vindo ao Pixel-RetroPlaylist, " + nomeUsuarioLogado);
        
        if (dadosUser && dadosUser.statusSistema === "aviso") {
            setTimeout(() => {
                alert("AVISO DE INFRAÇÃO:\n\nSua conta possui um aviso ativo.\nMotivo: " + (dadosUser.motivoStatus || "Comportamento inadequado."));
                adicionarAvisoSistema("[ALERTA DE SEGURANÇA] Conta sob aviso formal de moderação.");
            }, 1000);
        }
        ouvirHistoricoSalas();
    };
}

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
                novasPessoas += 1;

                await update(salaRef, {
                    quantidadePessoas: novasPessoas,
                    participantes: participantes
                });
            }

            salaAtual = entrada;
            codigoGeradoTxt.textContent = entrada;

            configurarPresencaOnDisconnect(entrada);
            conectarAoChatEPlaylist(entrada);

            push(ref(db, 'salas/' + entrada + '/chat'), {
                tipo: "sistema",
                texto: "[SISTEMA] O usuário " + nomeUsuarioLogado + " entrou na sala."
            });
        } else {
            alert("Sala não encontrada!");
        }
    } catch (e) {
        console.error(e);
    }
});

function configurarPresencaOnDisconnect(idSala) {
    if (!nomeUsuarioLogado) return;
    const refParticipante = ref(db, `salas/${idSala}/participantes/${nomeUsuarioLogado}`);
    onDisconnect(refParticipante).remove();
}

function conectarAoChatEPlaylist(idSala) {
    onChildAdded(ref(db, 'salas/' + idSala + '/chat'), (snapshot) => {
        const msg = snapshot.val();
        if (msg) {
            const div = document.createElement('div');
            if (msg.tipo === "sistema") {
                div.style.color = "#000080";
                div.style.fontStyle = "italic";
                div.textContent = msg.texto;
            } else {
                div.innerHTML = `<strong>${msg.usuario}:</strong> ${msg.texto}`;
            }
            caixaChat.appendChild(div);
            caixaChat.scrollTop = caixaChat.scrollHeight;
        }
    });
}

function adicionarAvisoSistema(texto) {
    const div = document.createElement('div');
    div.style.color = "#008000";
    div.style.fontWeight = "bold";
    div.textContent = "[SISTEMA] " + texto;
    caixaChat.appendChild(div);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}

btnEnviarMensagem.addEventListener('click', () => {
    const texto = inputMensagem.value.trim();
    if (texto && salaAtual && nomeUsuarioLogado) {
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            usuario: nomeUsuarioLogado,
            texto: texto
        });
        inputMensagem.value = '';
    }
});

inputMensagem.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnEnviarMensagem.click();
    }
});
