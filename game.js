// High score management
const MAX_HIGH_SCORES = 10;

function loadHighScores() {
    const scores = localStorage.getItem("wordSnakeHighScores");
    // Initialize empty array or clean up existing scores to ensure exactly 10 entries
    if (!scores) return [];
    const parsedScores = JSON.parse(scores);
    parsedScores.sort((a, b) => b.score - a.score);
    return parsedScores.slice(0, MAX_HIGH_SCORES);
}

function saveHighScore(score) {
    const scores = loadHighScores();
    const newScore = {
        score: score,
        date: new Date().toLocaleDateString(),
    };

    // Only add the score if it's better than the lowest score when we have 10 scores,
    // or if we have fewer than 10 scores
    if (scores.length < MAX_HIGH_SCORES || score > (scores[scores.length - 1]?.score || 0)) {
        scores.push(newScore);
        scores.sort((a, b) => b.score - a.score);
        scores.splice(MAX_HIGH_SCORES); // Ensure exactly 10 or fewer scores

        localStorage.setItem("wordSnakeHighScores", JSON.stringify(scores));
        updateHighScoreDisplay();
    }
}

function updateHighScoreDisplay() {
    const scores = loadHighScores();
    const highScoresElement = document.getElementById("high-scores");
    highScoresElement.innerHTML = scores
        .map(
            (score, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${score.score}</td>
                <td>${score.date}</td>
            </tr>
        `
        )
        .join("");
}

// Initialize high scores display
updateHighScoreDisplay();

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
let letterBag = [];
let wordHistory = [];
const MAX_HISTORY = 10;

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function refillLetterBag() {
    // Letter frequencies inspired by English language frequency
    const letterFrequencies = {
        E: 12, // Most common
        A: 9,
        I: 9,
        O: 8,
        N: 6,
        R: 6,
        T: 6,
        S: 6,
        L: 4,
        U: 4,
        D: 4,
        G: 3,
        B: 2,
        C: 2,
        M: 2,
        P: 2,
        F: 2,
        H: 2,
        V: 2,
        W: 2,
        Y: 2,
        K: 1,
        J: 1,
        X: 1,
        Q: 1,
        Z: 1,
    };

    // Create the bag with the specified frequencies
    letterBag = [];
    for (const [letter, frequency] of Object.entries(letterFrequencies)) {
        for (let i = 0; i < frequency; i++) {
            letterBag.push(letter);
        }
    }

    // Shuffle the bag
    shuffleArray(letterBag);
}

function getRandomLetter() {
    if (letterBag.length === 0) {
        refillLetterBag();
    }
    return letterBag.pop();
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

        // Draw letter on snake segment, skip the head (index 0)
        if (index > 0 && index - 1 < snakeLetters.length) {
            // Draw letters in order, starting from the segment after the head
            ctx.fillStyle = "#1a1a2e";
            ctx.font = "14px Courier New";
            ctx.textAlign = "center";
            ctx.fillText(
                snakeLetters[index - 1],
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

    snake.unshift(head); // Check letter collection
    const letterIndex = letters.findIndex((letter) => letter.x === head.x && letter.y === head.y);
    if (letterIndex !== -1) {
        const collectedLetter = letters[letterIndex].letter;
        snakeLetters.push(collectedLetter); // Add to end instead of start
        spawnLetters();
    } else {
        snake.pop();
        if (snakeLetters.length > snake.length - 1) {
            // -1 because we don't count the head
            snakeLetters.shift(); // Remove from start instead of end
        }
    }

    updateDisplay();
}

function updateDisplay() {
    scoreElement.textContent = score;
    snakeLettersElement.textContent = snakeLetters.join(" ");
    currentWordElement.textContent = currentWord;
}

function updateWordHistory(word, points) {
    wordHistory.unshift({ word, points });
    if (wordHistory.length > MAX_HISTORY) {
        wordHistory.pop();
    }

    const historyElement = document.getElementById("word-history");
    historyElement.innerHTML = wordHistory
        .map((entry) => `<tr><td>${entry.word}</td><td>${entry.points}</td></tr>`)
        .join("");
}

function checkWord(word) {
    const wordLower = word.toLowerCase();
    if (word.length >= 3 && validWords.has(wordLower)) {
        // Check if we have all letters
        const wordLetters = word.split("");
        const availableLetters = [...snakeLetters];

        for (let letter of wordLetters) {
            const index = availableLetters.indexOf(letter);
            if (index === -1) {
                return false;
            }
            availableLetters.splice(index, 1);
        } // Find all indices to remove
        const indicesToRemove = wordLetters
            .map((letter) => snakeLetters.indexOf(letter))
            .filter((index) => index !== -1)
            .sort((a, b) => b - a); // Sort in descending order to remove from back to front        // Sort indices in descending order so we remove from back to front
        indicesToRemove.sort((a, b) => b - a);

        // First remove the letters
        for (const index of indicesToRemove) {
            snakeLetters.splice(index, 1);
        }

        // Then remove the corresponding snake segments
        // We add 1 to each index because the head doesn't have a letter
        const segmentIndicesToRemove = indicesToRemove.map((i) => i + 1);

        // Remove segments from back to front
        for (const segmentIndex of segmentIndicesToRemove) {
            snake.splice(segmentIndex, 1);

            // Smoothly move remaining segments to close the gap
            for (let i = segmentIndex; i < snake.length; i++) {
                const nextSegment = snake[i];
                const prevSegment = snake[i - 1];
                // Move segment towards the previous segment
                if (nextSegment.x < prevSegment.x) nextSegment.x++;
                if (nextSegment.x > prevSegment.x) nextSegment.x--;
                if (nextSegment.y < prevSegment.y) nextSegment.y++;
                if (nextSegment.y > prevSegment.y) nextSegment.y--;
            }
        }
        // Award points using quadratic scoring
        // Base points are 10, but we multiply by length^2 to reward longer words
        // This means: 3 letters = 90 points, 4 letters = 160 points,
        // 5 letters = 250 points, 6 letters = 360 points, etc.
        const points = Math.floor(10 * Math.pow(word.length, 2));
        score += points;
        updateWordHistory(word, points); // Add to history
        return true;
    }
    return false;
}

function gameOver() {
    gameRunning = false;
    finalScoreElement.textContent = score;
    gameOverElement.style.display = "block";
    saveHighScore(score);
}

function restartGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    snakeLetters = [];
    score = 0;
    gameRunning = true;
    currentWord = "";
    wordHistory = []; // Clear word history
    document.getElementById("word-history").innerHTML = ""; // Clear history display
    gameOverElement.style.display = "none";
    refillLetterBag(); // Initialize the letter bag
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
        case "Backspace":
            currentWord = "";
            e.preventDefault();
            break;
        case "Enter":
            if (currentWord.length >= 3 && checkWord(currentWord)) {
                currentWord = "";
            }
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
refillLetterBag();
spawnLetters();
updateDisplay();
gameLoop();
