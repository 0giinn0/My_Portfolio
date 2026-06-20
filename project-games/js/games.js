// ═══════════════════════════════════════════════════════════════
// GOLDEN SPIRAL NAVIGATION
// ═══════════════════════════════════════════════════════════════

let currentGame = null;

function toggleHub() {
  const ripple = document.getElementById('spiralRipple');
  const center = document.getElementById('spiralCenter');
  center.classList.remove('tapping');
  void ripple.offsetWidth;
  center.classList.add('tapping');
  setTimeout(() => center.classList.remove('tapping'), 700);
}

function selectGame(game) {
  const hub = document.getElementById('spiralHub');
  const items = hub.querySelectorAll('.spiral-item');
  items.forEach(i => i.classList.remove('active'));
  hub.querySelector(`[data-game="${game}"]`).classList.add('active');

  document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));
  const el = document.getElementById('game-' + game);
  if (el) el.classList.add('active');
  currentGame = game;

  if (game === 'wordle') initWordle();
  if (game === 'memory') initMemory();
  if (game === 'typing') initTyping();
  if (game === 'snake') initSnake();
  if (game === 'tetris') initTetris();
  if (game === '2048') init2048();
  if (game === 'blackjack') initBlackjack();
  if (game === 'solitaire') initSolitaire();

  if (['snake', 'tetris', '2048'].includes(game)) {
    registerGameForAI(game);
  }
}

function goBack() {
  document.querySelectorAll('.game-container').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.spiral-item').forEach(i => i.classList.remove('active'));
  currentGame = null;
  if (snakeInterval) { clearInterval(snakeInterval); snakeInterval = null; }
  if (snakeRaf) { cancelAnimationFrame(snakeRaf); snakeRaf = null; }
  if (tetrisInterval) { clearInterval(tetrisInterval); tetrisInterval = null; }
  if (tetrisRaf) { cancelAnimationFrame(tetrisRaf); tetrisRaf = null; }
  if (typingInterval) { clearInterval(typingInterval); typingInterval = null; }
  if (memoryTimerInterval) { clearInterval(memoryTimerInterval); memoryTimerInterval = null; }
  stopAllAI();
}

// ═══════════════════════════════════════════════════════════════
// AI PLAYER (Snake, Tetris, 2048 only)
// ═══════════════════════════════════════════════════════════════

let aiWorker = null;
let aiToggleButtons = {};
let aiThrottle = { snake: 0, tetris: 0, '2048': 0 };
let aiMainThread = null;

function getTetrisTickInterval() {
  return Math.max(100, 800 - ((tetrisLevel || 1) - 1) * 70);
}

function initAI() {
  if (aiWorker) return;

  try {
    aiWorker = new Worker('project-games/js/ai-worker.js');

    aiWorker.onmessage = (e) => {
      const { type, game, action, data } = e.data;
      if (type === 'action' && action) {
        executeAIAction(game, action, data);
      }
    };

    aiWorker.onerror = (e) => {
      console.error('AI Worker error:', e);
      aiWorker = null;
    };
  } catch(err) {
    console.warn('Worker not available, using main-thread AI fallback');
    aiWorker = null;
  }
}

function registerGameForAI(game) {
  if (!aiWorker) initAI();

  const gameControls = document.querySelector(`#game-${game} .game-controls`);
  if (gameControls && !gameControls.querySelector('.ai-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'game-btn ai-toggle';
    toggle.innerHTML = '🤖 Auto';
    toggle.style.marginRight = '8px';
    toggle.onclick = () => toggleAI(game, toggle);
    gameControls.insertBefore(toggle, gameControls.firstChild);
    aiToggleButtons[game] = toggle;
  }
}

function toggleAI(game, button) {
  const isActive = button.classList.contains('active');
  if (isActive) {
    if (aiWorker) aiWorker.postMessage({ type: 'toggle', game, enabled: false });
    if (aiMainThread) { clearInterval(aiMainThread); aiMainThread = null; }
    button.classList.remove('active');
    button.textContent = '🤖 Auto';
  } else {
    if (aiWorker) {
      aiWorker.postMessage({ type: 'toggle', game, enabled: true });
    } else {
      startMainThreadAI(game);
    }
    button.classList.add('active');
    button.textContent = '⏸ AI';
  }
}

function startMainThreadAI(game) {
  if (aiMainThread) { clearInterval(aiMainThread); aiMainThread = null; }
  aiMainThread = setInterval(() => {
    if (!currentGame || currentGame !== game) { clearInterval(aiMainThread); aiMainThread = null; return; }
    const action = computeAIAction(game);
    if (action) executeAIAction(game, action, action);
  }, game === 'snake' ? 120 : game === 'tetris' ? 400 : 300);
}

function computeAIAction(game) {
  if (game === 'snake') return computeSnakeAI();
  if (game === 'tetris') return computeTetrisAI();
  if (game === '2048') return compute2048AI();
  return null;
}

function computeSnakeAI() {
  if (typeof snake === 'undefined' || !snake.length || typeof snakeFood === 'undefined') return null;
  const head = snake[0];
  const food = snakeFood;
  const cur = snakeDir;
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const dirVec = { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} };
  const cols = Math.floor(snakeCanvas.width / snakeCellSize);
  const rows = Math.floor(snakeCanvas.height / snakeCellSize);
  const dirs = ['up','down','left','right'];

  // Body positions (head excluded - we can't occupy head)
  // Tail will vacate unless we're about to eat food
  const willEat = head.x === food.x && head.y === food.y;
  const bodySet = new Set();
  for (let i = 0; i < snake.length - (willEat ? 0 : 1); i++) bodySet.add(snake[i].x + ',' + snake[i].y);

  function isSafe(x, y, step, ignoreTail) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return false;
    const key = x + ',' + y;
    if (ignoreTail && key === snake[snake.length - 1] + ',' + snake[snake.length - 1].y) return true;
    if (bodySet.has(key)) return false;
    return true;
  }

  // BFS that simulates snake movement: tail vacates as head advances
  function bfsTo(start, goal, simSteps) {
    const visited = new Set();
    visited.add(start.x + ',' + start.y);
    const queue = [{ x: start.x, y: start.y, dir: null, steps: 0, body: snake.map(s => ({x:s.x, y:s.y})) }];
    let qi = 0;
    while (qi < queue.length) {
      const cur = queue[qi++];
      if (cur.steps > simSteps) continue;
      for (const d of dirs) {
        if (cur.dir && d === opposite[cur.dir]) continue;
        const v = dirVec[d];
        const nx = cur.x + v.x, ny = cur.y + v.y;
        const key = nx + ',' + ny;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (visited.has(key)) continue;
        const eats = (nx === goal.x && ny === goal.y);
        const newBody = cur.body.map(s => ({x:s.x, y:s.y}));
        newBody.unshift({x:nx, y:ny});
        if (!eats) newBody.pop();
        const occupied = new Set();
        for (let i = 0; i < newBody.length - (eats ? 0 : 1); i++) occupied.add(newBody[i].x + ',' + newBody[i].y);
        if (occupied.has(key) && !eats) continue;
        const firstDir = cur.dir || d;
        if (eats) return firstDir;
        visited.add(key);
        queue.push({ x: nx, y: ny, dir: firstDir, steps: cur.steps + 1, body: newBody });
      }
    }
    return null;
  }

  // Try shortest path to food (simulate up to 2x grid size steps)
  const maxSteps = cols * rows * 2;
  const toFood = bfsTo(head, food, maxSteps);
  if (toFood && toFood !== opposite[cur]) return toFood;

  // No safe path to food — find longest survival path using flood-fill
  function floodFill(start, blocked) {
    const q = [{x: start.x, y: start.y}];
    const seen = new Set();
    seen.add(start.x + ',' + start.y);
    let count = 0;
    let qi = 0;
    while (qi < q.length) {
      const c = q[qi++]; count++;
      for (const d of dirs) {
        const v = dirVec[d];
        const nx = c.x + v.x, ny = c.y + v.y;
        const key = nx + ',' + ny;
        if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
        if (seen.has(key)) continue;
        if (blocked && bodySet.has(key)) continue;
        seen.add(key);
        q.push({x:nx, y:ny});
      }
    }
    return count;
  }

  let bestDir = null, bestSpace = -1;
  for (const d of dirs) {
    if (d === opposite[cur]) continue;
    const v = dirVec[d];
    const nx = head.x + v.x, ny = head.y + v.y;
    if (!isSafe(nx, ny, 0, true)) continue;
    // Simulate moving there and check available space
    const newHead = {x:nx, y:ny};
    const space = floodFill(newHead, true);
    if (space > bestSpace) { bestSpace = space; bestDir = d; }
  }
  return bestDir || null;
}

function computeTetrisAI() {
  if (typeof tetrisBoard === 'undefined' || !tetrisPiece) return null;
  if (computeTetrisAI._queue && computeTetrisAI._queue.length) return computeTetrisAI._queue.shift();
  const shape = tetrisPiece.shape;
  let bestScore = -Infinity, bestAction = null;
  for (let rot = 0; rot < 4; rot++) {
    let s = shape;
    for (let r = 0; r < rot; r++) {
      const rows = s.length, cols = s[0].length;
      const ns = [];
      for (let c = 0; c < cols; c++) { ns[c] = []; for (let row = 0; row < rows; row++) ns[c][rows - 1 - row] = s[row][c]; }
      s = ns;
    }
    for (let x = -2; x < 10; x++) {
      let y = 0;
      while (!checkCollision(s, x, y + 1)) y++;
      if (checkCollision(s, x, y)) continue;
      let lines = 0;
      const testBoard = tetrisBoard.map(r => [...r]);
      for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) {
        if (s[r][c] && y + r >= 0 && y + r < 20 && x + c >= 0 && x + c < 10) testBoard[y + r][x + c] = s[r][c];
      }
      for (let r = 0; r < 20; r++) { if (testBoard[r].every(c => c !== null)) { lines++; testBoard.splice(r, 1); testBoard.unshift(Array(10).fill(null)); r--; } }
      let holes = 0, bumpiness = 0, prevH = 0;
      const heights = [];
      for (let c = 0; c < 10; c++) {
        let h = 0;
        for (let r = 0; r < 20; r++) { if (testBoard[r][c]) { h = 20 - r; break; } }
        heights.push(h);
        if (c > 0) bumpiness += Math.abs(h - prevH);
        prevH = h;
      }
      for (let c = 0; c < 10; c++) { let blocked = false; for (let r = 0; r < 20; r++) { if (testBoard[r][c]) blocked = true; else if (blocked) holes++; } }
      const maxHeight = Math.max(...heights);
      const score = lines * 120 - holes * 10 - bumpiness * 3 - maxHeight * 4;
      if (score > bestScore) { bestScore = score; bestAction = { rot, x }; }
    }
  }
  if (!bestAction) return 'drop';
  const actions = [];
  for (let r = 0; r < bestAction.rot; r++) actions.push('rotate');
  const dx = bestAction.x - tetrisPiece.x;
  for (let i = 0; i < Math.abs(dx); i++) actions.push(dx > 0 ? 'moveRight' : 'moveLeft');
  actions.push('drop');
  computeTetrisAI._queue = actions;
  return computeTetrisAI._queue.shift() || 'drop';
}

