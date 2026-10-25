# Pixel-RetroPlaylist

## Executar no Replit

Este projeto é uma aplicação web estática em HTML, CSS e JavaScript. Inicia o workflow **Start application** para servir a aplicação na pré-visualização do Replit. O comando é:

```bash
python3 -m http.server 5000 --bind 0.0.0.0
```

Não é necessário instalar dependências Node.js. O JavaScript importa o Firebase Web SDK diretamente do CDN do Firebase.

## Configuração externa

A autenticação e as salas usam o Firebase Authentication e o Realtime Database. Ambos os ecrãs importam a configuração Web partilhada de `firebase-config.js`; não manter configurações Firebase duplicadas.

Ativa **Google** e **E-mail/palavra-passe** em Firebase Authentication → Sign-in method. Em Authentication → Settings → Authorized domains, adiciona `k-naythan.github.io` e o hostname exato da pré-visualização do Replit. O erro de domínio não autorizado mostra o hostname atual. Mantém `retro-play-list.firebaseapp.com` como `authDomain`, salvo se também atualizares as configurações de OAuth.

Contas com e-mail só entram nas salas depois de confirmar o endereço. Contas do site usam username e palavra-passe, sem e-mail de recuperação; a aplicação representa-as no Firebase Authentication com endereços internos do domínio reservado `.invalid`. Não permitir login apenas com um endereço de e-mail.

Aplica `database.rules.json` ao Realtime Database no Firebase Console; as alterações locais não atualizam as regras remotas automaticamente. Combina o ficheiro com regras adicionais já existentes em vez de as substituir às cegas.

A configuração Web do Firebase é pública no cliente. Nunca colocar tokens de GitHub ou outros segredos no código do navegador ou no repositório.

## Estrutura

- `index.html`, `style.css`, `script.js`: aplicação principal.
- `admin.html`, `admin.js`: painel de moderação.
- `firebase-config.js`: inicialização partilhada do Firebase.
- `database.rules.json`: regras de acesso do Realtime Database (aplicação manual no Console).
- `README.md`: visão geral e instruções de execução.
