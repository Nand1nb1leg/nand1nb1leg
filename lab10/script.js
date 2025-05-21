// --- Global Variables (used across pages) ---
const NICKNAME_COOKIE_NAME = 'hangmanNickname';
const TOP_SCORES_LOCAL_STORAGE_KEY = 'hangmanTopScores';
const GAME_DURATION = 60; // 1 minute in seconds

// Function to set a cookie
function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

// Function to get a cookie
function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// --- Logic for index.html (Nickname input) ---
if (document.getElementById('nickname-form')) {
    const nicknameForm = document.getElementById('nickname-form');
    const nicknameInput = document.getElementById('nickname');

    const storedNickname = getCookie(NICKNAME_COOKIE_NAME);
    if (storedNickname) {
        nicknameInput.value = storedNickname;
    }

    nicknameForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nickname = nicknameInput.value.trim();
        if (nickname) {
            setCookie(NICKNAME_COOKIE_NAME, nickname, 7); // Store for 7 days
            window.location.href = 'game.html';
        } else {
            alert('Нэрээ оруулна уу!');
        }
    });
}

// --- Logic for game.html (Hangman Game) ---
if (document.getElementById('hangman-canvas')) {
    const welcomeMessage = document.getElementById('welcome-message');
    const timerDisplay = document.getElementById('timer');
    const scoreDisplay = document.getElementById('score');
    const wordDisplay = document.getElementById('word-display');
    const hintDisplay = document.getElementById('hint-display');
    const keyboardContainer = document.getElementById('keyboard');
    const hangmanCanvas = document.getElementById('hangman-canvas');
    const restartGameBtn = document.getElementById('restart-game-btn');
    const ctx = hangmanCanvas.getContext('2d');

    let currentNickname = getCookie(NICKNAME_COOKIE_NAME) || 'Тоглогч';
    welcomeMessage.textContent = `Сайн байна уу, ${currentNickname}!`;

    let questions = [];
    let currentWord = '';
    let currentHint = '';
    let guessedLetters = [];
    let wrongGuesses = 0;
    let score = 0;
    let timer = GAME_DURATION;
    let timerInterval;
    let gameActive = false;

    // Mongolian Cyrillic Alphabet for keyboard
    const MONGOLIAN_ALPHABET = [
        'А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ё', 'Ж', 'З', 'И', 'Й', 'К', 'Л', 'М', 'Н', 'О', 'Ө', 'П', 'Р', 'С', 'Т', 'У', 'Ү', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ', 'Ъ', 'Ы', 'Ь', 'Э', 'Ю', 'Я'
    ];

    async function fetchQuestions() {
        try {
            const response = await fetch('questions.json');
            questions = await response.json();
            startGame();
        } catch (error) {
            console.error('Асуултуудыг татаж авахад алдаа гарлаа:', error);
            alert('Тоглоомын асуултуудыг ачаалахад алдаа гарлаа. Хуудсыг дахин ачаална уу.');
        }
    }

    function chooseWord() {
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selected = questions[randomIndex];
        currentWord = selected.word.toUpperCase();
        currentHint = selected.hint;
        guessedLetters = Array(currentWord.length).fill('_');
        wrongGuesses = 0;
        drawHangman();
        renderWordDisplay();
        hintDisplay.textContent = `Зөвлөгөө: ${currentHint}`;
    }

    function renderWordDisplay() {
        wordDisplay.innerHTML = '';
        guessedLetters.forEach(letter => {
            const letterSpan = document.createElement('span');
            letterSpan.classList.add('word-letter');
            letterSpan.textContent = letter;
            wordDisplay.appendChild(letterSpan);
        });
    }

    function generateKeyboard() {
        keyboardContainer.innerHTML = '';
        MONGOLIAN_ALPHABET.forEach(letter => {
            const button = document.createElement('button');
            button.classList.add('key-button');
            button.textContent = letter;
            button.dataset.letter = letter;
            button.addEventListener('click', () => handleGuess(letter));
            keyboardContainer.appendChild(button);
        });
    }

    function handleGuess(letter) {
        if (!gameActive) return;

        const keyButton = document.querySelector(`.key-button[data-letter="${letter}"]`);
        if (keyButton && keyButton.classList.contains('disabled')) return; // Prevent multiple clicks on same letter

        let found = false;
        for (let i = 0; i < currentWord.length; i++) {
            if (currentWord[i] === letter) {
                guessedLetters[i] = letter;
                found = true;
                score += 1; // Increment score for each correct letter
            }
        }

        if (found) {
            renderWordDisplay();
            scoreDisplay.textContent = `Оноо: ${score}`;
            if (!guessedLetters.includes('_')) {
                // Word guessed correctly
                setTimeout(() => {
                    alert('Баяр хүргэе! Та үгийг таалаа!');
                    nextWord();
                }, 300);
            }
        } else {
            wrongGuesses++;
            drawHangman();
            if (wrongGuesses >= 6) { // Head, Body, 2 Arms, 2 Legs = 6 parts total
                gameOver();
            }
        }

        if (keyButton) {
            keyButton.classList.add('disabled');
        }
    }

    // Hangman Drawing Logic
    function drawHangman() {
        ctx.clearRect(0, 0, hangmanCanvas.width, hangmanCanvas.height);
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;

        // Gallow
        ctx.beginPath();
        ctx.moveTo(10, 240);
        ctx.lineTo(190, 240); // Base
        ctx.moveTo(50, 240);
        ctx.lineTo(50, 10);  // Vertical post
        ctx.lineTo(150, 10); // Horizontal beam
        ctx.lineTo(150, 30); // Rope
        ctx.stroke();

        // Head (wrongGuesses >= 1)
        if (wrongGuesses >= 1) {
            ctx.beginPath();
            ctx.arc(150, 50, 20, 0, Math.PI * 2, true);
            ctx.stroke();
        }
        // Body (wrongGuesses >= 2)
        if (wrongGuesses >= 2) {
            ctx.beginPath();
            ctx.moveTo(150, 70);
            ctx.lineTo(150, 150);
            ctx.stroke();
        }
        // Left Arm (wrongGuesses >= 3)
        if (wrongGuesses >= 3) {
            ctx.beginPath();
            ctx.moveTo(150, 80);
            ctx.lineTo(120, 120);
            ctx.stroke();
        }
        // Right Arm (wrongGuesses >= 4)
        if (wrongGuesses >= 4) {
            ctx.beginPath();
            ctx.moveTo(150, 80);
            ctx.lineTo(180, 120);
            ctx.stroke();
        }
        // Left Leg (wrongGuesses >= 5)
        if (wrongGuesses >= 5) {
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.lineTo(120, 190);
            ctx.stroke();
        }
        // Right Leg (wrongGuesses >= 6)
        if (wrongGuesses >= 6) {
            ctx.beginPath();
            ctx.moveTo(150, 150);
            ctx.lineTo(180, 190);
            ctx.stroke();
        }
    }

    function nextWord() {
        chooseWord();
        enableKeyboard();
    }

    function enableKeyboard() {
        document.querySelectorAll('.key-button').forEach(button => {
            button.classList.remove('disabled');
        });
    }

    function disableKeyboard() {
        document.querySelectorAll('.key-button').forEach(button => {
            button.classList.add('disabled');
        });
    }

    function startTimer() {
        clearInterval(timerInterval);
        timer = GAME_DURATION;
        timerDisplay.textContent = `Хугацаа: ${formatTime(timer)}`;
        timerInterval = setInterval(() => {
            timer--;
            timerDisplay.textContent = `Хугацаа: ${formatTime(timer)}`;
            if (timer <= 0) {
                clearInterval(timerInterval);
                gameOver(true); // Game over due to time
            }
        }, 1000);
    }

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function saveScore(nickname, score) {
        let topScores = JSON.parse(localStorage.getItem(TOP_SCORES_LOCAL_STORAGE_KEY)) || [];

        topScores.push({ nickname, score, date: new Date().toISOString() });

        // Sort by score descending and take top 10
        topScores.sort((a, b) => b.score - a.score);
        topScores = topScores.slice(0, 10);

        localStorage.setItem(TOP_SCORES_LOCAL_STORAGE_KEY, JSON.stringify(topScores));

        // You might want to remove this alert, as we'll show the scoreboard directly.
        // If you want to keep a small notification, that's fine.
        // const currentRank = topScores.findIndex(s => s.nickname === nickname && s.score === score);
        // if (currentRank !== -1 && currentRank < 5) {
        //     alert(`Баяр хүргэе, ${nickname}! Та эхний ${currentRank + 1} орлоо! Таны оноо: ${score}`);
        // }
    }


    function gameOver(timeUp = false) {
        gameActive = false;
        clearInterval(timerInterval);
        disableKeyboard();
        saveScore(currentNickname, score);

        if (timeUp) {
            alert(`Хугацаа дууслаа! Таны оноо: ${score}`);
        } else {
            alert(`Хожигдлоо! Таны оноо: ${score}. Зөв үг: ${currentWord}`);
        }

        // Redirect to the scoreboard page
        window.location.href = 'scoreboard.html';
    }
    // Event listener for physical keyboard input
    document.addEventListener('keydown', (event) => {
        if (!gameActive) return;

        const pressedKey = event.key.toUpperCase();
        if (MONGOLIAN_ALPHABET.includes(pressedKey)) {
            const keyButton = document.querySelector(`.key-button[data-letter="${pressedKey}"]`);
            if (keyButton && !keyButton.classList.contains('disabled')) {
                handleGuess(pressedKey);
                // Simulate a click on the button to visually show it's disabled
                keyButton.classList.add('disabled');
            }
        }
    });

    function startGame() {
        score = 0;
        wrongGuesses = 0;
        scoreDisplay.textContent = `Оноо: ${score}`;
        gameActive = true;
        generateKeyboard();
        nextWord();
        startTimer();
    }

    // Initialize game on page load
    fetchQuestions();
}