const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const snakeLettersElement = document.getElementById("snake-letters");
const currentWordElement = document.getElementById("current-word");
const gameOverElement = document.getElementById("game-over");
const finalScoreElement = document.getElementById("final-score");
const highScoresElement = document.getElementById("high-scores");
const historyElement = document.getElementById("word-history");
const wordHistoryContainer = document.getElementById("word-history-container");
const scoringSchemeContainer = document.getElementById("scoring-scheme-container");
const scoringSchemeElement = document.getElementById("scoring-scheme");

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

const GRID_SIZE = 20;
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

let snake = [{ x: 10, y: 10 }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let bufferedDirection = null; // Store a buffered direction for smooth turning
let letters = [];
let snakeLetters = [];
let score = 0;
let gameRunning = true;
let currentWord = "";
let letterBag = [];
let wordHistory = [];
const MAX_HISTORY = 10;
let pendingWordRemoval = null; // Queue for word processing between game steps
let lastBackspaceTime = 0; // Track the timing of the last backspace press
const DOUBLE_PRESS_THRESHOLD = 300; // Time in milliseconds for double press detection

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

function spawnLetter() {
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

function isVowel(letter) {
    return ["A", "E", "I", "O", "U"].includes(letter);
}

function spawnLetters() {
    // Only used at game start - spawns initial 2 letters
    letters = [];

    // First letter - can be any letter
    spawnLetter();

    // If first letter is not a vowel, ensure second letter is a vowel
    if (!isVowel(letters[0].letter)) {
        let x, y;
        do {
            x = Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE));
            y = Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE));
        } while (
            snake.some((segment) => segment.x === x && segment.y === y) ||
            letters.some((letter) => letter.x === x && letter.y === y)
        );

        // Get vowels from the letter bag
        let vowels = letterBag.filter(isVowel);
        if (vowels.length === 0) {
            // If no vowels in the bag, refill it and try again
            refillLetterBag();
            vowels = letterBag.filter(isVowel);
        }

        // Remove the selected vowel from the letter bag
        const vowelIndex = letterBag.indexOf(vowels[Math.floor(Math.random() * vowels.length)]);
        const vowel = letterBag.splice(vowelIndex, 1)[0];

        letters.push({
            x: x,
            y: y,
            letter: vowel,
        });
    } else {
        // If first letter is already a vowel, second letter can be any letter
        spawnLetter();
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
    // Process any pending word removal first
    if (pendingWordRemoval) {
        processWordRemoval(pendingWordRemoval);
        pendingWordRemoval = null;
    }

    // Apply the pending direction change at the start of the tick
    direction = { ...nextDirection };
    // If there's a buffered direction and it's orthogonal to current direction, apply it
    if (
        bufferedDirection &&
        ((bufferedDirection.x !== 0 && direction.y !== 0) || (bufferedDirection.y !== 0 && direction.x !== 0))
    ) {
        nextDirection = bufferedDirection;
        bufferedDirection = null;
    }
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Check wall collision
    if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
        gameOver();
        return;
    }

    // Check self collision only if not processing a word
    if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head); // Check letter collection
    const letterIndex = letters.findIndex((letter) => letter.x === head.x && letter.y === head.y);
    if (letterIndex !== -1) {
        const collectedLetter = letters[letterIndex].letter;
        snakeLetters.push(collectedLetter); // Add to end instead of start
        // Remove the collected letter
        letters.splice(letterIndex, 1);
        // Change the letter of the remaining tile
        const otherIndex = 0; // Since we just removed one, there's only one left
        letters[otherIndex].letter = getRandomLetter();
        // Spawn a new letter in a different position
        spawnLetter();
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

    // Split letters into used and unused based on current word
    const remainingLetters = [...snakeLetters];
    const usedIndices = new Set();

    // Count how many times each letter appears in the current word
    const letterCounts = {};
    for (const letter of currentWord) {
        letterCounts[letter] = (letterCounts[letter] || 0) + 1;
    }

    // Find and mark used letters, handling duplicates
    for (const [letter, count] of Object.entries(letterCounts)) {
        let found = 0;
        for (let i = 0; i < remainingLetters.length; i++) {
            if (remainingLetters[i] === letter) {
                if (found < count) {
                    usedIndices.add(i);
                    found++;
                }
            }
        }
    }

    // Create HTML with unused and used letters
    const letterElements = remainingLetters.map((letter, index) => {
        if (usedIndices.has(index)) {
            return `<span class="letter-used">${letter}</span>`;
        }
        return `<span>${letter}</span>`;
    });

    // Sort so unused letters appear first
    letterElements.sort((a, b) => {
        const aUsed = a.includes("letter-used");
        const bUsed = b.includes("letter-used");
        return aUsed - bUsed;
    });

    snakeLettersElement.innerHTML = letterElements.join(" ");
    currentWordElement.textContent = currentWord;
}

