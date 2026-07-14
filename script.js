document.addEventListener('DOMContentLoaded', () => {

    // --- PLAYBACK SETTINGS ---
    // Every note plays for the same length so duration never gives the answer away.
    const NOTE_DURATION = 3.0;   // seconds
    const FADE_OUT = 0.25;       // seconds, avoids a click when the sample is cut

    // --- FINGERBOARD LAYOUTS PER POSITION ---
    const positions = {
        first: {
            label: 'First position',
            layout: [
                { label: 'Open',     notes: { G: 'G3', D: 'D4', A: 'A4', E: 'E5' } },
                { label: '1st',      notes: { G: 'A3', D: 'E4', A: 'B4', E: 'F5' } },
                { label: '1st high', notes: { E: 'F#5' } },
                { label: '2nd',      notes: { G: 'B3', A: 'C5', E: 'G5' } },
                { label: '2nd high', notes: { D: 'F#4', A: 'C#5', E: 'G#5' } },
                { label: '3rd',      notes: { G: 'C4', D: 'G4', A: 'D5', E: 'A5' } },
                { label: '4th',      notes: { G: 'D4', D: 'A4', A: 'E5', E: 'B5' } }
            ]
        },
        second: {
            label: 'Second position',
            layout: [
                { label: 'Open',    notes: { G: 'G3', D: 'D4', A: 'A4', E: 'E5' } },
                { label: '1st low', notes: { D: 'F4', A: 'C5', E: 'G5' } },
                { label: '1st',     notes: { G: 'B3', D: 'F#4', A: 'C#5', E: 'G#5' } },
                { label: '2nd',     notes: { G: 'C4', D: 'G4', A: 'D5', E: 'A5' } },
                { label: '3rd',     notes: { G: 'D4', D: 'A4', A: 'E5', E: 'B5' } },
                { label: '4th',     notes: { G: 'E4', D: 'B4', A: 'F#5', E: 'C6' } }
            ]
        }
    };

    const noteFrequencies = {
        'G3': 196.00, 'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
        'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'A4': 440.00,
        'B4': 493.88, 'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25,
        'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00,
        'B5': 987.77, 'C6': 1046.50
    };

    // --- State & Audio ---
    const audioBuffers = {};
    let audioContext;
    let currentPosition = localStorage.getItem('violinPosition') || 'first';
    let currentRandomNote = null;
    let correctAnswers = 0;
    let totalPlayed = 0;
    let awaitingAnswer = false;

    const currentLayout = () => positions[currentPosition].layout;
    const currentNotes = () => [...new Set(currentLayout().flatMap(row => Object.values(row.notes)))];
    const scoresKey = () => `violinHighScores-${currentPosition}`;
    const statsKey = () => `violinNoteStats-${currentPosition}`;

    function recordNoteResult(note, selectedNote) {
        const stats = JSON.parse(localStorage.getItem(statsKey())) || {};
        const entry = stats[note] || { attempts: 0, correct: 0, confusedWith: {} };
        entry.attempts++;
        if (selectedNote === note) {
            entry.correct++;
        } else {
            entry.confusedWith[selectedNote] = (entry.confusedWith[selectedNote] || 0) + 1;
        }
        stats[note] = entry;
        localStorage.setItem(statsKey(), JSON.stringify(stats));
    }

    // Migrate scores saved before positions existed (they were all first position).
    if (localStorage.getItem('violinHighScores') && !localStorage.getItem('violinHighScores-first')) {
        localStorage.setItem('violinHighScores-first', localStorage.getItem('violinHighScores'));
        localStorage.removeItem('violinHighScores');
    }

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
    const positionButtons = document.querySelectorAll('.position-btn');
    const positionLabel = document.getElementById('position-label');
    const noteStatsList = document.getElementById('note-stats-list');
    const resetStatsBtn = document.getElementById('reset-stats-btn');

    // --- Audio Functions ---
    function initAudioContext() {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    async function loadAudioFile(note) {
        if (audioBuffers[note]) return;
        try {
            const filename = `audio/violin-${note.toLowerCase().replace('#', 's')}.wav`;
            const response = await fetch(filename);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const arrayBuffer = await response.arrayBuffer();
            audioBuffers[note] = await audioContext.decodeAudioData(arrayBuffer);
        } catch (error) {
            console.warn(`Could not load audio for ${note}, will use fallback tone.`, error);
        }
    }

    function loadAllAudio() {
        messageArea.textContent = 'Loading audio…';
        const notes = [...currentNotes(), 'C4']; // C4 is the reference note
        Promise.all(notes.map(loadAudioFile)).then(() => {
            messageArea.textContent = 'Ready. Press Play note to begin.';
        });
    }

    function playSound(note) {
        if (!audioContext) return;
        const now = audioContext.currentTime;

        if (audioBuffers[note]) {
            const buffer = audioBuffers[note];
            const duration = Math.min(NOTE_DURATION, buffer.duration);
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            source.buffer = buffer;

            gainNode.gain.setValueAtTime(1, now);
            gainNode.gain.setValueAtTime(1, now + Math.max(0, duration - FADE_OUT));
            gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            source.start(now, 0, duration);
        } else if (noteFrequencies[note]) {
            // Fallback synth, shaped to the same 3-second envelope as the samples.
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(noteFrequencies[note], now);
            gainNode.gain.setValueAtTime(0.0001, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
            gainNode.gain.setValueAtTime(0.4, now + NOTE_DURATION - FADE_OUT);
            gainNode.gain.linearRampToValueAtTime(0.0001, now + NOTE_DURATION);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(now);
            oscillator.stop(now + NOTE_DURATION);
        }
    }

    // --- UI & Game Logic ---
    function createFingerboard() {
        try {
            fingerboard.innerHTML = '';
            const strings = ['G', 'D', 'A', 'E'];

            // String header row
            strings.forEach(s => {
                const head = document.createElement('div');
                head.className = 'string-head';
                head.textContent = s;
                fingerboard.appendChild(head);
            });
            fingerboard.appendChild(document.createElement('div')); // empty label cell

            currentLayout().forEach(row => {
                const isOpen = row.label === 'Open';
                strings.forEach((stringName, i) => {
                    const noteCell = document.createElement('div');
                    noteCell.className = 'note-cell';
                    noteCell.dataset.string = stringName;
                    const noteName = row.notes[stringName];

                    if (noteName) {
                        const noteCircle = document.createElement('div');
                        noteCircle.className = 'note-circle';
                        noteCircle.dataset.note = noteName;
                        noteCircle.textContent = noteName.replace(/[0-9]/g, '');
                        if (isOpen) noteCircle.classList.add('open-string');
                        noteCell.appendChild(noteCircle);
                    }
                    fingerboard.appendChild(noteCell);
                });

                const labelCell = document.createElement('div');
                labelCell.className = 'finger-label';
                labelCell.textContent = row.label;
                fingerboard.appendChild(labelCell);

                if (isOpen) {
                    const nut = document.createElement('div');
                    nut.className = 'nut';
                    fingerboard.appendChild(nut);
                }
            });
        } catch (error) {
            console.error('Failed to create fingerboard:', error);
            fingerboard.innerHTML = "<p style='color:var(--incorrect-color);'>Error: could not draw the fingerboard.</p>";
        }
    }

    function startNewRound() {
        document.querySelectorAll('.note-circle').forEach(c => c.classList.remove('correct', 'incorrect', 'review-mode'));
        awaitingAnswer = true;
        const notes = currentNotes();
        currentRandomNote = notes[Math.floor(Math.random() * notes.length)];
        messageArea.style.color = '';
        messageArea.textContent = 'Listen…';
        setTimeout(() => {
            playSound(currentRandomNote);
            messageArea.textContent = 'Which note was that?';
        }, 500);
        playRandomNoteBtn.textContent = 'Replay note';
        playRandomNoteBtn.style.display = 'inline-block';
        playReferenceBtn.style.display = 'inline-block';
        continueBtn.style.display = 'none';
        stopBtn.style.display = 'none';
    }

    function handleAnswer(selectedNote) {
        if (!awaitingAnswer) return;
        awaitingAnswer = false;
        totalPlayed++;
        recordNoteResult(currentRandomNote, selectedNote);
        const selectedCircles = fingerboard.querySelectorAll(`[data-note="${selectedNote}"]`);
        const correctCircles = fingerboard.querySelectorAll(`[data-note="${currentRandomNote}"]`);

        if (selectedNote === currentRandomNote) {
            correctAnswers++;
            messageArea.style.color = 'var(--correct-color)';
            messageArea.textContent = 'Correct!';
            correctCircles.forEach(c => c.classList.add('correct', 'review-mode'));
        } else {
            messageArea.style.color = 'var(--incorrect-color)';
            messageArea.textContent = `Not quite. It was ${currentRandomNote}.`;
            selectedCircles.forEach(c => c.classList.add('incorrect', 'review-mode'));
            correctCircles.forEach(c => c.classList.add('correct', 'review-mode'));
        }
        scoreDisplay.textContent = `${correctAnswers} / ${totalPlayed}`;
        continueBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
    }

    function displayHighScores() {
        const highScores = JSON.parse(localStorage.getItem(scoresKey())) || [];
        scoreList.innerHTML = '';
        if (highScores.length === 0) {
            scoreList.innerHTML = '<p class="empty-note">No scores recorded yet.</p>';
            return;
        }
        const list = document.createElement('ul');
        highScores.forEach(record => {
            const item = document.createElement('li');
            const percentage = record.score.toFixed(0);
            const date = new Date(record.date).toLocaleDateString('en-GB');
            item.innerHTML = `<span class="score-percent">${percentage}% <small>(${record.correct}/${record.total})</small></span><span class="score-date">${date}</span>`;
            list.appendChild(item);
        });
        scoreList.appendChild(list);
    }

    function displayNoteStats() {
        const stats = JSON.parse(localStorage.getItem(statsKey())) || {};
        noteStatsList.innerHTML = '';
        const entries = Object.entries(stats).filter(([, s]) => s.attempts > 0);

        if (entries.length === 0) {
            noteStatsList.innerHTML = '<p class="empty-note">Play a few rounds to see which notes need work.</p>';
            resetStatsBtn.style.display = 'none';
            return;
        }
        resetStatsBtn.style.display = 'inline';

        // Weakest first; ties broken by more attempts (more evidence of trouble)
        entries.sort((a, b) =>
            (a[1].correct / a[1].attempts) - (b[1].correct / b[1].attempts) ||
            b[1].attempts - a[1].attempts
        );

        const list = document.createElement('ul');
        entries.slice(0, 6).forEach(([note, s]) => {
            const pct = Math.round((s.correct / s.attempts) * 100);
            const confusions = Object.entries(s.confusedWith).sort((a, b) => b[1] - a[1]);
            const worst = confusions.length ? confusions[0][0] : null;

            const item = document.createElement('li');
            item.innerHTML = `
                <span class="stat-note">${note}</span>
                <span class="stat-bar"><span class="stat-bar-fill" style="width:${pct}%"></span></span>
                <span class="stat-detail">${pct}% <small>(${s.correct}/${s.attempts})</small>${worst ? ` · hears as ${worst}` : ''}</span>`;
            list.appendChild(item);
        });
        noteStatsList.appendChild(list);
    }

    function setPosition(pos) {
        currentPosition = pos;
        localStorage.setItem('violinPosition', pos);
        positionButtons.forEach(b => b.classList.toggle('active', b.dataset.position === pos));
        positionLabel.textContent = positions[pos].label;
        createFingerboard();
        displayHighScores();
        displayNoteStats();
    }

    function createRipple(event) {
        const button = event.currentTarget;
        const circle = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        circle.style.width = circle.style.height = `${diameter}px`;
        circle.style.left = `${event.clientX - button.getBoundingClientRect().left - diameter / 2}px`;
        circle.style.top = `${event.clientY - button.getBoundingClientRect().top - diameter / 2}px`;
        circle.classList.add('ripple');
        button.querySelector('.ripple')?.remove();
        button.appendChild(circle);
    }

    // --- Event Listeners ---
    document.querySelectorAll('.btn').forEach(b => b.addEventListener('click', createRipple));

    positionButtons.forEach(btn => {
        btn.addEventListener('click', () => setPosition(btn.dataset.position));
    });

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

    playReferenceBtn.addEventListener('click', () => playSound('C4'));

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
        if (totalPlayed > 0) {
            const record = { score, correct: correctAnswers, total: totalPlayed, date: new Date().toISOString() };
            const highScores = JSON.parse(localStorage.getItem(scoresKey())) || [];
            highScores.push(record);
            highScores.sort((a, b) => b.score - a.score || b.total - a.total);
            localStorage.setItem(scoresKey(), JSON.stringify(highScores.slice(0, 3)));
        }
        correctAnswers = 0;
        totalPlayed = 0;
        currentRandomNote = null;
        awaitingAnswer = false;
        playRandomNoteBtn.textContent = 'Play note';
        scoreDisplay.textContent = '0 / 0';
        messageArea.style.color = '';
        messageArea.textContent = 'Press Play note to begin';
        displayHighScores();
        displayNoteStats();
        practiceScreen.classList.remove('active');
        startScreen.classList.add('active');
    });

    resetStatsBtn.addEventListener('click', () => {
        if (confirm(`Reset note stats for ${positions[currentPosition].label.toLowerCase()}?`)) {
            localStorage.removeItem(statsKey());
            displayNoteStats();
        }
    });

    // --- Initial Setup ---
    setPosition(currentPosition);
});