function compute2048AI() {
  if (typeof board2048 === 'undefined') return null;
  const dirs = ['up', 'down', 'left', 'right'];
  const MONOTonic = [
    [0,1,2,3],[0,1,3,2],[0,2,1,3],[0,2,3,1],[0,3,1,2],[0,3,2,1],
    [1,0,2,3],[1,0,3,2],[1,2,0,3],[1,2,3,0],[1,3,0,2],[1,3,2,0],
    [2,0,1,3],[2,0,3,1],[2,1,0,3],[2,1,3,0],[2,3,0,1],[2,3,1,0],
    [3,0,1,2],[3,0,2,1],[3,1,0,2],[3,1,2,0],[3,2,0,1],[3,2,1,0]
  ];
  function evaluate(board) {
    let empty = 0, merges = 0, maxV = 0, cornerBonus = 0;
    const flat = board.flat();
    for (let i = 0; i < 16; i++) {
      if (flat[i] === 0) empty++;
      if (flat[i] > maxV) maxV = flat[i];
    }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      if (c + 1 < 4 && board[r][c] === board[r][c + 1]) merges++;
      if (r + 1 < 4 && board[r][c] === board[r + 1][c]) merges++;
    }
    // Monotonicity
    let monoScore = 0;
    for (const perm of MONOTonic) {
      let score = 0;
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) score += board[r][perm[c]] * (r * 4 + c);
      if (score > monoScore) monoScore = score;
    }
    // Corner bonus: largest tile in corner
    const corners = [board[0][0], board[0][3], board[3][0], board[3][3]];
    if (corners.includes(maxV)) cornerBonus = maxV * 2;
    return empty * 15 + merges * 8 + maxV * 1.5 + monoScore * 0.001 + cornerBonus;
  }
  function depthEval(board, depth) {
    if (depth === 0) return evaluate(board);
    let best = -Infinity;
    for (const d of dirs) {
      const copy = board.map(r => [...r]);
      const before = copy.flat().reduce((a,b) => a+b, 0);
      simulate2048Move(copy, d);
      const after = copy.flat().reduce((a,b) => a+b, 0);
      if (before === after) continue;
      best = Math.max(best, depthEval(copy, depth - 1));
    }
    return best === -Infinity ? evaluate(board) : best;
  }
  let best = null, bestScore = -Infinity;
  for (const d of dirs) {
    const copy = board2048.map(r => [...r]);
    const before = copy.flat().reduce((a,b) => a+b, 0);
    simulate2048Move(copy, d);
    const after = copy.flat().reduce((a,b) => a+b, 0);
    if (before === after) continue;
    const score = depthEval(copy, 2);
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best || 'right';
}

function simulate2048Move(board, dir) {
  function slide(row) {
    let r = row.filter(x => x !== 0);
    for (let i = 0; i < r.length - 1; i++) { if (r[i] === r[i + 1]) { r[i] *= 2; r.splice(i + 1, 1); } }
    while (r.length < 4) r.push(0);
    return r;
  }
  if (dir === 'left') { for (let r = 0; r < 4; r++) board[r] = slide(board[r]); }
  else if (dir === 'right') { for (let r = 0; r < 4; r++) board[r] = slide(board[r].reverse()).reverse(); }
  else if (dir === 'up') { for (let c = 0; c < 4; c++) { let col = [board[0][c], board[1][c], board[2][c], board[3][c]]; col = slide(col); for (let r = 0; r < 4; r++) board[r][c] = col[r]; } }
  else if (dir === 'down') { for (let c = 0; c < 4; c++) { let col = [board[3][c], board[2][c], board[1][c], board[0][c]]; col = slide(col); for (let r = 0; r < 4; r++) board[r][c] = col[3 - r]; } }
}

function executeAIAction(game, action, data) {
  if (!currentGame || currentGame !== game) return;

  const now = Date.now();
  let minInterval = 0;
  if (game === 'tetris') minInterval = getTetrisTickInterval();
  else if (game === 'snake') minInterval = 120;
  if (now - aiThrottle[game] < minInterval) return;
  aiThrottle[game] = now;

  switch(game) {
    case 'snake':
      if (action === 'up') setSnakeDir('up');
      else if (action === 'down') setSnakeDir('down');
      else if (action === 'left') setSnakeDir('left');
      else if (action === 'right') setSnakeDir('right');
      break;
    case 'tetris':
      if (action === 'moveLeft') tetrisMove(-1);
      else if (action === 'moveRight') tetrisMove(1);
      else if (action === 'rotate') tetrisRotate();
      else if (action === 'drop') tetrisDrop();
      break;
    case '2048':
      move2048(action);
      break;
  }
}

function getSnakeState() {
  return {
    snake: snake.map(s => ({ x: s.x, y: s.y })),
    food: { x: snakeFood.x, y: snakeFood.y },
    dir: snakeDir,
    gridSize: { cols: Math.floor(snakeCanvas.width / snakeCellSize), rows: Math.floor(snakeCanvas.height / snakeCellSize) },
    score: snakeScore,
    gameOver: snakeGameOver
  };
}

function getTetrisState() {
  return {
    board: tetrisBoard.map(row => row.map(cell => cell || null)),
    piece: tetrisPiece ? { shape: tetrisPiece.shape, x: tetrisPiece.x, y: tetrisPiece.y, color: tetrisPiece.color } : null,
    next: tetrisNext,
    score: tetrisScore,
    level: tetrisLevel,
    lines: tetrisLines,
    gameOver: tetrisGameOver
  };
}

function get2048State() {
  return {
    board: board2048.map(row => [...row]),
    score: score2048,
    best: best2048,
    gameOver: gameOver2048
  };
}

function sendGameStateToAI() {
  if (!aiWorker) return;

  let state = null;
  if (currentGame === 'snake') state = getSnakeState();
  else if (currentGame === 'tetris') state = getTetrisState();
  else if (currentGame === '2048') state = get2048State();

  if (state) {
    aiWorker.postMessage({
      type: 'state',
      game: currentGame,
      state: state
    });
  }
}

function stopAllAI() {
  if (aiWorker) {
    aiWorker.postMessage({ type: 'stop' });
  }
  if (aiMainThread) { clearInterval(aiMainThread); aiMainThread = null; }
  Object.values(aiToggleButtons).forEach(btn => {
    btn.classList.remove('active');
    btn.textContent = '🤖 Auto';
  });
}

function scheduleAIUpdates() {
  if (currentGame && ['snake', 'tetris', '2048'].includes(currentGame)) {
    sendGameStateToAI();
  }
  setTimeout(scheduleAIUpdates, 100);
}

scheduleAIUpdates();

const WORDS_EN = [
  'apple','beach','brave','candy','charm','climb','cloud','dance','doubt','dream',
  'eagle','earth','ember','equal','fable','feast','flame','flash','flute','frame',
  'giant','gleam','globe','grace','grain','grape','grave','habit','happy','harsh',
  'heart','horse','house','humor','image','irony','jewel','jolly','judge','karma',
  'kneel','ladder','lemon','level','light','linen','liver','logic','lunar','magic',
  'melon','mercy','metal','model','money','month','moral','motel','music','noble',
  'ocean','olive','opera','orbit','organ','outer','oxide','ozone','panda','panel',
  'panic','paper','party','pearl','phase','piano','piece','pilot','pinch','pixel',
  'pizza','place','plain','plane','plant','plate','plaza','pluck','point','pound',
  'power','press','price','pride','prime','print','prior','prize','proof','proud',
  'queen','quest','quick','quiet','quota','quote','radar','radio','raise','rally',
  'ranch','range','rapid','ratio','reach','react','realm','rebel','reign','relax',
  'reply','rider','ridge','rifle','right','rigid','river','robin','robot','rocky',
  'roman','rough','round','route','royal','rugby','ruler','rural','saint','salad',
  'scale','scene','scope','score','sense','serve','seven','shade','shame','shape',
  'share','shark','sharp','shelf','shell','shift','shine','shirt','shock','shore',
  'short','shout','sight','sigma','silly','since','sixth','sixty','skill','skull',
  'slate','sleep','slice','slide','slope','smart','smell','smile','smoke','snake',
  'solar','solid','solve','sonic','sorry','space','spare','speak','speed','spend',
  'spice','spine','spite','spoke','spoon','sport','spray','squad','stack','staff',
  'stage','stake','stain','stair','stake','stale','stall','stamp','stand','stare',
  'stark','start','state','stave','steak','steal','steam','steel','steep','steer',
  'stern','stick','stiff','still','sting','stock','stole','stone','stood','stool',
  'store','storm','story','stout','stove','strap','straw','stray','strip','stuck',
  'study','stuff','style','sugar','suite','super','surge','swamp','swarm','swear',
  'sweep','sweet','swell','swept','swift','swing','swirl','sword','syrup','table',
  'taste','teach','teeth','thank','theme','thick','thief','thing','think','third',
  'thorn','those','three','threw','throw','thumb','tiger','tight','timer','title',
  'today','token','tooth','topaz','topic','torch','total','touch','tough','tower',
  'toxic','trace','track','trade','trail','train','trait','trash','treat','trend',
  'trial','tribe','trick','tried','troop','truck','truly','trump','trunk','trust',
  'truth','tumor','tuner','tweed','twice','twist','ultra','uncle','under','union',
  'unite','unity','until','upper','upset','urban','usage','usual','utter','valid',
  'value','video','vigor','vinyl','viral','virus','visit','vista','vital','vivid',
  'vocal','voice','voter','waist','waste','watch','water','weary','weave','whale',
  'wheat','wheel','where','which','while','white','whole','whose','widen','width',
  'witch','woman','world','worry','worse','worst','worth','would','wound','wrath',
  'write','wrong','wrote','yacht','yield','young','yours','youth','zebra','zonal'
];

