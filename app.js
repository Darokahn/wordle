async function Wordle(gridObject, wordsObject, word) {

    // I don't know if this is allowed, but I'm using this function to mimic how you would initialize a python object.

    let wordle = {
        keyboard: Keyboard(),
        wordsObject: wordsObject,
        gridObject: gridObject,
        word: word,
        currentRow: 0, 
        currentGuessString: "",
        guessHistory: [],
        trackedLetters: {}
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

        //pass through once to check greens with priority
        for (let i = 0; i < 5; i++) {
            let gLetter = word[i];
            let cLetter = correctWord[i];
            if (gLetter === cLetter) {
                thisGuess[i] = 'green';
                lettersCount[gLetter]--;
            }
        }

        //pass through again; yellows and blacks get leftovers
        for (let i = 0; i < 5; i++) {
            let gLetter = word[i];
            if (thisGuess[i] != '') {
                continue;
            }
            if (correctWord.includes(gLetter)) {
                if (lettersCount[gLetter] != 0) {
                    thisGuess[i] = 'yellow';
                    lettersCount[gLetter]--;
                }
                else {
                    thisGuess[i] = 'black';
                }
            }
            else {
                thisGuess[i] = "black";
            }
        }
        return thisGuess;
    };

    wordle.updateTrackedLetters = function(guessOutcome, guess) {
        for (let i = 0; i < guess.length; i++) {

            let letter = guess[i];
            let status = guessOutcome[i];

            if (!(letter in this.trackedLetters)) {
                this.trackedLetters[letter] = TrackedLetter();
            }

            let letterObj = this.trackedLetters[letter];

            switch (status) {
                case "yellow":
                    letterObj.forbiddenPositions.add(i);
                    letterObj.positiveOccurrencesThisRow++;
                    break;
                case "black": 
                    letterObj.forbiddenPositions.add(i);
                    letterObj.negativeOccurencesThisRow++;
                    break;
                case "green":
                    letterObj.knownPositions.add(i);
                    letterObj.positiveOccurrencesThisRow++;
                    break;
            }
        }
        Object.values(this.trackedLetters).forEach(function(letter) {
            letter.minimumOccurrences = Math.max(letter.positiveOccurrencesThisRow, letter.minimumOccurrences);
            if (letter.negativeOccurencesThisRow) {
                letter.maximumOccurrences = letter.minimumOccurrences;
            }
            letter.resetRow();
        });
    }

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
            await new Promise(resolve => setTimeout(resolve, 1700));
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
            this.updateTrackedLetters(guessOutcome, this.currentGuessString);
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

        this.updateTrackedLetters(guessOutcome, this.currentGuessString);

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
                square.classList.remove('has-letter', 'impossible', 'certain', 'impossible', 'unknown');
            }
            else {
                let keyframes = [
                    {transform: 'scale(1)'},
                    {transform: 'scale(1.1)'},
                    {transform: 'scale(1)'}
                ];
                let char = this.currentGuessString[i];
                square.innerHTML = char.toUpperCase();
                if (!square.classList.contains("has-letter")) {
                    square.animate(keyframes, {duration: 100});
                }
                square.classList.add("has-letter");
                if (char in this.trackedLetters) {
                    let condition = this.trackedLetters[char].positionStatus(i);
                    square.classList.remove('impossible', 'certain', 'impossible');
                    square.classList.add(condition);
                    let newDiv = document.createElement('div');
                    square.appendChild(newDiv);
                }
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

    keyboard.newKey = function(char, keydown, wide) {
        let newKey = document.createElement("button");
        newKey.classList.add("key");
        if (wide === true) {
            newKey.classList.add("wide");
        }
        newKey.innerHTML = char;
        newKey.onclick = function() {
            let event = new KeyboardEvent('keydown', {key: keydown});
            document.dispatchEvent(event);
        };
        return newKey;
    }

    keyboard.addKey = function(index, row) {
        let char = keyboard.keyorder[index].toUpperCase();
        let newKey = keyboard.newKey(char, char, false);
        keyboard.rows[row].appendChild(newKey);
    }

    keyboard.updateColors = function(wordleObject) {
        Array.from(this.rows).forEach(function(row) {
            Array.from(row.children).forEach(function(square) {
                let char = square.innerHTML.toLowerCase();
                if (char in wordleObject.trackedLetters) var letterObj = wordleObject.trackedLetters[char];
                else return;
                if (letterObj.knownPositions.size === 0 && letterObj.maximumOccurrences > 0) {
                    square.classList.add("yellow");
                }
                else if (letterObj.knownPositions.size > 0) {
                    square.classList.add("green");
                }
                else if (letterObj.maximumOccurrences === 0) {
                    square.classList.add("black");
                }
            })
        })
    }

    let newKey = keyboard.newKey("Enter", "Enter", true);
    keyboard.rows[2].appendChild(newKey);
    var row = 0;
    for (let i = 0; i < 26; i++) {
        switch (i) {
            case 19:
                row = 2; break;
            case 10:
                row = 1; break;
        }
        keyboard.addKey(i, row);
    }
    newKey = keyboard.newKey("<svg aria-hidden=\"true\" xmlns=\"http://www.w3.org/2000/svg\" height=\"20\" viewBox=\"0 0 24 24\" width=\"20\"><path fill=\"var(--color-tone-1)\" d=\"M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H7.07L2.4 12l4.66-7H22v14zm-11.59-2L14 13.41 17.59 17 19 15.59 15.41 12 19 8.41 17.59 7 14 10.59 10.41 7 9 8.41 12.59 12 9 15.59z\"></path></svg>", "Backspace", true);
    keyboard.rows[2].appendChild(newKey);


    return keyboard;
}

