import { db, auth, provedorGoogle, ADMIN_EMAILS } from "./firebase-config.js";
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
    equalTo,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    linkWithPopup,
    linkWithRedirect,
    deleteUser,
    signOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import "./audio-player.js";

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
const btnMetodoEmail = document.getElementById('btn-metodo-email');
const btnMetodoSite = document.getElementById('btn-metodo-site');
const containerNome = document.getElementById('container-nome');
const containerUsuario = document.getElementById('container-usuario');
const containerEmail = document.getElementById('container-email');

const inputNome = document.getElementById('login-nome');
const inputUsuario = document.getElementById('login-usuario');
const inputEmail = document.getElementById('login-email');
const inputSenha = document.getElementById('login-senha');
const btnEntrarSistema = document.getElementById('btn-entrar-sistema');
const btnGoogleLogin = document.getElementById('btn-google-login');
const avisoContaSite = document.getElementById('site-account-notice');
const accountControls = document.getElementById('account-controls');
const accountEmail = document.getElementById('account-email');
const btnVincularGoogle = document.getElementById('btn-vincular-google');
const accountAuthFeedback = document.getElementById('account-auth-feedback');
const btnTerminarSessao = document.getElementById('btn-terminar-sessao');
const ADMIN_COMMAND_SESSION_KEY = 'pixel-retro-admin-command-uid';

const painelHistorico = document.getElementById('painel-historico');
const btnAbrirHistorico = document.getElementById('btn-abrir-historico');
const btnFecharHistorico = document.getElementById('btn-fechar-historico');
const listaSalasHistorico = document.getElementById('lista-salas-historico');
const desktopStatus = document.getElementById('desktop-status');
const estadoSala = document.getElementById('estado-sala');

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
let salaAtual = null;
let nomeUsuarioLogado = null; 
let modoAtual = "login";
let modoCredenciais = "email";
const LIMITE_PESSOAS = 8;
let cancelarHistoricoSalas = null;
let cancelarChatAtual = null;
let inicializacaoSessaoUid = null;
let inicializacaoSessaoPromise = null;
let adiarInicializacaoSessao = false;

// Chave usada no localStorage para sincronizar sessão entre separadores
const SESSION_KEY = 'pixel-retro-active-uid';
const DOMINIO_EMAIL_INTERNO = "accounts.pixel-retroplaylist.invalid";

function emailInternoDoUtilizador(usuario) {
    return `${String(usuario || "").trim().toLowerCase()}@${DOMINIO_EMAIL_INTERNO}`;
}

function contaDoSite(utilizador) {
    return Boolean(utilizador?.email?.toLowerCase().endsWith(`@${DOMINIO_EMAIL_INTERNO}`));
}

function utilizadorEAdministradora(utilizador = auth.currentUser) {
    const email = utilizador?.email?.trim().toLowerCase();
    return Boolean(email && ADMIN_EMAILS.some((emailAdmin) => emailAdmin.toLowerCase() === email));
}

// Define persistência antes de qualquer início de sessão iniciado pelo utilizador.
const authPersistenceReady = setPersistence(auth, browserLocalPersistence).catch((erro) => {
    console.warn("Não foi possível definir a persistência local do Auth:", erro);
});

// Sincronização de sessão no localStorage
function persistSessionForUser(user) {
    try {
        if (!user) return;
        localStorage.setItem(SESSION_KEY, user.uid);
        // também gravamos meta para debug/visualização
        localStorage.setItem(SESSION_KEY + ':meta', JSON.stringify({ displayName: user.displayName, email: user.email }));
        // forçar evento de storage em outros separadores
        localStorage.setItem(SESSION_KEY + ':updatedAt', String(Date.now()));
    } catch (e) {
        console.warn('Falha ao persistir sessão no localStorage:', e);
    }
}

function clearPersistedSession() {
    try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_KEY + ':meta');
        localStorage.setItem(SESSION_KEY + ':updatedAt', String(Date.now()));
    } catch (e) {
        console.warn('Falha ao limpar sessão persistida:', e);
    }
}

// Ouvir alterações de sessão vindas de outros separadores
window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === SESSION_KEY || e.key === (SESSION_KEY + ':updatedAt')) {
        const otherUid = localStorage.getItem(SESSION_KEY);
        const currentUid = auth.currentUser?.uid;

        // Se outro separador iniciou sessão com um UID diferente -> encerrar sessão local
        if (otherUid && currentUid && otherUid !== currentUid) {
            console.info('Outra sessão foi iniciada noutro separador; a sessão atual será encerrada.');
            // Não aguardamos — o onAuthStateChanged tratará da UI
            signOut(auth).catch((err) => console.warn('Erro ao terminar sessão para sincronizar:', err));
            return;
        }

        // Se outro separador encerrou sessão (otherUid === null) -> encerrar sessão local também
        if (!otherUid && currentUid) {
            console.info('A sessão foi terminada noutro separador; a sessão atual será encerrada.');
            signOut(auth).catch((err) => console.warn('Erro ao terminar sessão na sincronização:', err));
            return;
        }
    }
});

