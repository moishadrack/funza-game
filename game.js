let currentLang = "sw";
let currentCategory = "";
let currentGameMode = "";
let currentWords = [];

let flashcardIndex = 0;
let flashcardFlipped = false;

let quizIndex = 0;
let quizScore = 0;
let quizAnswered = false;

let matchPairs = [];
let matchSelected = null;
let matchMatched = 0;
let matchTimer = null;
let matchSeconds = 0;
let matchScore = 0;

let totalStars = parseInt(localStorage.getItem("funza_stars") || "0");

const LANG_CODES = {
    sw: "sw-KE",
    ki: "sw-KE",
    lu: "sw-KE",
    ka: "sw-KE",
    gu: "sw-KE",
    kl: "sw-KE",
    lh: "sw-KE",
    me: "sw-KE",
    ma: "sw-KE",
    so: "so-SO"
};

function init() {
    document.getElementById("total-stars").textContent = totalStars;
    buildLanguageGrid();
}

function buildLanguageGrid() {
    const grid = document.getElementById("language-grid");
    grid.innerHTML = "";

    Object.keys(LANGUAGES).forEach(code => {
        const lang = LANGUAGES[code];
        const btn = document.createElement("button");
        btn.className = "category-btn language-btn";
        btn.dataset.lang = code;
        btn.innerHTML = `
            <span class="cat-emoji">${lang.flag}</span>
            <span class="cat-name">${lang.name}</span>
            <span class="cat-greeting">${lang.greeting}</span>
        `;
        btn.onclick = () => selectLanguage(code);
        grid.appendChild(btn);
    });
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById("screen-" + id).classList.add("active");
}

function goHome() {
    showScreen("home");
    updateStarDisplay();
}

function updateStarDisplay() {
    document.getElementById("total-stars").textContent = totalStars;
    const modeStars = document.getElementById("mode-stars");
    if (modeStars) modeStars.textContent = totalStars;
}

function selectLanguage(code) {
    currentLang = code;
    const lang = LANGUAGES[code];

    document.getElementById("language-badge").textContent = lang.flag + " " + lang.name;
    document.getElementById("mode-lang-badge").textContent = lang.flag + " " + lang.name;
    document.getElementById("language-title").textContent = "Learn " + lang.name;

    document.getElementById("quiz-instruction").textContent = `What is the ${lang.name} word for:`;

    showScreen("categories");
}

function showCategories() {
    showScreen("categories");
}

function selectCategory(cat) {
    currentCategory = cat;
    currentWords = [...WORDS[currentLang][cat]];

    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.classList.remove("selected");
    });
    document.querySelector(`[data-category="${cat}"]`).classList.add("selected");

    document.getElementById("category-title").textContent = CATEGORY_INFO[cat].emoji + " " + CATEGORY_INFO[cat].name;
    showScreen("modes");
}

function showModes() {
    if (matchTimer) {
        clearInterval(matchTimer);
        matchTimer = null;
    }
    showScreen("modes");
}

function startGame(mode) {
    currentGameMode = mode;
    shuffleArray(currentWords);

    if (mode === "flashcard") {
        flashcardIndex = 0;
        flashcardFlipped = false;
        showScreen("flashcard");
        updateFlashcard();
    } else if (mode === "quiz") {
        quizIndex = 0;
        quizScore = 0;
        showScreen("quiz");
        updateQuiz();
    } else if (mode === "match") {
        matchSelected = null;
        matchMatched = 0;
        matchSeconds = 0;
        matchScore = 0;
        showScreen("match");
        setupMatch();
    }
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ===== SPEECH =====
function speak(text, langCode) {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langCode || LANG_CODES[currentLang] || "sw-KE";
        utter.rate = 0.8;
        utter.pitch = 1.1;
        window.speechSynthesis.speak(utter);
    }
}

function speakWord() {
    if (currentWords[flashcardIndex]) {
        speak(currentWords[flashcardIndex].local);
    }
}

function speakQuizWord() {
    if (currentWords[quizIndex]) {
        speak(currentWords[quizIndex].local);
    }
}

// ===== FLASHCARD =====
function updateFlashcard() {
    const word = currentWords[flashcardIndex];
    document.getElementById("card-emoji").textContent = word.emoji;
    document.getElementById("card-emoji-back").textContent = word.emoji;
    document.getElementById("card-english").textContent = word.english;
    document.getElementById("card-local").textContent = word.local;

    flashcardFlipped = false;
    document.getElementById("flashcard-inner").classList.remove("flipped");

    const progress = ((flashcardIndex + 1) / currentWords.length) * 100;
    document.getElementById("flashcard-progress").style.width = progress + "%";
    document.getElementById("flashcard-stars").textContent = totalStars;
}