function TrackedLetter() {
    let newLetter = {
        forbiddenPositions: new Set(),
        knownPositions: new Set(),
        positiveOccurrencesThisRow: 0,
        negativeOccurencesThisRow: 0,
        minimumOccurrences: 0,
        maximumOccurrences: 5
    };
    newLetter.resetRow = function() {
        this.positiveOccurrencesThisRow = 0;
        this.negativeOccurencesThisRow = 0;
    };

    newLetter.positionStatus = function(index) {
        if (this.knownPositions.has(index)) {
            return "certain";
        }
        if (this.maximumOccurrences === 0 || this.forbiddenPositions.has(index)) {
            return "impossible";
        }
        if (this.maximumOccurrences > 0) {
            return "possible";
        }
        return "unknown";
    };

    return newLetter;
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

function daysSinceProjectStart(date) {
    const start = new Date(2024, 5, 5);
    let milliseconds = date - start;
    let days = Math.floor(milliseconds / 86_400_000);
    return days;
}

function chooseWord(wordsObject, arg) {
    const answers = wordsObject.record.answers;
    var index = 0;
    switch(arg) {
        case 'daily':
            index = daysSinceProjectStart(new Date()); break;
        case 'random':
            index = Math.floor(Math.random() * answers.length); break;
    }
    return answers[index];
}

async function getWordsObject() {
    response = await fetch("https://api.jsonbin.io/v3/b/629f9937402a5b38021f6b38");
    const json = await response.json();
    return json;
}

async function init() {
    var mode;
    var storedMode = localStorage.getItem('mode');

    if (storedMode) {
        mode = storedMode; 
    }
    else {
        mode = 'daily';
        localStorage.setItem('mode', 'daily');
    }

    const today = new Date();

    const words = await getWordsObject();

    const chosenWord = chooseWord(words, mode);

    console.log(`Hey hacker, the word is ${chosenWord}. If you're gonna dig around my code, why don't you fix some bugs?`);
    console.log('For a few site functions, type "help"');
    
    let g = Grid(document.getElementById("wordle-grid"), 6, 5);
    
    w = await Wordle(g, words, chosenWord);

    document.addEventListener("keydown", onKeypress);

    if (mode === 'daily') {
        if (!localStorage.getItem("last-played")) {
            localStorage.setItem("last-played", today);
        }

        let lastPlayed = new Date(localStorage.getItem("last-played"));

        if (daysSinceProjectStart(lastPlayed) != daysSinceProjectStart(today)) {
            localStorage.setItem("last-game", '');
            localStorage.setItem("last-played", today);
        }

        if (guesses = localStorage.getItem("last-game")) {
            w.guessHistory = localStorage.getItem("last-game").split(",");
            w.computerGuess();
        }
    }
    
    else if (mode === 'random') {
        localStorage.clear();
        localStorage.setItem('mode', 'random');
    }

    let extraText = "Clone";
    var title = document.getElementById("title");
    var i = 0;
    setTimeout(function() {
        title.classList.add('has-cursor');
        var titleAnimation = setInterval(function() {
            if (i < extraText.length) {
                title.textContent += extraText[i];
            }
            else if (i == extraText.length + 3) {
                title.classList.remove('has-cursor');
                clearInterval(titleAnimation);
                return;
            }
            i++;
        }, 90);
    }, 1000);
    document.body.style.display = 'flex';
}

var w;

var k;

init();

let reset = function() {localStorage.clear(); window.location.reload();};
let makeRandom = function() {localStorage.mode = 'random'; window.location.reload();};
let makeDaily = function() {localStorage.mode = 'daily'; window.location.reload();};
let help = "to change something about the site, type one of the following here: change your mode to random: makeRandom(); change to daily: makeDaily(); clear all data: reset()";
let noRestrict = function() {w.validateWord = function() {return true;};};