// Calculate points for a word of given length
function calculateWordPoints(length) {
    return length > 3 ? Math.floor(100 * Math.pow(length - 3, 2)) : 0;
}

function showScoringScheme() {
    wordHistoryContainer.style.display = "none";
    scoringSchemeContainer.style.display = "block";
    scoringSchemeElement.innerHTML = getScoringSchemeHTML();
}

function showWordHistory() {
    wordHistoryContainer.style.display = "block";
    scoringSchemeContainer.style.display = "none";
}

function updateWordHistory(word, points) {
    wordHistory.unshift({ word, points });
    if (wordHistory.length > MAX_HISTORY) {
        wordHistory.pop();
    }

    // Show word history and update its contents
    showWordHistory();
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
        }

        // Find all indices to remove
        const indicesToRemove = wordLetters
            .map((letter) => snakeLetters.indexOf(letter))
            .filter((index) => index !== -1)
            .sort((a, b) => b - a); // Sort in descending order to remove from back to front

        // Queue up the word removal for the next game step
        const segmentIndicesToRemove = indicesToRemove.map((i) => i + 1);
        pendingWordRemoval = { indicesToRemove, segmentIndicesToRemove };

        // Award points using the same calculation as shown in the scoring table
        const points = calculateWordPoints(word.length);
        score += points;
        updateWordHistory(word, points);
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

// Generate HTML for the scoring scheme table
function getScoringSchemeHTML() {
    const rows = [];
    // Add rows for lengths 3 to 10
    for (let length = 3; length <= 10; length++) {
        const points = calculateWordPoints(length);
        rows.push(`<tr><td>${length}</td><td>${points}</td></tr>`);
    }
    return rows.join("");
}

function restartGame() {
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    bufferedDirection = null;
    snakeLetters = [];
    score = 0;
    gameRunning = true;
    currentWord = "";
    wordHistory = []; // Clear word history
    showScoringScheme(); // Show scoring scheme instead of empty history
    gameOverElement.style.display = "none";
    refillLetterBag(); // Initialize the letter bag
    spawnLetters();
    updateDisplay();
}

// Event listeners
document.addEventListener("keydown", (e) => {
    if (!gameRunning) return; // Arrow keys for movement
    switch (e.key) {
        case "ArrowUp": {
            const newDir = { x: 0, y: -1 };
            if (direction.y === 0) {
                nextDirection = newDir;
                bufferedDirection = null;
            } else if (nextDirection.y === 0) {
                bufferedDirection = newDir;
            }
            e.preventDefault();
            break;
        }
        case "ArrowDown": {
            const newDir = { x: 0, y: 1 };
            if (direction.y === 0) {
                nextDirection = newDir;
                bufferedDirection = null;
            } else if (nextDirection.y === 0) {
                bufferedDirection = newDir;
            }
            e.preventDefault();
            break;
        }
        case "ArrowLeft": {
            const newDir = { x: -1, y: 0 };
            if (direction.x === 0) {
                nextDirection = newDir;
                bufferedDirection = null;
            } else if (nextDirection.x === 0) {
                bufferedDirection = newDir;
            }
            e.preventDefault();
            break;
        }
        case "ArrowRight": {
            const newDir = { x: 1, y: 0 };
            if (direction.x === 0) {
                nextDirection = newDir;
                bufferedDirection = null;
            } else if (nextDirection.x === 0) {
                bufferedDirection = newDir;
            }
            e.preventDefault();
            break;
        }
        case "Backspace": {
            const now = Date.now();
            const timeSinceLastBackspace = now - lastBackspaceTime;

            if (timeSinceLastBackspace <= DOUBLE_PRESS_THRESHOLD) {
                // Double backspace - clear the whole word
                currentWord = "";
            } else {
                // Single backspace - remove last character
                currentWord = currentWord.slice(0, -1);
            }

            lastBackspaceTime = now;
            e.preventDefault();
            break;
        }
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
showScoringScheme(); // Show scoring guide on initial load
gameLoop();

function processWordRemoval(wordInfo) {
    const { indicesToRemove, segmentIndicesToRemove } = wordInfo;

    // First remove the letters
    for (const index of indicesToRemove) {
        snakeLetters.splice(index, 1);
    }

    // Then remove the corresponding snake segments
    for (const segmentIndex of segmentIndicesToRemove) {
        snake.splice(segmentIndex, 1);

        // Smoothly move remaining segments to close the gap
        // Process from the segment after the removed one up to the tail
        for (let i = segmentIndex; i < snake.length; i++) {
            const nextSegment = snake[i];
            const prevSegment = snake[i - 1];

            // Calculate the direction to move
            const dx = Math.sign(prevSegment.x - nextSegment.x);
            const dy = Math.sign(prevSegment.y - nextSegment.y);

            // Only move one coordinate at a time to prevent diagonal movement
            if (dx !== 0) {
                nextSegment.x += dx;
            } else if (dy !== 0) {
                nextSegment.y += dy;
            }
        }
    }
}