onAuthStateChanged(auth, (utilizador) => {
    accountControls?.classList.toggle('escondido', !utilizador);
    if (accountEmail) {
        accountEmail.textContent = utilizador?.displayName || utilizador?.email || "";
    }
    const temGoogleLigado = Boolean(utilizador?.providerData?.some((provider) => provider.providerId === "google.com"));
    btnVincularGoogle?.classList.toggle('escondido', !utilizador || temGoogleLigado);

    if (!utilizador) {
        if (accountAuthFeedback) accountAuthFeedback.textContent = "";
        nomeUsuarioLogado = null;
        inicializacaoSessaoUid = null;
        inicializacaoSessaoPromise = null;
        salaAtual = null;
        cancelarChatAtual?.();
        cancelarChatAtual = null;
        cancelarHistoricoSalas?.();
        cancelarHistoricoSalas = null;
        if (codigoGeradoTxt) codigoGeradoTxt.textContent = "—";
        if (caixaChat) caixaChat.replaceChildren();
        atualizarEstadoSala("Entra numa sala para abrir o chat.");
        telaTermos?.classList.add('escondido');
        telaLogin?.classList.remove('escondido');
        // limpar sessão persistida se existia (para ficar consistente)
        clearPersistedSession();
        return;
    }

    if (!contaDoSite(utilizador) && !utilizador.emailVerified) {
        accountControls?.classList.add('escondido');
        telaTermos?.classList.add('escondido');
        telaLogin?.classList.remove('escondido');
        clearPersistedSession();
        if (!adiarInicializacaoSessao) {
            mostrarMensagemAutenticacao("Confirma o teu e-mail pelo link enviado antes de entrares. Inicia sessão novamente para pedir outro link.");
            signOut(auth).catch((erro) => console.warn("Não foi possível terminar a sessão não verificada:", erro));
        }
        return;
    }

    if (adiarInicializacaoSessao) return;

    // Quando houver um utilizador válido, persistimos a sua sessão para que outros separadores
    // saibam que esta conta está ativa.
    persistSessionForUser(utilizador);

    void iniciarSessaoAutenticada(utilizador).catch((erro) => {
        console.error("Não foi possível restaurar a sessão:", erro);
        mostrarErroDeSessao(erro);
    });
});

(async function processRedirectResult() {
    try {
        const resultado = await getRedirectResult(auth);
        if (resultado && resultado.user) {
            await handleGoogleLoginResult(resultado);
            if (resultado.operationType === "link" && accountAuthFeedback) {
                accountAuthFeedback.textContent = "Conta Google associada.";
            }
        }
    } catch (e) {
        console.warn("Erro ao processar o resultado de redirect do Google:", e);
        mostrarErroDeSessao(e);
    }
})();

// ==========================================
// CONTROLO DE PAINEIS E ABAS
// ==========================================
btnAbrirHistorico?.addEventListener('click', () => {
    painelHistorico?.classList.remove('escondido');
    ouvirHistoricoSalas();
});
btnFecharHistorico?.addEventListener('click', () => painelHistorico?.classList.add('escondido'));

document.addEventListener('pixel:open-room-history', ouvirHistoricoSalas);

btnAbaLogin?.addEventListener('click', () => definirModoAutenticacao("login"));
btnAbaRegistro?.addEventListener('click', () => definirModoAutenticacao("registro"));
btnMetodoEmail?.addEventListener('click', () => definirMetodoCredenciais("email"));
btnMetodoSite?.addEventListener('click', () => definirMetodoCredenciais("site"));

function definirModoAutenticacao(modo) {
    modoAtual = modo;
    const estaARegistar = modo === "registro";

    if (btnAbaLogin && btnAbaRegistro) {
        btnAbaLogin.setAttribute('aria-pressed', String(!estaARegistar));
        btnAbaRegistro.setAttribute('aria-pressed', String(estaARegistar));
    }

    const contaSemEmail = modoCredenciais === "site";
    const mostraUtilizador = estaARegistar || contaSemEmail;

    if (containerNome && inputNome) {
        containerNome.classList.toggle('escondido', !estaARegistar);
        inputNome.required = estaARegistar;
        inputNome.disabled = !estaARegistar;
    }

    if (containerUsuario && inputUsuario) {
        containerUsuario.classList.toggle('escondido', !mostraUtilizador);
        inputUsuario.required = mostraUtilizador;
        inputUsuario.disabled = !mostraUtilizador;
    }

    if (containerEmail && inputEmail) {
        containerEmail.classList.toggle('escondido', contaSemEmail);
        inputEmail.required = !contaSemEmail;
        inputEmail.disabled = contaSemEmail;
    }

    if (inputSenha) {
        inputSenha.autocomplete = estaARegistar ? "new-password" : "current-password";
        inputSenha.minLength = estaARegistar ? 8 : 0;
    }

    if (btnEntrarSistema) {
        btnEntrarSistema.textContent = estaARegistar ? "Criar conta" : "Iniciar sessão";
    }

    avisoContaSite?.classList.toggle('escondido', !contaSemEmail);
    limparMensagemAutenticacao();
}

