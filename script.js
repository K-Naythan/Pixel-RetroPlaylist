import { db, auth, provedorGoogle } from "./firebase-config.js";
import { 
    ref, 
    set, 
    push, 
    onChildAdded, 
    onValue, 
    get, 
    update, 
    onDisconnect,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    signInWithPopup, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// ELEMENTOS DO DOM (MAPEAMENTO SEGURO)
// ==========================================
const telaLogin = document.getElementById('tela-login');
const telaTermos = document.getElementById('tela-termos');
const btnAceitarTermos = document.getElementById('btn-aceitar-termos');

const formAutenticacao = document.getElementById('form-autenticacao');
const authFeedback = document.getElementById('auth-feedback');
const btnAbaLogin = document.getElementById('btn-aba-login');
const btnAbaRegistro = document.getElementById('btn-aba-registro');
const containerUsuario = document.getElementById('container-usuario');
const containerEmail = document.getElementById('container-email');

const inputUsuario = document.getElementById('login-usuario');
const inputEmail = document.getElementById('login-email');
const inputSenha = document.getElementById('login-senha');
const btnEntrarSistema = document.getElementById('btn-entrar-sistema');
const btnGoogleLogin = document.getElementById('btn-google-login');

const player = document.getElementById('player-mp4');
const inputArquivo = document.getElementById('importar-arquivo');
const listaPlaylist = document.getElementById('lista-playlist');

const painelBiblioteca = document.getElementById('painel-biblioteca');
const btnAbrirBiblioteca = document.getElementById('btn-abrir-biblioteca');
const btnFecharBiblioteca = document.getElementById('btn-fechar-biblioteca');

const painelHistorico = document.getElementById('painel-historico');
const btnAbrirHistorico = document.getElementById('btn-abrir-historico');
const btnFecharHistorico = document.getElementById('btn-fechar-historico');
const listaSalasHistorico = document.getElementById('lista-salas-historico');

const btnCriarSala = document.getElementById('btn-criar-sala');
const btnEntrarSala = document.getElementById('btn-entrar-sala');
const inputCodigoConvite = document.getElementById('input-codigo-convite');
const codigoGeradoTxt = document.getElementById('codigo-gerado');
const selectTipoSala = document.getElementById('select-tipo-sala');

const caixaChat = document.getElementById('caixa-chat');
const inputMensagem = document.getElementById('input-mensagem');
const btnEnviarMensagem = document.getElementById('btn-enviar-mensagem');

// ==========================================
// ESTADO GLOBAL DA APLICAÇÃO
// ==========================================
let bibliotecaArquivosLocais = {};
let playlistOrdenada = [];
let salaAtual = null;
let nomeUsuarioLogado = null; 
let modoAtual = "login";
const LIMITE_PESSOAS = 8;

// ==========================================
// GESTÃO DA CACHE LOCAL (LOCALSTORAGE)
// ==========================================
function carregarCacheLocal() {
    try {
        const cacheSalva = localStorage.getItem('pixel_retro_playlist_cache');
        if (cacheSalva) {
            bibliotecaArquivosLocais = JSON.parse(cacheSalva);
        }
    } catch (e) {
        console.warn("Falha ao carregar cache local:", e);
        bibliotecaArquivosLocais = {};
    }
}

function salvarCacheLocal() {
    try {
        localStorage.setItem('pixel_retro_playlist_cache', JSON.stringify(bibliotecaArquivosLocais));
    } catch (e) {
        console.warn("Falha ao guardar cache local:", e);
    }
}

carregarCacheLocal();

// ==========================================
// CONTROLO DE PAINEIS E ABAS
// ==========================================
btnAbrirBiblioteca?.addEventListener('click', () => painelBiblioteca?.classList.remove('escondida'));
btnFecharBiblioteca?.addEventListener('click', () => painelBiblioteca?.classList.add('escondida'));

btnAbrirHistorico?.addEventListener('click', () => {
    painelHistorico?.classList.remove('escondida');
    ouvirHistoricoSalas();
});
btnFecharHistorico?.addEventListener('click', () => painelHistorico?.classList.add('escondida'));

btnAbaLogin?.addEventListener('click', () => definirModoAutenticacao("login"));
btnAbaRegistro?.addEventListener('click', () => definirModoAutenticacao("registro"));

function definirModoAutenticacao(modo) {
    modoAtual = modo;
    const estaARegistar = modo === "registro";

    if (btnAbaLogin && btnAbaRegistro) {
        btnAbaLogin.setAttribute('aria-pressed', String(!estaARegistar));
        btnAbaRegistro.setAttribute('aria-pressed', String(estaARegistar));
        btnAbaLogin.style.background = estaARegistar ? "#c0c0c0" : "#e0e0e0";
        btnAbaRegistro.style.background = estaARegistar ? "#e0e0e0" : "#c0c0c0";
        btnAbaLogin.style.fontWeight = estaARegistar ? "normal" : "bold";
        btnAbaRegistro.style.fontWeight = estaARegistar ? "bold" : "normal";
    }

    if (containerUsuario && inputUsuario) {
        containerUsuario.classList.toggle('escondido', !estaARegistar);
        inputUsuario.required = estaARegistar;
        inputUsuario.disabled = !estaARegistar;
    }

    if (containerEmail && inputEmail) {
        containerEmail.classList.remove('escondido');
        inputEmail.required = true;
        inputEmail.disabled = false;
    }

    if (inputSenha) {
        inputSenha.autocomplete = estaARegistar ? "new-password" : "current-password";
        inputSenha.minLength = estaARegistar ? 6 : 0;
    }

    if (btnEntrarSistema) {
        btnEntrarSistema.textContent = estaARegistar ? "Criar conta" : "Iniciar sessão";
    }

    limparMensagemAutenticacao();
}

// Inicializa no modo login por padrão
definirModoAutenticacao("login");

function mostrarMensagemAutenticacao(mensagem, tipo = "erro") {
    if (!authFeedback) return;
    authFeedback.textContent = mensagem;
    authFeedback.hidden = false;
    authFeedback.style.display = "block";
    authFeedback.style.color = tipo === "erro" ? "#ff0000" : (tipo === "sucesso" ? "#008000" : "#0000ff");
    authFeedback.style.fontSize = "11px";
    authFeedback.style.marginTop = "6px";
}

function limparMensagemAutenticacao() {
    if (!authFeedback) return;
    authFeedback.textContent = "";
    authFeedback.hidden = true;
    authFeedback.style.display = "none";
}

function traduzirErroAutenticacao(erro) {
    const mensagens = {
        "auth/invalid-api-key": "Configuração de API inválida no Firebase.",
        "auth/operation-not-allowed": "Método de autenticação não ativado no Firebase Console.",
        "auth/invalid-credential": "Dados incorretos. Verifica o e-mail e a palavra-passe.",
        "auth/invalid-login-credentials": "Dados incorretos. Verifica o e-mail e a palavra-passe.",
        "auth/invalid-email": "O e-mail introduzido é inválido.",
        "auth/email-already-in-use": "Este e-mail já está em uso por outro utilizador.",
        "auth/weak-password": "A palavra-passe deve ter pelo menos 6 caracteres.",
        "auth/user-not-found": "Não existe conta associada a este e-mail.",
        "auth/wrong-password": "Palavra-passe incorreta.",
        "auth/user-disabled": "Esta conta foi desativada no Firebase.",
        "auth/too-many-requests": "Foram feitas demasiadas tentativas. Aguarda um pouco e tenta novamente.",
        "auth/network-request-failed": "Sem ligação à rede. Verifica a tua Internet.",
        "auth/unauthorized-domain": "Domínio não autorizado no Firebase Console.",
        "auth/popup-blocked": "O navegador bloqueou a janela do Google. Ativa os pop-ups.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada antes da conclusão."
    };
    return mensagens[erro?.code] || (erro?.message ? erro.message : "Erro na autenticação. Tenta novamente.");
}

// Helper para timeout em promessas (Blindagem contra travamentos)
function comTimeout(promessa, ms = 12000) {
    return Promise.race([
        promessa,
        new Promise((_, reject) => setTimeout(() => reject(new Error("A ligação expirou. Tenta novamente.")), ms))
    ]);
}

// ==========================================
// FLUXO DE AUTENTICAÇÃO (SUBMIT E GOOGLE)
// ==========================================
formAutenticacao?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const email = inputEmail?.value.trim();
    const senha = inputSenha?.value ?? "";
    const usuario = inputUsuario ? inputUsuario.value.trim().toLowerCase() : "";

    if (!email || !senha) {
        mostrarMensagemAutenticacao("Preenche o e-mail e a palavra-passe.");
        return;
    }

    if (modoAtual === "registro" && !usuario) {
        mostrarMensagemAutenticacao("Preenche o nome de utilizador para criares a conta.");
        return;
    }

    if (btnEntrarSistema) btnEntrarSistema.disabled = true;
    if (btnGoogleLogin) btnGoogleLogin.disabled = true;
    if (btnEntrarSistema) btnEntrarSistema.textContent = modoAtual === "registro" ? "A criar conta…" : "A iniciar sessão…";
    limparMensagemAutenticacao();

    try {
        if (modoAtual === "login") {
            const credencial = await comTimeout(signInWithEmailAndPassword(auth, email, senha));
            const uid = credencial.user.uid;

            const consultaPerfil = query(
                ref(db, 'usuarios'),
                orderByChild('uid'),
                equalTo(uid)
            );
            const snapshot = await comTimeout(get(consultaPerfil));
            let nomeEncontrado = null;

            if (snapshot.exists()) {
                const [nome, perfil] = Object.entries(snapshot.val())[0] || [];
                if (nome && perfil) {
                    nomeEncontrado = nome;
                    if (perfil.statusSistema === "banimento") {
                        throw { code: "auth/banned", message: perfil.motivoStatus };
                    }
                }
            }

            nomeUsuarioLogado = nomeEncontrado ? nomeEncontrado.toUpperCase() : email.split('@')[0].toUpperCase();
            telaLogin?.classList.add('escondido');
            chamarFluxoTermos({ statusSistema: "nenhuma" });

        } else {
            const userRef = ref(db, 'usuarios/' + usuario);
            const snapshot = await comTimeout(get(userRef));

            if (snapshot.exists()) {
                mostrarMensagemAutenticacao("Este nome de utilizador já está registado.");
                return;
            }

            const credencial = await comTimeout(createUserWithEmailAndPassword(auth, email, senha));
            
            await set(userRef, { 
                uid: credencial.user.uid,
                email: email,
                statusSistema: "nenhuma",
                motivoStatus: ""
            });

            nomeUsuarioLogado = usuario.toUpperCase();
            telaLogin?.classList.add('escondido');
            chamarFluxoTermos({ statusSistema: "nenhuma" });
        }
    } catch (e) {
        console.error("Erro no formulário:", e);
        if (e.code === "auth/banned") {
            mostrarMensagemAutenticacao("Esta conta está suspensa. Motivo: " + (e.message || "Violação dos termos."));
        } else {
            mostrarMensagemAutenticacao(traduzirErroAutenticacao(e));
        }
    } finally {
        if (btnEntrarSistema) btnEntrarSistema.disabled = false;
        if (btnGoogleLogin) btnGoogleLogin.disabled = false;
        if (btnEntrarSistema) btnEntrarSistema.textContent = modoAtual === "registro" ? "Criar conta" : "Iniciar sessão";
    }
});

