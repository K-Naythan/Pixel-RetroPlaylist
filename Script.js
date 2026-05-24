
const inputArquivo = document.getElementById('importar-arquivo');
const player = document.getElementById('player-mp4');
const listaPlaylist = document.getElementById('lista-playlist');

let playlist = [];
let musicaAtualIndex = 0;

inputArquivo.addEventListener('change', function(evento) {
    const arquivos = evento.target.files;

    for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        const urlBlob = URL.createObjectURL(arquivo);

        playlist.push({
            nome: arquivo.name,
            url: urlBlob
        });
    }

    atualizarInterfacePlaylist();
});

function atualizarInterfacePlaylist() {
    listaPlaylist.innerHTML = ''; 

    playlist.forEach((musica, index) => {
        const item = document.createElement('li');
        item.textContent = musica.nome;
        item.classList.add('item-musica');

        item.addEventListener('click', () => {
            tocarMusica(index);
        });

        listaPlaylist.appendChild(item);
    });
}

function tocarMusica(index) {
    musicaAtualIndex = index;
    player.src = playlist[index].url;
    player.play();
}

player.addEventListener('ended', () => {
    if (musicaAtualIndex + 1 < playlist.length) {
        tocarMusica(musicaAtualIndex + 1);
    }
});