const URDU_WORDS = [
  'کھانا','پینا','چلنا','بیٹھنا','سونا','ہنسنا','رونا','بولنا','دیکھنا','سننا',
  'کھیلنا','پڑھنا','لکھنا','سمجھنا','سیکھنا','بچانا','دینا','لینا','بیچنا','کاٹنا',
  'کھولنا','جوڑنا','توڑنا','گرنا','اٹھنا','بھاگنا','چھپنا','سوچنا','گاننا','ناچنا',
  'کودنا','بہانا','روکنا','چلانا','چالاک','ہوشیار','بہادر','کمزور','بڑا','لمبا',
  'نیلا','پیلا','سبز','سرخ','سفید','کالا','گہرا','ہلکا','گرما','ٹھنڈا',
  'خشک','گیلا','تیز','سخت','نرم','بھاری','صاف','پورا','خالی','سالم',
  'کھلا','بند','سادہ','آسان','مشکل','لیکن','مگر','پھر','ابھی','کل',
  'آج','رات','دن','شام','صبح','دوپہر','بعد','نہیں','ہاں','ضرور',
  'شاید','مرغی','کتا','بلی','شیر','گھوڑا','بکری','بھیڑ','مچھلی','پرندہ',
  'چڑیا','کوا','کبوتر','عقاب','رنگ','چہرہ','ہاتھ','پاؤں','سینہ','گردن',
  'کمر','بازو','انگلی','ٹخنہ','گھٹنا','دل','دماغ','خون','ہڈی','جلد',
  'بال','آنکھ','ناک','کان','ہونٹ','دانت','زبان','پیٹ','پیٹھ','شانہ',
  'گھر','کمرہ','دیوار','چھت','دروازہ','کھڑکی','باغ','پھول','پتا','شاخ',
  'پھل','بیج','خاک','پتھر','ریت','دریا','جھیل','چشمه','نہر','آسمان',
  'ستارہ','چاند','سورج','ہوا','بارش','برف','بادل','قمر','پانی','آگ',
  'مٹی','گیند','تلوار','لوہا','چاندی','سونا','شیشہ','کتاب','قلم','کاغذ',
  'سکول','استاد','طالب','امتحان','نمبر','گنتی','حساب','جمع','حروف','الفاظ',
  'جملہ','خط','سچ','جھوٹ','عزم','ہمت','کوشش','محنت','خوشی','سکون',
  'چین','آرام','ثابت','پکا','فیصلہ','وعدہ','خبر','سوال','جواب','حکم',
  'قانون','سزا','انصاف','حق','ظلم','آئین','جشن','گیت','تصویر','ہنر',
  'فن','چھلانگ','گول','سیدھا','موڑ','راستہ','گلی','بازار','دکان','قیمت',
  'پیسہ','روپیہ','ہزار','لاکھ','کروڑ','آدھا','پونا','چوتھا','سال','ماہ',
  'ہفتہ','گھنٹہ','منٹ','مرد','عورت','بچہ','لڑکا','لڑکی','دادا','دادی',
  'بائی','بھائی','بہن','چاچا','ماما','خالہ','بہنی','بھتیجی','بھاتیجی','پوسی',
  'دوسرا','تیسرا','چوتھا','پانچواں','پہلا','آخری','اگلا','پچھلا','چھوٹا','بڑا',
  'لمبا',' mota','پتلا','چوڑا','تنکا','گہرا','اوپر','نیچے','بیرونی','اندرونی',
  'سمیں','بیرون','آگے','پیچھے','دایں','بائیں','مرکزی','خاص','عمومی','آخری',
  'پہلی','دوسری','تیسری','چوتھی','پانچویں','چھٹی','ساتویں','آٹھویں','نویں','دسویں',
  'سولہ','ستارہ','آٹھ','نو','تیرا','چودہ','پندرہ','ستارہ','اٹھارہ','انیس',
  'بیس','اکیس','بائیس','تئیس','چوبیس','پچیس','چھبیس','ستائیس','اٹھائیس','انتالیس',
  'تیس','اکتالیس','بیتالیس','تینتالیس','چوتالیس','پچتالیس','چھیالیس','سڑتالیس','اٹھتالیس','انتالیس',
  'چھاصل','پچاس','اکسٹرا','ٹیسٹ','ڈیمو','ڈیٹا','پروگرام','کوڈ','اپلیکیشن','سافٹ ویئر'
];

let wordleLang = 'en';
let wordleAnswer = '';
let wordleBoard = [];
let wordleCurrentRow = 0;
let wordleCurrentCol = 0;
let wordleGameOver = false;
let wordleStats = JSON.parse(localStorage.getItem('wordleStats') || '{"played":0,"won":0,"streak":0,"max":0}');

const WORDLE_ROWS = 6;
const WORDLE_COLS = 5;

const EN_KEYBOARD = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫']
];

const UR_KEYBOARD = [
  ['ض','ص','ث','ق','ف','غ','ع','ه','خ','ح'],
  ['ش','س','ی','ب','ل','ا','ت','ن','م','ے'],
  ['ٹ','ڈ','ڑ','چ','ژ','ج','ک','گ','ظ','ط'],
  ['ENTER','ز','ر','ذ','د','پ','و','ھ','ء','⌫']
];

function setLanguage(lang) {
  wordleLang = lang;
  document.querySelectorAll('#langToggle .lang-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`#langToggle .lang-btn:${lang === 'en' ? 'first-child' : 'last-child'}`).classList.add('active');
  resetWordle();
}

function initWordle() {
  buildWordleBoard();
  buildWordleKeyboard();
  updateWordleStats();
  resetWordle();
}

function buildWordleBoard() {
  const board = document.getElementById('wordleBoard');
  board.innerHTML = '';
  for (let r = 0; r < WORDLE_ROWS; r++) {
    const row = document.createElement('div');
    row.className = 'wordle-row';
    for (let c = 0; c < WORDLE_COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'wordle-cell';
      cell.id = `cell-${r}-${c}`;
      row.appendChild(cell);
    }
    board.appendChild(row);
  }
}

function buildWordleKeyboard() {
  const kb = document.getElementById('wordleKeyboard');
  kb.innerHTML = '';
  const keys = wordleLang === 'ur' ? UR_KEYBOARD : EN_KEYBOARD;

  keys.forEach(row => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'key-row';
    row.forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key' + (key === 'ENTER' || key === '⌫' ? ' wide' : '') + (wordleLang === 'ur' ? ' urdu' : '');
      btn.textContent = key;
      btn.onclick = () => handleKeyPress(key);
      btn.id = `key-${key}`;
      rowDiv.appendChild(btn);
    });
    kb.appendChild(rowDiv);
  });
}

function resetWordle() {
  const words = wordleLang === 'ur' ? URDU_WORDS : WORDS_EN;
  wordleAnswer = words[Math.floor(Math.random() * words.length)].toLowerCase();
  wordleBoard = Array.from({length: WORDLE_ROWS}, () => Array(WORDLE_COLS).fill(''));
  wordleCurrentRow = 0;
  wordleCurrentCol = 0;
  wordleGameOver = false;

  document.getElementById('wordleMessage').innerHTML = '';

  for (let r = 0; r < WORDLE_ROWS; r++) {
    for (let c = 0; c < WORDLE_COLS; c++) {
      const cell = document.getElementById(`cell-${r}-${c}`);
      cell.textContent = '';
      cell.className = 'wordle-cell';
    }
  }

  document.querySelectorAll('.key').forEach(k => {
    k.className = k.className.replace(/ (correct|present|absent)/g, '');
    if (wordleLang === 'ur' && !k.textContent.includes('ENTER') && !k.textContent.includes('⌫')) {
      k.classList.add('urdu');
    }
  });

  buildWordleKeyboard();
}

function handleKeyPress(key) {
  if (wordleGameOver) return;

  if (key === '⌫') {
    if (wordleCurrentCol > 0) {
      wordleCurrentCol--;
      wordleBoard[wordleCurrentRow][wordleCurrentCol] = '';
      const cell = document.getElementById(`cell-${wordleCurrentRow}-${wordleCurrentCol}`);
      cell.textContent = '';
      cell.classList.remove('filled');
    }
  } else if (key === 'ENTER') {
    if (wordleCurrentCol === WORDLE_COLS) {
      checkWordleGuess();
    }
  } else {
    if (wordleCurrentCol < WORDLE_COLS) {
      const letter = wordleLang === 'ur' ? key : key.toLowerCase();
      wordleBoard[wordleCurrentRow][wordleCurrentCol] = letter;
      const cell = document.getElementById(`cell-${wordleCurrentRow}-${wordleCurrentCol}`);
      cell.textContent = wordleLang === 'ur' ? key : key.toUpperCase();
      cell.classList.add('filled', 'pop');
      setTimeout(() => cell.classList.remove('pop'), 200);
      wordleCurrentCol++;
    }
  }
}

