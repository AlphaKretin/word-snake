const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const snakeLettersElement = document.getElementById("snake-letters");
const currentWordElement = document.getElementById("current-word");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");

const GRID_SIZE = 20;
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let letters = [];
let snakeLetters = [];
let score = 0;
let gameRunning = true;
let currentWord = "";

function getRandomLetter() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return letters[Math.floor(Math.random() * letters.length)];
}

function spawnLetters() {
    letters = [];
    for (let i = 0; i < 2; i++) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE));
            y = Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE));
        } while (
            snake.some((segment) => segment.x === x && segment.y === y) ||
            letters.some((letter) => letter.x === x && letter.y === y)
        );

        letters.push({
            x: x,
            y: y,
            letter: getRandomLetter(),
        });
    }
}

function drawGame() {
    // Clear canvas
    ctx.fillStyle = "#16213e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw snake
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#4ecdc4" : "#45b7aa";
        ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

        // Draw letter on snake segment
        if (snakeLetters[index]) {
            ctx.fillStyle = "#1a1a2e";
            ctx.font = "14px Courier New";
            ctx.textAlign = "center";
            ctx.fillText(
                snakeLetters[index],
                segment.x * GRID_SIZE + GRID_SIZE / 2,
                segment.y * GRID_SIZE + GRID_SIZE / 2 + 5
            );
        }
    });

    // Draw letters
    letters.forEach((letterObj) => {
        ctx.fillStyle = "#ffe66d";
        ctx.fillRect(letterObj.x * GRID_SIZE, letterObj.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);

        ctx.fillStyle = "#1a1a2e";
        ctx.font = "14px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(
            letterObj.letter,
            letterObj.x * GRID_SIZE + GRID_SIZE / 2,
            letterObj.y * GRID_SIZE + GRID_SIZE / 2 + 5
        );
    });
}

function moveSnake() {
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Check wall collision
    if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
        gameOver();
        return;
    }

    // Check self collision
    if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Check letter collection
    const letterIndex = letters.findIndex((letter) => letter.x === head.x && letter.y === head.y);
    if (letterIndex !== -1) {
        const collectedLetter = letters[letterIndex].letter;
        snakeLetters.unshift(collectedLetter);
        spawnLetters();
    } else {
        snake.pop();
        if (snakeLetters.length > snake.length) {
            snakeLetters.pop();
        }
    }

    updateDisplay();
}

function updateDisplay() {
    scoreElement.textContent = score;
    snakeLettersElement.textContent = snakeLetters.join(" ");
    currentWordElement.textContent = currentWord;
}

function checkWord(word) {
    const wordUpper = word.toLowerCase();
    if (validWords.has(wordUpper) && word.length >= 3) {
        // Check if we have all letters
        const wordLetters = word.split("");
        const availableLetters = [...snakeLetters];

        for (let letter of wordLetters) {
            const index = availableLetters.indexOf(letter);
            if (index === -1) {
                return false;
            }
            availableLetters.splice(index, 1);
        }

        // Remove used letters from snake
        for (let letter of wordLetters) {
            const index = snakeLetters.indexOf(letter);
            if (index !== -1) {
                snakeLetters.splice(index, 1);
                snake.splice(index + 1, 1); // +1 because head doesn't have a letter
            }
        }

        // Award points
        score += word.length * 10;
        return true;
    }
    return false;
}

function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = "block";
}

function restartGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    snakeLetters = [];
    score = 0;
    gameRunning = true;
    currentWord = "";
    gameOverElement.style.display = "none";
    spawnLetters();
    updateDisplay();
}

// Event listeners
document.addEventListener("keydown", (e) => {
    if (!gameRunning) return;

    // Arrow keys for movement
    switch (e.key) {
        case "ArrowUp":
            if (direction.y === 0) direction = { x: 0, y: -1 };
            e.preventDefault();
            break;
        case "ArrowDown":
            if (direction.y === 0) direction = { x: 0, y: 1 };
            e.preventDefault();
            break;
        case "ArrowLeft":
            if (direction.x === 0) direction = { x: -1, y: 0 };
            e.preventDefault();
            break;
        case "ArrowRight":
            if (direction.x === 0) direction = { x: 1, y: 0 };
            e.preventDefault();
            break;
        case "Enter":
            if (currentWord.length >= 3) {
                if (checkWord(currentWord)) {
                    currentWord = "";
                }
            }
            e.preventDefault();
            break;
        case "Backspace":
            currentWord = currentWord.slice(0, -1);
            e.preventDefault();
            break;
        default:
            // Letter keys for word formation
            if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
                const letter = e.key.toUpperCase();
                if (snakeLetters.includes(letter)) {
                    currentWord += letter;
                }
                e.preventDefault();
            }
    }
});

// Game loop
function gameLoop() {
    if (gameRunning) {
        moveSnake();
        drawGame();
    }
    setTimeout(gameLoop, 150);
}

// Initialize game
spawnLetters();
updateDisplay();
gameLoop();
