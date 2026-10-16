# Pixel-RetroPlaylist

## Executar no Replit

Este projeto é uma aplicação web estática em HTML, CSS e JavaScript. Inicia o workflow **Start application** para servir a aplicação na pré-visualização do Replit. O comando é:

```bash
python3 -m http.server 5000 --bind 0.0.0.0
```

Não é necessário instalar dependências Node.js. O JavaScript importa o Firebase Web SDK diretamente do CDN do Firebase.

## Configuração externa

A autenticação e as salas usam o Firebase Authentication e o Realtime Database. Ambos os ecrãs importam a configuração Web partilhada de `firebase-config.js`; não manter configurações Firebase duplicadas. O domínio GitHub Pages e o domínio de pré-visualização precisam estar autorizados no Authentication. As regras do Realtime Database têm de permitir as operações da aplicação.

A configuração Web do Firebase é pública no cliente. Nunca colocar tokens de GitHub ou outros segredos no código do navegador ou no repositório.

## Estrutura

- `index.html`, `style.css`, `script.js`: aplicação principal.
- `admin.html`, `admin.js`: painel de moderação.
- `firebase-config.js`: inicialização partilhada do Firebase.
- `README.md`: visão geral e instruções de execução.
