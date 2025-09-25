const COLS = 5;
let currentRow = 0;
let wordList = [];

// DOM elements
const board = document.getElementById('board');
const solveBtn = document.getElementById('solve-btn');
const resetBtn = document.getElementById('reset-btn');
const resultsDiv = document.getElementById('results');

solveBtn.addEventListener('click', solve);
resetBtn.addEventListener('click', resetGame);

// Background buttons
document.getElementById('bg-change-btn').addEventListener('click', changeBackground);
document.getElementById('bg-toggle-btn').addEventListener('click', toggleBackground);

// Load words
fetch('words.txt')
  .then(res => res.text())
  .then(text => wordList = text.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean));

// --- UI Functions ---
function createRow() {
  const rowDiv = document.createElement('div');
  rowDiv.className = 'row';
  rowDiv.dataset.row = currentRow;

  for (let c = 0; c < COLS; c++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 1;
    input.className = 'cell gray';
    input.dataset.col = c;
    input.dataset.row = currentRow;

    input.addEventListener('input', e => handleInput(e, input));
    input.addEventListener('keydown', e => handleBackspace(e, input));
    input.addEventListener('click', () => cycleColor(input));
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter') solve();
    });

    rowDiv.appendChild(input);
  }

  board.appendChild(rowDiv);
  rowDiv.querySelector('input').focus();
}

function handleInput(e, cell) {
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);
  cell.value = cell.value.toUpperCase();
  const cells = document.querySelectorAll(`.row[data-row='${row}'] .cell`);
  if (col < COLS - 1 && cell.value) cells[col + 1].focus();
}

function handleBackspace(e, cell) {
  if (e.key === 'Backspace') {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const cells = document.querySelectorAll(`.row[data-row='${row}'] .cell`);
    if (cell.value) cell.value = '';
    else if (col > 0) {
      cells[col-1].focus();
      cells[col-1].value = '';
    }
    e.preventDefault();
  }
}

function cycleColor(cell) {
  if (!cell.readOnly) {
    if (cell.classList.contains('gray')) cell.classList.replace('gray','yellow');
    else if (cell.classList.contains('yellow')) cell.classList.replace('yellow','green');
    else if (cell.classList.contains('green')) cell.classList.replace('green','gray');
  }
}

function scoreWord(word, allWords) {
  const freq = {};
  for(const w of allWords) [...new Set(w)].forEach(l=>freq[l]=(freq[l]||0)+1);
  return [...new Set(word)].reduce((sum,l)=>sum+(freq[l]||0),0);
}

function suggestBestWord(words) {
  if(!words.length) return null;
  const scored = words.map(w=>({word:w,score:scoreWord(w,words)}));
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].word;
}

function fillGuess(word) {
  const cells = document.querySelectorAll(`.row[data-row='${currentRow}'] .cell`);
  for (let i=0; i<COLS; i++) cells[i].value = word[i].toUpperCase();
  cells[0].focus();
}

// --- Solve Function ---
function solve() {
  if (!wordList.length) { alert('Words loading'); return; }

  const cells = document.querySelectorAll(`.row[data-row='${currentRow}'] .cell`);
  const guess = [...cells].map(c=>c.value.toLowerCase()).join('');

  // Validate
  if (guess.length < COLS || [...cells].some(c => !c.value)) {
    document.getElementById('warning').style.display = 'block';
    document.getElementById('invalid').style.display = 'none';
    return;
  } else document.getElementById('warning').style.display = 'none';

  if (!wordList.includes(guess)) {
    document.getElementById('invalid').style.display = 'block';
    return;
  } else document.getElementById('invalid').style.display = 'none';

  // Check if all green
  if ([...cells].every(c => c.classList.contains('green'))) {
    resultsDiv.innerHTML = `<h3>🎉 You solved it! The word is <strong>${guess.toUpperCase()}</strong></h3>`;
    return;
  }

  const correct = Array(COLS).fill(null);
  const present = [];
  const absent = [];

  for (let r = 0; r <= currentRow; r++) {
    const rowCells = document.querySelectorAll(`.row[data-row='${r}'] .cell`);
    rowCells.forEach((cell,i)=>{
      const letter = cell.value.toLowerCase();
      if (!letter) return;
      if (cell.classList.contains('green')) correct[i]=letter;
      else if (cell.classList.contains('yellow')) present.push({letter,pos:i});
      else if (cell.classList.contains('gray')) absent.push(letter);
    });
  }

  const results = wordList.filter(word => {
    if (word.length !== COLS) return false;
    for (let i=0;i<COLS;i++) if (correct[i] && word[i]!==correct[i]) return false;
    for (const p of present) if(!word.includes(p.letter) || word[p.pos]===p.letter) return false;
    for (const a of absent) if(word.includes(a) && !correct.includes(a) && !present.some(p=>p.letter===a)) return false;
    return true;
  });

  const best = suggestBestWord(results);

  resultsDiv.innerHTML = `
    <h3>
      Best Next Guess: 
      ${best ? `<button onclick="fillGuess('${best}')" style="background:#f0a500;border:none;border-radius:6px;width:100px;padding:6px;margin-left:10px;cursor:pointer;font-weight:bold;color:#1e1e2f;text-align:center">${best.toUpperCase()}</button>` : 'None'}
    </h3>
    <h3>Matches (${results.length}):</h3>
    <input type="text" id="match-search" placeholder="Search..." />
    <ul class="matches" id="matches-list">
      ${results.map(w=>`<li><button onclick="fillGuess('${w}')">${w}</button></li>`).join('')}
    </ul>
  `;

  // Search functionality
  const searchInput = document.getElementById('match-search');
  const matchesList = document.getElementById('matches-list');
  searchInput.addEventListener('input', () => {
    const filter = searchInput.value.toLowerCase();
    [...matchesList.children].forEach(li => {
      li.style.display = li.textContent.toLowerCase().includes(filter) ? '' : 'none';
    });
  });

  cells.forEach(c => { c.readOnly = true; c.classList.add('readonly'); });
  currentRow++;
  createRow();
}

function resetGame() {
  currentRow = 0;
  board.innerHTML = '';
  resultsDiv.innerHTML = '';
  document.getElementById('warning').style.display = 'none';
  document.getElementById('invalid').style.display = 'none';
  createRow();
}

// --- Background Logic ---
let bgEnabled = true;
const backgrounds = [
  "https://i.pinimg.com/originals/22/07/43/220743df7f831dce831375e9949a68c6.gif",
  "https://i.pinimg.com/originals/66/29/ac/6629ac69eee96adbe0880b4f06afdc26.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUycGhhYzVrb2ZsMXo4MnFxbzYwbXFnYmhiYnk5N2N2Z2t4cXkxMmszaCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/b29IZK1dP4aWs/giphy.gif",
  "https://giffiles.alphacoders.com/145/14565.gif",
  "https://i.pinimg.com/originals/70/34/68/703468dd221332430b108354a9f65f7f.gif"
];

function applyBackground(url) {
  document.body.style.background = `url('${url}') no-repeat center center fixed`;
  document.body.style.backgroundSize = "cover";
}

function changeBackground() {
  if (!bgEnabled) return;
  const bg = backgrounds[Math.floor(Math.random() * backgrounds.length)];
  applyBackground(bg);
}

function toggleBackground() {
  bgEnabled = !bgEnabled;
  if (bgEnabled) {
    changeBackground();
    document.getElementById("bg-toggle-btn").textContent = "Disable Background";
  } else {
    document.body.style.background = "#1e1e2f";
    document.getElementById("bg-toggle-btn").textContent = "Enable Background";
  }
}

// Start
createRow();
changeBackground();
