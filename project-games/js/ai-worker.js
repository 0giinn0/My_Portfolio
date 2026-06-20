// ═══════════════════════════════════════════════════════════════
// ENHANCED AI ALGORITHMS: OBSTACLE AWARENESS, LINE DETECTION, GAME OVER PREVENTION
// ═══════════════════════════════════════════════════════════════

let snakeAI = null;
let tetrisAI = null;
let game2048AI = null;

onmessage = function(e) {
  const { type, game, enabled, state } = e.data;

  switch(type) {
    case 'toggle':
      if (enabled) {
        if (game === 'snake') snakeAI = new EnhancedSnakeAI();
        else if (game === 'tetris') tetrisAI = new EnhancedTetrisAI();
        else if (game === '2048') game2048AI = new Enhanced2048AI();
      } else {
        if (game === 'snake') snakeAI = null;
        else if (game === 'tetris') tetrisAI = null;
        else if (game === '2048') game2048AI = null;
      }
      break;

    case 'state':
      if (game === 'snake' && snakeAI) {
        const action = snakeAI.getAction(state);
        if (action) postMessage({ type: 'action', game: 'snake', action });
      } else if (game === 'tetris' && tetrisAI) {
        const action = tetrisAI.getAction(state);
        if (action) postMessage({ type: 'action', game: 'tetris', action, data: action });
      } else if (game === '2048' && game2048AI) {
        const action = game2048AI.getAction(state);
        if (action) postMessage({ type: 'action', game: '2048', action });
      }
      break;

    case 'stop':
      snakeAI = null;
      tetrisAI = null;
      game2048AI = null;
      break;
  }
};

class EnhancedSnakeAI {
  constructor() {
    this.lastMove = null;
    this.target = null;
    this.pathCache = {};
    this.obstacleHistory = [];
    this.wallProximity = 0;
    this.bodyPatternMemory = {};
  }

  getAction(state) {
    if (state.gameOver) return null;

    const { snake, food, dir, gridSize } = state;
    const head = snake[0];

    // Update obstacle awareness
    this.updateObstacleAwareness(head, snake, gridSize);
    
    // Enhanced pathfinding with obstacle awareness
    if (!this.target || this.target.x !== food.x || this.target.y !== food.y) {
      this.target = { x: food.x, y: food.y };
      this.findPathWithObstacles(head, food, gridSize, snake);
    }

    const nextPos = { x: head.x + this.target.dx, y: head.y + this.target.dy };

    // Check if path is safe with enhanced awareness
    if (this.isSafeWithAwareness(nextPos, snake, gridSize, head)) {
      if (this.target.dx === 0 && this.target.dy === 0) {
        this.target = null;
        return null;
      }

      const newDir = this.getDirectionFromDelta(this.target.dx, this.target.dy);
      if (newDir && newDir !== this.getOppositeDirection(dir)) {
        this.lastMove = newDir;
        return newDir;
      }
    }

    const fallbackDir = this.getFallbackDirection(head, snake, dir);
    if (fallbackDir) {
      this.lastMove = fallbackDir;
      return fallbackDir;
    }

    return null;
  }

  updateObstacleAwareness(head, snake, gridSize) {
    const walls = [
      { x: -1, y: head.y }, { x: gridSize.cols, y: head.y },
      { x: head.x, y: -1 }, { x: head.x, y: gridSize.rows }
    ];
    
    const nearbyWalls = walls.filter(w => 
      Math.abs(w.x - head.x) <= 2 && Math.abs(w.y - head.y) <= 2
    );
    this.wallProximity = nearbyWalls.length;
    
    const bodyPattern = snake.map(s => `${s.x},${s.y}`).join('|');
    this.bodyPatternMemory[bodyPattern] = (this.bodyPatternMemory[bodyPattern] || 0) + 1;
    
    this.obstacleHistory.push({
      head: { ...head },
      snakeLength: snake.length,
      timestamp: Date.now()
    });
    
    if (this.obstacleHistory.length > 100) {
      this.obstacleHistory.shift();
    }
  }