btnGoogleLogin?.addEventListener('click', async () => {
    limparMensagemAutenticacao();
    if (btnGoogleLogin) btnGoogleLogin.disabled = true;
    if (btnEntrarSistema) btnEntrarSistema.disabled = true;
    mostrarMensagemAutenticacao("A abrir autenticação Google…", "informacao");

    try {
        const resultado = await signInWithPopup(auth, provedorGoogle);
        const usuarioFirebase = resultado.user;
        
        let usernameBase = usuarioFirebase.displayName ? usuarioFirebase.displayName.split(' ')[0] : "USER";
        let usuarioLimpo = usernameBase.toLowerCase().replace(/[^a-z0-9]/g, "") || "user" + Math.floor(Math.random() * 1000);
        
        const userRef = ref(db, 'usuarios/' + usuarioLimpo);
        const snapshot = await comTimeout(get(userRef));
        
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
        telaLogin?.classList.add('escondido');
        chamarFluxoTermos(dadosUsuarioSalvar);
    } catch (e) {
        console.error("Erro no Google Login:", e);
        mostrarMensagemAutenticacao(traduzirErroAutenticacao(e));
    } finally {
        if (btnGoogleLogin) btnGoogleLogin.disabled = false;
        if (btnEntrarSistema) btnEntrarSistema.disabled = false;
    }
});

