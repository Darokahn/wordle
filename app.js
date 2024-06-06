async function Wordle(gridObject, word) {

    // I don't know if this is allowed, but I'm using this function to mimic how you would initialize a python object.

    let wordle = {
        keyboard: Keyboard(),
        wordsObject: await getWordsObject(),
        gridObject: gridObject,
        word: word,
        currentRow: 0, 
        currentGuessString: "",
        guessHistory: [],
        blackLetters: new Set(), 
        greenLetters: new Set(), 
        yellowLetters: new Set()
    };

    wordle.guess = function(word) {
        let thisGuess = ["", "", "", "", ""];
        let lettersCount = {};
        for (let i = 0; i < this.word.length; i++) {
            let letter = this.word[i];
            if (letter in lettersCount) {
                lettersCount[letter]++;
            }
            else {
                lettersCount[letter] = 1;
            }
        }

        if (word.length != 5) {
            console.log("Attempt to guess word longer than 5 rejected");
            return thisGuess;
        }
        let correctWord = this.word;
        for (let i = 0; i < 5; i++) {
            let gLetter = word[i];
            let cLetter = correctWord[i];
            if (gLetter === cLetter) {
                if (lettersCount[gLetter] != 0) {
                    thisGuess[i] = 'green';
                    lettersCount[gLetter]--;
                }
                else {
                    thisGuess[i] = 'black';
                }
                this.greenLetters.add(cLetter);
            }
            else if (correctWord.includes(gLetter)) {
                if (lettersCount[gLetter] != 0) {
                    thisGuess[i] = 'yellow';
                    lettersCount[gLetter]--;
                }
                else {
                    thisGuess[i] = 'black';
                }
                this.yellowLetters.add(gLetter);
            }
            else {
                thisGuess[i] = "black";
                this.blackLetters.add(gLetter);
            }
        }
        return thisGuess;
    };

    wordle.validateWord = function() {
        let words = this.wordsObject;
        if (words.record.allowed.includes(this.currentGuessString)) {
            return true;
        }
        if (words.record.answers.includes(this.currentGuessString)) {
            return true;
        }
        return false;
    };

    wordle.updateSquares = async function(guessOutcome, doDelay = true) {
        let row = this.gridObject.rows[this.currentRow];
        var delay = 0;
        if (doDelay) {
            delay = 1;
        }
        for (var i = 0; i < row.length; i++) {
            let s = row[i];
            let c = guessOutcome[i];
            let func = function(square = s, color = c) {
                square.classList.remove('empty');
                square.classList.add(color);
            };
            let keyFrames = [
                {transform: 'scaleY(1)'},
                {transform: 'scaleY(0.6)'},
                {transform: 'scaleY(0)'},
                {transform: 'scaleY(0.4)'},
                {transform: 'scaleY(1)'},
            ];

            let args = {
                duration: 400,
                fill: 'forwards'
            };
            setTimeout(function() {
                s.animate(keyFrames, args);
                setTimeout(func, 200);
            }, i * 300 * delay);
            
        };
        if (doDelay){
            await new Promise(resolve => setTimeout(resolve, 1600));
        }
    };

    wordle.checkCondition = function(guessOutcome) {
        var greenCount = 0;
        for (let i = 0; i < guessOutcome.length; i++) {
            if (guessOutcome[i] === "green") {
                greenCount++;
            }
        }
        let rowsLen = this.gridObject.rows.length;
        if (greenCount === this.word.length)  {
            this.win();
        }
        else if (this.currentRow >= rowsLen) {
            this.currentRow = rowsLen - 1;
            this.lose();
        }
        
    }

    wordle.computerGuess = async function() {
        let guesses = localStorage.getItem("last-game").split(",");
        for(let i = 0; i < guesses.length; i++){
            let g = guesses[i];
            this.currentGuessString = g;
            let guessOutcome = this.guess(g);
            this.updateSquares(guessOutcome, false);
            this.keyboard.updateColors(this);
            this.updateEmpties();
            this.currentRow++;
            this.checkCondition(guessOutcome);
            };
        this.currentGuessString = "";
    };

    wordle.makeGuess = async function() {
        if (!this.validateWord()) {
            this.reject("Word not in word list");
            return;
        }
        let guessOutcome = this.guess(this.currentGuessString);
        if (guessOutcome.includes("")) {
            console.log("guess aborted");
            return;
        }

        await this.updateSquares(guessOutcome, true);

        this.keyboard.updateColors(this);
        this.currentRow++;
        this.guessHistory.push(this.currentGuessString);

        this.checkCondition(guessOutcome);

        localStorage.setItem("last-game", this.guessHistory);
        this.currentGuessString = "";
    };

    wordle.updateEmpties = function() {
        let row = this.gridObject.rows[this.currentRow];
        for (let i = 0; i < row.length; i++) {
            let square = row[i];
            if (i >= this.currentGuessString.length) {
                square.innerHTML = "";
                square.classList.remove("has-letter");
            }
            else {
                let keyframes = [
                    {transform: 'scale(1)'},
                    {transform: 'scale(1.1)'},
                    {transform: 'scale(1)'}
                ];
                square.innerHTML = this.currentGuessString[i].toUpperCase();
                if (!square.classList.contains("has-letter")) {
                    square.animate(keyframes, {duration: 100});
                }
                square.classList.add("has-letter");
            }
        }
    };

    wordle.wiggle = function() {
        let row = this.gridObject.rows[this.currentRow];
        for (let i = 0; i < row.length; i++) {
            row[i].classList.add("wiggling");
        }

        setTimeout(function() {
            for (let i = 0; i < row.length; i++) {
                row[i].classList.remove("wiggling");
            }
        }, 500);
    };

    wordle.reject = function(message) {
        this.wiggle();
        putMessage(message);
    };

    wordle.win = function() {
        putMessage("You win!");
        document.removeEventListener('keydown', onKeypress);
    };

    wordle.lose = function() {
        this.reject(`You lose... the word was ${this.word} :)`);
        document.removeEventListener('keydown', onKeypress);
    }

    return wordle;
}