  isSafeWithAwareness(pos, snake, gridSize, head) {
    if (pos.x < 0 || pos.x >= gridSize.cols || pos.y < 0 || pos.y >= gridSize.rows) {
      return false;
    }
    
    if (snake.some(s => s.x === pos.x && s.y === pos.y)) {
      return false;
    }
    
    if (this.isDangerousMove(pos, snake, gridSize, head)) return false;
    if (this.isGettingStuck(pos, snake, gridSize)) return false;
    
    return true;
  }

  isDangerousMove(pos, snake, gridSize, head) {
    const corners = [
      { x: 0, y: 0 }, { x: 0, y: gridSize.rows - 1 },
      { x: gridSize.cols - 1, y: 0 }, { x: gridSize.cols - 1, y: gridSize.rows - 1 }
    ];
    
    if (corners.some(corner => corner.x === pos.x && corner.y === pos.y)) return true;
    
    const openNeighbors = this.countOpenNeighbors(pos, snake, gridSize);
    if (openNeighbors <= 1) return true;
    
    if (this.target) {
      const distToFood = Math.abs(pos.x - this.target.x) + Math.abs(pos.y - this.target.y);
      const headToFood = Math.abs(head.x - this.target.x) + Math.abs(head.y - this.target.y);
      if (distToFood > headToFood) return true;
    }
    
    return false;
  }

  isGettingStuck(pos, snake, gridSize) {
    const openNeighbors = this.countOpenNeighbors(pos, snake, gridSize);
    if (openNeighbors <= 1) return true;
    
    const bodyNeighbors = snake.filter(s => 
      Math.abs(s.x - pos.x) <= 1 && Math.abs(s.y - pos.y) <= 1
    ).length - 1;
    
    if (bodyNeighbors >= 3) return true;
    
    return false;
  }

  countOpenNeighbors(pos, snake, gridSize) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const newX = pos.x + dx;
        const newY = pos.y + dy;
        if (newX >= 0 && newX < gridSize.cols && newY >= 0 && newY < gridSize.rows) {
          if (!snake.some(s => s.x === newX && s.y === newY)) count++;
        }
      }
    }
    return count;
  }

  findPathWithObstacles(start, end, gridSize, snake) {
    const queue = [{ pos: start, path: [] }];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    const snakeObstacles = snake.map(s => `${s.x},${s.y}`);

    while (queue.length > 0) {
      const { pos, path } = queue.shift();
      if (pos.x === end.x && pos.y === end.y) {
        if (path.length > 0) this.target = path[0];
        return;
      }
      const moves = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
      ];
      for (const move of moves) {
        const newX = pos.x + move.dx;
        const newY = pos.y + move.dy;
        const key = `${newX},${newY}`;
        if (!visited.has(key) && !snakeObstacles.includes(key)) {
          visited.add(key);
          queue.push({
            pos: { x: newX, y: newY },
            path: [...path, { dx: move.dx, dy: move.dy }]
          });
        }
      }
    }
    this.target = null;
  }

  getDirectionFromDelta(dx, dy) {
    if (dx === 1) return 'right';
    if (dx === -1) return 'left';
    if (dy === 1) return 'down';
    if (dy === -1) return 'up';
    return null;
  }

  getOppositeDirection(dir) {
    if (dir === 'up') return 'down';
    if (dir === 'down') return 'up';
    if (dir === 'left') return 'right';
    if (dir === 'right') return 'left';
    return null;
  }

  getFallbackDirection(head, snake, currentDir) {
    const directions = ['up', 'down', 'left', 'right'];
    for (const dir of directions) {
      if (dir === currentDir) continue;
      const delta = this.getDeltaFromDirection(dir);
      const nextPos = { x: head.x + delta.dx, y: head.y + delta.dy };
      if (this.isSafeWithAwareness(nextPos, snake, { cols: 40, rows: 30 }, head)) return dir;
    }
    return null;
  }

  getDeltaFromDirection(dir) {
    switch(dir) {
      case 'up': return { dx: 0, dy: -1 };
      case 'down': return { dx: 0, dy: 1 };
      case 'left': return { dx: -1, dy: 0 };
      case 'right': return { dx: 1, dy: 0 };
      default: return { dx: 0, dy: 0 };
    }
  }
}

