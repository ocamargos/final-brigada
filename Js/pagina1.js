// ==========================
// JS ADAPTADO — RESPONSIVO
// Tudo proporcional ao canvas
// ==========================
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 400;

let scale = 1; // não usado para transform, mas podemos expor se quiser
let gameSpeed = 5;
const maxGameSpeed = 15;
const speedIncrement = 1;

let gravity = 1;
let isJumping = false;
let velocityY = 0;
let dinoY = 0; // será recalculado por updateLayout
let gameOver = false;
let gameWon = false;
let gameStarted = false;

let currentQuestionIndex = 0;
let perguntaRespondida = false;
let showSucessMessage = false;
const sucessMessage = "RESPOSTA CORRETA";

let score = 0;
let scoreAcertos = 0;
let scoreErros = 0;

const DISTANCE_TO_DINO = 1100; // usado apenas para barra de tensão (mantive)
let distanceTraveled = 0;

let lastTime = 0;
let shakeTime = 0;

let canvas, ctx;

// objetos com valores base (serão recalculados)
const dino = { xRatio: 50 / BASE_WIDTH, yRatio: 220 / BASE_HEIGHT, widthRatio: 50 / BASE_WIDTH, heightRatio: 60 / BASE_HEIGHT, color: "#4CAF50", x: 0, y: 0, width: 0, height: 0 };
const spike = { xRatio: (BASE_WIDTH + 100) / BASE_WIDTH, yRatio: 250 / BASE_HEIGHT, widthRatio: 30 / BASE_WIDTH, heightRatio: 50 / BASE_HEIGHT, color: "#b33a3a", x: 0, y: 0, width: 0, height: 0 };

const perguntas = [
    { texto: "Arroz integral dura mais que arroz branco? (V/F)", resposta: false },
    { texto: "O mel nunca estraga? (V/F)", resposta: true },
    { texto: "Todos os óleos vegetais duram até 1 ano. (V/F)", resposta: true },
    { texto: "Feijão cru dura no máximo 1 ano. (V/F)", resposta: false },
    { texto: "Vinagre precisa ser refrigerado após aberto?(V/F)", resposta: false },
    { texto: "Sal não tem data de validade.", resposta: true },
];

let bagImage = new Image();
let imagesLoaded = false;
const BAG_IMAGE_SRC = "../img/sacola.jpg";

let timelineItems;
let lineBackground;
let timeline;
let lineProgress;

// layout calculado
let cw = BASE_WIDTH;
let ch = BASE_HEIGHT;
let groundY = 0; // y do chão (pixel)
let baseFontSize = 16;
let tensionBarHeight = 6;
let startButton, trueBtn, falseBtn;

// Carrega imagem e inicia loop
function loadImagesAndStartGame() {
    bagImage.onload = () => {
        imagesLoaded = true;
        requestAnimationFrame(gameLoop);
    };
    bagImage.onerror = () => {
        imagesLoaded = false;
        requestAnimationFrame(gameLoop);
    };
    bagImage.src = BAG_IMAGE_SRC;
    if (bagImage.complete) {
        imagesLoaded = true;
        requestAnimationFrame(gameLoop);
    }
}

// timeline helpers (mantive)
function setTimelineHeight() {
    if (timelineItems && lineBackground && timelineItems.length > 0) {
        const lastItem = timelineItems[timelineItems.length - 1];
        const lastItemTop = lastItem.offsetTop;
        const finalHeight = lastItemTop + lastItem.offsetHeight - 40;
        lineBackground.style.height = `${finalHeight}px`;
    }
}

function updateTimelineProgress() {
    if (timeline && lineProgress && lineBackground) {
        const timelineHeight = lineBackground.offsetHeight;
        const timelineTop = timeline.offsetTop;

        const scrollY = window.scrollY + window.innerHeight / 2;

        let progress = ((scrollY - timelineTop) / timelineHeight) * 100;
        progress = Math.max(0, Math.min(progress, 100));

        lineProgress.style.height = progress + "%";
    }
}