function definirMetodoCredenciais(metodo) {
    modoCredenciais = metodo;
    btnMetodoEmail?.setAttribute('aria-pressed', String(metodo === "email"));
    btnMetodoSite?.setAttribute('aria-pressed', String(metodo === "site"));
    definirModoAutenticacao(modoAtual);
}

// Inicializa no modo login por padrão
definirModoAutenticacao("login");

function mostrarMensagemAutenticacao(mensagem, tipo = "erro") {
    if (!authFeedback) return;
    authFeedback.textContent = mensagem;
    authFeedback.hidden = false;
    authFeedback.style.display = "block";
    authFeedback.dataset.tipo = tipo;
    authFeedback.style.color = tipo === "erro" ? "#ff0000" : (tipo === "sucesso" ? "#008000" : "#0000ff");
    authFeedback.style.fontSize = "11px";
    authFeedback.style.marginTop = "6px";
}

function limparMensagemAutenticacao() {
    if (!authFeedback) return;
    authFeedback.textContent = "";
    authFeedback.hidden = true;
    authFeedback.style.display = "none";
    delete authFeedback.dataset.tipo;
}

function traduzirErroAutenticacao(erro) {
    const mensagens = {
        "auth/invalid-api-key": "Configuração de API inválida no Firebase.",
        "auth/operation-not-allowed": "Ativa este método em Firebase Console > Authentication > Sign-in method.",
        "auth/invalid-credential": "Dados incorretos. Verifica o e-mail e a palavra-passe.",
        "auth/invalid-login-credentials": "Dados incorretos. Verifica o e-mail e a palavra-passe.",
        "auth/invalid-email": "O e-mail introduzido é inválido.",
        "auth/email-already-in-use": "Este e-mail já está em uso por outro utilizador.",
        "auth/weak-password": "A palavra-passe deve ter pelo menos 8 caracteres.",
        "auth/user-not-found": "Não existe conta associada a este e-mail.",
        "auth/wrong-password": "Palavra-passe incorreta.",
        "auth/user-disabled": "Esta conta foi desativada no Firebase.",
        "auth/too-many-requests": "Foram feitas demasiadas tentativas. Aguarda um pouco e tenta novamente.",
        "auth/network-request-failed": "Sem ligação à rede. Verifica a tua Internet.",
        "auth/unauthorized-domain": `O domínio ${window.location.hostname} não está autorizado. Adiciona-o em Firebase Console > Authentication > Settings > Authorized domains.`,
        "auth/auth-domain-config-required": "A configuração do domínio de autenticação Firebase está incompleta.",
        "auth/popup-blocked": "O navegador bloqueou a janela do Google. Ativa os pop-ups.",
        "auth/popup-closed-by-user": "A janela do Google foi fechada antes da conclusão.",
        "auth/cancelled-popup-request": "Já existe um pedido Google aberto. Fecha-o e tenta novamente.",
        "auth/web-storage-unsupported": "O navegador bloqueou o armazenamento necessário para autenticar.",
        "auth/operation-not-supported-in-this-environment": "Este navegador não permite abrir a janela Google. Tenta novamente no navegador principal.",
        "auth/account-exists-with-different-credential": "Este e-mail já tem uma conta por outro método. Entra nesse método primeiro e usa «Associar Google» para ligar as contas.",
        "auth/credential-already-in-use": "Esta conta Google já está associada a outro perfil.",
        "auth/provider-already-linked": "Esta conta já tem um fornecedor Google associado.",
        "auth/email-not-verified": "Confirma o teu e-mail antes de entrares na aplicação."
    };
    return mensagens[erro?.code] || (erro?.message ? erro.message : "Erro na autenticação. Tenta novamente.");
}

function mostrarErroDeSessao(erro) {
    const detalheErro = `${erro?.code || ""} ${erro?.message || ""}`;
    if (/PERMISSION_DENIED|database\/permission-denied/i.test(detalheErro)) {
        mostrarMensagemAutenticacao("A conta foi autenticada, mas o Firebase não permitiu carregar o perfil. Confirma as regras de database.rules.json.");
        return;
    }
    if (erro?.code === "auth/unauthorized-domain") {
        mostrarMensagemAutenticacao(traduzirErroAutenticacao(erro));
        return;
    }
    mostrarMensagemAutenticacao(traduzirErroAutenticacao(erro));
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
async function carregarOuCriarPerfil(utilizadorFirebase) {
    const consultaPerfil = query(ref(db, 'usuarios'), orderByChild('uid'), equalTo(utilizadorFirebase.uid));
    const snapshot = await comTimeout(get(consultaPerfil));
    if (snapshot.exists()) {
        const [chave, perfil] = Object.entries(snapshot.val())[0] || [];
        if (chave && perfil) return { chave, perfil };
    }

    const nomeBase = utilizadorFirebase.displayName?.split(/\s+/)[0]
        || utilizadorFirebase.email?.split("@")[0]
        || "user";
    const nomeLimpo = nomeBase.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 18) || "user";
    const perfilNovo = {
        uid: utilizadorFirebase.uid,
        email: contaDoSite(utilizadorFirebase) ? "" : (utilizadorFirebase.email || ""),
        username: `${nomeLimpo}-${utilizadorFirebase.uid.slice(-8).toLowerCase()}`,
        displayName: utilizadorFirebase.displayName || "",
        statusSistema: "nenhuma",
        motivoStatus: ""
    };
    const chave = `user-${utilizadorFirebase.uid}`;
    const resultado = await comTimeout(runTransaction(
        ref(db, `usuarios/${chave}`),
        (perfilExistente) => {
            if (perfilExistente === null) return perfilNovo;
            if (perfilExistente.uid === utilizadorFirebase.uid) return perfilExistente;
            return;
        },
        { applyLocally: false }
    ));
    const perfilGuardado = resultado.snapshot?.val();
    if (!perfilGuardado || perfilGuardado.uid !== utilizadorFirebase.uid) {
        throw new Error("Não foi possível criar um perfil seguro para esta conta.");
    }
    return { chave, perfil: perfilGuardado };
}