function checkWordleGuess() {
  const guess = wordleBoard[wordleCurrentRow].join('');
  const answer = wordleAnswer;

  const answerLetters = answer.split('');
  const result = Array(WORDLE_COLS).fill('absent');
  const used = Array(WORDLE_COLS).fill(false);

  // First pass: correct positions
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (guess[i] === answer[i]) {
      result[i] = 'correct';
      used[i] = true;
      answerLetters[i] = null;
    }
  }

  // Second pass: present letters
  for (let i = 0; i < WORDLE_COLS; i++) {
    if (result[i] === 'correct') continue;
    const idx = answerLetters.indexOf(guess[i]);
    if (idx !== -1) {
      result[i] = 'present';
      answerLetters[idx] = null;
    }
  }

  // Animate cells
  for (let c = 0; c < WORDLE_COLS; c++) {
    const cell = document.getElementById(`cell-${wordleCurrentRow}-${c}`);
    setTimeout(() => {
      cell.classList.add('flip');
      setTimeout(() => {
        cell.classList.remove('filled');
        cell.classList.add(result[c]);
      }, 250);
    }, c * 200);
  }

  // Update keyboard colors
  setTimeout(() => {
    for (let c = 0; c < WORDLE_COLS; c++) {
      const letter = wordleBoard[wordleCurrentRow][c];
      const keyBtn = document.getElementById(`key-${wordleLang === 'ur' ? letter : letter.toUpperCase()}`);
      if (keyBtn) {
        if (result[c] === 'correct') {
          keyBtn.className = keyBtn.className.replace(/ (present|absent)/g, '') + ' correct';
        } else if (result[c] === 'present' && !keyBtn.classList.contains('correct')) {
          keyBtn.className = keyBtn.className.replace(/ absent/g, '') + ' present';
        } else if (!keyBtn.classList.contains('correct') && !keyBtn.classList.contains('present')) {
          keyBtn.className += ' absent';
        }
      }
    }
  }, WORDLE_COLS * 200 + 250);

  // Check win/lose
  setTimeout(() => {
    if (guess === answer) {
      wordleGameOver = true;
      wordleStats.won++;
      wordleStats.streak++;
      wordleStats.max = Math.max(wordleStats.max, wordleStats.streak);
      saveWordleStats();
      showMessage('wordleMessage', 'Brilliant!', 'win');
    } else if (wordleCurrentRow === WORDLE_ROWS - 1) {
      wordleGameOver = true;
      wordleStats.streak = 0;
      saveWordleStats();
      showMessage('wordleMessage', wordleLang === 'ur' ? `جواب: ${answer}` : `Answer: ${answer}`, 'lose');
    }
    wordleCurrentRow++;
    wordleCurrentCol = 0;
    updateWordleStats();
  }, WORDLE_COLS * 200 + 400);
}

function saveWordleStats() {
  wordleStats.played++;
  localStorage.setItem('wordleStats', JSON.stringify(wordleStats));
}

function updateWordleStats() {
  document.getElementById('statPlayed').textContent = wordleStats.played;
  document.getElementById('statWin').textContent = wordleStats.played ? Math.round((wordleStats.won / wordleStats.played) * 100) : 0;
  document.getElementById('statStreak').textContent = wordleStats.streak;
  document.getElementById('statMax').textContent = wordleStats.max;
}

// ═══════════════════════════════════════════════════════════════
// MEMORY MATCH
// ═══════════════════════════════════════════════════════════════

const MEMORY_SYMBOLS = ['♠','♥','♦','♣','★','☆','●','○','◆','◇','▲','△','■','□','✦','✧','⚡','☀','☁','❄'];
let memoryCards = [];
let memoryFlipped = [];
let memoryMatched = 0;
let memoryMoves = 0;
let memoryPairs = 0;
let memorySize = 4;
let memoryTimer = 0;
let memoryTimerInterval = null;
let memoryLocked = false;