function flipCard() {
    flashcardFlipped = !flashcardFlipped;
    const inner = document.getElementById("flashcard-inner");
    if (flashcardFlipped) {
        inner.classList.add("flipped");
        addStar("flashcard");
    } else {
        inner.classList.remove("flipped");
    }
}

function nextCard() {
    flashcardIndex = (flashcardIndex + 1) % currentWords.length;
    updateFlashcard();
}

function prevCard() {
    flashcardIndex = (flashcardIndex - 1 + currentWords.length) % currentWords.length;
    updateFlashcard();
}

// ===== QUIZ =====
function updateQuiz() {
    if (quizIndex >= currentWords.length) {
        showResults("quiz");
        return;
    }

    quizAnswered = false;
    const word = currentWords[quizIndex];
    document.getElementById("quiz-word").textContent = word.english;
    document.getElementById("quiz-feedback").textContent = "";

    const progress = (quizIndex / currentWords.length) * 100;
    document.getElementById("quiz-progress").style.width = progress + "%";
    document.getElementById("quiz-stars").textContent = quizScore;

    let options = generateQuizOptions(word);
    const optionsDiv = document.getElementById("quiz-options");
    optionsDiv.innerHTML = "";

    options.forEach(opt => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt;
        btn.onclick = () => checkQuizAnswer(btn, opt, word.local);
        optionsDiv.appendChild(btn);
    });

    speak(word.english, "en-US");
}

function generateQuizOptions(correctWord) {
    let options = [correctWord.local];
    const allLocal = currentWords.map(w => w.local);

    while (options.length < 4) {
        const random = allLocal[Math.floor(Math.random() * allLocal.length)];
        if (!options.includes(random)) {
            options.push(random);
        }
    }

    shuffleArray(options);
    return options;
}

function checkQuizAnswer(btn, selected, correct) {
    if (quizAnswered) return;
    quizAnswered = true;

    const allBtns = document.querySelectorAll(".quiz-option");
    allBtns.forEach(b => b.disabled = true);

    if (selected === correct) {
        btn.classList.add("correct");
        document.getElementById("quiz-feedback").textContent = "🎉 Correct!";
        document.getElementById("quiz-feedback").style.color = "#4CAF50";
        quizScore++;
        document.getElementById("quiz-stars").textContent = quizScore;
        speak(correct);
    } else {
        btn.classList.add("wrong");
        document.getElementById("quiz-feedback").textContent = "❌ It's: " + correct;
        document.getElementById("quiz-feedback").style.color = "#ff6b6b";

        allBtns.forEach(b => {
            if (b.textContent === correct) {
                b.classList.add("correct");
            }
        });
    }

    setTimeout(() => {
        quizIndex++;
        updateQuiz();
    }, 1800);
}

