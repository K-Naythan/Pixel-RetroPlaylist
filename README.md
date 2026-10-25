# Pixel-RetroPlaylist
Pixel-RetroPlaylist
Status do Projeto: 🛠️ Em desenvolvimento (Fase de integração com Firebase e Deploy via js.org).

Bem-vindo ao Pixel-RetroPlaylist, um projeto que une a nostalgia da estética digital dos anos 90 com a funcionalidade moderna de automação e playlists colaborativas. Este sistema foi desenhado para ser um hub de mídia com uma interface clássica inspirada no Windows 98 e Pixel Art.

🚀 Visão Geral
O Pixel-RetroPlaylist combina um player local com salas e chat em tempo real:

Interface Retro: Design totalmente baseado em janelas clássicas e elementos de pixel art.

Integração Firebase: Autenticação e banco de dados em tempo real para gerir salas e usuários.

Colaboração em Tempo Real: As pessoas podem conversar nas salas. Cada pessoa escolhe e ouve os ficheiros de áudio no próprio dispositivo; o site não envia faixas para os outros membros.

Automação: Baseado na experiência prévia com bots automatizados e scripts em JavaScript/Node.js.

🛠️ Tecnologias Utilizadas
Linguagens: JavaScript (ES6+), HTML5 e CSS3.

Ambiente de Desenvolvimento: Programado e testado via Termux e Acode diretamente em dispositivos móveis, provando que o desenvolvimento de qualidade pode ser feito em qualquer lugar.

Backend & DB: Firebase (Auth & Realtime Database).

Hosting: GitHub Pages com domínio customizado via js.org.

## Executar localmente ou no Replit

A aplicação é estática e não necessita de instalação de dependências. O servidor de desenvolvimento serve os ficheiros na porta 5000:

```bash
python3 -m http.server 5000 --bind 0.0.0.0
```

## Configuração Firebase

A configuração Web partilhada pelo site e pelo painel está em `firebase-config.js`. Para o Google funcionar, confirma no Firebase Console que:

- Os fornecedores **E-mail/palavra-passe** e **Google** estão ativados em **Authentication → Sign-in method**. Para Google, configura também o e-mail de suporte do projeto.
- `k-naythan.github.io` e o domínio exato usado na pré-visualização do Replit estão em **Authentication → Settings → Authorized domains**. O erro de domínio não autorizado mostra o hostname que falta.
- Usa o domínio `retro-play-list.firebaseapp.com` configurado em `firebase-config.js`; se mudares o `authDomain`, revê também o domínio de redirecionamento OAuth do Google.
- O painel administrativo é aberto pelo comando `/admin-painel` no chat da playlist. Só TRIV (`trivyy777@gmail.com`) e KYRA (`kyralovonny@gmail.com`) podem usá-lo; o painel valida a conta e a origem do comando. Mantém `ADMIN_EMAILS` em `firebase-config.js` sincronizado com `database.rules.json`.
- Aplica as regras de `database.rules.json` no Realtime Database para limitar salas a contas verificadas e contas do site, e restringir perfis ao respetivo utilizador e administradores. Se já existirem regras para outros dados, combina-as em vez de substituir o conjunto inteiro sem revisão.

A configuração Web, incluindo a chave `apiKey`, é enviada ao navegador e não é um segredo. Protege os dados com regras do Firebase e restrições da chave, não com valores secretos no código do cliente.

O login e o registo são tratados no navegador; o formulário não deve enviar credenciais na URL. Contas por e-mail exigem palavra-passe e confirmação do endereço antes de abrir salas. Contas do site usam nome, username e palavra-passe, sem e-mail; o Firebase recebe um identificador interno terminado em `@accounts.pixel-retroplaylist.invalid`, que não é uma caixa de correio. Essas contas não têm recuperação por e-mail, portanto a palavra-passe deve ser guardada.

A sessão iniciada é restaurada automaticamente neste navegador; usa **Terminar sessão** para sair ou trocar de conta. Se a conta por e-mail e a conta Google usarem o mesmo endereço, inicia sessão pelo método original e usa **Associar Google** para ligar as contas. Depois de aplicar as regras, testa o registo, a confirmação de e-mail, o login Google e a conta do site antes de publicar.

Referências oficiais: [Google Sign-In para Web](https://firebase.google.com/docs/auth/web/google-signin), [verificação de e-mail](https://firebase.google.com/docs/auth/web/manage-users#send_a_user_a_verification_email) e [segurança do Realtime Database](https://firebase.google.com/docs/database/security).

## Áudio e temas

O player usa controlos próprios e um visualizador desenhado no site. A reprodução utiliza o suporte de áudio do navegador, mas não mostra o player nativo. Os ficheiros ficam apenas na sessão do dispositivo e não são guardados no Firebase. MP3, M4A, WAV, OGG, AAC, FLAC e Opus são aceites quando o navegador consegue descodificar o formato.

Os temas **Normal retro**, **Coquette kawaii** e **Gótico retro** funcionam nos dois modos. O botão **Modo Setup** muda para a área de trabalho com ícones, janelas fecháveis e barra de tarefas. Os temas e o modo escolhido ficam guardados neste navegador.