function setMemorySize(cols) {
  memorySize = cols;
  document.querySelectorAll('#game-memory .game-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  resetMemory();
}

function initMemory() {
  resetMemory();
}

function resetMemory() {
  clearInterval(memoryTimerInterval);
  memoryTimer = 0;
  memoryMoves = 0;
  memoryMatched = 0;
  memoryFlipped = [];
  memoryLocked = false;

  const rows = memorySize === 6 ? 4 : 3;
  const totalPairs = (memorySize * rows) / 2;
  memoryPairs = totalPairs;

  const symbols = MEMORY_SYMBOLS.slice(0, totalPairs);
  const deck = [...symbols, ...symbols];
  memoryCards = deck.sort(() => Math.random() - 0.5);

  const board = document.getElementById('memoryBoard');
  board.style.gridTemplateColumns = `repeat(${memorySize}, 1fr)`;
  board.innerHTML = '';

  memoryCards.forEach((symbol, i) => {
    const card = document.createElement('div');
    card.style.cssText = `
      aspect-ratio:1;border-radius:10px;cursor:pointer;font-size:28px;
      background:var(--surface-2);border:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;
      transition:all .3s;user-select:none;
    `;
    card.dataset.index = i;
    card.dataset.symbol = symbol;
    card.textContent = '?';
    card.style.color = 'var(--text-muted)';
    card.onclick = () => flipCard(i);
    board.appendChild(card);
  });

  updateMemoryStats();
  document.getElementById('memoryMessage').innerHTML = '';

  memoryTimerInterval = setInterval(() => {
    memoryTimer++;
    document.getElementById('memTime').textContent = memoryTimer + 's';
  }, 1000);
}

function flipCard(index) {
  if (memoryLocked) return;
  if (memoryFlipped.length >= 2) return;
  if (memoryFlipped.some(f => f.index === index)) return;

  const cards = document.querySelectorAll('#memoryBoard > div');
  const card = cards[index];
  if (card.dataset.matched) return;

  card.style.background = 'var(--surface-3)';
  card.style.color = 'var(--accent)';
  card.textContent = card.dataset.symbol;

  memoryFlipped.push({ index, symbol: card.dataset.symbol });

  if (memoryFlipped.length === 2) {
    memoryMoves++;
    memoryLocked = true;

    if (memoryFlipped[0].symbol === memoryFlipped[1].symbol) {
      // Match found
      setTimeout(() => {
        cards[memoryFlipped[0].index].style.background = 'var(--correct)';
        cards[memoryFlipped[0].index].style.color = '#fff';
        cards[memoryFlipped[0].index].dataset.matched = 'true';
        cards[memoryFlipped[1].index].style.background = 'var(--correct)';
        cards[memoryFlipped[1].index].style.color = '#fff';
        cards[memoryFlipped[1].index].dataset.matched = 'true';
        memoryMatched++;
        memoryFlipped = [];
        memoryLocked = false;
        updateMemoryStats();

        if (memoryMatched === memoryPairs) {
          clearInterval(memoryTimerInterval);
          showMessage('memoryMessage', `Completed in ${memoryMoves} moves!`, 'win');
        }
      }, 500);
    } else {
      // No match
      setTimeout(() => {
        cards[memoryFlipped[0].index].style.background = 'var(--surface-2)';
        cards[memoryFlipped[0].index].style.color = 'var(--text-muted)';
        cards[memoryFlipped[0].index].textContent = '?';
        cards[memoryFlipped[1].index].style.background = 'var(--surface-2)';
        cards[memoryFlipped[1].index].style.color = 'var(--text-muted)';
        cards[memoryFlipped[1].index].textContent = '?';
        memoryFlipped = [];
        memoryLocked = false;
      }, 800);
    }
    updateMemoryStats();
  }
}

function updateMemoryStats() {
  document.getElementById('memMoves').textContent = memoryMoves;
  document.getElementById('memPairs').textContent = `${memoryMatched}/${memoryPairs}`;
}

// ═══════════════════════════════════════════════════════════════
// TYPING SPEED TEST
// ═══════════════════════════════════════════════════════════════

const TYPING_TEXTS = [
  `The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once. It has been used for decades to test typewriters, keyboards, and font rendering. Practice typing this sentence to improve your speed and accuracy across all keys.`,

  `Programming is not just about writing code that works. It is about writing code that humans can understand, maintain, and extend. Clean code reads like well-written prose. Every variable name, every function, every module should tell a story. When you write code, you are writing for your future self and for the developers who come after you.`,

  `The best time to plant a tree was twenty years ago. The second best time is now. This proverb applies perfectly to learning new skills, starting projects, and building habits. Every expert was once a beginner who refused to quit. The journey of a thousand miles begins with a single step, but it continues with thousands more.`,

  `In software development, simplicity is the ultimate sophistication. It takes courage to remove features, to delete code, to say no to complexity. The function of good software is to make the complex appear simple. Anyone can write code a computer understands. Good programmers write code humans understand.`,

  `A journey of a thousand miles begins with a single step. But the step is not enough. You must keep walking. Day after day. Through rain and shine. When the path is clear and when it is obscured. Consistency beats intensity. Small daily progress compounds into remarkable results over time. This is the secret of mastery in any field.`,

  `Code is poetry written in logic. Each function a stanza. Each module a chapter. The compiler is your editor. The runtime is your audience. Bugs are typos in your verse. Refactoring is revision. Clean code reads like a well-crafted poem — every word necessary, nothing superfluous, beauty in structure and clarity of expression.`,

  `Talk is cheap. Show me the code. But also show me the tests. Show me the documentation. Show me the thought process. Real engineering is not just the artifact you produce, but the discipline that produced it. First solve the problem, then write the code. Make it work. Make it right. Make it fast. In that order.`,

  `The only way to do great work is to love what you do. If you have not found it yet, keep looking. Do not settle. As with all matters of the heart, you will know when you find it. And like any great relationship, it gets better with time. Passion fuels the late nights, the debugging sessions, the refactoring marathons that turn good into great.`
];

let typingText = '';
let typingIndex = 0;
let typingStarted = false;
let typingTimer = 30;
let typingMode = 30;
let typingInterval = null;
let typingErrors = 0;
let typingCorrect = 0;

function setTypingMode(seconds) {
  typingMode = parseInt(seconds);
  typingTimer = typingMode;
  document.querySelectorAll('#game-typing .game-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  resetTyping();
}

function initTyping() {
  resetTyping();
}

function resetTyping() {
  clearInterval(typingInterval);
  typingTimer = typingMode;
  typingIndex = 0;
  typingStarted = false;
  typingErrors = 0;
  typingCorrect = 0;

  typingText = TYPING_TEXTS[Math.floor(Math.random() * TYPING_TEXTS.length)];

  const textEl = document.getElementById('typingText');
  const lines = typingText.split('\n');
  let charIndex = 0;
  textEl.innerHTML = lines.map((line, lineIdx) => {
    const lineHtml = line.split('').map((ch) => {
      const id = `typing-char-${charIndex}`;
      charIndex++;
      return `<span id="${id}" style="color:var(--text-muted)">${ch === ' ' ? '\u00A0' : ch}</span>`;
    }).join('');
    return `<div style="display:block">${lineHtml}</div>`;
  }).join('');

  document.getElementById('typingField').value = '';
  document.getElementById('typingField').disabled = false;
  document.getElementById('typingField').placeholder = 'Type the text above...';
  document.getElementById('typingTime').textContent = typingTimer;
  document.getElementById('typingMessage').innerHTML = '';
  document.getElementById('typeWPM').textContent = '0';
  document.getElementById('typeAccuracy').textContent = '100';
  document.getElementById('typeTime').textContent = typingTimer;
  document.getElementById('typeChars').textContent = '0';
}

function startTyping() {
  if (typingStarted) return;
  typingStarted = true;
  typingTimer = typingMode;

  typingInterval = setInterval(() => {
    typingTimer--;
    document.getElementById('typeTime').textContent = typingTimer;

    if (typingTimer <= 0) {
      clearInterval(typingInterval);
      document.getElementById('typingField').disabled = true;
      const wpm = Math.round((typingCorrect / 5) / (typingMode / 60));
      const accuracy = typingCorrect + typingErrors > 0 ? Math.round((typingCorrect / (typingCorrect + typingErrors)) * 100) : 100;
      showMessage('typingMessage', `WPM: ${wpm} | Accuracy: ${accuracy}%`, 'info');
    }
  }, 1000);
}

function checkTyping() {
  const field = document.getElementById('typingField');
  const typed = field.value;
  const len = typed.length;

  // Update character highlights
  for (let i = 0; i < typingText.length; i++) {
    const charEl = document.getElementById(`typing-char-${i}`);
    if (i < len) {
      if (typed[i] === typingText[i]) {
        charEl.style.color = 'var(--correct)';
      } else {
        charEl.style.color = 'var(--correct)';
        charEl.style.textDecoration = 'underline';
        charEl.style.textDecorationColor = 'var(--present)';
      }
    } else if (i === len) {
      charEl.style.color = 'var(--accent)';
    } else {
      charEl.style.color = 'var(--text-muted)';
      charEl.style.textDecoration = 'none';
    }
  }

  // Count correct/incorrect
  typingCorrect = 0;
  typingErrors = 0;
  for (let i = 0; i < len && i < typingText.length; i++) {
    if (typed[i] === typingText[i]) typingCorrect++;
    else typingErrors++;
  }

  const wpm = typingStarted ? Math.round((typingCorrect / 5) / ((typingMode - typingTimer) / 60 || 1)) : 0;
  const accuracy = len > 0 ? Math.round((typingCorrect / len) * 100) : 100;

  document.getElementById('typeWPM').textContent = wpm;
  document.getElementById('typeAccuracy').textContent = accuracy;
  document.getElementById('typeChars').textContent = len;

  // Auto-complete if finished
  if (len >= typingText.length) {
    clearInterval(typingInterval);
    document.getElementById('typingField').disabled = true;
    showMessage('typingMessage', `Completed! WPM: ${wpm} | Accuracy: ${accuracy}%`, 'win');
  }
}

// ═══════════════════════════════════════════════════════════════
// SNAKE GAME
// ═══════════════════════════════════════════════════════════════

let snakeCanvas, snakeCtx;
let snake = [];
let snakeFood = null;
let snakeDir = { x: 1, y: 0 };
let snakeNextDir = { x: 1, y: 0 };
let snakeScore = 0;
let snakeBest = parseInt(localStorage.getItem('snakeBest') || '0');
let snakeInterval = null;
let snakeRaf = null;
let snakeCellSize = 20;
let snakeGameOver = false;
let snakeFoodEaten = 0;
let snakeLevel = 1;
let snakeSpeed = 120;

function initSnake() {
  snakeCanvas = document.getElementById('snakeCanvas');
  snakeCtx = snakeCanvas.getContext('2d');
  snakeCellSize = 20;
  document.getElementById('snakeBest').textContent = snakeBest;
  resetSnake();
}

function setSnakeDir(dir) {
  if (snakeGameOver) return;
  if (dir === 'up' && snakeDir.y !== 1) snakeNextDir = { x: 0, y: -1 };
  if (dir === 'down' && snakeDir.y !== -1) snakeNextDir = { x: 0, y: 1 };
  if (dir === 'left' && snakeDir.x !== 1) snakeNextDir = { x: -1, y: 0 };
  if (dir === 'right' && snakeDir.x !== -1) snakeNextDir = { x: 1, y: 0 };
}

function resetSnake() {
  if (snakeInterval) clearInterval(snakeInterval);
  if (snakeRaf) cancelAnimationFrame(snakeRaf);
  snakeGameOver = false;
  snake = [{ x: 10, y: 10 }];
  snakeDir = { x: 1, y: 0 };
  snakeNextDir = { x: 1, y: 0 };
  snakeScore = 0;
  snakeFoodEaten = 0;
  snakeLevel = 1;
  snakeSpeed = 120;
  document.getElementById('snakeScore').textContent = '0';
  document.getElementById('snakeMessage').innerHTML = '';
  spawnSnakeFood();

  snakeInterval = setInterval(updateSnake, snakeSpeed);
  snakeRaf = requestAnimationFrame(snakeRenderLoop);
}

function snakeRenderLoop() {
  if (snakeGameOver) return;
  drawSnake();
  snakeRaf = requestAnimationFrame(snakeRenderLoop);
}

function spawnSnakeFood() {
  const cols = Math.floor(snakeCanvas.width / snakeCellSize);
  const rows = Math.floor(snakeCanvas.height / snakeCellSize);
  do {
    snakeFood = {
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows)
    };
  } while (snake.some(s => s.x === snakeFood.x && s.y === snakeFood.y));
}

function updateSnake() {
  if (snakeGameOver) return;

  snakeDir = { ...snakeNextDir };

  const head = { x: snake[0].x + snakeDir.x, y: snake[0].y + snakeDir.y };

  // Wall collision
  const cols = Math.floor(snakeCanvas.width / snakeCellSize);
  const rows = Math.floor(snakeCanvas.height / snakeCellSize);
  if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows) {
    endSnake();
    return;
  }

  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    endSnake();
    return;
  }

  snake.unshift(head);

  // Eat food
  if (head.x === snakeFood.x && head.y === snakeFood.y) {
    snakeScore += 10;
    snakeFoodEaten++;
    document.getElementById('snakeScore').textContent = snakeScore;
    document.getElementById('snakeFruit').textContent = snakeFoodEaten;

    // Level up every 10 fruits
    if (snakeFoodEaten % 10 === 0) {
      snakeLevel++;
      snakeSpeed = Math.max(50, 120 - (snakeLevel - 1) * 8);
      clearInterval(snakeInterval);
      snakeInterval = setInterval(updateSnake, snakeSpeed);
      document.getElementById('snakeLevel').textContent = snakeLevel;
      showMessage('snakeMessage', `Level ${snakeLevel}! Speed +${120 - snakeSpeed}ms`, 'info');
    }

    spawnSnakeFood();
  } else {
    snake.pop();
  }
}

function drawSnake() {
  const ctx = snakeCtx;
  const size = snakeCellSize;

  ctx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  // Draw grid (subtle)
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= snakeCanvas.width; x += size) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, snakeCanvas.height); ctx.stroke();
  }
  for (let y = 0; y <= snakeCanvas.height; y += size) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(snakeCanvas.width, y); ctx.stroke();
  }

  // Draw food
  if (snakeFood) {
    ctx.fillStyle = '#b0b0b0';
    ctx.beginPath();
    ctx.arc(snakeFood.x * size + size/2, snakeFood.y * size + size/2, size/3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw snake
  snake.forEach((seg, i) => {
    const brightness = i === 0 ? 176 : Math.max(80, 176 - i * 4);
    ctx.fillStyle = `rgb(${brightness},${brightness},${brightness})`;
    const gap = 1;
    const r = 4;
    const x = seg.x * size + gap;
    const y = seg.y * size + gap;
    const w = size - gap * 2;
    const h = size - gap * 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  });
}

function endSnake() {
  snakeGameOver = true;
  clearInterval(snakeInterval);
  cancelAnimationFrame(snakeRaf);
  if (snakeScore > snakeBest) {
    snakeBest = snakeScore;
    localStorage.setItem('snakeBest', snakeBest.toString());
    document.getElementById('snakeBest').textContent = snakeBest;
  }
  showMessage('snakeMessage', `Game Over! Score: ${snakeScore}`, 'lose');
}

document.addEventListener('keydown', (e) => {
  if (currentGame !== 'snake' || snakeGameOver) return;
  const key = e.key;
  if ((key === 'ArrowUp' || key === 'w') && snakeDir.y !== 1) snakeNextDir = { x: 0, y: -1 };
  if ((key === 'ArrowDown' || key === 's') && snakeDir.y !== -1) snakeNextDir = { x: 0, y: 1 };
  if ((key === 'ArrowLeft' || key === 'a') && snakeDir.x !== 1) snakeNextDir = { x: -1, y: 0 };
  if ((key === 'ArrowRight' || key === 'd') && snakeDir.x !== -1) snakeNextDir = { x: 1, y: 0 };
  e.preventDefault();
});

// ═══════════════════════════════════════════════════════════════
// TETRIS
// ═══════════════════════════════════════════════════════════════

let tetrisCanvas, tetrisCtx;
const TETRIS_COLS = 10;
const TETRIS_ROWS = 20;
const TETRIS_CELL = 30;
let tetrisBoard = [];
let tetrisPiece = null;
let tetrisNext = null;
let tetrisScore = 0;
let tetrisLevel = 1;
let tetrisLines = 0;
let tetrisInterval = null;
let tetrisRaf = null;
let tetrisGameOver = false;

const TETROMINOS = [
  { shape: [[1,1,1,1]], color: '#d0d0d0' },
  { shape: [[1,0,0],[1,1,1]], color: '#b0b0b0' },
  { shape: [[0,0,1],[1,1,1]], color: '#909090' },
  { shape: [[1,1],[1,1]], color: '#707070' },
  { shape: [[0,1,1],[1,1,0]], color: '#505050' },
  { shape: [[0,1,0],[1,1,1]], color: '#404040' },
  { shape: [[1,1,0],[0,1,1]], color: '#606060' }
];

function initTetris() {
  tetrisCanvas = document.getElementById('tetrisCanvas');
  tetrisCtx = tetrisCanvas.getContext('2d');
  tetrisCanvas.width = TETRIS_COLS * TETRIS_CELL;
  tetrisCanvas.height = TETRIS_ROWS * TETRIS_CELL;
  resetTetris();
}

function tetrisMove(dir) {
  if (tetrisGameOver || !tetrisPiece) return;
  if (!checkCollision(tetrisPiece.shape, tetrisPiece.x + dir, tetrisPiece.y)) {
    tetrisPiece.x += dir;
  }
}

function tetrisRotate() {
  if (tetrisGameOver || !tetrisPiece) return;
  const rotated = rotateTetris(tetrisPiece.shape);
  if (!checkCollision(rotated, tetrisPiece.x, tetrisPiece.y)) {
    tetrisPiece.shape = rotated;
  }
}

function tetrisDrop() {
  if (tetrisGameOver || !tetrisPiece) return;
  while (!checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y + 1)) {
    tetrisPiece.y++;
    tetrisScore += 2;
  }
  lockTetrisPiece();
  document.getElementById('tetrisScore').textContent = tetrisScore;
}