function chamarFluxoTermos(dadosUser) {
    if (!telaTermos) return;
    telaTermos.classList.remove('escondido');
    
    if (btnAceitarTermos) {
        btnAceitarTermos.onclick = () => {
            telaTermos.classList.add('escondido');
            adicionarAvisoSistema("Bem-vindo ao Pixel-RetroPlaylist, " + nomeUsuarioLogado);
            ouvirHistoricoSalas();
        };
    }
}

// ==========================================
// SALAS EM TEMPO REAL E HISTÓRICO
// ==========================================
function ouvirHistoricoSalas() {
    if (!nomeUsuarioLogado || !listaSalasHistorico) return;

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

                    let botaoEliminar = null;
                    if (sala.criador === nomeUsuarioLogado) {
                        botaoEliminar = document.createElement('button');
                        botaoEliminar.type = 'button';
                        botaoEliminar.className = 'botao-retro btn-eliminar-sala-remota';
                        botaoEliminar.dataset.sala = idSala;
                        botaoEliminar.textContent = 'Eliminar';
                        Object.assign(botaoEliminar.style, {
                            position: 'absolute',
                            right: '5px',
                            top: '5px',
                            padding: '2px 6px',
                            fontSize: '10px',
                            cursor: 'pointer'
                        });
                    }

                    const etiquetaTipo = document.createElement('span');
                    etiquetaTipo.textContent = ehPublica ? ' [PÚBLICA]' : ' [PRIVADA]';
                    etiquetaTipo.style.color = ehPublica ? '#008000' : '#a06000';
                    etiquetaTipo.style.fontWeight = 'bold';

                    const adicionarLinha = (rotulo, valor) => {
                        const forte = document.createElement('strong');
                        forte.textContent = rotulo;
                        div.append(forte, document.createTextNode(valor));
                    };

                    if (botaoEliminar) div.appendChild(botaoEliminar);
                    adicionarLinha('Sala: ', idSala);
                    div.appendChild(etiquetaTipo);
                    div.appendChild(document.createElement('br'));
                    adicionarLinha('Dono: ', sala.criador || 'Desconhecido');
                    div.appendChild(document.createElement('br'));
                    adicionarLinha(
                        `Ocupação (${Number(sala.quantidadePessoas) || 0}/${LIMITE_PESSOAS}): `,
                        participantes.join(', ')
                    );

                    if (!pertenceASala && ehPublica) {
                        div.style.cursor = "pointer";
                        div.addEventListener('click', (e) => {
                            if (!e.target.classList.contains('btn-eliminar-sala-remota')) {
                                if (inputCodigoConvite) inputCodigoConvite.value = idSala;
                                btnEntrarSala?.click();
                            }
                        });
                    }

                    listaSalasHistorico.appendChild(div);
                }
            });

            document.querySelectorAll('.btn-eliminar-sala-remota').forEach(botao => {
                botao.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const idParaDeletar = e.target.getAttribute('data-sala');
                    if (confirm("Desejas eliminar a " + idParaDeletar + "?")) {
                        await eliminarSalaRemotamente(idParaDeletar);
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
            if (codigoGeradoTxt) codigoGeradoTxt.textContent = "-";
            if (caixaChat) caixaChat.innerHTML = '';
            alert("A tua sala atual foi encerrada do servidor.");
        }
    } catch (e) {
        alert("Erro ao eliminar a sala.");
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
                    texto: "[SISTEMA] O utilizador " + nomeUsuarioLogado + " desconectou-se da sala."
                });
            }
        }
    } catch (e) {
        console.error(e);
    }

    salaAtual = null;
    if (codigoGeradoTxt) codigoGeradoTxt.textContent = "-";
    if (caixaChat) caixaChat.innerHTML = '';
}