// Próxima pergunta original
function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex >= perguntas.length) {
        return finalizeGame();
    }

    // reposiciona spike para começar fora da tela (usando proporção)
    spike.x = cw + spike.width * 1.2;
    distanceTraveled = 0;
    perguntaRespondida = false;
    showSucessMessage = false;
}

function finalizeGame() {
    gameWon = scoreAcertos > scoreErros;
    gameOver = true;
}

function handleAnswer(isJump) {
    if (perguntaRespondida || gameOver || !gameStarted) return;
    perguntaRespondida = true;

    const correta = perguntas[currentQuestionIndex].resposta;
    const acertou = (isJump && correta) || (!isJump && !correta);

    if (acertou) {
        scoreAcertos++;
        score += 10;
        showSucessMessage = true;

        // aumenta velocidade proporcionalmente (mantive limites)
        if (gameSpeed < maxGameSpeed) {
            gameSpeed = Math.min(maxGameSpeed, gameSpeed + speedIncrement);
        }

        spike.x = cw + spike.width * 2; // afasto o spike para próxima questão

        setTimeout(() => {
            showSucessMessage = false;
            nextQuestion();
        }, 800);
    } else {
        scoreErros++;
        shakeTime = 500;

        setTimeout(() => {
            finalizeGame();
        }, 500);
    }
}

function restartGame() {
    gameSpeed = 5;
    score = 0;
    scoreAcertos = 0;
    scoreErros = 0;
    currentQuestionIndex = 0;
    perguntaRespondida = false;
    showSucessMessage = false;
    gameOver = false;
    gameWon = false;
    gameStarted = false;

    spike.x = cw + spike.width * 1.2;

    if (startButton) startButton.style.display = "inline-block";
}

// === RESPONSIVIDADE: resizeCanvas e updateLayout ===
function resizeCanvas() {
    const container = document.getElementById("quiz-jogo"); // CORRETO: sem '#'
    if (!container) return;
    if (!canvas) return;

    // baseamos a largura no container; altura proporcional ao BASE ratio
    const containerWidth = container.clientWidth;
    const containerHeight = Math.round((BASE_HEIGHT / BASE_WIDTH) * containerWidth);

    canvas.width = containerWidth;
    canvas.height = containerHeight;

    cw = canvas.width;
    ch = canvas.height;

    // scale como proporção em relação ao base
    scale = cw / BASE_WIDTH;

    // recalcula medidas proporcionais
    updateLayout();
}

// atualiza todas as medidas derivadas do canvas (proporcional)
function updateLayout() {
    // chão e posicionamentos base
    groundY = Math.round(ch * 0.85); // chão a 85% da altura

    // dino: tamanhos e posições base proporcionais
    dino.width = Math.round(cw * 0.06); // ~6% da largura
    dino.height = Math.round(ch * 0.15); // ~15% da altura
    dino.x = Math.round(cw * dino.xRatio); // usa xRatio original
    // dinoY proporcional (mantendo o mesmo "altura do chão" relativo)
    dinoY = Math.round(ch * dino.yRatio);
    dino.y = dinoY;

    // spike
    spike.width = Math.round(cw * spike.widthRatio);
    spike.height = Math.round(ch * spike.heightRatio);
    spike.x = Math.max(spike.x, Math.round(cw * spike.xRatio)); // se já estiver em jogo mantém, senão posiciona
    spike.y = Math.round(ch * spike.yRatio);

    // fontes e HUD
    baseFontSize = Math.max(12, Math.round(16 * scale));
    tensionBarHeight = Math.max(3, Math.round(6 * scale));

    // gravidade e velocidade proporcionais (mantendo comportamento)
    // gravidade base 1 for BASE_HEIGHT; scale by ch/BASE_HEIGHT
    gravity = 1 * (ch / BASE_HEIGHT);
    // normalize gameSpeed in px per frame: base 5 at BASE_WIDTH, so apply proportion
    // we'll store gameSpeedPixels = gameSpeed * (cw/BASE_WIDTH) when using movement
}