function iniciarSessaoAutenticada(utilizadorFirebase) {
    if (!contaDoSite(utilizadorFirebase) && !utilizadorFirebase.emailVerified) {
        const erro = new Error("Confirma o teu e-mail antes de entrares na aplicação.");
        erro.code = "auth/email-not-verified";
        return Promise.reject(erro);
    }

    if (inicializacaoSessaoUid === utilizadorFirebase.uid && inicializacaoSessaoPromise) {
        return inicializacaoSessaoPromise;
    }

    inicializacaoSessaoUid = utilizadorFirebase.uid;
    const promessa = (async () => {
        const { perfil } = await carregarOuCriarPerfil(utilizadorFirebase);
        if (auth.currentUser?.uid !== utilizadorFirebase.uid) return false;

        if (perfil.statusSistema === "banimento") {
            mostrarMensagemAutenticacao("Esta conta está suspensa. Motivo: " + (perfil.motivoStatus || "Violação dos termos."));
            await signOut(auth);
            return false;
        }

        nomeUsuarioLogado = String(perfil.username || utilizadorFirebase.email?.split("@")[0] || "USER").toUpperCase();
        limparMensagemAutenticacao();
        telaLogin?.classList.add('escondido');
        chamarFluxoTermos(perfil);

        // Persistir sessão para sincronizar com outros separadores
        try {
            persistSessionForUser(utilizadorFirebase);
        } catch (e) {
            console.warn('Não foi possível persistir sessão após autenticação:', e);
        }

        return true;
    })().finally(() => {
        if (inicializacaoSessaoPromise === promessa) {
            inicializacaoSessaoUid = null;
            inicializacaoSessaoPromise = null;
        }
    });
    inicializacaoSessaoPromise = promessa;
    return promessa;
}