function resetTetris() {
  if (tetrisInterval) clearInterval(tetrisInterval);
  if (tetrisRaf) cancelAnimationFrame(tetrisRaf);
  tetrisBoard = Array.from({length: TETRIS_ROWS}, () => Array(TETRIS_COLS).fill(null));
  tetrisScore = 0;
  tetrisLevel = 1;
  tetrisLines = 0;
  tetrisGameOver = false;
  document.getElementById('tetrisScore').textContent = '0';
  document.getElementById('tetrisLevel').textContent = '1';
  document.getElementById('tetrisLines').textContent = '0';
  document.getElementById('tetrisMessage').innerHTML = '';

  spawnTetrisPiece();
  tetrisInterval = setInterval(updateTetris, 800);
  tetrisRaf = requestAnimationFrame(tetrisRenderLoop);
}

function tetrisRenderLoop() {
  if (tetrisGameOver) return;
  drawTetris();
  tetrisRaf = requestAnimationFrame(tetrisRenderLoop);
}

function spawnTetrisPiece() {
  if (tetrisNext) {
    tetrisPiece = { ...tetrisNext, x: Math.floor(TETRIS_COLS / 2) - Math.ceil(tetrisNext.shape[0].length / 2), y: 0 };
  } else {
    const t = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
    tetrisPiece = {
      shape: t.shape.map(r => [...r]),
      color: t.color,
      x: Math.floor(TETRIS_COLS / 2) - Math.ceil(t.shape[0].length / 2),
      y: 0
    };
  }
  // Generate next
  const t = TETROMINOS[Math.floor(Math.random() * TETROMINOS.length)];
  tetrisNext = { shape: t.shape.map(r => [...r]), color: t.color };
  drawNextTetris();
  if (checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y)) {
    endTetris();
  }
}

function drawNextTetris() {
  const canvas = document.getElementById('nextTetrisCanvas');
  if (!canvas || !tetrisNext) return;
  const ctx = canvas.getContext('2d');
  const cell = 24;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const shape = tetrisNext.shape;
  const offX = (canvas.width - shape[0].length * cell) / 2;
  const offY = (canvas.height - shape.length * cell) / 2;
  ctx.fillStyle = tetrisNext.color;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        ctx.fillRect(offX + c * cell + 1, offY + r * cell + 1, cell - 2, cell - 2);
      }
    }
  }
}

function checkCollision(shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (shape[r][c]) {
        const x = px + c;
        const y = py + r;
        if (x < 0 || x >= TETRIS_COLS || y >= TETRIS_ROWS) return true;
        if (y >= 0 && tetrisBoard[y][x]) return true;
      }
    }
  }
  return false;
}

function rotateTetris(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array.from({length: cols}, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = shape[r][c];
    }
  }
  return rotated;
}

function lockTetrisPiece() {
  for (let r = 0; r < tetrisPiece.shape.length; r++) {
    for (let c = 0; c < tetrisPiece.shape[r].length; c++) {
      if (tetrisPiece.shape[r][c]) {
        const y = tetrisPiece.y + r;
        const x = tetrisPiece.x + c;
        if (y >= 0) {
          tetrisBoard[y][x] = tetrisPiece.color;
        }
      }
    }
  }

  // Clear lines
  let linesCleared = 0;
  for (let r = TETRIS_ROWS - 1; r >= 0; r--) {
    if (tetrisBoard[r].every(cell => cell !== null)) {
      tetrisBoard.splice(r, 1);
      tetrisBoard.unshift(Array(TETRIS_COLS).fill(null));
      linesCleared++;
      r++;
    }
  }

  if (linesCleared > 0) {
    tetrisLines += linesCleared;
    tetrisScore += [0, 100, 300, 500, 800][linesCleared] * tetrisLevel;
    tetrisLevel = Math.floor(tetrisLines / 10) + 1;
    document.getElementById('tetrisScore').textContent = tetrisScore;
    document.getElementById('tetrisLevel').textContent = tetrisLevel;
    document.getElementById('tetrisLines').textContent = tetrisLines;

    // Speed up
    clearInterval(tetrisInterval);
    tetrisInterval = setInterval(updateTetris, Math.max(100, 800 - (tetrisLevel - 1) * 70));
  }

  spawnTetrisPiece();
}

function updateTetris() {
  if (tetrisGameOver) return;

  if (!checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y + 1)) {
    tetrisPiece.y++;
  } else {
    lockTetrisPiece();
  }
}

function drawTetris() {
  const ctx = tetrisCtx;
  ctx.clearRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

  // Draw board
  for (let r = 0; r < TETRIS_ROWS; r++) {
    for (let c = 0; c < TETRIS_COLS; c++) {
      if (tetrisBoard[r][c]) {
        ctx.fillStyle = tetrisBoard[r][c];
        ctx.fillRect(c * TETRIS_CELL + 1, r * TETRIS_CELL + 1, TETRIS_CELL - 2, TETRIS_CELL - 2);
      }
    }
  }

  // Draw current piece
  if (tetrisPiece) {
    ctx.fillStyle = tetrisPiece.color;
    for (let r = 0; r < tetrisPiece.shape.length; r++) {
      for (let c = 0; c < tetrisPiece.shape[r].length; c++) {
        if (tetrisPiece.shape[r][c]) {
          const x = (tetrisPiece.x + c) * TETRIS_CELL + 1;
          const y = (tetrisPiece.y + r) * TETRIS_CELL + 1;
          ctx.fillRect(x, y, TETRIS_CELL - 2, TETRIS_CELL - 2);
        }
      }
    }
  }

  // Draw grid
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= tetrisCanvas.width; x += TETRIS_CELL) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, tetrisCanvas.height); ctx.stroke();
  }
  for (let y = 0; y <= tetrisCanvas.height; y += TETRIS_CELL) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(tetrisCanvas.width, y); ctx.stroke();
  }
}

function endTetris() {
  tetrisGameOver = true;
  clearInterval(tetrisInterval);
  cancelAnimationFrame(tetrisRaf);
  showMessage('tetrisMessage', `Game Over! Score: ${tetrisScore}`, 'lose');
}

document.addEventListener('keydown', (e) => {
  if (currentGame !== 'tetris' || tetrisGameOver) return;
  if (!tetrisPiece) return;

  if (e.key === 'ArrowLeft') {
    if (!checkCollision(tetrisPiece.shape, tetrisPiece.x - 1, tetrisPiece.y)) {
      tetrisPiece.x--;
    }
  } else if (e.key === 'ArrowRight') {
    if (!checkCollision(tetrisPiece.shape, tetrisPiece.x + 1, tetrisPiece.y)) {
      tetrisPiece.x++;
    }
  } else if (e.key === 'ArrowDown') {
    if (!checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y + 1)) {
      tetrisPiece.y++;
      tetrisScore++;
      document.getElementById('tetrisScore').textContent = tetrisScore;
    }
  } else if (e.key === 'ArrowUp') {
    const rotated = rotateTetris(tetrisPiece.shape);
    if (!checkCollision(rotated, tetrisPiece.x, tetrisPiece.y)) {
      tetrisPiece.shape = rotated;
    }
  } else if (e.key === ' ') {
    // Hard drop
    while (!checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y + 1)) {
      tetrisPiece.y++;
      tetrisScore += 2;
    }
    lockTetrisPiece();
    document.getElementById('tetrisScore').textContent = tetrisScore;
  }
  e.preventDefault();
});

// ═══════════════════════════════════════════════════════════════
// 2048
// ═══════════════════════════════════════════════════════════════

let board2048 = [];
let score2048 = 0;
let best2048 = parseInt(localStorage.getItem('best2048') || '0');
let gameOver2048 = false;

const TILE_COLORS = {
  0: 'var(--surface-2)',
  2: '#777', 4: '#888', 8: '#999', 16: '#aaa',
  32: '#bbb', 64: '#ccc', 128: '#ddd', 256: '#eee',
  512: '#fff', 1024: '#fff', 2048: '#fff'
};

function init2048() {
  document.getElementById('best2048').textContent = best2048;
  reset2048();
}

function reset2048() {
  board2048 = Array.from({length: 4}, () => Array(4).fill(0));
  score2048 = 0;
  gameOver2048 = false;
  document.getElementById('score2048').textContent = '0';
  document.getElementById('message2048').innerHTML = '';
  spawnTile2048();
  spawnTile2048();
  render2048();
}