// chamadas iniciais
// (não chamar updateLayout antes do DOM carregar)
document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("gameCanvas");
    if (!canvas) {
        console.error("Canvas não encontrado (#gameCanvas).");
        return;
    }
    ctx = canvas.getContext("2d");

    // referência aos botões
    startButton = document.getElementById("startButton");
    trueBtn = document.getElementById("trueBtn");
    falseBtn = document.getElementById("falseBtn");

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // timeline e imagens
    timeline = document.getElementById("timeline");
    lineBackground = document.querySelector(".line-background");
    lineProgress = document.querySelector(".line-progress");
    timelineItems = document.querySelectorAll(".item");
    setTimelineHeight();
    window.addEventListener("scroll", updateTimelineProgress);
    loadImagesAndStartGame();

    // eventos UI
    if (startButton) startButton.addEventListener("click", () => {
        if (gameOver) {
            restartGame();
            if (startButton) startButton.textContent = "Iniciar";
            if (startButton) startButton.style.display = "none";
            return;
        }
        if (!gameStarted) {
            if (startButton) startButton.style.display = "none";
            gameStarted = true;
            nextQuestion();
        }
    });

    if (trueBtn) trueBtn.addEventListener("click", () => {
        if (!gameStarted) return startButton && startButton.click();
        if (!isJumping && !gameOver) {
            isJumping = true;
            // jump velocity proportional to canvas height
            velocityY = -Math.max(8, Math.round(ch * 0.04));
            handleAnswer(true);
        }
    });

    if (falseBtn) falseBtn.addEventListener("click", () => {
        if (!gameStarted) return startButton && startButton.click();
        if (!isJumping && !gameOver) {
            handleAnswer(false);
        }
    });

    // teclado
    document.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            if (!gameStarted) {
                startButton && startButton.click();
            } else if (!isJumping && !gameOver) {
                isJumping = true;
                velocityY = -Math.max(8, Math.round(ch * 0.04));
                handleAnswer(true);
            }
        } else if (e.code === "Enter" && gameOver) {
            restartGame();
            if (startButton) startButton.textContent = "Iniciar";
            if (startButton) startButton.style.display = "none";
        }
    });
});

// ===== DESENHOS (usando medidas proporcionais calculadas) =====
function drawDino(time) {
    const isFalling = velocityY > 0 && dino.y < dinoY;

    ctx.save();
    // posicao do dino ja em pixels
    ctx.translate(dino.x, dino.y);

    if (isJumping && !isFalling) {
        ctx.fillStyle = "#9C27B0";
    } else if (isFalling) {
        ctx.fillStyle = "#FF9800";
    } else {
        ctx.fillStyle = dino.color;
    }

    // Corpo do dino (proporcional já)
    ctx.fillRect(0, 0, Math.round(dino.width * 0.6), Math.round(dino.height * 0.8));

    // cabeça
    ctx.beginPath();
    ctx.arc(Math.round(dino.width * 0.3), -Math.round(dino.height * 0.15), Math.round(Math.max(6, ch * 0.02)), 0, Math.PI * 2);
    ctx.fill();

    // sacolas (bolsas) ao lado
    const sway = Math.sin(time / 200) * Math.max(2, Math.round(cw * 0.004));
    const bagRectWidth = Math.max(8, Math.round(cw * 0.015));
    const bagRectHeight = Math.max(12, Math.round(ch * 0.04));
    const bagRectY = Math.round(dino.height * 0.35);

    ctx.fillStyle = "#ffdd66";
    const leftBagX = -Math.round(bagRectWidth / 2) + Math.round(sway);
    ctx.fillRect(leftBagX, bagRectY, bagRectWidth, bagRectHeight);

    if (imagesLoaded) {
        const imageWidth = Math.max(8, Math.round(bagRectWidth * 0.6));
        const imageHeight = Math.max(10, Math.round(bagRectHeight * 0.6));
        const imageOffsetX = Math.round((bagRectWidth - imageWidth) / 2);
        const imageOffsetY = Math.round((bagRectHeight - imageHeight) / 2);
        ctx.drawImage(bagImage, leftBagX + imageOffsetX, bagRectY + imageOffsetY, imageWidth, imageHeight);
    }

    ctx.fillStyle = "#ffdd66";
    const rightBagX = Math.round(dino.width * 0.6) - 3 - Math.round(sway);
    ctx.fillRect(rightBagX, bagRectY, bagRectWidth, bagRectHeight);

    if (imagesLoaded) {
        const imageWidth = Math.max(8, Math.round(bagRectWidth * 0.6));
        const imageHeight = Math.max(10, Math.round(bagRectHeight * 0.6));
        const imageOffsetX = Math.round((bagRectWidth - imageWidth) / 2);
        const imageOffsetY = Math.round((bagRectHeight - imageHeight) / 2);
        ctx.drawImage(bagImage, rightBagX + imageOffsetX, bagRectY + imageOffsetY, imageWidth, imageHeight);
    }

    // pernas (proporcional)
    ctx.strokeStyle = "#333";
    ctx.lineWidth = Math.max(2, Math.round(scale * 2));
    ctx.beginPath();
    const legMove = isJumping ? 0 : Math.sin(time / 100) * Math.max(3, Math.round(scale * 5));
    ctx.moveTo(5, Math.round(dino.height * 0.8));
    ctx.lineTo(5 + legMove, Math.round(dino.height));
    ctx.moveTo(20, Math.round(dino.height * 0.8));
    ctx.lineTo(20 - legMove, Math.round(dino.height));
    ctx.stroke();

    ctx.restore();
}

