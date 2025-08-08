document.addEventListener('DOMContentLoaded', () => {

    // --- CORRECTED FINGERBOARD DATA AND NOTE LISTS ---
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
    
    // Corrected map with no duplicate keys
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
    // ROBUST FINGERBOARD CREATION
    function createFingerboard() {
        try {
            fingerboard.innerHTML = ''; // Clear previous content
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
                        noteCircle.textContent = noteName.replace(/[0-9#]/g, '');
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
        messageArea.textContent =