function spawnTile2048() {
  const empty = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board2048[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board2048[r][c] = Math.random() < 0.9 ? 2 : 4;
}

function render2048() {
  const board = document.getElementById('board2048');
  board.innerHTML = '';
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const val = board2048[r][c];
      const tile = document.createElement('div');
      tile.style.cssText = `
        aspect-ratio:1;border-radius:8px;display:flex;align-items:center;justify-content:center;
        font-family:var(--font-mono);font-weight:700;font-size:${val >= 1024 ? '18px' : val >= 128 ? '22px' : '26px'};
        background:${TILE_COLORS[val] || 'var(--surface-3)'};
        color:${val <= 4 ? 'var(--text-secondary)' : val <= 64 ? 'var(--bg)' : 'var(--bg)'};
        transition:all .15s;
      `;
      tile.textContent = val || '';
      board.appendChild(tile);
    }
  }
}

function slideRow2048(row) {
  let arr = row.filter(v => v !== 0);
  let merged = [];
  let score = 0;
  for (let i = 0; i < arr.length; i++) {
    if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
      merged.push(arr[i] * 2);
      score += arr[i] * 2;
      i++;
    } else {
      merged.push(arr[i]);
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function move2048(dir) {
  if (gameOver2048) return;

  const old = board2048.map(r => [...r]);
  let gained = 0;

  if (dir === 'left') {
    for (let r = 0; r < 4; r++) {
      const { row, score } = slideRow2048(board2048[r]);
      board2048[r] = row;
      gained += score;
    }
  } else if (dir === 'right') {
    for (let r = 0; r < 4; r++) {
      const { row, score } = slideRow2048([...board2048[r]].reverse());
      board2048[r] = row.reverse();
      gained += score;
    }
  } else if (dir === 'up') {
    for (let c = 0; c < 4; c++) {
      const col = [board2048[0][c], board2048[1][c], board2048[2][c], board2048[3][c]];
      const { row, score } = slideRow2048(col);
      board2048[0][c] = row[0];
      board2048[1][c] = row[1];
      board2048[2][c] = row[2];
      board2048[3][c] = row[3];
      gained += score;
    }
  } else if (dir === 'down') {
    for (let c = 0; c < 4; c++) {
      const col = [board2048[3][c], board2048[2][c], board2048[1][c], board2048[0][c]];
      const { row, score } = slideRow2048(col);
      board2048[3][c] = row[0];
      board2048[2][c] = row[1];
      board2048[1][c] = row[2];
      board2048[0][c] = row[3];
      gained += score;
    }
  }

  // Check if board actually changed
  let moved = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board2048[r][c] !== old[r][c]) { moved = true; break; }
    }
    if (moved) break;
  }

  if (!moved) return;

  score2048 += gained;
  document.getElementById('score2048').textContent = score2048;
  if (score2048 > best2048) {
    best2048 = score2048;
    localStorage.setItem('best2048', best2048.toString());
    document.getElementById('best2048').textContent = best2048;
  }
  spawnTile2048();
  render2048();

  // Check win
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board2048[r][c] === 2048) {
        showMessage('message2048', 'You Win!', 'win');
        return;
      }
    }
  }

  // Check game over
  if (isGameOver2048()) {
    gameOver2048 = true;
    showMessage('message2048', 'Game Over!', 'lose');
  }
}

function isGameOver2048() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board2048[r][c] === 0) return false;
      if (c + 1 < 4 && board2048[r][c] === board2048[r][c + 1]) return false;
      if (r + 1 < 4 && board2048[r][c] === board2048[r + 1][c]) return false;
    }
  }
  return true;
}

document.addEventListener('keydown', (e) => {
  if (currentGame !== '2048' || gameOver2048) return;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
    e.preventDefault();
    const dir = e.key.replace('Arrow', '').toLowerCase();
    move2048(dir);
  }
});

// Touch support for 2048
let touchStartX2048, touchStartY2048;
document.addEventListener('touchstart', (e) => {
  if (currentGame !== '2048') return;
  touchStartX2048 = e.touches[0].clientX;
  touchStartY2048 = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  if (currentGame !== '2048' || gameOver2048) return;
  const dx = e.changedTouches[0].clientX - touchStartX2048;
  const dy = e.changedTouches[0].clientY - touchStartY2048;
  if (Math.abs(dx) > Math.abs(dy)) {
    move2048(dx > 0 ? 'right' : 'left');
  } else {
    move2048(dy > 0 ? 'down' : 'up');
  }
});

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function showMessage(id, text, type) {
  document.getElementById(id).innerHTML = `<div class="game-msg ${type}">${text}</div>`;
}

// Touch support for snake
let touchStartXSnake, touchStartYSnake;
document.addEventListener('touchstart', (e) => {
  if (currentGame !== 'snake') return;
  touchStartXSnake = e.touches[0].clientX;
  touchStartYSnake = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  if (currentGame !== 'snake' || snakeGameOver) return;
  const dx = e.changedTouches[0].clientX - touchStartXSnake;
  const dy = e.changedTouches[0].clientY - touchStartYSnake;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && snakeDir.x !== -1) snakeNextDir = { x: 1, y: 0 };
    else if (dx < 0 && snakeDir.x !== 1) snakeNextDir = { x: -1, y: 0 };
  } else {
    if (dy > 0 && snakeDir.y !== -1) snakeNextDir = { x: 0, y: 1 };
    else if (dy < 0 && snakeDir.y !== 1) snakeNextDir = { x: 0, y: -1 };
  }
});

// Touch support for tetris
let touchStartXTetris, touchStartYTetris;
document.addEventListener('touchstart', (e) => {
  if (currentGame !== 'tetris') return;
  touchStartXTetris = e.touches[0].clientX;
  touchStartYTetris = e.touches[0].clientY;
});

document.addEventListener('touchend', (e) => {
  if (currentGame !== 'tetris' || tetrisGameOver) return;
  const dx = e.changedTouches[0].clientX - touchStartXTetris;
  const dy = e.changedTouches[0].clientY - touchStartYTetris;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0) {
      if (!checkCollision(tetrisPiece.shape, tetrisPiece.x + 1, tetrisPiece.y)) tetrisPiece.x++;
    } else {
      if (!checkCollision(tetrisPiece.shape, tetrisPiece.x - 1, tetrisPiece.y)) tetrisPiece.x--;
    }
  } else {
    if (dy > 30) {
      while (!checkCollision(tetrisPiece.shape, tetrisPiece.x, tetrisPiece.y + 1)) {
        tetrisPiece.y++;
        tetrisScore += 2;
      }
      lockTetrisPiece();
      document.getElementById('tetrisScore').textContent = tetrisScore;
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// BLACKJACK (Clubs only — RE7 style)
// ═══════════════════════════════════════════════════════════════

let bjDeck=[], bjPH=[], bjDH=[], bjState='idle', bjStats={w:0,l:0,d:0}, bjInited=false;
const BJ_SUITS=['Clubs'], BJ_RANKS=['A',2,3,4,5,6,7,8,9,10,'J','Q','K'];
const BJ_VAL={A:[1,11],J:[10],Q:[10],K:[10]};

function bjVal(r){return BJ_VAL[r]||[parseInt(r)]}
function bjScore(h){let t=0,a=0;for(let i=0;i<h.length;i++){if(h[i].r==='A'){a++;t+=11}else t+=bjVal(h[i].r)[0]}while(t>21&&a>0){t-=10;a--}return t}
function bjImg(c){return 'Cards/'+c.r+'_Clubs_'+(bjVariant())+'.png'}
function bjVariant(){return document.getElementById('bjVarBtn')?document.getElementById('bjVarBtn').textContent:'Dark'}

function initBlackjack(){
  if(bjInited)return; bjInited=true;
  bjDeal();
}

function bjDeal(){
  bjDeck=[];for(let i=0;i<BJ_RANKS.length;i++)bjDeck.push({r:BJ_RANKS[i]});
  for(let i=bjDeck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));let t=bjDeck[i];bjDeck[i]=bjDeck[j];bjDeck[j]=t}
  bjPH=[bjDeck.pop(),bjDeck.pop()];bjDH=[bjDeck.pop(),bjDeck.pop()];
  bjState='playing';
  document.getElementById('bjResult').textContent='';
  document.getElementById('bjDealBtn').disabled=true;
  document.getElementById('bjHitBtn').disabled=false;
  document.getElementById('bjStandBtn').disabled=false;
  bjRender();
  if(bjScore(bjPH)===21)bjStand();
}

function bjRenderCard(c,fd){
  const el=document.createElement('div');
  el.className='bj-card'+(fd?' fd':'');
  const src=fd?'Cards/BACK_Dark.png':bjImg(c);
  el.innerHTML='<img src="'+src+'" alt="">';
  return el;
}

function bjRender(){
  const dh=document.getElementById('bjDealer'),ph=document.getElementById('bjPlayer');
  dh.innerHTML='';ph.innerHTML='';
  const dHide=bjState==='playing';
  for(let i=0;i<bjDH.length;i++)dh.appendChild(bjRenderCard(bjDH[i],dHide&&i===0));
  for(let i=0;i<bjPH.length;i++)ph.appendChild(bjRenderCard(bjPH[i],false));
  document.getElementById('bjPInfo').textContent=bjPH.length?'Score: '+bjScore(bjPH):'';
  let di='';
  if(bjDH.length){di=dHide?'Showing: '+bjVal(bjDH[1].r)[0]:'Score: '+bjScore(bjDH)}
  document.getElementById('bjDInfo').textContent=di;
}

function bjEnd(msg){
  bjState='over';
  document.getElementById('bjResult').textContent=msg;
  document.getElementById('bjDealBtn').disabled=false;
  document.getElementById('bjHitBtn').disabled=true;
  document.getElementById('bjStandBtn').disabled=true;
  bjRender();
}

function bjHit(){
  if(bjState!=='playing')return;
  bjPH.push(bjDeck.pop());bjRender();
  if(bjScore(bjPH)>21){bjEnd('Bust! Dealer wins.');bjStats.l++;document.getElementById('bjLosses').textContent=bjStats.l}
}