class EnhancedTetrisAI {
  constructor() {
    this.lastDropTime = Date.now();
    this.dropInterval = 800;
  }

  getAction(state) {
    if (state.gameOver) return null;
    const { piece, board } = state;
    if (!piece) return null;

    const currentPos = { x: piece.x, y: piece.y };
    const shape = piece.shape;
    let bestAction = null;
    let bestScore = -Infinity;

    const evaluate = (x, y, s) => {
      if (this.checkCollision(s, x, y, board)) return;
      const score = this.evaluatePosition(x, y, s, board) + (x === currentPos.x && y === currentPos.y ? 0.1 : 0);
      if (score > bestScore) {
        bestScore = score;
        if (x < currentPos.x) bestAction = 'moveLeft';
        else if (x > currentPos.x) bestAction = 'moveRight';
        else if (y > currentPos.y) bestAction = 'drop';
        else bestAction = null;
      }
    };

    const tryRotate = (s) => {
      const rotated = this.rotateShape(s);
      if (!this.checkCollision(rotated, currentPos.x, currentPos.y, board)) {
        const score = this.evaluatePosition(currentPos.x, currentPos.y, rotated, board);
        if (score > bestScore) {
          bestScore = score;
          bestAction = 'rotate';
        }
      }
    };

    // Evaluate current position
    evaluate(currentPos.x, currentPos.y, shape);
    // Try rotations
    tryRotate(shape);
    const r2 = this.rotateShape(this.rotateShape(shape));
    if (r2 !== shape) tryRotate(r2);
    // Try moves
    if (!this.checkCollision(shape, currentPos.x - 1, currentPos.y, board)) evaluate(currentPos.x - 1, currentPos.y, shape);
    if (!this.checkCollision(shape, currentPos.x + 1, currentPos.y, board)) evaluate(currentPos.x + 1, currentPos.y, shape);

    if (bestAction === 'drop' && Date.now() - this.lastDropTime < this.dropInterval) return null;
    if (bestAction === 'drop') { this.lastDropTime = Date.now(); }
    return bestAction;
  }

  checkCollision(shape, x, y, board) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const nx = x + c, ny = y + r;
          if (nx < 0 || nx >= 10 || ny >= 20) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
    }
    return false;
  }

  rotateShape(shape) {
    const rows = shape.length, cols = shape[0].length;
    const r = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++)
      for (let j = 0; j < cols; j++)
        r[j][rows - 1 - i] = shape[i][j];
    return r;
  }

  evaluatePosition(x, y, shape, board) {
    let score = 0;
    let boardY = y;
    while (!this.checkCollision(shape, x, boardY + 1, board)) boardY++;
    
    const tempBoard = board.map(r => [...r]);
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c] && boardY + r < 20) tempBoard[boardY + r][x + c] = true;

    // Lines cleared
    let lines = 0;
    for (let r = 0; r < 20; r++) {
      if (tempBoard[r].every(c => c)) lines++;
    }
    score += lines * 100;

    // Height penalty
    let maxH = 0;
    for (let c = 0; c < 10; c++) {
      for (let r = 0; r < 20; r++) {
        if (tempBoard[r][c]) { maxH = Math.max(maxH, 20 - r); break; }
      }
    }
    score -= maxH * 5;

    // Holes
    let holes = 0;
    for (let c = 0; c < 10; c++) {
      let blocked = false;
      for (let r = 0; r < 20; r++) {
        if (tempBoard[r][c]) blocked = true;
        else if (blocked) holes++;
      }
    }
    score -= holes * 10;

    // Dangerous line awareness
    for (let r = 0; r < 20; r++) {
      const filled = board[r].filter(c => c).length;
      if (filled >= 8) {
        const willFill = shape.some((row, sr) => row.some((v, sc) => v && boardY + sr === r));
        if (!willFill) score -= (10 - filled) * 20;
      }
    }

    return score;
  }
}

class Enhanced2048AI {
  constructor() {
    this.cache = {};
  }

