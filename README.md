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

A configuração Web partilhada pelo site e pelo painel está em `firebase-config.js`. Confirma no Firebase Console que:

- Os métodos **E-mail/palavra-passe** e **Google** estão ativados em Authentication.
- `k-naythan.github.io` está na lista de domínios autorizados de Authentication. Para desenvolvimento no Replit, autoriza também o domínio de pré-visualização usado.
- O painel administrativo é aberto pelo comando `/admin-painel` no chat da playlist. Só TRIV (`trivyy777@gmail.com`) e KYRA (`kyralovonny@gmail.com`) podem usá-lo; o painel valida a conta e a origem do comando. Mantém `ADMIN_EMAILS` em `firebase-config.js` sincronizado com `database.rules.json`.
- Aplica as regras de `database.rules.json` no Realtime Database para proteger a lista e as alterações de utilizadores. Se já existirem regras para outros dados, combina-as em vez de substituir o conjunto inteiro sem revisão.
- As regras fornecidas permitem operações autenticadas em `salas` para manter as salas e o chat existentes; os perfis de `usuarios` são limitados ao respetivo utilizador e às contas administrativas autorizadas.

A configuração Web, incluindo a chave `apiKey`, é enviada ao navegador e não é um segredo. Protege os dados com regras do Firebase e restrições da chave, não com valores secretos no código do cliente.

O login e o registo são tratados no navegador; o formulário não deve enviar credenciais na URL. A sessão iniciada é restaurada automaticamente neste navegador; usa **Terminar sessão** para sair ou trocar de conta. Depois de aplicar as regras, testa o registo de uma conta nova e o login antes de publicar.

## Áudio e temas

O player usa controlos próprios e um visualizador desenhado no site. A reprodução utiliza o suporte de áudio do navegador, mas não mostra o player nativo. Os ficheiros ficam apenas na sessão do dispositivo e não são guardados no Firebase. MP3, M4A, WAV, OGG, AAC, FLAC e Opus são aceites quando o navegador consegue descodificar o formato.

Os temas **Normal retro**, **Coquette kawaii** e **Gótico retro** funcionam nos dois modos. O botão **Modo Setup** muda para a área de trabalho com ícones, janelas fecháveis e barra de tarefas. Os temas e o modo escolhido ficam guardados neste navegador.
