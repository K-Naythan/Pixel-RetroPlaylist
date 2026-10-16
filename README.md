# Pixel-RetroPlaylist
Pixel-RetroPlaylist
Status do Projeto: 🛠️ Em desenvolvimento (Fase de integração com Firebase e Deploy via js.org).

Bem-vindo ao Pixel-RetroPlaylist, um projeto que une a nostalgia da estética digital dos anos 90 com a funcionalidade moderna de automação e playlists colaborativas. Este sistema foi desenhado para ser um hub de mídia com uma interface clássica inspirada no Windows 98 e Pixel Art.

🚀 Visão Geral
Este projeto não é apenas um reprodutor de música; é um ambiente focado em:

Interface Retro: Design totalmente baseado em janelas clássicas e elementos de pixel art.

Integração Firebase: Autenticação e banco de dados em tempo real para gerir salas e usuários.

Colaboração em Tempo Real: Criado para permitir que membros interajam, sugiram músicas e compartilhem arquivos.

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
- As regras do Realtime Database permitem as operações autenticadas da aplicação. A consulta de perfil é feita por UID; adiciona um índice em `usuarios/uid` se necessário.
- As regras do Realtime Database devem restringir as alterações de moderação a administradores. O painel admin não autentica nem verifica o papel de administrador por si só.

A configuração Web, incluindo a chave `apiKey`, é enviada ao navegador e não é um segredo. Protege os dados com regras do Firebase e restrições da chave, não com valores secretos no código do cliente.

O login e o registo são tratados no navegador; o formulário não deve enviar credenciais na URL.