btnCriarSala?.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;

    if (salaAtual) await sairDaSalaAtual();

    const tipoVisibilidade = selectTipoSala ? selectTipoSala.value : "privada";
    const numeros = Math.floor(1000 + Math.random() * 9000);
    const idSala = "SALA-" + numeros;

    salaAtual = idSala;
    if (codigoGeradoTxt) codigoGeradoTxt.textContent = idSala;

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
            texto: "[SISTEMA] O utilizador " + nomeUsuarioLogado + " criou a sala."
        });
    } catch (e) {
        console.error(e);
    }
});

btnEntrarSala?.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) return;

    let entrada = inputCodigoConvite?.value.trim().toUpperCase();
    if (!entrada) return;

    if (!entrada.startsWith("SALA-")) entrada = "SALA-" + entrada;

    if (salaAtual === entrada) {
        alert("Já estás conectado nesta sala!");
        return;
    }

    if (salaAtual) await sairDaSalaAtual();

    try {
        const salaRef = ref(db, 'salas/' + entrada);
        const snapshot = await get(salaRef);

        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            const participantes = dadosSala.participantes || {};
            let novasPessoas = dadosSala.quantidadePessoas || 0;

            if (!participantes[nomeUsuarioLogado]) {
                if (novasPessoas >= LIMITE_PESSOAS) {
                    alert("Sala cheia! O limite é de 8 pessoas.");
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
            if (codigoGeradoTxt) codigoGeradoTxt.textContent = entrada;

            configurarPresencaOnDisconnect(entrada);
            conectarAoChatEPlaylist(entrada);

            push(ref(db, 'salas/' + entrada + '/chat'), {
                tipo: "sistema",
                texto: "[SISTEMA] O utilizador " + nomeUsuarioLogado + " entrou na sala."
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

// ==========================================
// CHAT EM TEMPO REAL
// ==========================================
function conectarAoChatEPlaylist(idSala) {
    if (caixaChat) caixaChat.innerHTML = '';

    onChildAdded(ref(db, 'salas/' + idSala + '/chat'), (snapshot) => {
        const msg = snapshot.val();
        if (msg && caixaChat) {
            const div = document.createElement('div');
            if (msg.tipo === "sistema") {
                div.style.color = "#000080";
                div.style.fontStyle = "italic";
                div.textContent = msg.texto;
            } else {
                const utilizador = document.createElement('strong');
                utilizador.textContent = `${msg.usuario || 'Utilizador'}: `;
                div.append(utilizador, document.createTextNode(msg.texto || ''));
            }
            caixaChat.appendChild(div);
            caixaChat.scrollTop = caixaChat.scrollHeight;
        }
    });
}

function adicionarAvisoSistema(texto) {
    if (!caixaChat) return;
    const div = document.createElement('div');
    div.style.color = "#008000";
    div.style.fontWeight = "bold";
    div.textContent = "[SISTEMA] " + texto;
    caixaChat.appendChild(div);
    caixaChat.scrollTop = caixaChat.scrollHeight;
}

btnEnviarMensagem?.addEventListener('click', () => {
    const texto = inputMensagem?.value.trim();
    if (texto && salaAtual && nomeUsuarioLogado) {
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            usuario: nomeUsuarioLogado,
            texto: texto
        });
        if (inputMensagem) inputMensagem.value = '';
    }
});

inputMensagem?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') btnEnviarMensagem?.click();
});