formAutenticacao?.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const eContaSite = modoCredenciais === "site";
    const emailIntroduzido = inputEmail?.value.trim().toLowerCase() || "";
    const nome = inputNome?.value.trim() || "";
    const senha = inputSenha?.value ?? "";
    const usuario = inputUsuario ? inputUsuario.value.trim().toLowerCase() : "";
    const email = eContaSite ? emailInternoDoUtilizador(usuario) : emailIntroduzido;

    if (!senha) {
        mostrarMensagemAutenticacao("Preenche a palavra-passe.");
        return;
    }

    if (eContaSite && !usuario) {
        mostrarMensagemAutenticacao("Preenche o nome de utilizador.");
        return;
    }

    if ((!eContaSite && !emailIntroduzido) || (!eContaSite && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailIntroduzido))) {
        mostrarMensagemAutenticacao("Introduz um e-mail válido.");
        return;
    }

    if (eContaSite || modoAtual === "registro") {
        if (!/^[a-z0-9_-]{3,32}$/.test(usuario)) {
            mostrarMensagemAutenticacao("O nome de utilizador deve ter 3–32 caracteres: letras sem acentos, números, hífen ou sublinhado.");
            return;
        }
    }

    if (modoAtual === "registro" && !nome) {
        mostrarMensagemAutenticacao("Preenche o teu nome.");
        return;
    }

    if (modoAtual === "registro" && nome.length > 64) {
        mostrarMensagemAutenticacao("O nome pode ter no máximo 64 caracteres.");
        return;
    }

    if (!eContaSite && emailIntroduzido.endsWith(`@${DOMINIO_EMAIL_INTERNO}`)) {
        mostrarMensagemAutenticacao("Esse domínio é reservado para contas por nome de utilizador.");
        return;
    }

    if (modoAtual === "registro" && senha.length < 8) {
        mostrarMensagemAutenticacao("A palavra-passe deve ter pelo menos 8 caracteres.");
        return;
    }

    if (btnEntrarSistema) btnEntrarSistema.disabled = true;
    if (btnGoogleLogin) btnGoogleLogin.disabled = true;
    if (btnEntrarSistema) btnEntrarSistema.textContent = modoAtual === "registro" ? "A criar conta…" : "A iniciar sessão…";
    limparMensagemAutenticacao();

    try {
        await authPersistenceReady;

        if (modoAtual === "login") {
            adiarInicializacaoSessao = true;
            let utilizadorAutenticado = null;
            try {
                const credencial = await comTimeout(signInWithEmailAndPassword(auth, email, senha));
                utilizadorAutenticado = credencial.user;
                if (eContaSite !== contaDoSite(credencial.user)) {
                    await signOut(auth);
                    throw new Error(eContaSite
                        ? "Não existe uma conta do site com esse nome de utilizador."
                        : "Esta conta usa o método de acesso por nome de utilizador.");
                }

                if (!eContaSite && !credencial.user.emailVerified) {
                    await sendEmailVerification(credencial.user);
                    await signOut(auth);
                    mostrarMensagemAutenticacao("O e-mail ainda não foi confirmado. Enviámos um novo link; confirma-o e inicia sessão novamente.", "sucesso");
                    return;
                }
            } finally {
                adiarInicializacaoSessao = false;
            }

            await iniciarSessaoAutenticada(utilizadorAutenticado);

        } else {
            const userRef = ref(db, `usuarios/${usuario}`);
            let credencial;
            let perfilCriado = false;
            adiarInicializacaoSessao = true;

            try {
                credencial = await comTimeout(createUserWithEmailAndPassword(auth, email, senha));
                await updateProfile(credencial.user, { displayName: nome });
                const emailPerfil = eContaSite ? "" : emailIntroduzido;
                const dadosPerfil = {
                    uid: credencial.user.uid,
                    email: emailPerfil,
                    username: usuario,
                    displayName: nome,
                    statusSistema: "nenhuma",
                    motivoStatus: ""
                };
                const resultado = await comTimeout(runTransaction(userRef, (perfilAtual) => {
                    if (perfilAtual !== null) return;
                    return dadosPerfil;
                }, { applyLocally: false }));

                if (!resultado.committed) {
                    await deleteUser(credencial.user).catch(() => {});
                    mostrarMensagemAutenticacao("Este nome de utilizador já está registado.");
                    return;
                }
                perfilCriado = true;

                if (eContaSite) {
                    adiarInicializacaoSessao = false;
                    await iniciarSessaoAutenticada(credencial.user);
                } else {
                    await sendEmailVerification(credencial.user);
                    await signOut(auth);
                    mostrarMensagemAutenticacao("Conta criada. Enviámos um link de confirmação para o teu e-mail; confirma-o antes de iniciar sessão.", "sucesso");
                }
            } catch (erroPerfil) {
                if (credencial?.user && !perfilCriado) await deleteUser(credencial.user).catch(() => {});
                else if (credencial?.user && !eContaSite) await signOut(auth).catch(() => {});
                if (/PERMISSION_DENIED|database\/permission-denied/i.test(`${erroPerfil?.code || ""} ${erroPerfil?.message || ""}`)) {
                    mostrarMensagemAutenticacao("Não foi possível reservar esse nome. Pode já estar em uso ou as regras atualizadas de database.rules.json ainda não foram aplicadas no Firebase.");
                    return;
                }
                throw erroPerfil;
            } finally {
                adiarInicializacaoSessao = false;
            }
        }
    } catch (e) {
        console.error("Erro no formulário:", e);
        if (eContaSite && ["auth/user-not-found", "auth/invalid-credential", "auth/invalid-login-credentials", "auth/wrong-password"].includes(e?.code)) {
            mostrarMensagemAutenticacao("Dados incorretos. Verifica o nome de utilizador e a palavra-passe.");
        } else {
            mostrarErroDeSessao(e);
        }
    } finally {
        if (btnEntrarSistema) btnEntrarSistema.disabled = false;
        if (btnGoogleLogin) btnGoogleLogin.disabled = false;
        if (btnEntrarSistema) btnEntrarSistema.textContent = modoAtual === "registro" ? "Criar conta" : "Iniciar sessão";
    }
});

async function handleGoogleLoginResult(resultado) {
    if (resultado?.user) await iniciarSessaoAutenticada(resultado.user);
}

btnGoogleLogin?.addEventListener('click', async () => {
    limparMensagemAutenticacao();
    if (btnGoogleLogin) btnGoogleLogin.disabled = true;
    if (btnEntrarSistema) btnEntrarSistema.disabled = true;
    mostrarMensagemAutenticacao("A abrir autenticação Google…", "informacao");

    try {
        await authPersistenceReady;
        if (auth.currentUser) {
            await iniciarSessaoAutenticada(auth.currentUser);
            return;
        }
        const resultado = await signInWithPopup(auth, provedorGoogle);
        await handleGoogleLoginResult(resultado);
    } catch (e) {
        console.error("Erro no Google Login:", e);

        const fallbackCodes = new Set([
            'auth/popup-blocked',
            'auth/web-storage-unsupported',
            'auth/operation-not-supported-in-this-environment'
        ]);
        if (e?.code && fallbackCodes.has(e.code)) {
            try {
                await signInWithRedirect(auth, provedorGoogle);
                return;
            } catch (redirectError) {
                console.error('Erro ao iniciar redirect para Google:', redirectError);
                mostrarErroDeSessao(redirectError);
            }
        } else {
            mostrarErroDeSessao(e);
        }
    } finally {
        if (btnGoogleLogin) btnGoogleLogin.disabled = false;
        if (btnEntrarSistema) btnEntrarSistema.disabled = false;
    }
});