// ===== MATCH =====
function setupMatch() {
    const wordCount = Math.min(6, currentWords.length);
    const selectedWords = currentWords.slice(0, wordCount);

    const englishWords = shuffleArray([...selectedWords]);
    const localWords = shuffleArray([...selectedWords]);

    matchPairs = selectedWords.map(w => ({ english: w.english, local: w.local }));
    matchMatched = 0;
    matchScore = 0;
    matchSeconds = 0;

    const leftCol = document.getElementById("match-col-left");
    const rightCol = document.getElementById("match-col-right");
    leftCol.innerHTML = "";
    rightCol.innerHTML = "";

    englishWords.forEach(w => {
        const btn = document.createElement("button");
        btn.className = "match-word";
        btn.textContent = w.english;
        btn.dataset.type = "english";
        btn.dataset.value = w.english;
        btn.onclick = () => selectMatchWord(btn);
        leftCol.appendChild(btn);
    });

    localWords.forEach(w => {
        const btn = document.createElement("button");
        btn.className = "match-word";
        btn.textContent = w.local;
        btn.dataset.type = "local";
        btn.dataset.value = w.local;
        btn.onclick = () => selectMatchWord(btn);
        rightCol.appendChild(btn);
    });

    document.getElementById("match-stars").textContent = "0";

    if (matchTimer) clearInterval(matchTimer);
    matchTimer = setInterval(() => {
        matchSeconds++;
        const mins = Math.floor(matchSeconds / 60);
        const secs = matchSeconds % 60;
        document.getElementById("match-timer").textContent = `⏱ ${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

function selectMatchWord(btn) {
    if (btn.classList.contains("matched")) return;

    if (!matchSelected) {
        btn.classList.add("selected");
        matchSelected = btn;
        if (btn.dataset.type === "local") {
            speak(btn.dataset.value);
        } else {
            speak(btn.dataset.value, "en-US");
        }
    } else {
        if (matchSelected === btn) {
            btn.classList.remove("selected");
            matchSelected = null;
            return;
        }

        if (matchSelected.dataset.type === btn.dataset.type) {
            matchSelected.classList.remove("selected");
            btn.classList.add("selected");
            matchSelected = btn;
            return;
        }

        const englishVal = matchSelected.dataset.type === "english" ? matchSelected.dataset.value : btn.dataset.value;
        const localVal = matchSelected.dataset.type === "local" ? matchSelected.dataset.value : btn.dataset.value;

        const isMatch = matchPairs.some(p => p.english === englishVal && p.local === localVal);

        if (isMatch) {
            matchSelected.classList.remove("selected");
            matchSelected.classList.add("matched");
            btn.classList.add("matched");
            matchMatched++;
            matchScore++;

            document.getElementById("match-stars").textContent = matchScore;
            totalStars++;
            updateStarDisplay();

            speak(localVal);

            if (matchMatched === matchPairs.length) {
                clearInterval(matchTimer);
                setTimeout(() => showResults("match"), 800);
            }
        } else {
            matchSelected.classList.add("wrong-match");
            btn.classList.add("wrong-match");

            setTimeout(() => {
                matchSelected.classList.remove("selected", "wrong-match");
                btn.classList.remove("wrong-match");
                matchSelected = null;
            }, 600);
            return;
        }

        matchSelected = null;
    }
}

// ===== STAR SYSTEM =====
function addStar(gameMode) {
    totalStars++;
    localStorage.setItem("funza_stars", totalStars.toString());
    updateStarDisplay();
}

// ===== RESULTS =====
function showResults(gameMode) {
    showScreen("results");

    let stars = 0;
    let title = "";
    let emoji = "";

    if (gameMode === "quiz") {
        stars = quizScore;
        const pct = quizScore / currentWords.length;
        if (pct >= 0.9) { title = "Amazing!"; emoji = "🏆"; }
        else if (pct >= 0.7) { title = "Great Job!"; emoji = "🎉"; }
        else if (pct >= 0.5) { title = "Good Try!"; emoji = "👍"; }
        else { title = "Keep Practicing!"; emoji = "💪"; }
    } else if (gameMode === "match") {
        stars = matchScore;
        if (matchSeconds < 30) { title = "Speed Champion!"; emoji = "⚡"; }
        else if (matchSeconds < 60) { title = "Great Job!"; emoji = "🎉"; }
        else { title = "Well Done!"; emoji = "👏"; }
    }

    document.getElementById("results-emoji").textContent = emoji;
    document.getElementById("results-title").textContent = title;
    document.getElementById("results-score").textContent = `You earned ${stars} star${stars !== 1 ? 's' : ''}!`;

    totalStars += stars;
    localStorage.setItem("funza_stars", totalStars.toString());
    updateStarDisplay();

    const starsDiv = document.getElementById("results-stars");
    starsDiv.innerHTML = "";
    for (let i = 0; i < Math.min(stars, 10); i++) {
        const span = document.createElement("span");
        span.textContent = "⭐";
        span.className = "star-earned";
        span.style.animationDelay = (i * 0.15) + "s";
        starsDiv.appendChild(span);
    }

    launchConfetti();
}

function replayGame() {
    startGame(currentGameMode);
}

function launchConfetti() {
    const colors = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#6c63ff", "#ff9a56", "#45b7d1", "#f7dc6f"];

    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const piece = document.createElement("div");
            piece.className = "confetti-piece";
            piece.style.left = Math.random() * 100 + "vw";
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.width = (Math.random() * 10 + 5) + "px";
            piece.style.height = (Math.random() * 10 + 5) + "px";
            piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
            piece.style.animationDuration = (Math.random() * 2 + 2) + "s";
            document.body.appendChild(piece);

            setTimeout(() => piece.remove(), 4000);
        }, i * 50);
    }
}

init();
