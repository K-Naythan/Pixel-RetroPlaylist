# Pixel-RetroPlaylist

## Executar no Replit

Este projeto é uma aplicação web estática em HTML, CSS e JavaScript. Inicia o workflow **Start application** para servir a aplicação na pré-visualização do Replit. O comando é:

```bash
python3 -m http.server 5000 --bind 0.0.0.0
```

Não é necessário instalar dependências Node.js. O JavaScript importa o Firebase Web SDK diretamente do CDN do Firebase.

## Configuração externa

A autenticação e as salas usam o Firebase Realtime Database. A configuração atual inclui o URL da base de dados, mas não inclui a configuração web completa necessária para os métodos de autenticação. Não inventar nem substituir esses valores; completar a configuração quando os dados da aplicação Firebase estiverem disponíveis. O acesso ao Firebase também depende das regras configuradas no projeto Firebase.

## Estrutura

- `index.html`, `style.css`, `script.js`: aplicação principal.
- `admin.html`, `admin.js`: painel de moderação.
- `README.md`: visão geral e instruções de execução.
