const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const linesElement = document.getElementById('lines');
const levelElement = document.getElementById('level');
const gameOverElement = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;

let board = [];
let currentPiece = null;
let gameRunning = false;
let score = 0;
let lines = 0;
let level = 1;
let dropInterval = 1000;
let lastDropTime = 0;

const COLORS = {
    0: '#111',
    1: '#0ff',
    2: '#00f',
    3: '#fa0',
    4: '#ff0',
    5: '#0f0',
    6: '#f0f',
    7: '#f00'
};

const SHAPES = [
    [[1, 1, 1, 1]],
    [[1, 1], [1, 1]],
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0, 0], [1, 1, 1]],
    [[0, 0, 1], [1, 1, 1]],
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1, 1], [1, 1, 0]]
];

class Piece {
    constructor() {
        this.type = Math.floor(Math.random() * SHAPES.length);
        this.shape = SHAPES[this.type];
        this.color = this.type + 1;
        this.x = Math.floor((COLS - this.shape[0].length) / 2);
        this.y = 0;
    }

    rotate() {
        const rotated = [];
        const rows = this.shape.length;
        const cols = this.shape[0].length;
        
        for (let j = 0; j < cols; j++) {
            rotated[j] = [];
            for (let i = rows - 1; i >= 0; i--) {
                rotated[j][rows - 1 - i] = this.shape[i][j];
            }
        }
        
        return rotated;
    }
}

function createBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
}

function drawBlock(x, y, color) {
    ctx.fillStyle = COLORS[color];
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    if (color !== 0) {
        ctx.strokeStyle = '#000';
        ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
}

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            drawBlock(col, row, board[row][col]);
        }
    }
}

function drawPiece() {
    if (!currentPiece) return;
    
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                drawBlock(currentPiece.x + col, currentPiece.y + row, currentPiece.color);
            }
        }
    }
}

function isValidMove(piece, dx, dy, newShape = null) {
    const shape = newShape || piece.shape;
    const newX = piece.x + dx;
    const newY = piece.y + dy;
    
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const boardX = newX + col;
                const boardY = newY + row;
                
                if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                    return false;
                }
                
                if (boardY >= 0 && board[boardY][boardX]) {
                    return false;
                }
            }
        }
    }
    
    return true;
}

function lockPiece() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                
                if (boardY >= 0) {
                    board[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            row++;
        }
    }
    
    if (linesCleared > 0) {
        lines += linesCleared;
        score += linesCleared * 100 * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        
        updateDisplay();
    }
}

function updateDisplay() {
    scoreElement.textContent = score;
    linesElement.textContent = lines;
    levelElement.textContent = level;
}

function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    startButton.textContent = 'もう一度プレイ';
}

function movePiece(dx, dy) {
    if (isValidMove(currentPiece, dx, dy)) {
        currentPiece.x += dx;
        currentPiece.y += dy;
        return true;
    }
    return false;
}

function rotatePiece() {
    const rotated = currentPiece.rotate();
    
    if (isValidMove(currentPiece, 0, 0, rotated)) {
        currentPiece.shape = rotated;
    } else if (isValidMove(currentPiece, -1, 0, rotated)) {
        currentPiece.x -= 1;
        currentPiece.shape = rotated;
    } else if (isValidMove(currentPiece, 1, 0, rotated)) {
        currentPiece.x += 1;
        currentPiece.shape = rotated;
    }
}

function dropPiece() {
    if (!movePiece(0, 1)) {
        lockPiece();
        clearLines();
        currentPiece = new Piece();
        
        if (!isValidMove(currentPiece, 0, 0)) {
            gameOver();
        }
    }
}

function hardDrop() {
    while (movePiece(0, 1)) {
        score += 2;
    }
    updateDisplay();
}

function gameLoop(currentTime) {
    if (!gameRunning) return;
    
    if (currentTime - lastDropTime > dropInterval) {
        dropPiece();
        lastDropTime = currentTime;
    }
    
    drawBoard();
    drawPiece();
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = 1000;
    updateDisplay();
    
    currentPiece = new Piece();
    gameRunning = true;
    gameOverElement.style.display = 'none';
    startButton.textContent = 'リスタート';
    
    lastDropTime = Date.now();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', (e) => {
    if (!gameRunning || !currentPiece) return;
    
    switch(e.key) {
        case 'ArrowLeft':
            movePiece(-1, 0);
            break;
        case 'ArrowRight':
            movePiece(1, 0);
            break;
        case 'ArrowDown':
            if (movePiece(0, 1)) {
                score += 1;
                updateDisplay();
            }
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case ' ':
            hardDrop();
            break;
    }
});

createBoard();
drawBoard();