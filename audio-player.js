const audio = document.getElementById("audio-player");
const fileInput = document.getElementById("importar-arquivo");
const trackList = document.getElementById("lista-playlist");
const libraryPanel = document.getElementById("painel-biblioteca");
const libraryToggle = document.getElementById("btn-abrir-biblioteca");
const clearLibraryButton = document.getElementById("btn-limpar-biblioteca");
const playButton = document.getElementById("btn-reproduzir");
const previousButton = document.getElementById("btn-faixa-anterior");
const nextButton = document.getElementById("btn-faixa-seguinte");
const seekInput = document.getElementById("seek-audio");
const volumeInput = document.getElementById("volume-audio");
const volumeValue = document.getElementById("volume-valor");
const trackTitle = document.getElementById("titulo-faixa");
const audioStatus = document.getElementById("estado-audio");
const currentTimeLabel = document.getElementById("tempo-atual");
const durationLabel = document.getElementById("duracao-audio");
const visualizer = document.getElementById("visualizador-audio");
const visualizerPlaceholder = document.getElementById("visualizer-placeholder");
const visualizerFrame = document.querySelector(".visualizer-frame");
const visualizerContext = visualizer?.getContext("2d");
const themeButton = document.getElementById("btn-temas");
const desktopThemeButton = document.getElementById("btn-temas-desktop");
const themeMenu = document.getElementById("menu-temas");
const setupButton = document.getElementById("btn-modo-setup");

const tracks = [];
let currentTrackIndex = -1;
let audioContext = null;
let analyser = null;
let mediaSource = null;
let frequencyData = null;
let animationFrame = 0;
let audioContextUnavailable = false;

function storePreference(key, value) {
    try {
        localStorage.setItem(key, value);
    } catch {
        // The player remains usable when browser storage is disabled.
    }
}

function readPreference(key, fallback) {
    try {
        return localStorage.getItem(key) || fallback;
    } catch {
        return fallback;
    }
}

function applyTheme(theme) {
    const validThemes = ["normal", "coquette", "gotico"];
    const selectedTheme = validThemes.includes(theme) ? theme : "normal";
    document.body.dataset.theme = selectedTheme;
    storePreference("pixel_retro_theme", selectedTheme);

    document.querySelectorAll("[data-tema]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.tema === selectedTheme));
    });
    drawPausedVisualizer();
}

function applyMode(mode) {
    const desktopMode = mode === "desktop";
    document.body.dataset.mode = desktopMode ? "desktop" : "normal";
    storePreference("pixel_retro_mode", desktopMode ? "desktop" : "normal");

    if (setupButton) {
        setupButton.setAttribute("aria-pressed", String(desktopMode));
        setupButton.textContent = desktopMode ? "Modo normal" : "Modo Setup";
        setupButton.setAttribute(
            "aria-label",
            desktopMode ? "Voltar ao modo normal" : "Ativar modo Setup, área de trabalho"
        );
    }
}

applyTheme(readPreference("pixel_retro_theme", "normal"));
applyMode(readPreference("pixel_retro_mode", "normal"));

themeButton?.addEventListener("click", () => {
    themeMenu?.classList.toggle("escondido");
});

desktopThemeButton?.addEventListener("click", () => {
    themeMenu?.classList.toggle("escondido");
});

themeMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tema]");
    if (!button) return;
    applyTheme(button.dataset.tema);
    themeMenu.classList.add("escondido");
});

document.addEventListener("click", (event) => {
    if (!themeMenu || themeMenu.classList.contains("escondido")) return;
    if (themeMenu.contains(event.target) || themeButton?.contains(event.target) || desktopThemeButton?.contains(event.target)) return;
    themeMenu.classList.add("escondido");
});

setupButton?.addEventListener("click", () => {
    applyMode(document.body.dataset.mode === "desktop" ? "normal" : "desktop");
});

document.querySelectorAll("[data-abrir-janela]").forEach((button) => {
    button.addEventListener("click", () => {
        const windowElement = document.getElementById(button.dataset.abrirJanela);
        windowElement?.classList.remove("window-closed");
        windowElement?.focus({ preventScroll: true });
    });
});

