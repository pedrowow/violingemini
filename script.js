document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration & State ---
    const notes = {
        G: ['G3', 'A3', 'B3', 'C4'],
        D: ['D4', 'E4', 'F#4', 'G4'],
        A: ['A4', 'B4', 'C#5', 'D5'],
        E: ['E5', 'F#5', 'G#5', 'A5']
    };
    const allNotes = Object.values(notes).flat();

    const noteFrequencies = {
        'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63,
        'D4': 293.66, 'E4': 329.63, 'F#4': 369.99, 'G4': 392.00,
        'A4': 440.00, 'B4': 493.88, 'C#5': 554.37, 'D5': 587.33,
        'E5': 659.25, 'F#5': 739.99, 'G#5': 830.61, 'A5': 880.00
    };

    let audioContext;
    let currentRandomNote = null;
    let correctAnswers = 0;
    let totalPlayed = 0;
    let awaitingAnswer = false;

    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const practiceScreen = document.getElementById('practice-screen');
    const scoreDisplay = document.getElementById('score-display');
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

    function playTone(note, duration = 0.5) {
        if (!audioContext) return;
        const frequency = noteFrequencies[note];
        if (!frequency) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
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
        awaitingAnswer = true;
        messageArea.textContent = 'Listen for the note...';
        
        // Reset fingerboard colors
        document.querySelectorAll('.note-circle').forEach(c => c.className = c.dataset.note.includes('3') && notes.G.indexOf(c.dataset.note) === 0 ? 'note-circle open-string' : 'note-circle');
        
        // Pick and play a random note
        currentRandomNote = allNotes[Math.floor(Math.random() * allNotes.length)];
        setTimeout(() => {
            playTone(currentRandomNote, 0.8);
            messageArea.textContent = 'What note was that?';
        }, 500);

        // Update button visibility
        playRandomNoteBtn.style.display = 'inline-block';
        playRandomNoteBtn.textContent = 'Replay Note';
        playReferenceBtn.style.display = 'inline-block';
        continueBtn.style.display = 'none';
        stopBtn.style.display = 'none';
    }

    function updateScoreDisplay() {
        scoreDisplay.textContent = `Score: ${correctAnswers} / ${totalPlayed}`;
    }

    function handleAnswer(selectedNote) {
        if (!awaitingAnswer) return;
        awaitingAnswer = false;

        totalPlayed++;
        const selectedCircle = fingerboard.querySelector(`[data-note="${selectedNote}"]`);

        if (selectedNote === currentRandomNote) {
            correctAnswers++;
            messageArea.style.color = '#388E3C';
            messageArea.textContent = 'Correct!';
            selectedCircle.classList.add('correct');
        } else {
            messageArea.style.color = '#D32F2F';
            messageArea.textContent = `Incorrect. The correct note was ${currentRandomNote}.`;
            selectedCircle.classList.add('incorrect');
            const correctCircle = fingerboard.querySelector(`[data-note="${currentRandomNote}"]`);
            correctCircle.classList.add('correct');
        }

        updateScoreDisplay();

        // Update button visibility for post-answer
        playRandomNoteBtn.style.display = 'none';
        playReferenceBtn.style.display = 'none';
        continueBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
    }

    // --- Event Listeners ---
    startBtn.addEventListener('click', () => {
        initAudioContext();
        startScreen.classList.remove('active');
        practiceScreen.classList.add('active');
        playRandomNoteBtn.textContent = 'Play Random Note'; // Reset text on first start
    });

    playRandomNoteBtn.addEventListener('click', () => {
        if (awaitingAnswer) {
            // Replay the current note if user is still guessing
            playTone(currentRandomNote, 0.8);
        } else {
            // Start a new round
            startNewRound();
        }
    });

    playReferenceBtn.addEventListener('click', () => {
        playTone('G3');
    });

    fingerboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('note-circle')) {
            handleAnswer(e.target.dataset.note);
        }
    });

    continueBtn.addEventListener('click', startNewRound);
    
    // --- Initial Setup ---
    createFingerboard();
});
