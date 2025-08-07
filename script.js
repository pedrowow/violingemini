document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration & State ---
    const notes = {
        G: ['G3', 'A3', 'B3', 'C4'],
        D: ['D4', 'E4', 'F#4', 'G4'],
        A: ['A4', 'B4', 'C#5', 'D5'],
        E: ['E5', 'F#5', 'G#5', 'A5']
    };
    const allNotes = Object.values(notes).flat();
    const audioBuffers = {};

    let audioContext;
    let currentRandomNote = null;
    let lastSelectedNote = null;
    let correctAnswers = 0;
    let totalPlayed = 0;
    let awaitingAnswer = false;

    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const practiceScreen = document.getElementById('practice-screen');
    const scoreDisplay = document.getElementById('score-display');
    const scoreList = document.getElementById('score-list');
    const fingerboard = document.getElementById('fingerboard');
    const messageArea = document.getElementById('message-area');
    const startBtn = document.getElementById('start-btn');
    const playRandomNoteBtn = document.getElementById('play-random-note-btn');
    const playReferenceBtn = document.getElementById('play-reference-note-btn');
    const continueBtn = document.getElementById('continue-btn');
    const stopBtn = document.getElementById('stop-btn');

    // --- Audio Functions ---
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    async function loadAudioFile(note) {
        try {
            const filename = `violin-${note.toLowerCase().replace('#', 's')}.wav`;
            const response = await fetch(filename);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[note] = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.error(`Could not load audio for ${note}:`, error);
        }
    }
    
    function loadAllAudio() {
        messageArea.textContent = 'Loading audio files...';
        const loadPromises = allNotes.map(loadAudioFile);
        Promise.all(loadPromises).then(() => {
            messageArea.textContent = 'Audio loaded. Click "Play Note" to start.';
        });
    }

    function playSound(note) {
        if (!audioContext || !audioBuffers[note]) {
            console.error(`Audio for ${note} not ready.`);
            return;
        }
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffers[note];
        source.connect(audioContext.destination);
        source.start(0);
    }

    // --- UI & Game Logic Functions ---
    function createFingerboard() {
        fingerboard.innerHTML = '';
        Object.keys(notes).forEach(stringName => {
            const stringDiv = document.createElement('div');
            stringDiv.className = 'string';
            notes[stringName].forEach((noteName, index) => {
                const noteCircle = document.createElement('div');
                noteCircle.className = 'note-circle';
                noteCircle.dataset.note = noteName;
                noteCircle.textContent = noteName.replace(/[0-9#]/g, '');
                if (index === 0) noteCircle.classList.add('open-string');
                stringDiv.appendChild(noteCircle);
            });
            fingerboard.appendChild(stringDiv);
        });
    }

    function startNewRound() {
        document.querySelectorAll('.note-circle').forEach(c => {
            c.classList.remove('correct', 'incorrect', 'review-mode');
        });
        
        awaitingAnswer = true;
        currentRandomNote = allNotes[Math.floor(Math.random() * allNotes.length)];
        
        messageArea.textContent = 'Listen...';
        setTimeout(() => {
            playSound(currentRandomNote);
            messageArea.textContent = 'What note was that?';
        }, 500);

        playRandomNoteBtn.textContent = 'Replay Note';
        playRandomNoteBtn.style.display = 'inline-block';
        playReferenceBtn.style.display = 'inline-block';
        continueBtn.style.display = 'none';
        stopBtn.style.display = 'none';
    }

    function handleAnswer(selectedNote) {
        if (!awaitingAnswer) return;
        
        awaitingAnswer = false;
        lastSelectedNote = selectedNote;
        totalPlayed++;
        
        const selectedCircle = fingerboard.querySelector(`[data-note="${selectedNote}"]`);
        const correctCircle = fingerboard.querySelector(`[data-note="${currentRandomNote}"]`);

        if (selectedNote === currentRandomNote) {
            correctAnswers++;
            messageArea.style.color = 'var(--correct-color)';
            messageArea.textContent = 'Correct!';
            selectedCircle.classList.add('correct', 'review-mode');
        } else {
            messageArea.style.color = 'var(--incorrect-color)';
            messageArea.textContent = `Incorrect. The correct note was ${currentRandomNote}.`;
            selectedCircle.classList.add('incorrect', 'review-mode');
            correctCircle.classList.add('correct', 'review-mode');
        }

        scoreDisplay.textContent = `${correctAnswers} / ${totalPlayed}`;
        continueBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
    }

    function displayHighScores() {
        const highScores = JSON.parse(localStorage.getItem('violinHighScores')) || [];
        scoreList.innerHTML = '';
        
        if (highScores.length === 0) {
            scoreList.innerHTML = '<p>No scores recorded yet.</p>';
            return;
        }

        const list = document.createElement('ul');
        highScores.forEach(record => {
            const item = document.createElement('li');
            const percentage = record.score.toFixed(0);
            const date = new Date(record.date).toLocaleDateString('en-GB');
            item.innerHTML = `
                <span class="score-percent">${percentage}% (${record.correct}/${record.total})</span>
                <span class="score-date">${date}</span>
            `;
            list.appendChild(item);
        });
        scoreList.appendChild(list);
    }
    
    // --- Material Design Ripple Effect for Buttons ---
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
        circle.classList.add("ripple");

        const ripple = button.getElementsByClassName("ripple")[0];
        if (ripple) {
            ripple.remove();
        }
        button.appendChild(circle);
    }

    // --- Event Listeners ---
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', createRipple);
    });

    startBtn.addEventListener('click', () => {
        initAudioContext();
        loadAllAudio();
        startScreen.classList.remove('active');
        practiceScreen.classList.add('active');
    });

    playRandomNoteBtn.addEventListener('click', () => {
        if (currentRandomNote) {
            playSound(currentRandomNote);
        } else {
            startNewRound();
        }
    });

    playReferenceBtn.addEventListener('click', () => playSound('G3'));

    fingerboard.addEventListener('click', (e) => {
        const circle = e.target;
        if (circle.classList.contains('note-circle')) {
            const note = circle.dataset.note;
            if (awaitingAnswer) {
                handleAnswer(note);
            } else if (circle.classList.contains('review-mode')) {
                playSound(note);
            }
        }
    });

    continueBtn.addEventListener('click', startNewRound);

    stopBtn.addEventListener('click', () => {
        const score = totalPlayed > 0 ? (correctAnswers / totalPlayed) * 100 : 0;
        const scoreRecord = { score, correct: correctAnswers, total: totalPlayed, date: new Date().toISOString() };
        
        const highScores = JSON.parse(localStorage.getItem('violinHighScores')) || [];
        highScores.push(scoreRecord);
        highScores.sort((a, b) => {
            if (b.score === a.score) {
                return b.total - a.total;
            }
            return b.score - a.score;
        });
        localStorage.setItem('violinHighScores', JSON.stringify(highScores.slice(0, 3)));

        correctAnswers = 0;
        totalPlayed = 0;
        currentRandomNote = null;
        scoreDisplay.textContent = `0 / 0`;
        displayHighScores();
        practiceScreen.classList.remove('active');
        startScreen.classList.add('active');
    });

    // --- Initial Setup ---
    createFingerboard();
    displayHighScores();
});