btnVincularGoogle?.addEventListener('click', async () => {
    const utilizador = auth.currentUser;
    if (!utilizador) return;

    btnVincularGoogle.disabled = true;
    if (accountAuthFeedback) accountAuthFeedback.textContent = "A associar Google…";

    try {
        await authPersistenceReady;
        await linkWithPopup(utilizador, provedorGoogle);
        if (accountAuthFeedback) accountAuthFeedback.textContent = "Conta Google associada.";
    } catch (erro) {
        const fallbackCodes = new Set([
            "auth/popup-blocked",
            "auth/web-storage-unsupported",
            "auth/operation-not-supported-in-this-environment"
        ]);
        if (erro?.code && fallbackCodes.has(erro.code)) {
            try {
                await linkWithRedirect(utilizador, provedorGoogle);
                return;
            } catch (erroRedirect) {
                console.error("Erro ao associar Google por redirecionamento:", erroRedirect);
                if (accountAuthFeedback) accountAuthFeedback.textContent = traduzirErroAutenticacao(erroRedirect);
            }
        } else {
            console.error("Erro ao associar conta Google:", erro);
            if (accountAuthFeedback) accountAuthFeedback.textContent = traduzirErroAutenticacao(erro);
        }
    } finally {
        btnVincularGoogle.disabled = false;
    }
});

