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
let salaAtual = null;
let nomeUsuarioLogado = null; 
let modoAtual = "login";
const LIMITE_PESSOAS = 8;

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
    
    // Configuração dos campos
    if (containerUsuario) {
        containerUsuario.classList.toggle('escondido', !estaARegistar);
        inputUsuario.required = estaARegistar;
        inputUsuario.disabled = !estaARegistar;
    }

    if (containerEmail) {
        containerEmail.classList.remove('escondido');
        inputEmail.required = true;
        inputEmail.disabled = false;
    }

    inputSenha.autocomplete = estaARegistar ? "new-password" : "current-password";
    inputSenha.minLength = estaARegistar ? 6 : -1;
    btnEntrarSistema.textContent = estaARegistar ? "Criar conta" : "Iniciar sessão";
    limparMensagemAutenticacao();
}

// Inicializar por padrão no modo login
definirModoAutenticacao("login");

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
        "auth/invalid-credential": "E-mail ou palavra-passe incorretos.",
        "auth/invalid-email": "Introduz um endereço de e-mail válido.",
        "auth/email-already-in-use": "Este e-mail já está associado a uma conta.",
        "auth/weak-password": "A palavra-passe deve ter pelo menos 6 caracteres.",
        "auth/user-not-found": "Não encontrámos nenhuma conta com este e-mail.",
        "auth/wrong-password": "A palavra-passe está incorreta.",
        "auth/network-request-failed": "Sem ligação à Internet. Tenta novamente.",
        "auth/unauthorized-domain": "Este domínio ainda não está autorizado no Firebase.",
        "auth/popup-blocked": "O navegador bloqueou a janela do Google.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada."
    };
    return mensagens[erro.code] || "Não foi possível concluir a autenticação. Confirma os teus dados.";
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
            // Entrar diretamente no Firebase com E-mail e Palavra-passe
            const credencial = await signInWithEmailAndPassword(auth, email, senha);
            const uid = credencial.user.uid;

            // Buscar nome de utilizador na base de dados
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
            // Registar nova conta
            const userRef = ref(db, 'usuarios/' + usuario);
            const snapshot = await get(userRef);

            if (snapshot.exists()) {
                mostrarMensagemAutenticacao("Este nome de utilizador já está a ser utilizado.");
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
        }

        if (!encontrouSalas) {
            listaSalasHistorico.innerHTML = "<p style='font-size:12px; color:#555;'>Nenhuma sala pública disponível no momento.</p>";
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