function Grid(parentDiv, rowCount, colCount) {

    let rows = [];
    let squares = Array.from(parentDiv.children);
    for (let i = 0; i < rowCount; i++) {
        let index = i * colCount;
        rows.push(squares.slice(index, index + colCount));
    }

    let grid = {
        rows: rows
    };

    return grid
}

function Keyboard() {
    let keyboardDiv = document.getElementById("keyboard");
    let keyboard = {
        keyorder: "qwertyuiopasdfghjklzxcvbnm",
        rows: keyboardDiv.children
    };

    // this part is bad :(
    
    for (var i = 0; i < 10; i++) {
        let char = keyboard.keyorder[i].toUpperCase();
        let newKey = document.createElement("button");
        newKey.classList.add("key");
        newKey.innerHTML = char;
        newKey.onclick = function() {
            let event = new KeyboardEvent('keydown', {key: char});
            document.dispatchEvent(event);
        };
        keyboard.rows[0].appendChild(newKey);
    }
    for (i; i < 19; i++) {
        let char = keyboard.keyorder[i].toUpperCase();
        let newKey = document.createElement("button");
        newKey.classList.add("key");
        newKey.innerHTML = char;
        newKey.onclick = function() {
            let event = new KeyboardEvent('keydown', {key: char});
            document.dispatchEvent(event);
        };
        keyboard.rows[1].appendChild(newKey);
    }
    let newKey = document.createElement("button");
    newKey.classList.add("key");
    newKey.innerHTML = "ENTER";
    newKey.classList.add("wide");
    newKey.onclick = function() {
        let event = new KeyboardEvent('keydown', {key: 'Enter'});
        document.dispatchEvent(event);
    }
    keyboard.rows[2].appendChild(newKey);
    for (i; i < 26; i++) {
        let char = keyboard.keyorder[i].toUpperCase();
        let newKey = document.createElement("button");
        newKey.classList.add("key");
        newKey.innerHTML = char;
        newKey.onclick = function() {
            let event = new KeyboardEvent('keydown', {key: char});
            document.dispatchEvent(event);
        };
        keyboard.rows[2].appendChild(newKey);
    }
    newKey = document.createElement("button");
    newKey.classList.add("key");
    newKey.classList.add("wide");
    newKey.innerHTML =  "<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" height=\"20\" viewBox=\"0 0 24 24\" width=\"20\"><path fill=\"var(--color-tone-1)\" d=\"M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z\"></path></svg>"
    newKey.onclick = function() {
        let event = new KeyboardEvent('keydown', {key: "Backspace"});
        document.dispatchEvent(event);
    };
    keyboard.rows[2].appendChild(newKey);

    keyboard.updateColors = function(wordleObject) {
        let yellows = wordleObject.yellowLetters;
        let greens = wordleObject.greenLetters;
        let blacks = wordleObject.blackLetters;
        Array.from(this.rows).forEach(function(row) {
            Array.from(row.children).forEach(function(square) {
                let char = square.innerHTML.toLowerCase();
                if (yellows.has(char)) {
                    square.classList.add("yellow");
                }
                else if (greens.has(char)) {
                    square.classList.add("green");
                }
                else if (blacks.has(char)) {
                    square.classList.add("black");
                }
            })
        })
    }


    return keyboard;
}