btnTerminarSessao?.addEventListener('click', async () => {
    btnTerminarSessao.disabled = true;
    try {
        if (salaAtual) await sairDaSalaAtual();
        await signOut(auth);
        // Limpar sessão partilhada
        clearPersistedSession();
    } catch (erro) {
        console.error("Não foi possível terminar a sessão:", erro);
        mostrarErroDeSessao(erro);
    } finally {
        btnTerminarSessao.disabled = false;
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
    if (!nomeUsuarioLogado || !listaSalasHistorico || cancelarHistoricoSalas) return;

    cancelarHistoricoSalas = onValue(ref(db, 'salas'), (snapshot) => {
        listaSalasHistorico.innerHTML = '';
        let encontrouSalas = false;
        const nomeAtual = String(nomeUsuarioLogado || '').trim().toLowerCase();
        const eAdministradora = utilizadorEAdministradora();

        if (snapshot.exists()) {
            const salas = snapshot.val();
            Object.entries(salas).forEach(([idSala, sala]) => {
                if (!sala) return;

                const criador = String(sala.criador || '').trim().toLowerCase();
                const presencas = sala.presencas && typeof sala.presencas === "object" ? sala.presencas : {};
                const participantesGuardados = sala.participantes && typeof sala.participantes === "object"
                    ? sala.participantes
                    : {};
                const participantesAtivos = Object.entries(participantesGuardados)
                    .filter(([, uid]) => typeof uid === "string" && Boolean(presencas[uid]))
                    .map(([nome]) => nome);
                const participantesDesatualizados = Object.entries(participantesGuardados)
                    .filter(([, uid]) => typeof uid !== "string" || !presencas[uid])
                    .map(([nome]) => nome);
                const participantes = participantesAtivos;
                const pertenceASala = criador === nomeAtual ||
                    participantes.some((nome) => String(nome).trim().toLowerCase() === nomeAtual);
                const ehPublica = sala.tipoExibicao === "publica";
                const salaVazia = participantes.length === 0;

                if (participantesDesatualizados.length && (eAdministradora || criador === nomeAtual)) {
                    const correcao = { quantidadePessoas: participantes.length };
                    participantesDesatualizados.forEach((nome) => {
                        correcao[`participantes/${nome}`] = null;
                    });
                    update(ref(db, `salas/${idSala}`), correcao).catch((error) => {
                        console.warn(`Não foi possível limpar a presença antiga da sala ${idSala}:`, error);
                    });
                }

                if ((eAdministradora || pertenceASala || ehPublica) && (!salaVazia || pertenceASala || eAdministradora)) {
                    encontrouSalas = true;
                    const div = document.createElement('div');
                    div.classList.add('item-sala-historico');
                    div.dataset.sala = idSala;

                    const linhaCabecalho = document.createElement('div');
                    linhaCabecalho.className = 'room-history-heading';
                    const titulo = document.createElement('strong');
                    titulo.textContent = idSala;
                    const etiquetaTipo = document.createElement('span');
                    etiquetaTipo.className = 'room-type-label';
                    etiquetaTipo.textContent = ehPublica ? 'PÚBLICA' : 'PRIVADA';
                    linhaCabecalho.append(titulo, etiquetaTipo);

                    if (criador === nomeAtual || eAdministradora) {
                        const botaoEliminar = document.createElement('button');
                        botaoEliminar.type = 'button';
                        botaoEliminar.className = 'botao-retro btn-eliminar-sala-remota';
                        botaoEliminar.dataset.sala = idSala;
                        botaoEliminar.textContent = 'Eliminar';
                        botaoEliminar.setAttribute('aria-label', `Eliminar a sala ${idSala}`);
                        linhaCabecalho.appendChild(botaoEliminar);
                        botaoEliminar.addEventListener('click', async (event) => {
                            event.stopPropagation();
                            if (confirm(`Eliminar a sala ${idSala}? Esta ação não pode ser desfeita.`)) {
                                await eliminarSalaRemotamente(idSala);
                            }
                        });
                    }

                    const detalhes = document.createElement('p');
                    detalhes.textContent = `Criada por ${sala.criador || 'utilizador desconhecido'} · ${participantes.length}/${LIMITE_PESSOAS} pessoas`;
                    const presenca = document.createElement('p');
                    presenca.className = salaVazia ? 'room-empty-label' : 'room-participants';
                    presenca.textContent = salaVazia
                        ? 'Sala vazia — sem participantes ligados'
                        : `Ligados: ${participantes.join(', ')}`;
                    div.append(linhaCabecalho, detalhes, presenca);

                    if (!pertenceASala && ehPublica && !salaVazia) {
                        div.style.cursor = "pointer";
                        div.addEventListener('click', () => {
                            if (inputCodigoConvite) inputCodigoConvite.value = idSala;
                            btnEntrarSala?.click();
                        });
                    }

                    listaSalasHistorico.appendChild(div);
                }
            });
        }

        if (!encontrouSalas) {
            const empty = document.createElement('p');
            empty.className = 'empty-room-copy';
            empty.textContent = eAdministradora
                ? 'Não há salas guardadas.'
                : 'Não há salas públicas ativas no momento.';
            listaSalasHistorico.appendChild(empty);
        }
    }, (error) => {
        console.error("Não foi possível carregar o histórico de salas:", error);
        listaSalasHistorico.textContent = "Não foi possível carregar as salas. Verifica as regras do Firebase.";
    });
}

async function eliminarSalaRemotamente(idSala) {
    try {
        await set(ref(db, 'salas/' + idSala), null);
        if (salaAtual === idSala) {
            salaAtual = null;
            if (codigoGeradoTxt) codigoGeradoTxt.textContent = "-";
            if (caixaChat) caixaChat.innerHTML = '';
            cancelarChatAtual?.();
            cancelarChatAtual = null;
            atualizarEstadoSala("A sala foi eliminada. Entra ou cria outra sala.");
            alert("A tua sala atual foi encerrada do servidor.");
        }
    } catch (e) {
        console.error("Erro ao eliminar sala:", e);
        alert(e?.code === "PERMISSION_DENIED"
            ? "O Firebase recusou a eliminação. Aplica as regras de database.rules.json na base de dados."
            : "Não foi possível eliminar a sala. Verifica a ligação e tenta novamente.");
    }
}

async function sairDaSalaAtual() {
    if (!salaAtual || !nomeUsuarioLogado) return;

    try {
        const salaRef = ref(db, 'salas/' + salaAtual);
        const snapshot = await get(salaRef);

        if (snapshot.exists()) {
            const dadosSala = snapshot.val();
            const participantes = { ...(dadosSala.participantes || {}) };
            const uidAtual = auth.currentUser?.uid;

            if (participantes[nomeUsuarioLogado]) {
                delete participantes[nomeUsuarioLogado];
                const presencas = { ...(dadosSala.presencas || {}) };
                if (uidAtual) delete presencas[uidAtual];
                const membrosAtivos = Object.fromEntries(Object.entries(participantes)
                    .filter(([, uid]) => typeof uid === "string" && Boolean(presencas[uid])));
                const novasPessoas = Object.keys(membrosAtivos).length;

                await update(salaRef, {
                    quantidadePessoas: novasPessoas,
                    participantes: membrosAtivos,
                    presencas: presencas
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
    atualizarEstadoSala("Entra numa sala para abrir o chat.");
    cancelarChatAtual?.();
    cancelarChatAtual = null;
}

function atualizarEstadoSala(mensagem) {
    if (estadoSala) estadoSala.textContent = mensagem;
    if (desktopStatus) desktopStatus.textContent = salaAtual ? `LIGADO: ${salaAtual}` : "DESLIGADO DA SALA";
}

btnCriarSala?.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) {
        alert("Inicia sessão antes de criares uma sala.");
        return;
    }

    if (salaAtual) await sairDaSalaAtual();

    const tipoVisibilidade = selectTipoSala ? selectTipoSala.value : "privada";
    let idSala = null;
    try {
        let salaCriada = false;
        for (let tentativa = 0; tentativa < 5 && !salaCriada; tentativa += 1) {
            const numeros = Math.floor(1000 + Math.random() * 9000);
            idSala = "SALA-" + numeros;
            const salaRef = ref(db, 'salas/' + idSala);
            const resultado = await runTransaction(salaRef, (salaExistente) => {
                if (salaExistente !== null) return;
                return {
                    criador: nomeUsuarioLogado,
                    criadorUid: auth.currentUser?.uid || "",
                    criadaEm: Date.now(),
                    quantidadePessoas: 1,
                    tipoExibicao: tipoVisibilidade,
                    participantes: { [nomeUsuarioLogado]: auth.currentUser?.uid || "" },
                    presencas: auth.currentUser?.uid ? { [auth.currentUser.uid]: true } : {},
                    comandoPlayer: { acao: "parado", nomeMusica: "", enviadoPor: "" }
                };
            }, { applyLocally: false });
            salaCriada = resultado.committed;
        }

        if (!salaCriada || !idSala) throw new Error("Não foi possível reservar um código de sala livre.");

        salaAtual = idSala;
        if (codigoGeradoTxt) codigoGeradoTxt.textContent = idSala;
        await configurarPresencaOnDisconnect(idSala);
        conectarAoChatEPlaylist(idSala);
        atualizarEstadoSala(`Ligado à sala ${idSala}. O áudio continua local em cada dispositivo.`);

        push(ref(db, 'salas/' + idSala + '/chat'), {
            tipo: "sistema",
            texto: "[SISTEMA] O utilizador " + nomeUsuarioLogado + " criou a sala."
        });
    } catch (e) {
        console.error("Não foi possível criar a sala:", e);
        salaAtual = null;
        alert("Não foi possível criar a sala. Verifica as regras e a ligação ao Firebase.");
    }
});

btnEntrarSala?.addEventListener('click', async () => {
    if (!nomeUsuarioLogado) {
        alert("Inicia sessão antes de entrares numa sala.");
        return;
    }

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
            const uidAtual = auth.currentUser?.uid;
            if (!uidAtual) {
                alert("A sessão expirou. Inicia sessão novamente.");
                return;
            }
            const presencas = { ...(dadosSala.presencas || {}), [uidAtual]: true };
            const participantesGuardados = dadosSala.participantes && typeof dadosSala.participantes === "object"
                ? dadosSala.participantes
                : {};
            const participantes = Object.fromEntries(Object.entries(participantesGuardados)
                .filter(([, uid]) => typeof uid === "string" && Boolean(presencas[uid])));
            participantes[nomeUsuarioLogado] = uidAtual;
            const novasPessoas = Object.keys(participantes).length;
            if (novasPessoas > LIMITE_PESSOAS) {
                alert("Sala cheia! O limite é de 8 pessoas.");
                return;
            }

            await update(salaRef, {
                quantidadePessoas: novasPessoas,
                participantes: participantes,
                presencas: presencas
            });
            salaAtual = entrada;
            if (codigoGeradoTxt) codigoGeradoTxt.textContent = entrada;

            await configurarPresencaOnDisconnect(entrada);
            conectarAoChatEPlaylist(entrada);
            atualizarEstadoSala(`Ligado à sala ${entrada}. O áudio continua local em cada dispositivo.`);

            push(ref(db, 'salas/' + entrada + '/chat'), {
                tipo: "sistema",
                texto: "[SISTEMA] O utilizador " + nomeUsuarioLogado + " entrou na sala."
            });
        } else {
            alert("Sala não encontrada!");
        }
    } catch (e) {
        console.error("Não foi possível entrar na sala:", e);
        salaAtual = null;
        atualizarEstadoSala("Não foi possível ligar à sala. Verifica as regras do Firebase.");
    }
});

async function configurarPresencaOnDisconnect(idSala) {
    const uid = auth.currentUser?.uid;
    if (!nomeUsuarioLogado || !uid) return;
    const refParticipante = ref(db, `salas/${idSala}/participantes/${nomeUsuarioLogado}`);
    const refPresenca = ref(db, `salas/${idSala}/presencas/${uid}`);
    await Promise.all([
        onDisconnect(refParticipante).remove(),
        onDisconnect(refPresenca).remove()
    ]);
}

// ==========================================
// CHAT EM TEMPO REAL
// ==========================================
function conectarAoChatEPlaylist(idSala) {
    if (caixaChat) caixaChat.innerHTML = '';
    cancelarChatAtual?.();

    cancelarChatAtual = onChildAdded(ref(db, 'salas/' + idSala + '/chat'), (snapshot) => {
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
    if (!texto) return;

    if (texto.toLowerCase() === "/admin-painel") {
        if (inputMensagem) inputMensagem.value = "";
        const utilizadorAtual = auth.currentUser;
        if (!utilizadorEAdministradora(utilizadorAtual)) {
            adicionarAvisoSistema(utilizadorAtual
                ? "Acesso negado. Só as contas TRIV e KYRA podem abrir o painel administrativo."
                : "Inicia sessão com a conta TRIV ou KYRA para abrir o painel administrativo.");
            return;
        }

        try {
            sessionStorage.setItem(ADMIN_COMMAND_SESSION_KEY, utilizadorAtual.uid);
        } catch (erro) {
            console.error("Não foi possível guardar o acesso do comando:", erro);
            adicionarAvisoSistema("O navegador bloqueou o acesso ao painel. Permite o armazenamento deste site e tenta novamente.");
            return;
        }

        window.location.assign("admin.html");
        return;
    }

    if (texto && salaAtual && nomeUsuarioLogado) {
        push(ref(db, 'salas/' + salaAtual + '/chat'), {
            usuario: nomeUsuarioLogado,
            texto: texto
        });
        if (inputMensagem) inputMensagem.value = '';
    }
});

inputMensagem?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnEnviarMensagem?.click();
    }
});