function bjStand(){
  if(bjState!=='playing')return;
  document.getElementById('bjHitBtn').disabled=true;
  document.getElementById('bjStandBtn').disabled=true;
  bjState='dealer';bjRender();
  const t=setInterval(()=>{
    if(bjScore(bjDH)<17&&bjScore(bjPH)<=21){bjDH.push(bjDeck.pop());bjRender()}
    else{clearInterval(t);
      const p=bjScore(bjPH),d=bjScore(bjDH);
      if(p>21)bjEnd('Bust! Dealer wins.'),bjStats.l++;
      else if(d>21)bjEnd('Dealer busts! You win!'),bjStats.w++;
      else if(p>d)bjEnd('You win!'),bjStats.w++;
      else if(p<d)bjEnd('Dealer wins.'),bjStats.l++;
      else bjEnd('Push!'),bjStats.d++;
      document.getElementById('bjWins').textContent=bjStats.w;
      document.getElementById('bjLosses').textContent=bjStats.l;
      document.getElementById('bjDraws').textContent=bjStats.d;
    }
  },550);
}

// ═══════════════════════════════════════════════════════════════
// SOLITAIRE (Klondike)
// ═══════════════════════════════════════════════════════════════

let sol={deck:[],stock:[],waste:[],found:[[],[],[],[]],tab:[[],[],[],[],[],[],[]],sel:null,moves:0,hist:[],over:false};
const SOL_SUITS=['Clubs','Diamonds','Hearts','Spades'],SOL_SC={Clubs:'black',Diamonds:'red',Hearts:'red',Spades:'black'};
const SOL_R=['A',2,3,4,5,6,7,8,9,10,'J','Q','K'],SOL_RV={A:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9,10:10,J:11,Q:12,K:13};

function solImg(c){return 'Cards/'+c.r+'_'+c.s+'_Dark.png'}
function solRed(c){return SOL_SC[c.s]==='red'}

function initSolitaire(){solDeal()}

function solDeal(){
  sol.deck=[];for(let s=0;s<SOL_SUITS.length;s++)for(let r=0;r<SOL_R.length;r++)sol.deck.push({r:SOL_R[r],s:SOL_SUITS[s],up:false});
  for(let i=sol.deck.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));let t=sol.deck[i];sol.deck[i]=sol.deck[j];sol.deck[j]=t}
  sol.stock=[];sol.waste=[];sol.found=[[],[],[],[]];sol.tab=[[],[],[],[],[],[],[]];sol.sel=null;sol.moves=0;sol.hist=[];sol.over=false;
  let idx=0;
  for(let c=0;c<7;c++)for(let row=0;row<=c;row++){let card=sol.deck[idx++];card.up=(row===c);sol.tab[c].push(card)}
  while(idx<52)sol.stock.push(sol.deck[idx++]);
  solRender();
}

function solSnap(){sol.hist.push(JSON.stringify({stock:sol.stock,waste:sol.waste,found:sol.found,tab:sol.tab}));if(sol.hist.length>80)sol.hist.shift()}
function solUndo(){if(!sol.hist.length)return;const s=JSON.parse(sol.hist.pop());sol.stock=s.stock;sol.waste=s.waste;sol.found=s.found;sol.tab=s.tab;sol.sel=null;solRender()}
function solFoundN(){let n=0;for(let i=0;i<4;i++)n+=sol.found[i].length;return n}

function solCanTab(card,col){
  const pile=sol.tab[col];
  if(!pile.length)return card.r==='K';
  const top=pile[pile.length-1];
  return top.up&&solRed(top)!==solRed(card)&&SOL_RV[top.r]===SOL_RV[card.r]+1;
}

function solAutoMove(card){
  for(let fi=0;fi<4;fi++){
    const f=sol.found[fi];
    if(f.length&&f[f.length-1].s===card.s&&SOL_RV[card.r]===SOL_RV[f[f.length-1].r]+1){
      solSnap();f.push(card);sol.moves++;solCheckWin();solRender();return true;
    }
    if(!f.length&&card.r==='A'){
      solSnap();f.push(card);sol.moves++;solCheckWin();solRender();return true;
    }
  }
  return false;
}

function solCheckWin(){
  if(solFoundN()===52){
    sol.over=true;
    const b=document.getElementById('solBoard');
    const m=document.createElement('div');m.className='sol-msg';
    m.innerHTML='<h2>You Win!</h2><p>'+sol.moves+' moves</p>';
    b.appendChild(m);
  }
}

function solRemoveFrom(type,idx,ci){
  if(type==='waste')return[sol.waste.pop()];
  if(type==='tab'){
    const col=sol.tab[idx],removed=col.splice(ci);
    if(col.length&&!col[col.length-1].up)col[col.length-1].up=true;
    return removed;
  }
  return[];
}

function solOnStock(){
  solSnap();
  if(!sol.stock.length){sol.stock=sol.waste.reverse();sol.waste=[]}
  else{const c=sol.stock.pop();c.up=true;sol.waste.push(c)}
  sol.sel=null;solRender();
}

function solOnWaste(){
  if(!sol.waste.length)return;
  if(sol.sel&&sol.sel.type==='waste'){sol.sel=null;solRender();return}
  if(sol.sel){sol.sel=null;solRender();return}
  sol.sel={type:'waste'};solRender();
}

function solOnCard(type,ci,cardIdx){
  const pile=sol.tab[ci];
  const card=pile[cardIdx];
  if(!card.up)return;
  if(sol.sel){
    if(sol.sel.type===type&&sol.sel.ci===ci&&sol.sel.cardIdx===cardIdx){sol.sel=null;solRender();return}
    let cards;
    if(sol.sel.type==='waste')cards=solRemoveFrom('waste');
    else if(sol.sel.type==='tab')cards=solRemoveFrom('tab',sol.sel.ci,sol.sel.cardIdx);
    if(cards&&cards.length){
      if(solCanTab(cards[0],ci)){
        solSnap();pile.push(...cards);sol.moves++;sol.sel=null;solRender();return;
      }
      if(sol.sel.type==='waste')sol.waste.push(...cards);
      else if(sol.sel.type==='tab')sol.tab[sol.sel.ci].push(...cards);
    }
    sol.sel=null;solRender();return;
  }
  sol.sel={type:'tab',ci,cardIdx};solRender();
}

function solOnEmpty(ci){
  if(!sol.sel)return;
  let cards;
  if(sol.sel.type==='waste')cards=solRemoveFrom('waste');
  else if(sol.sel.type==='tab')cards=solRemoveFrom('tab',sol.sel.ci,sol.sel.cardIdx);
  if(cards&&cards.length&&cards[0].r==='K'){solSnap();sol.tab[ci].push(...cards);sol.moves++}
  else if(cards){if(sol.sel.type==='waste')sol.waste.push(...cards);else if(sol.sel.type==='tab')sol.tab[sol.sel.ci].push(...cards)}
  sol.sel=null;solRender();
}

function solOnDblClick(type,ci,cardIdx){
  let card;
  if(type==='waste'){if(!sol.waste.length)return;card=sol.waste[sol.waste.length-1]}
  else{const p=sol.tab[ci];if(cardIdx!==p.length-1)return;card=p[cardIdx]}
  if(solAutoMove(card)){
    if(type==='waste')sol.waste.pop();
    else{sol.tab[ci].pop();if(sol.tab[ci].length&&!sol.tab[ci][sol.tab[ci].length-1].up)sol.tab[ci][sol.tab[ci].length-1].up=true}
  }
}

function solRender(){
  const b=document.getElementById('solBoard');b.innerHTML='';
  const top=document.createElement('div');top.className='sol-top';
  // Stock
  const sd=document.createElement('div');sd.className='sol-pile';
  if(sol.stock.length){const sb=document.createElement('div');sb.className='sol-sb';sb.innerHTML='<img src="Cards/BACK_Dark.png" alt="">';sb.onclick=e=>{e.stopPropagation();solOnStock()};sd.appendChild(sb)}
  else{const ph=document.createElement('div');ph.className='sol-ph stock';ph.textContent='\u21bb';ph.onclick=e=>{e.stopPropagation();solOnStock()};sd.appendChild(ph)}
  top.appendChild(sd);
  // Waste
  const wd=document.createElement('div');wd.className='sol-pile';
  if(sol.waste.length){const wc=sol.waste[sol.waste.length-1];const el=solMakeCard(wc,sol.sel&&sol.sel.type==='waste');el.onclick=e=>{e.stopPropagation();solOnWaste()};el.ondblclick=e=>{e.stopPropagation();solOnDblClick('waste')};wd.appendChild(el)}
  else{const ph=document.createElement('div');ph.className='sol-ph';wd.appendChild(ph)}
  top.appendChild(wd);
  const gap=document.createElement('div');gap.className='sol-gap';top.appendChild(gap);
  // Foundations
  const suits=['\u2663','\u2666','\u2665','\u2660'];
  for(let f=0;f<4;f++){
    const fd=document.createElement('div');fd.className='sol-pile';
    if(sol.found[f].length){const fc=sol.found[f][sol.found[f].length-1];fd.appendChild(solMakeCard(fc,false))}
    else{const ph=document.createElement('div');ph.className='sol-ph';ph.textContent=suits[f];fd.appendChild(ph)}
    top.appendChild(fd);
  }
  b.appendChild(top);
  // Tableau
  const tbl=document.createElement('div');tbl.className='sol-tableau';
  for(let c=0;c<7;c++){
    const col=document.createElement('div');col.className='sol-col';
    if(!sol.tab[c].length){
      const ph=document.createElement('div');ph.className='sol-cph';
      ph.onclick=()=>solOnEmpty(c);col.appendChild(ph);
    }else{
      for(let ci=0;ci<sol.tab[c].length;ci++){
        const card=sol.tab[c][ci];
        const el=solMakeCard(card,sol.sel&&sol.sel.type==='tab'&&sol.sel.ci===c&&sol.sel.cardIdx===ci);
        el.style.top=ci*20+'px';el.style.zIndex=ci+1;
        el.onclick=e=>{e.stopPropagation();solOnCard('tab',c,ci)};
        el.ondblclick=e=>{e.stopPropagation();solOnDblClick('tab',c,ci)};
        col.appendChild(el);
      }
    }
    tbl.appendChild(col);
  }
  b.appendChild(tbl);
}

function solMakeCard(card,sel){
  const el=document.createElement('div');
  el.className='sol-c'+(card.up?'':' face-down')+(sel?' sel':'');
  el.innerHTML='<img src="'+(card.up?solImg(card):'Cards/BACK_Dark.png')+'" alt="">';
  return el;
}