  getAction(state) {
    if (state.gameOver) return null;
    const board = state.board;
    const moves = ['up', 'down', 'left', 'right'];
    let bestMove = null, bestScore = -Infinity;

    const gameState = this.detectGameOverConditions(board);
    if (gameState.shouldStop) return this.getConservativeMove(board);

    for (const move of moves) {
      const { board: nb, changed } = this.move(board, move);
      if (!changed) continue;
      const score = this.evaluateBoard(nb, gameState);
      if (score > bestScore) { bestScore = score; bestMove = move; }
    }

    if (!bestMove) return null;
    return bestMove;
  }

  detectGameOverConditions(board) {
    const emptyCells = this.countEmptyCells(board);
    const noMovesLeft = !['up','down','left','right'].some(m => this.move(board, m).changed);
    const riskyCells = this.countRiskyCells(board);
    return {
      shouldStop: (noMovesLeft && emptyCells < 2) || riskyCells >= 12,
      emptyCells, noMovesLeft, riskyCells
    };
  }

  countRiskyCells(board) {
    let count = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (board[r][c] === 0) count++;
    return 16 - count;
  }

  getConservativeMove(board) {
    let bestMove = null, bestScore = -Infinity;
    for (const move of ['down', 'right', 'left', 'up']) {
      const { board: nb, changed } = this.move(board, move);
      if (!changed) continue;
      const ec = this.countEmptyCells(nb);
      if (ec > bestScore) { bestScore = ec; bestMove = move; }
    }
    return bestMove;
  }

  move(board, direction) {
    const nb = board.map(r => [...r]);
    let changed = false;

    if (direction === 'left') {
      for (let r = 0; r < 4; r++) {
        let row = nb[r].filter(v => v !== 0);
        for (let i = 0; i < row.length - 1; i++) {
          if (row[i] === row[i + 1]) { row[i] *= 2; row.splice(i + 1, 1); }
        }
        while (row.length < 4) row.push(0);
        if (nb[r].join(',') !== row.join(',')) changed = true;
        nb[r] = row;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = nb[r].filter(v => v !== 0);
        for (let i = row.length - 1; i > 0; i--) {
          if (row[i] === row[i - 1]) { row[i] *= 2; row.splice(i - 1, 1); }
        }
        while (row.length < 4) row.unshift(0);
        if (nb[r].join(',') !== row.join(',')) changed = true;
        nb[r] = row;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        let col = [];
        for (let r = 0; r < 4; r++) if (nb[r][c] !== 0) col.push(nb[r][c]);
        for (let i = 0; i < col.length - 1; i++) {
          if (col[i] === col[i + 1]) { col[i] *= 2; col.splice(i + 1, 1); }
        }
        while (col.length < 4) col.push(0);
        for (let r = 0; r < 4; r++) { if (nb[r][c] !== col[r]) changed = true; nb[r][c] = col[r]; }
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        let col = [];
        for (let r = 3; r >= 0; r--) if (nb[r][c] !== 0) col.push(nb[r][c]);
        for (let i = col.length - 1; i > 0; i--) {
          if (col[i] === col[i - 1]) { col[i] *= 2; col.splice(i - 1, 1); }
        }
        while (col.length < 4) col.unshift(0);
        for (let r = 3; r >= 0; r--) { if (nb[r][c] !== col[3 - r]) changed = true; nb[r][c] = col[3 - r]; }
      }
    }

    return { board: nb, changed };
  }

  evaluateBoard(board, gameState) {
    let score = 0;

    // Value bonus (higher tiles = better)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (board[r][c] !== 0) score += board[r][c] * Math.log2(board[r][c]);

    // Empty cells = more room to play
    score += this.countEmptyCells(board) * 50;

    // Monotonicity (tiles sorted along rows/cols)
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++)
        if (board[r][c] !== 0 && board[r][c + 1] !== 0)
          score += (board[r][c] > board[r][c + 1]) ? 10 : -10;

    // Avoid game over
    if (gameState.shouldStop) score -= 500;

    return score;
  }

  countEmptyCells(board) {
    let count = 0;
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++)
        if (board[r][c] === 0) count++;
    return count;
  }
}

function scheduleStateCheck() {
  setTimeout(scheduleStateCheck, 100);
}

scheduleStateCheck();