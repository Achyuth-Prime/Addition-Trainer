const LEVELS = {
    0: { count: 4, max_val: 20, start_points: 2 },
    1: { count: 10, max_val: 20, start_points: 2 },
    2: { count: 4, max_val: 50, start_points: 2 },
    3: { count: 10, max_val: 50, start_points: 2 },
    4: { count: 4, max_val: 100, start_points: 2 },
    5: { count: 10, max_val: 100, start_points: 2 }
};

let currentLevel = null;
let numbers = [];
let correctSum = 0;
let startPoints = [];
let currentStartPointIndex = 0;
let results = [];
let startTime = 0;

const appDiv = document.getElementById('app');

function getStats() {
    const defaultStats = {};
    Object.keys(LEVELS).forEach(lvl => {
        defaultStats[lvl] = { plays: 0, avgTime: null };
    });
    try {
        const stored = localStorage.getItem('additionTrainerStats');
        if (stored) {
            return { ...defaultStats, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error("Could not read stats", e);
    }
    return defaultStats;
}

function updateStats(level, newTime, wrongCount = null) {
    const stats = getStats();
    const lvlStats = stats[level] || { plays: 0, avgTime: null, lastWrong: 0 };
    const totalPlays = lvlStats.plays;
    const oldAvg = lvlStats.avgTime || 0;
    const newPlays = totalPlays + 1;
    const newAvg = totalPlays === 0 ? newTime : ((oldAvg * totalPlays) + newTime) / newPlays;
    
    stats[level] = { plays: newPlays, avgTime: newAvg };
    if (wrongCount !== null) {
        stats[level].lastWrong = wrongCount;
    }
    
    localStorage.setItem('additionTrainerStats', JSON.stringify(stats));
    return { oldAvg: lvlStats.avgTime, newAvg: newAvg, plays: newPlays };
}

let appMode = 'main';

function init() {
    renderMainMenu();
}

function renderMainMenu() {
    appMode = 'main';
    appDiv.innerHTML = `
        <div class="glass-panel">
            <h1> Mental Math Trainer </h1>
            <div class="level-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                <div class="level-card" onclick="renderAdditionHome()">
                    <h2>➕ Addition Trainer</h2>
                </div>
                <div class="level-card" onclick="renderSquaresHome()">
                    <h2>⏹️ Squares & Cubes Trainer</h2>
                </div>
            </div>
        </div>
    `;
}

function renderAdditionHome() {
    const stats = getStats();
    appDiv.innerHTML = `
        <div class="glass-panel">
            <h1> Mental Addition Trainer </h1>
            <div class="level-grid">
                ${Object.keys(LEVELS).map(level => {
                    const lStats = stats[level];
                    const statText = lStats && lStats.plays > 0 
                        ? `<p style="color: var(--primary); font-weight: bold; margin-top: 0.5rem; font-size: 1rem;">Played: ${lStats.plays} | Avg: ${lStats.avgTime.toFixed(2)}s</p>`
                        : `<p style="color: grey; font-size: 1rem; margin-top: 0.5rem;">Not played yet</p>`;
                    return `
                    <div class="level-card" onclick="startLevel(${level})">
                        <h2>Level ${level}</h2>
                        <p>${LEVELS[level].count} numbers under ${LEVELS[level].max_val}</p>
                        ${statText}
                    </div>
                `}).join('')}
            </div>
            <div class="actions-row" style="margin-top: 3rem;">
                <button class="action-btn secondary" onclick="renderMainMenu()">Main Menu</button>
            </div>
        </div>
    `;
}

function generateNumbers(level) {
    const cfg = LEVELS[level];
    const nums = [];
    const minVal = level >= 4 ? 10 : 1;
    for (let i = 0; i < cfg.count; i++) {
        nums.push(Math.floor(Math.random() * (cfg.max_val - minVal + 1)) + minVal);
    }
    return nums;
}

function shuffle(array) {
    const arr = [...array];
    let currentIndex = arr.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
    return arr;
}

function startLevel(level) {
    currentLevel = level;
    numbers = generateNumbers(level);
    correctSum = numbers.reduce((a, b) => a + b, 0);
    
    // Pick unique start points
    const uniqueNums = [...new Set(numbers)];
    let availableStarts = uniqueNums;
    if(availableStarts.length < LEVELS[level].start_points) {
        availableStarts = [...numbers];
    }
    
    startPoints = shuffle(availableStarts).slice(0, LEVELS[level].start_points);
    currentStartPointIndex = 0;
    results = [];
    
    renderGame();
}

function renderGame() {
    if (currentStartPointIndex >= startPoints.length) {
        renderSummary();
        return;
    }

    const currentStartPoint = startPoints[currentStartPointIndex];
    
    appDiv.innerHTML = `
        <div class="glass-panel game-container" style="animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
            <h2>Level ${currentLevel} - Round ${currentStartPointIndex + 1} / ${startPoints.length}</h2>
            
            <div class="circle-container" id="circle-container"></div>
            
            <div class="input-section">
                <p>Begin adding from: <span class="start-point-highlight">${currentStartPoint}</span></p>
                <form id="answer-form">
                    <input type="number" id="sum-input" class="sum-input" autocomplete="off" autofocus required placeholder="Total sum?">
                    <br>
                    <button type="submit" class="submit-btn" id="submit-btn">Submit Answer</button>
                </form>
            </div>
        </div>
    `;

    renderCircle(numbers, currentStartPoint);
    
    const form = document.getElementById('answer-form');
    const input = document.getElementById('sum-input');
    
    // Slight timeout before starting timer
    setTimeout(() => {
        input.focus();
        startTime = performance.now();
    }, 100);

    form.onsubmit = (e) => {
        e.preventDefault();
        const endTime = performance.now();
        const answer = parseInt(input.value);
        
        results.push({
            startPoint: currentStartPoint,
            userAnswer: answer,
            correct: answer === correctSum,
            time: ((endTime - startTime) / 1000).toFixed(2)
        });
        
        currentStartPointIndex++;
        renderGame();
    };
}

function renderCircle(nums, currentStartPoint) {
    const container = document.getElementById('circle-container');
    const n = nums.length;
    // Radius in percentage to scale automatically with container size
    const radiusPercent = 40.625; 
    
    let highlighted = false;
    
    nums.forEach((num, index) => {
        const angle = (index / n) * 2 * Math.PI - Math.PI / 2; // Start from top
        
        // Calculate x and y in percentages
        const xPercent = 50 + radiusPercent * Math.cos(angle); 
        const yPercent = 50 + radiusPercent * Math.sin(angle);
        
        const orb = document.createElement('div');
        orb.className = 'number-orb';
        orb.style.left = `${xPercent}%`;
        orb.style.top = `${yPercent}%`;
        orb.innerText = num;
        
        if (num === currentStartPoint && !highlighted) {
            orb.classList.add('highlighted');
            highlighted = true;
        }
        
        container.appendChild(orb);
    });
}

function renderSummary() {
    const totalTime = results.reduce((acc, r) => acc + parseFloat(r.time), 0);
    const avgTimePerProblem = totalTime / results.length;
    const { oldAvg, newAvg } = updateStats(currentLevel, avgTimePerProblem);

    let html = `
        <div class="glass-panel">
            <h1>Level ${currentLevel} Summary</h1>
            
            <div class="summary-details">
                <div class="detail-item" style="flex: 2;">
                    <div class="detail-label">Full Sequence</div>
                    <div class="detail-value" style="font-size: 2rem;">${numbers.join(' + ')}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Correct Sum</div>
                    <div class="detail-value text-success">${correctSum}</div>
                </div>
            </div>

            <div class="summary-details" style="margin-top: -1.5rem;">
                <div class="detail-item">
                    <div class="detail-label">Old Avg</div>
                    <div class="detail-value" style="color: var(--text-muted); font-size: 1.8rem;">${oldAvg ? oldAvg.toFixed(2) + 's' : '---'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">This Avg</div>
                    <div class="detail-value" style="font-size: 1.8rem;">${avgTimePerProblem.toFixed(2)}s</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">New Avg</div>
                    <div class="detail-value" style="color: var(--primary); font-size: 1.8rem;">${newAvg.toFixed(2)}s</div>
                </div>
            </div>
            
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Start Point</th>
                        <th>Your Answer</th>
                        <th>Time (s)</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    results.forEach(r => {
        const valueClass = r.correct ? 'text-success' : 'text-error';
        const icon = r.correct ? '✅' : '❌';
        html += `
                    <tr>
                        <td style="font-weight: 600;">${r.startPoint}</td>
                        <td class="${valueClass}">${r.userAnswer}</td>
                        <td>${r.time}</td>
                        <td class="result-icon">${icon}</td>
                    </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
            
            <div class="actions-row">
                <button class="action-btn" onclick="startLevel(currentLevel)">Retry Level ${currentLevel}</button>
                <button class="action-btn secondary" onclick="renderAdditionHome()">Addition Menu</button>
            </div>
        </div>
    `;
    
    appDiv.innerHTML = html;
}

// ==========================================
// SQUARES & CUBES TRAINER
// ==========================================
let sqMode = null;
let sqQuestions = [];
let sqResults = [];
let sqWrongCount = 0;
let sqCurrentQ = null;
let sqQuestionStartTime = 0;

function getSquaresData() {
    const questions = [];
    for(let i=1; i<=40; i++) questions.push({ q: `${i}²`, a: i*i });
    return questions;
}

function getCubesData() {
    const questions = [];
    for(let i=1; i<=20; i++) questions.push({ q: `${i}³`, a: i*i*i });
    return questions;
}

function renderSquaresHome() {
    appMode = 'squares';
    const stats = getStats();
    
    function createStatCard(modeId, title, desc) {
        const s = stats[`sq_${modeId}`] || { plays: 0, avgTime: null, lastWrong: 0 };
        const text = s.plays > 0 
            ? `<p style="color: var(--primary); font-weight: bold; margin-top: 0.5rem; font-size: 1rem;">Played: ${s.plays} | Avg: ${s.avgTime.toFixed(2)}s <br> PIA: ${s.lastWrong || 0}</p>`
            : `<p style="color: grey; font-size: 1rem; margin-top: 0.5rem;">Not played yet</p>`;
        return `
            <div class="level-card" onclick="startSquaresLevel('${modeId}')">
                <h2>${title}</h2>
                <p>${desc}</p>
                ${text}
            </div>
        `;
    }

    appDiv.innerHTML = `
        <div class="glass-panel">
            <h1> Squares & Cubes </h1>
            <div class="level-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
                ${createStatCard('rapid', 'Rapid (10 Qs)', 'Random Sample')}
                ${createStatCard('absolute', 'Absolute (60 Qs)', 'All Squares & Cubes')}
                ${createStatCard('sq_ord', 'Squares Ordered', 'Squares 1-40 (In Order)')}
                ${createStatCard('sq_rand', 'Squares Random', 'Squares 1-40 (Shuffled)')}
                ${createStatCard('cb_ord', 'Cubes Ordered', 'Cubes 1-20 (In Order)')}
                ${createStatCard('cb_rand', 'Cubes Random', 'Cubes 1-20 (Shuffled)')}
            </div>
            <div class="actions-row" style="margin-top: 3rem;">
                <button class="action-btn secondary" onclick="renderMainMenu()">Main Menu</button>
            </div>
        </div>
    `;
}

function startSquaresLevel(mode) {
    sqMode = mode;
    sqWrongCount = 0;
    sqResults = [];

    const squares = getSquaresData();
    const cubes = getCubesData();
    
    if (mode === 'rapid') {
        let pool = squares.concat(cubes);
        sqQuestions = shuffle(pool).slice(0, 10);
    } else if (mode === 'absolute') {
        let pool = squares.concat(cubes);
        sqQuestions = shuffle(pool);
    } else if (mode === 'sq_rand') {
        sqQuestions = shuffle([...squares]);
    } else if (mode === 'sq_ord') {
        sqQuestions = [...squares];
    } else if (mode === 'cb_rand') {
        sqQuestions = shuffle([...cubes]);
    } else if (mode === 'cb_ord') {
        sqQuestions = [...cubes];
    }
    
    renderSquaresGame();
}

function renderSquaresGame() {
    if (sqQuestions.length === 0) {
        renderSquaresSummary();
        return;
    }
    
    sqCurrentQ = sqQuestions.shift();
    
    const modeNames = {
        'rapid': 'Rapid', 'absolute': 'Absolute', 'sq_rand': 'Squares Random',
        'sq_ord': 'Squares Ordered', 'cb_rand': 'Cubes Random', 'cb_ord': 'Cubes Ordered'
    };
    const modeTitle = modeNames[sqMode] || 'Trainer';

    appDiv.innerHTML = `
        <div class="glass-panel game-container" style="animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
            <h2>${modeTitle} Mode - ${sqQuestions.length + 1} remaining</h2>
            
            <div style="font-size: 6rem; font-weight: bold; margin: 3rem 0; color: var(--text-main); text-shadow: 0 0 20px var(--primary-glow);">${sqCurrentQ.q} = ?</div>
            
            <div class="input-section">
                <form id="sq-answer-form">
                    <input type="number" id="sq-input" class="sum-input" autocomplete="off" autofocus required placeholder="Answer">
                    <br>
                    <button type="submit" class="submit-btn" id="submit-btn">Submit Answer</button>
                </form>
            </div>
        </div>
    `;
    
    const form = document.getElementById('sq-answer-form');
    const input = document.getElementById('sq-input');
    
    setTimeout(() => {
        input.focus();
        sqQuestionStartTime = performance.now();
    }, 100);

    form.onsubmit = (e) => {
        e.preventDefault();
        const endTime = performance.now();
        const t = ((endTime - sqQuestionStartTime) / 1000);
        const answer = parseInt(input.value);
        
        if (answer === sqCurrentQ.a) {
            sqResults.push(t);
            renderSquaresGame(); 
        } else {
            sqWrongCount++;
            sqQuestions.push(sqCurrentQ); // Re-queue at the end
            showSquaresFeedback(sqCurrentQ.q, sqCurrentQ.a);
        }
    };
}

function showSquaresFeedback(q, a) {
    appDiv.innerHTML = `
        <div class="glass-panel game-container" style="border-color: var(--error); box-shadow: 0 0 30px rgba(255,0,0,0.3);">
            <h2 style="color: var(--error); font-size: 2rem;">Incorrect!</h2>
            <div style="font-size: 5rem; font-weight: bold; margin: 3rem 0; color: var(--text-main);">
                ${q} = <span style="color: var(--success); text-shadow: 0 0 20px var(--success);">${a}</span>
            </div>
            <p style="font-size: 1.5rem; color: var(--text-muted); margin-bottom: 2rem;">Memorize it. We'll ask you this again later.</p>
            <button class="submit-btn" id="got-it-btn" onclick="renderSquaresGame()">Got it!</button>
        </div>
    `;
    setTimeout(() => {
        document.getElementById('got-it-btn').focus();
    }, 100);
}

function renderSquaresSummary() {
    const totalTime = sqResults.reduce((a, b) => a + b, 0);
    // sqResults only records successful answers, so length equals number of questions solved correctly
    const avgTimePerProblem = totalTime / sqResults.length;
    const statKey = `sq_${sqMode}`;
    const { oldAvg, newAvg } = updateStats(statKey, avgTimePerProblem, sqWrongCount);

    const modeNames = {
        'rapid': 'Rapid', 'absolute': 'Absolute', 'sq_rand': 'Squares Random',
        'sq_ord': 'Squares Ordered', 'cb_rand': 'Cubes Random', 'cb_ord': 'Cubes Ordered'
    };
    const modeTitle = modeNames[sqMode] || 'Trainer';

    appDiv.innerHTML = `
        <div class="glass-panel">
            <h1>${modeTitle} Summary</h1>
            
            <div class="summary-details">
                <div class="detail-item">
                    <div class="detail-label">Questions Solved</div>
                    <div class="detail-value text-success">${sqResults.length}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Mistakes Made</div>
                    <div class="detail-value text-error">${sqWrongCount}</div>
                </div>
            </div>
            
            <div class="summary-details" style="margin-top: -1.5rem;">
                <div class="detail-item">
                    <div class="detail-label">Old Avg</div>
                    <div class="detail-value" style="color: var(--text-muted); font-size: 1.8rem;">${oldAvg ? oldAvg.toFixed(2) + 's' : '---'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">This Avg</div>
                    <div class="detail-value" style="font-size: 1.8rem;">${avgTimePerProblem.toFixed(2)}s</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">New Avg</div>
                    <div class="detail-value" style="color: var(--primary); font-size: 1.8rem;">${newAvg.toFixed(2)}s</div>
                </div>
            </div>
            
            <div class="actions-row">
                <button class="action-btn" onclick="startSquaresLevel('${sqMode}')">Retry</button>
                <button class="action-btn secondary" onclick="renderSquaresHome()">Squares Menu</button>
            </div>
        </div>
    `;
}

// Start app
init();
