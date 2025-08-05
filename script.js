document.addEventListener('DOMContentLoaded', () => {

    // --- Configuration & State ---
    const notes = {
        G: ['G3', 'A3', 'B3', 'C4'],
        D: ['D4', 'E4', 'F#4', 'G4'],
        A: ['A4', 'B4', 'C#5', 'D5'],
        E: ['E5', 'F#5', 'G#5', 'A5']
    };

    // Note frequencies for synthesized audio (placeholder)
    const noteFrequencies = {
        'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63,
        'D4': 293.66, 'E4': 329.63, 'F#4': 369.99, 'G4': 392.00,
        'A4': 440.00, 'B4': 493.88, 'C#5': 554.37, 'D5': 587.33,
        'E5': 659.25, 'F#5': 739.99, 'G#5': 830.61, 'A5': 880.00
    };

    let audioContext; // Will be initialized on first user interaction

    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const practiceScreen = document.getElementById('practice-screen');
    const startBtn = document.getElementById('start-btn');
    const fingerboard = document.getElementById('fingerboard');
    const playReferenceBtn = document.getElementById('play-reference-note-btn');

    // --- Audio Functions ---
    
    // Function to initialize the AudioContext
    function initAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    // Function to play a synthesized tone
    function playTone(note, duration = 0.5) {
        if (!audioContext) return;
        
        const frequency = noteFrequencies[note];
        if (!frequency) {
            console.error(`Frequency for note ${note} not found.`);
            return;
        }

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine'; // A simple, clean tone
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    }

    // --- UI Functions ---
    
    // Create the fingerboard dynamically
    function createFingerboard() {
        fingerboard.innerHTML = ''; // Clear existing content
        for (const stringName of Object.keys(notes)) {
            const stringDiv = document.createElement('div');
            stringDiv.className = 'string';
            
            notes[stringName].forEach((noteName, index) => {
                const noteCircle = document.createElement('div');
                noteCircle.className = 'note-circle';
                noteCircle.dataset.note = noteName;
                noteCircle.textContent = noteName.replace(/[0-9#]/g, ''); // Display note letter only
                
                // The first note of each array is the open string
                if (index === 0) {
                    noteCircle.classList.add('open-string');
                }
                
                stringDiv.appendChild(noteCircle);
            });
            
            fingerboard.appendChild(stringDiv);
        }
    }

    // --- Event Listeners ---
    
    // Switch from start screen to practice screen
    startBtn.addEventListener('click', () => {
        initAudioContext(); // Initialize audio on user action
        startScreen.classList.remove('active');
        practiceScreen.classList.add('active');
    });

    // Handle clicks on the fingerboard using event delegation
    fingerboard.addEventListener('click', (e) => {
        if (e.target.classList.contains('note-circle')) {
            const note = e.target.dataset.note;
            playTone(note);
        }
    });

    // Play reference note
    playReferenceBtn.addEventListener('click', () => {
        initAudioContext(); // Ensure context is ready
        playTone('G3');
    });

    // --- Initial Setup ---
    createFingerboard();

});
