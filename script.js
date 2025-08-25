/* Wordish Unlimited — Clean Build script.js
   - Unlimited games, on-screen keyboard and physical input
   - Loads words.txt with cache-busting; fallback to built-in list
   - Shows solution inside Stats dialog on loss
*/
(() => {
  const q = (sel, el=document) => el.querySelector(sel);
  const qa = (sel, el=document) => Array.from(el.querySelectorAll(sel));
  const ls = (k,v) => v===undefined ? JSON.parse(localStorage.getItem(k)||"null") : localStorage.setItem(k, JSON.stringify(v));
  const randItem = arr => arr[Math.floor(Math.random()*arr.length)];

  const settings = Object.assign({
    guessLimit: 6,
    hardMode: false,
    allowAnyGuess: false,
    wordSource: "built-in",
    dark: matchMedia && matchMedia('(prefers-color-scheme: light)').matches ? false : true,
  }, ls('wordish:settings') || {});

  const stats = Object.assign({
    played: 0, wins: 0, streak: 0, best: 0, lastWin: null
  }, ls('wordish:stats') || {});

  const BUILTIN_WORDS = [
    "about","other","which","there","their","would","could","after","first","those",
    "again","every","think","three","small","place","great","right","still","world",
    "house","under","never","water","point","woman","young","story","money","maybe",
    "music","short","light","north","south","sound","night","heart","happy","brown",
    "black","white","green","found","bring","guess","quiet","peace","plant","train",
    "plane","chair","table","apple","bread","cheer","smile","laugh","storm","sunny",
    "ocean","river","beach","valley","field","stone","brick","steel","motor","cable",
    "video","photo","frame","pixel","voice","pride","spice","lemon","toast","spoon",
    "knife","baker","cream","bloom","flame","shine","shade","paper","piano","flute",
    "guitar","drums","stage","scene","dream","sleep","early","later","trick","solve",
    "puzzle","rhyme","catch","above","below","draft","final","print","share","reset",
    "start","enter","press","touch","close","open","smell","taste","scent","earth",
    "metal","sheep","tiger","otter","whale","eagle","panda","rhino","corgi","hound",
    "horse","raven","robin","waltz","jazzy","fuzzy","pique","quilt","quart","oxide",
    "ionic","civic","kayak","level","madam","radar","refer","stats","minim","xylem",
    "glyph","nymph","jumpy","vivid","zesty","azure","khaki"
  ];

  let words = [...BUILTIN_WORDS];
  let solution = "";
  let row = 0, col = 0;
  let grid = [];   // rows of letters
  let locks = [];  // per-tile result ("correct"/"present"/"absent")

  const els = {
    board: q('#board'),
    newGameBtn: q('#newGameBtn'),
    settingsBtn: q('#settingsBtn'),
    statsBtn: q('#statsBtn'),
    helpBtn: q('#helpBtn'),
    settingsDlg: q('#settingsDialog'),
    statsDlg: q('#statsDialog'),
    helpDlg: q('#helpDialog'),
    guessLimit: q('#guessLimit'),
    hardMode: q('#hardMode'),
    allowAnyGuess: q('#allowAnyGuess'),
    wordSource: q('#wordSource'),
    shareBtn: q('#shareBtn'),
    darkToggle: q('#darkToggle'),
    sGames: q('#sGames'),
    sWins: q('#sWins'),
    sStreak: q('#sStreak'),
    sBest: q('#sBest'),
    kbRows: qa('.kb-row'),
    toast: q('#toast'),
    answerReveal: q('#answerReveal'),
  };

  function applyTheme() {
    document.documentElement.classList.toggle('light', !settings.dark);
    els.darkToggle.checked = settings.dark;
  }
  function showToast(msg, ms=1600) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    setTimeout(() => els.toast.classList.remove('show'), ms);
  }
  const saveSettings = () => ls('wordish:settings', settings);
  const saveStats = () => ls('wordish:stats', stats);

  function makeBoard() {
    els.board.innerHTML = "";
    grid = Array.from({length: settings.guessLimit}, () => Array(5).fill(""));
    locks = Array.from({length: settings.guessLimit}, () => Array(5).fill(""));
    els.board.style.gridTemplateRows = `repeat(${settings.guessLimit}, 56px)`;
    for (let r=0; r<settings.guessLimit; r++) {
      for (let c=0; c<5; c++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.setAttribute('role','gridcell');
        tile.setAttribute('aria-label', `Row ${r+1} column ${c+1}`);
        els.board.appendChild(tile);
      }
    }
  }
  function updateBoard() {
    qa('.tile', els.board).forEach((tile, i) => {
      const r = Math.floor(i/5), c = i % 5;
      tile.textContent = grid[r][c].toUpperCase();
      tile.classList.toggle('filled', !!grid[r][c]);
      tile.classList.remove('correct','present','absent','reveal');
      if (locks[r][c]) tile.classList.add(locks[r][c]);
    });
  }
  function buildKeyboard() {
    const rows = ["qwertyuiop","asdfghjkl","↵zxcvbnm⌫"];
    els.kbRows.forEach((rowEl, idx) => {
      rowEl.innerHTML = "";
      const rowStr = rows[idx];
      for (const ch of rowStr) {
        const key = document.createElement('button');
        key.type = 'button';
        key.className = 'key';
        key.dataset.key = ch;
        key.textContent = ch === "↵" ? "Enter" : (ch === "⌫" ? "Back" : ch.toUpperCase());
        if (ch === "↵" || ch === "⌫") key.classList.add('wide');
        key.addEventListener('click', () => handleInput(ch));
        rowEl.appendChild(key);
      }
    });
  }
  function keyboardMark(letter, status) {
    const btn = qa(`.key`, document).find(b => b.dataset.key === letter);
    if (!btn) return;
    const rank = {"correct":3,"present":2,"absent":1,"":0};
    const current = ["","absent","present","correct"].find(k => btn.classList.contains(k)) || "";
    if (rank[status] > rank[current]) {
      btn.classList.remove('correct','present','absent');
      if (status) btn.classList.add(status);
    }
  }

  async function loadWords() {
    if (settings.wordSource === "words.txt") {
      const cacheBust = `?v=${Date.now()}`;
      try {
        const res = await fetch('words.txt'+cacheBust, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        const list = text.split(/\s+/).map(w => w.trim().toLowerCase()).filter(w => /^[a-z]{5}$/.test(w));
        if (list.length >= 50) {
          words = list;
          showToast(`Loaded ${list.length} words`);
          return;
        } else {
          showToast("words.txt looked too small — using built-in list");
        }
      } catch (e) {
        console.error("[Wordish] Failed to load words.txt:", e);
        showToast("Couldn't load words.txt — using built-in list");
      }
    }
    words = [...BUILTIN_WORDS];
  }

  function pickSolution() {
    solution = randItem(words);
    row = 0; col = 0;
    grid.forEach(r => r.fill(""));
    locks.forEach(r => r.fill(""));
    qa('.key').forEach(k => k.classList.remove('correct','present','absent'));
    updateBoard();
  }

  function commitLetter(letter) {
    if (col < 5 && row < settings.guessLimit) {
      grid[row][col] = letter; col++; updateBoard();
    }
  }
  function deleteLetter() {
    if (col > 0) { col--; grid[row][col] = ""; updateBoard(); }
  }

  function isHardModeSatisfied(guess) {
    if (!settings.hardMode || row === 0) return true;
    const prevRow = row-1;
    for (let c=0;c<5;c++) {
      if (locks[prevRow][c] === "correct" && guess[c] !== grid[prevRow][c]) return false;
    }
    const required = [];
    for (let c=0;c<5;c++) if (locks[prevRow][c] === "present" || locks[prevRow][c] === "correct") required.push(grid[prevRow][c]);
    for (const ch of required) if (!guess.includes(ch)) return false;
    return true;
  }

  function scoreGuess(guess) {
    const res = Array(5).fill("absent");
    const counts = {};
    for (const ch of solution) counts[ch] = (counts[ch]||0)+1;
    // Greens
    for (let i=0;i<5;i++) if (guess[i] === solution[i]) { res[i] = "correct"; counts[guess[i]]--; }
    // Yellows
    for (let i=0;i<5;i++) if (res[i] === "absent") {
      const ch = guess[i];
      if (counts[ch] > 0) { res[i] = "present"; counts[ch]--; }
    }
    return res;
  }

  function revealRow(result) {
    const tiles = qa('.tile').slice(row*5, row*5+5);
    tiles.forEach((t, i) => {
      setTimeout(() => {
        t.classList.add('reveal'); t.classList.add(result[i]);
        locks[row][i] = result[i];
        keyboardMark(grid[row][i], result[i]);
      }, i*260);
    });
  }

  function endGame(win) {
    stats.played++;
    if (win) {
      stats.wins++; stats.streak++; stats.best = Math.max(stats.best, stats.streak); stats.lastWin = new Date().toISOString();
      els.answerReveal.textContent = "";
      showToast("Nice!");
    } else {
      stats.streak = 0;
      els.answerReveal.textContent = `You lost. The word was: ${solution.toUpperCase()}`;
      showToast(`It was “${solution.toUpperCase()}”`);
    }
    saveStats();
    updateStatsUI();
    if (els.statsDlg && typeof els.statsDlg.showModal === "function") {
      setTimeout(() => els.statsDlg.showModal(), 300);
    }
  }

  function updateStatsUI() {
    els.sGames.textContent = stats.played;
    els.sWins.textContent = stats.wins;
    els.sStreak.textContent = stats.streak;
    els.sBest.textContent = stats.best;
  }

  function shareResult() {
    const rows = [];
    for (let r=0;r<=row;r++) {
      const line = locks[r].map(s => s==="correct" ? "🟩" : s==="present" ? "🟨" : "⬛").join("");
      rows.push(line);
    }
    const text = `Wordish Unlimited ${row+1}/${settings.guessLimit}\n` + rows.join("\n");
    if (navigator.share) {
      navigator.share({ text }).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=> showToast("Result copied"));
    }
  }

  function submitGuess() {
    if (col < 5) return showToast("Not enough letters");
    const guess = grid[row].join("");
    if (!settings.allowAnyGuess) {
      if (!words.includes(guess)) return showToast("Not in word list");
    }
    if (!isHardModeSatisfied(guess)) return showToast("Hard mode rule not met");

    const result = scoreGuess(guess);
    revealRow(result);

    if (result.every(s => s === "correct")) {
      return setTimeout(() => { endGame(true); }, 5*260+100);
    }
    row++; col = 0;
    if (row >= settings.guessLimit) {
      setTimeout(() => { endGame(false); }, 5*260+100);
    }
  }

  function handleInput(ch) {
    if (ch === "↵") return submitGuess();
    if (ch === "⌫") return deleteLetter();
    const letter = ch.toLowerCase();
    if (/^[a-z]$/.test(letter)) commitLetter(letter);
  }
  function handlePhysicalKeyboard(e) {
    if (e.key === "Enter") return handleInput("↵");
    if (e.key === "Backspace") return handleInput("⌫");
    const k = e.key.toLowerCase();
    if (/^[a-z]$/.test(k)) handleInput(k);
  }

  function bindUI() {
    els.newGameBtn.addEventListener('click', () => { pickSolution(); });
    els.settingsBtn.addEventListener('click', () => {
      els.guessLimit.value = settings.guessLimit;
      els.hardMode.checked = settings.hardMode;
      els.allowAnyGuess.checked = settings.allowAnyGuess;
      els.wordSource.value = settings.wordSource;
      els.settingsDlg.showModal();
    });
    q('#saveSettings').addEventListener('click', async (ev) => {
      ev.preventDefault();
      settings.guessLimit = Math.max(3, Math.min(10, parseInt(els.guessLimit.value||"6",10)));
      settings.hardMode = !!els.hardMode.checked;
      settings.allowAnyGuess = !!els.allowAnyGuess.checked;
      settings.wordSource = els.wordSource.value;
      saveSettings();
      await loadWords();
      makeBoard();
      pickSolution();
      els.settingsDlg.close();
    });
    q('#closeSettings').addEventListener('click', (ev) => { ev.preventDefault(); els.settingsDlg.close(); });
    els.statsBtn.addEventListener('click', () => { updateStatsUI(); els.statsDlg.showModal(); });
    els.helpBtn.addEventListener('click', () => els.helpDlg.showModal());
    els.shareBtn.addEventListener('click', shareResult);
    els.darkToggle.addEventListener('change', () => { settings.dark = els.darkToggle.checked; applyTheme(); saveSettings(); });
    window.addEventListener('keydown', handlePhysicalKeyboard);
  }

  async function init() {
    applyTheme();
    buildKeyboard();
    await loadWords();
    makeBoard();
    pickSolution();
    bindUI();
  }

  init();
})();