function putMessage(mess) {
    let m = document.createElement("div");

    document.body.appendChild(m);
    m.classList.add("message");
    m.innerHTML = mess;
    setTimeout(function () {
        m.classList.add("hide");
        setTimeout(function() {
            m.remove();
        }, 500);
    }, 800);
}

function onKeypress(event) {
    let char = event.key;
    if (char.match(/[a-z]/i) && char.length === 1) {
        if (w.currentGuessString.length < 5) {
            w.currentGuessString += char.toLowerCase();
            w.updateEmpties();
        }
    }
    else if (char === 'Enter') {
        if (w.currentGuessString.length === 5) {
            w.makeGuess();
        }
        else {
            w.reject("Not enough letters");
        }
    }
    else if (char === 'Backspace') {
        w.currentGuessString = w.currentGuessString.slice(0, -1);
        w.updateEmpties();
    }
}

function daysSinceProjectStart() {
    const start = new Date(2024, 5, 5);
    let milliseconds = new Date() - start;
    let days = Math.floor(milliseconds / 86_400_000);
    return days;
}

function chooseWord(wordsObject, arg) {
    const answers = wordsObject.record.answers;
    var index = 0;
    switch(arg) {
        case 'daily':
            index = daysSinceProjectStart();
            break;
        case 'random':
            index = Math.floor(Math.random() * answers.length);
            break;
    }
    return answers[index];
}

async function getWordsObject() {
    response = await fetch("https://api.jsonbin.io/v3/b/629f9937402a5b38021f6b38");
    const json = await response.json();
    return json;
}

async function init() {

    const mode = 'daily';

    const today = new Date();

    const words = await getWordsObject();

    const chosenWord = chooseWord(words, mode);

    console.log(`Hey hacker, the word is ${chosenWord}. If you're gonna dig around my code, why don't you fix some bugs?`);
    
    let g = Grid(document.getElementById("wordle-grid"), 6, 5);
    
    w = await Wordle(g, chosenWord);

    document.addEventListener("keydown", onKeypress);

    if (mode === 'daily') {
        if (guesses = localStorage.getItem("last-game")) {
            w.guessHistory = localStorage.getItem("last-game").split(",");
            w.computerGuess();
        }

        if (!localStorage.getItem("last-played")) {
            localStorage.setItem("last-played", today);
        }

        let lastPlayed = new Date(localStorage.getItem("last-played"));

        if (daysSinceProjectStart(lastPlayed) != daysSinceProjectStart(today)) {
            localStorage.clear();
            localStorage.setItem("last-played", today);
        }
    }
    
    else if (mode === 'random') {
        localStorage.clear();
    }   
}

var w;

var k;

init();

let reset = () => {localStorage.clear(); window.location.reload();}