function drawSpike() {
    ctx.save();
    ctx.translate(spike.x, spike.y);

    ctx.fillStyle = spike.color;
    ctx.beginPath();
    ctx.moveTo(0, spike.height);
    ctx.lineTo(Math.round(spike.width / 2), 0);
    ctx.lineTo(spike.width, spike.height);
    ctx.closePath();
    ctx.fill();

    // texto "FAKE" adaptado
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.max(8, Math.round(10 * scale))}px Arial`;
    ctx.textAlign = "left";
    ctx.fillText("FAKE", Math.round(spike.width * 0.1), spike.height - Math.round(spike.height * 0.15));
    ctx.restore();
}

function drawTensionBar() {
    const spikeStartPos = cw + Math.round(spike.width * 0.3);
    let currentDistance = spikeStartPos - spike.x;
    let percent = currentDistance / (DISTANCE_TO_DINO * (cw / BASE_WIDTH));
    percent = Math.min(1, Math.max(0, percent));
    const barWidth = Math.round(cw * percent);

    ctx.fillStyle = percent < 0.75 ? "#4caf50" : "#e74c3c";
    ctx.fillRect(0, 0, barWidth, Math.max(3, tensionBarHeight));
}

function drawHUD() {
    ctx.fillStyle = "#000";
    ctx.font = `${Math.max(12, Math.round(18 * scale))}px Arial`;
    ctx.textAlign = "left";
    const x = Math.round(10 + 0);
    const y = Math.round(30 * Math.max(scale, 1));
    ctx.fillText(`Acertos: ${scoreAcertos} | Erros: ${scoreErros} | Velocidade: ${gameSpeed.toFixed(1)}`, x, y);
}

function drawGameOver() {
    if (startButton) {
        startButton.textContent = "Reiniciar 🔄";
        startButton.style.display = "block";
    }

    const message = gameWon ? "PARABÉNS! VOCÊ VENCEU!" : "FIM DE JOGO!";
    const finalScore = scoreAcertos * 10;

    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = gameWon ? "#4CAF50" : "#fff";
    ctx.textAlign = "center";
    ctx.font = `bold ${Math.max(20, Math.round(60 * scale))}px Arial`;
    ctx.fillText(message, Math.round(cw / 2), Math.round(ch * 0.35));

    ctx.font = `${Math.max(12, Math.round(30 * scale))}px Arial`;
    ctx.fillText(`Pontuação Final: ${finalScore}`, Math.round(cw / 2), Math.round(ch * 0.55));

    ctx.font = `${Math.max(10, Math.round(20 * scale))}px Arial`;
    ctx.fillStyle = "#ccc";
    ctx.fillText("Pressione ENTER para jogar novamente", Math.round(cw / 2), Math.round(ch * 0.65));
}

// ===== colisão usando dimensões proporcionais =====
function checkCollisionScaled() {
    if (perguntaRespondida) return false;

    const dW = dino.width;
    const dH = dino.height;
    const sW = spike.width;
    const sH = spike.height;

    const isColliding = spike.x < dino.x + dW && spike.x + sW > dino.x && dino.y + dH >= spike.y;
    return isColliding;
}

// ===== GAME LOOP =====
function gameLoop(time) {
    if (!lastTime) lastTime = time;
    const delta = time - lastTime;
    lastTime = time;
    const normalizedSpeedFactor = delta / 16.66;

    // apply shake if necessário (mantive efeito)
    if (shakeTime > 0) {
        const shakeIntensity = 5 * (shakeTime / 500) * Math.max(1, scale);
        const tx = (Math.random() - 0.5) * shakeIntensity;
        const ty = (Math.random() - 0.5) * shakeIntensity;
        ctx.setTransform(1, 0, 0, 1, tx, ty);
        shakeTime -= delta;
    } else {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    // limpar usando as dimensões atuais
    ctx.clearRect(0, 0, cw, ch);

    if (gameOver) {
        drawGameOver();
        return requestAnimationFrame(gameLoop);
    }

    if (!gameStarted) {
        ctx.fillStyle = "#000";
        ctx.font = `${Math.max(14, Math.round(24 * scale))}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("Pressione INICIAR (ou ESPAÇO) para começar", Math.round(cw / 2), Math.round(ch * 0.4));
        return requestAnimationFrame(gameLoop);
    }

    // movimento do spike: velocidade em px = gameSpeed * (cw / BASE_WIDTH)
    const spikeSpeedPx = gameSpeed * (cw / BASE_WIDTH) * normalizedSpeedFactor * 1.6; // fator para ficar similar ao original
    spike.x -= spikeSpeedPx;

    if (isJumping) {
        // gravity já proporcional: adiciona gravidade por frame
        velocityY += gravity * normalizedSpeedFactor * 0.6; // 0.6 para ajustar sensação
        dino.y += velocityY * normalizedSpeedFactor;
        // chão: dinoY proporcional calculado em updateLayout
        if (dino.y >= dinoY) {
            dino.y = dinoY;
            velocityY = 0;
            isJumping = false;
        }
    }

    // desenhar barra, HUD, chão (linha)
    drawTensionBar();
    drawHUD();

    // chão/linha do solo
    ctx.beginPath();
    ctx.moveTo(0, dinoY + dino.height);
    ctx.lineTo(cw, dinoY + dino.height);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = Math.max(1, Math.round(scale * 2));
    ctx.stroke();

    // desenhos do jogo (usam medidas recalculadas)
    drawDino(time);
    drawSpike();

    // pergunta
    if (!perguntaRespondida) {
        ctx.fillStyle = "#000";
        ctx.font = `${Math.max(12, Math.round(24 * scale))}px Arial`;
        ctx.textAlign = "left";
        ctx.fillText(perguntas[currentQuestionIndex].texto, Math.round(cw * 0.07), Math.round(ch * 0.18));
    }

    // colisão proporcional
    const collided = checkCollisionScaled();
    if (collided) {
        handleAnswer(false);
    }

    // se spike passou da tela
    if (spike.x + spike.width < 0 && !perguntaRespondida) {
        handleAnswer(false);
    } else if (spike.x + spike.width < 0 && perguntaRespondida) {
        spike.x = cw + spike.width * 1.2;
    }

    // mensagem de sucesso pulsante
    if (showSucessMessage) {
        ctx.save();
        ctx.translate(Math.round(cw / 2), Math.round(ch * 0.3));
        const pulse = 1 + 0.08 * Math.sin(time / 100);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = "#00FF00";
        ctx.font = `bold ${Math.max(14, Math.round(30 * scale))}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(sucessMessage, 0, 0);
        ctx.restore();
    }

    requestAnimationFrame(gameLoop);
}

// Inicia loop quando DOM estiver pronto
// (loadImagesAndStartGame já chama requestAnimationFrame no onload/onerror)
/////////////////////////////////////////

