document.addEventListener('DOMContentLoaded', () => {

    // --- FINGERBOARD DATA AND NOTE LISTS ---
    const fingerboardLayout = [
        { label: 'Open string', notes: { G: 'G3', D: 'D4', A: 'A4', E: 'E5' } },
        { label: '1st finger', notes: { G: 'A3', D: 'E4', A: 'B4', E: 'F5' } },
        { label: '1st finger high', notes: { E: 'F#5' } },
        { label: '2nd finger', notes: { G: 'B3', A: 'C5', E: 'G5' } },
        { label: '2nd finger high', notes: { D: 'F#4', A: 'C#5', E: 'G#5' } },
        { label: '3rd finger', notes: { G: 'C4', D: 'G4', A: 'D5', E: 'A5' } },
        { label: '4th finger', notes: { G: 'D4', D: 'A4', A: 'E5', E: 'B5' } }
    ];

    const allNotes = [...new Set(fingerboardLayout.flatMap(row => Object.values(row.notes)))];
    
    const noteFrequencies = {
        'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 
        'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00, 'B5': 987.77
    };
    
    // --- State & Audio ---
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
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    async function loadAudioFile(note) {
        if (audioBuffers[note]) return;
        try {
            const filename = `violin-${note.toLowerCase().replace('#', 's')}.wav`;
            const response = await fetch(filename);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[note] = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn(`Could not load audio for ${note}, will use fallback tone.`, error);
        }
    }
    function loadAllAudio() {
        messageArea.textContent = 'Loading audio files...';
        Promise.all(allNotes.map(loadAudioFile)).then(() => {
            messageArea.textContent = 'Audio loaded. Click "Play Note" to start.';
        });
    }
    function playSound(note) {
        if (!audioContext) return;
        if (audioBuffers[note]) {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[note];
            source.connect(audioContext.destination);
            source.start(0);
        } else if (noteFrequencies[note]) { // Fallback to synth
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(noteFrequencies[note], audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
    }

    // --- UI & Game Logic ---
    function createFingerboard() {
        try {
            fingerboard.innerHTML = ''; 
            const strings = ['G', 'D', 'A', 'E'];
            
            fingerboardLayout.forEach(row => {
                strings.forEach(stringName => {
                    const noteCell = document.createElement('div');
                    noteCell.className = 'note-cell';
                    const noteName = row.notes[stringName];

                    if (noteName) {
                        const noteCircle = document.createElement('div');
                        noteCircle.className = 'note-circle';
                        noteCircle.dataset.note = noteName;
                        
                        // --- THIS IS THE MODIFIED LINE ---
                        // It now removes only numbers, keeping the '#' symbol.
                        noteCircle.textContent = noteName.replace(/[0-9]/g, '');
                        
                        if (row.label === 'Open string') {
                            noteCircle.classList.add('open-string');
                        }
                        noteCell.appendChild(noteCircle);
                    }
                    fingerboard.appendChild(noteCell);
                });

                const labelCell = document.createElement('div');
                labelCell.className = 'finger-label';
                labelCell.textContent = row.label;
                fingerboard.appendChild(labelCell);
            });
        } catch (error) {
            console.error("Failed to create fingerboard:", error);
            fingerboard.innerHTML = "<p style='color:red;'>Error: Could not draw the fingerboard.</p>";
        }
    }

    function startNewRound() {
        document.querySelectorAll('.note-circle').forEach(c => c.classList.remove('correct', 'incorrect', 'review-mode'));
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
        const selectedCircles = fingerboard.querySelectorAll(`[data-note="${selectedNote}"]`);
        const correctCircles = fingerboard.querySelectorAll(`[data-note="${currentRandomNote}"]`);

        if (selectedNote === currentRandomNote) {
            correctAnswers++;
            messageArea.style.color = 'var(--correct-color)';
            messageArea.textContent = 'Correct!';
            correctCircles.forEach(c => c.classList.add('correct', 'review-mode'));
        } else {
            messageArea.style.color = 'var(--incorrect-color)';
            messageArea.textContent = `Incorrect. The correct note was ${currentRandomNote}.`;
            selectedCircles.forEach(c => c.classList.add('incorrect', 'review-mode'));
            correctCircles.forEach(c => c.classList.add('correct', 'review-mode'));
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
            item.innerHTML = `<span class="score-percent">${percentage}% (${record.correct}/${record.total})</span><span class="score-date">${date}</span>`;
            list.appendChild(item);
        });
        scoreList.appendChild(list);
    }
    
    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement("span");
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - diameter / 2}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - diameter / 2}px`;
        circle.classList.add("ripple");
        button.querySelector(".ripple")?.remove();
        button.appendChild(circle);
    }

    // --- Event Listeners ---
    document.querySelectorAll('.btn').forEach(b => b.addEventListener('click', createRipple));
    startBtn.addEventListener('click', () => {
        initAudioContext();
        loadAllAudio();
        startScreen.classList.remove('active');
        practiceScreen.classList.add('active');
    });
    playRandomNoteBtn.addEventListener('click', () => {
        if (currentRandomNote) playSound(currentRandomNote);
        else startNewRound();
    });
    playReferenceBtn.addEventListener('click', () => playSound('G3'));
    fingerboard.addEventListener('click', e => {
        if (e.target.classList.contains('note-circle')) {
            const note = e.target.dataset.note;
            if (awaitingAnswer) handleAnswer(note);
            else if (e.target.classList.contains('review-mode')) playSound(note);
        }
    });
    continueBtn.addEventListener('click', startNewRound);
    stopBtn.addEventListener('click', () => {
        const score = totalPlayed > 0 ? (correctAnswers / totalPlayed) * 100 : 0;
        const record = { score, correct: correctAnswers, total: totalPlayed, date: new Date().toISOString() };
        const highScores = JSON.parse(localStorage.getItem('violinHighScores')) || [];
        highScores.push(record);
        highScores.sort((a, b) => b.score - a.score || b.total - a.total);
        localStorage.setItem('violinHighScores', JSON.stringify(highScores.slice(0, 3)));
        correctAnswers = 0;
        totalPlayed = 0;
        currentRandomNote = null;
        scoreDisplay.textContent = '0 / 0';
        displayHighScores();
        practiceScreen.classList.remove('active');
        startScreen.classList.add('active');
    });

    // --- Initial Setup ---
    createFingerboard();
    displayHighScores();
});