document.querySelectorAll("[data-fechar-janela]").forEach((button) => {
    button.addEventListener("click", () => {
        document.getElementById(button.dataset.fecharJanela)?.classList.add("window-closed");
    });
});

const openHistoryButtons = [
    document.getElementById("btn-abrir-historico"),
    document.getElementById("btn-abrir-historico-secundario")
].filter(Boolean);

openHistoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
        document.getElementById("painel-historico")?.classList.remove("escondido");
        document.dispatchEvent(new CustomEvent("pixel:open-room-history"));
    });
});

libraryToggle?.addEventListener("click", () => {
    libraryPanel?.classList.toggle("escondido");
});

document.getElementById("btn-fechar-historico")?.addEventListener("click", () => {
    document.getElementById("painel-historico")?.classList.add("escondido");
});

function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remainder}`;
}

function setAudioStatus(message) {
    if (audioStatus) audioStatus.textContent = message;
}

function renderTrackList() {
    if (!trackList) return;
    trackList.replaceChildren();

    if (tracks.length === 0) {
        const empty = document.createElement("li");
        empty.className = "empty-library";
        empty.textContent = "Ainda não há faixas. Carrega um ficheiro de áudio.";
        trackList.appendChild(empty);
        return;
    }

    tracks.forEach((track, index) => {
        const item = document.createElement("li");
        item.className = "item-musica";

        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.className = "track-select";
        selectButton.dataset.trackIndex = String(index);
        selectButton.setAttribute("aria-current", String(index === currentTrackIndex));
        selectButton.textContent = `${index === currentTrackIndex ? "♫ " : ""}${track.name}`;
        selectButton.addEventListener("click", () => selectTrack(index, true));

        const length = document.createElement("span");
        length.className = "track-length";
        length.textContent = track.duration ? formatTime(track.duration) : "";

        const removeButton = document.createElement("button");
        removeButton.type = "button";
        removeButton.className = "botao-retro track-remove";
        removeButton.dataset.removeIndex = String(index);
        removeButton.setAttribute("aria-label", `Remover ${track.name}`);
        removeButton.textContent = "X";
        removeButton.addEventListener("click", () => removeTrack(index));

        item.append(selectButton, length, removeButton);
        trackList.appendChild(item);
    });
}

function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const audioFiles = files.filter((file) => {
        const looksLikeAudio = file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|aac|flac|opus|aiff?)$/i.test(file.name);
        return looksLikeAudio;
    });
    const rejectedCount = files.length - audioFiles.length;

    audioFiles.forEach((file) => {
        tracks.push({
            name: file.name,
            url: URL.createObjectURL(file),
            duration: 0
        });
    });

    if (audioFiles.length) {
        renderTrackList();
        if (currentTrackIndex === -1) {
            selectTrack(0, false);
        }
        setAudioStatus(`${audioFiles.length} faixa(s) adicionada(s) à biblioteca local deste dispositivo.`);
    }

    if (rejectedCount) {
        setAudioStatus(`${rejectedCount} ficheiro(s) ignorado(s): escolhe ficheiros de áudio como MP3, M4A ou WAV.`);
    }
}

fileInput?.addEventListener("change", (event) => {
    addFiles(event.target.files);
    fileInput.value = "";
});

function selectTrack(index, startPlayback) {
    if (!tracks[index] || !audio) return;

    currentTrackIndex = index;
    audio.pause();
    audio.src = tracks[index].url;
    audio.load();
    if (trackTitle) trackTitle.textContent = tracks[index].name;
    if (currentTimeLabel) currentTimeLabel.textContent = "0:00";
    if (durationLabel) durationLabel.textContent = "0:00";
    if (seekInput) seekInput.value = "0";
    if (visualizerPlaceholder) visualizerPlaceholder.classList.add("escondido");
    renderTrackList();
    setAudioStatus(`Faixa pronta neste dispositivo: ${tracks[index].name}`);

    if (startPlayback) void startAudio();
}

function removeTrack(index) {
    const [removed] = tracks.splice(index, 1);
    if (!removed) return;
    URL.revokeObjectURL(removed.url);

    if (index === currentTrackIndex) {
        audio?.pause();
        if (audio) {
            audio.removeAttribute("src");
            audio.load();
        }
        currentTrackIndex = -1;
        if (tracks.length) {
            selectTrack(Math.min(index, tracks.length - 1), false);
        } else {
            if (trackTitle) trackTitle.textContent = "Nenhuma faixa selecionada";
            if (visualizerPlaceholder) visualizerPlaceholder.classList.remove("escondido");
            setAudioStatus("Os ficheiros são carregados apenas neste dispositivo.");
        }
    } else if (index < currentTrackIndex) {
        currentTrackIndex -= 1;
    }

    renderTrackList();
    drawPausedVisualizer();
}

clearLibraryButton?.addEventListener("click", () => {
    tracks.forEach((track) => URL.revokeObjectURL(track.url));
    tracks.length = 0;
    currentTrackIndex = -1;
    audio?.pause();
    if (audio) {
        audio.removeAttribute("src");
        audio.load();
    }
    if (trackTitle) trackTitle.textContent = "Nenhuma faixa selecionada";
    if (currentTimeLabel) currentTimeLabel.textContent = "0:00";
    if (durationLabel) durationLabel.textContent = "0:00";
    if (seekInput) seekInput.value = "0";
    if (visualizerPlaceholder) visualizerPlaceholder.classList.remove("escondido");
    setAudioStatus("A biblioteca local foi limpa.");
    updatePlayButton();
    renderTrackList();
    drawPausedVisualizer();
});

function setupAudioGraph() {
    if (analyser) return true;
    if (audioContextUnavailable) return false;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        audioContextUnavailable = true;
        return false;
    }

    try {
        audioContext = new AudioContextClass();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.82;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        mediaSource = audioContext.createMediaElementSource(audio);
        mediaSource.connect(analyser);
        analyser.connect(audioContext.destination);
        return true;
    } catch (error) {
        console.warn("O visualizador de áudio não pôde ser ativado:", error);
        try {
            mediaSource?.connect(audioContext?.destination);
        } catch {
            // If the analyser graph is unavailable, the HTML audio element still handles playback.
        }
        analyser = null;
        frequencyData = null;
        audioContextUnavailable = true;
        return false;
    }
}

async function startAudio() {
    if (!audio?.src && tracks.length) {
        selectTrack(Math.max(0, currentTrackIndex), false);
    }
    if (!audio?.src) {
        setAudioStatus("Carrega primeiro um ficheiro de áudio.");
        return;
    }

    const hasVisualizer = setupAudioGraph();
    if (audioContext?.state === "suspended") {
        try {
            await audioContext.resume();
        } catch (error) {
            console.warn("Não foi possível iniciar o visualizador:", error);
        }
    }

    try {
        await audio.play();
        if (!hasVisualizer || audioContextUnavailable) {
            setAudioStatus("A faixa está a tocar. O visualizador não é suportado neste navegador.");
        } else {
            setAudioStatus(`A tocar neste dispositivo: ${tracks[currentTrackIndex]?.name || "faixa selecionada"}`);
        }
    } catch (error) {
        console.warn("Não foi possível reproduzir o ficheiro:", error);
        setAudioStatus("Não foi possível reproduzir este formato. Tenta MP3, M4A ou WAV num navegador completo.");
    }
}

function updatePlayButton() {
    if (!playButton || !audio) return;
    const playing = !audio.paused && !audio.ended;
    playButton.textContent = playing ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", playing ? "Pausar" : "Reproduzir");
    playButton.title = playing ? "Pausar" : "Reproduzir";
}

playButton?.addEventListener("click", () => {
    if (audio?.paused) {
        void startAudio();
    } else {
        audio?.pause();
    }
});

function skipToTrack(direction) {
    if (!tracks.length) {
        setAudioStatus("Carrega áudio para usar os controlos de faixa.");
        return;
    }
    const base = currentTrackIndex < 0 ? 0 : currentTrackIndex;
    const nextIndex = (base + direction + tracks.length) % tracks.length;
    selectTrack(nextIndex, true);
}

previousButton?.addEventListener("click", () => {
    if (audio && audio.currentTime > 3) {
        audio.currentTime = 0;
        return;
    }
    skipToTrack(-1);
});

nextButton?.addEventListener("click", () => skipToTrack(1));

audio?.addEventListener("loadedmetadata", () => {
    const track = tracks[currentTrackIndex];
    if (track && Number.isFinite(audio.duration)) track.duration = audio.duration;
    if (durationLabel) durationLabel.textContent = formatTime(audio.duration);
    renderTrackList();
});

audio?.addEventListener("timeupdate", () => {
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(audio.currentTime);
    if (seekInput && Number.isFinite(audio.duration) && audio.duration > 0) {
        seekInput.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    }
});

audio?.addEventListener("play", () => {
    visualizerFrame?.classList.add("is-playing");
    updatePlayButton();
    drawVisualizer();
});

audio?.addEventListener("pause", () => {
    visualizerFrame?.classList.remove("is-playing");
    updatePlayButton();
    cancelAnimationFrame(animationFrame);
    drawPausedVisualizer();
});

audio?.addEventListener("ended", () => {
    visualizerFrame?.classList.remove("is-playing");
    updatePlayButton();
    if (tracks.length > 1) skipToTrack(1);
});

audio?.addEventListener("error", () => {
    if (audio?.src) {
        setAudioStatus("Este ficheiro não pôde ser descodificado. Experimenta MP3 ou WAV, ou abre o site no navegador principal.");
    }
});

seekInput?.addEventListener("input", () => {
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
        audio.currentTime = (Number(seekInput.value) / 1000) * audio.duration;
    }
});

volumeInput?.addEventListener("input", () => {
    if (!audio || !volumeInput) return;
    audio.volume = Number(volumeInput.value);
    if (volumeValue) volumeValue.textContent = `${Math.round(audio.volume * 100)}%`;
});

if (audio && volumeInput) audio.volume = Number(volumeInput.value);
renderTrackList();

function resizeVisualizer() {
    if (!visualizer || !visualizerContext) return;
    const bounds = visualizer.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    visualizer.width = Math.max(1, Math.floor(bounds.width * ratio));
    visualizer.height = Math.max(1, Math.floor(bounds.height * ratio));
    visualizerContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawPausedVisualizer();
}

function drawBars(values) {
    if (!visualizer || !visualizerContext) return;
    const bounds = visualizer.getBoundingClientRect();
    const width = bounds.width;
    const height = bounds.height;
    if (!width || !height) return;

    const context = visualizerContext;
    context.clearRect(0, 0, width, height);
    const count = 42;
    const gap = Math.max(2, width / 190);
    const barWidth = (width - gap * (count - 1) - 28) / count;
    const accent = getComputedStyle(document.body).getPropertyValue("--bar-color").trim() || "#f4a8ca";
    const centerY = height * 0.52;

    for (let index = 0; index < count; index += 1) {
        const sourceIndex = values ? Math.floor((index / count) * values.length) : index;
        const level = values
            ? values[sourceIndex] / 255
            : (Math.sin(index * 0.62) + Math.cos(index * 0.21) + 2) / 8;
        const barHeight = Math.max(3, level * height * 0.66);
        const x = 14 + index * (barWidth + gap);
        const y = centerY - barHeight / 2;
        context.fillStyle = accent;
        context.globalAlpha = 0.55 + level * 0.45;
        context.fillRect(x, y, barWidth, barHeight);
        context.fillStyle = "#ffffff";
        context.globalAlpha = 0.5;
        context.fillRect(x, y, barWidth, Math.min(2, barHeight));
    }
    context.globalAlpha = 1;
}

function drawPausedVisualizer() {
    if (!audio || audio.paused || !analyser || !frequencyData) {
        drawBars(null);
    }
}

function drawVisualizer() {
    if (!audio || audio.paused) return;
    if (analyser && frequencyData) {
        analyser.getByteFrequencyData(frequencyData);
        drawBars(frequencyData);
    } else {
        drawBars(null);
    }
    animationFrame = requestAnimationFrame(drawVisualizer);
}

if (visualizer && "ResizeObserver" in window) {
    new ResizeObserver(resizeVisualizer).observe(visualizer);
} else {
    window.addEventListener("resize", resizeVisualizer);
}
resizeVisualizer();

window.addEventListener("beforeunload", () => {
    tracks.forEach((track) => URL.revokeObjectURL(track.url));
    cancelAnimationFrame(animationFrame);
    if (audioContext && audioContext.state !== "closed") void audioContext.close();
});
