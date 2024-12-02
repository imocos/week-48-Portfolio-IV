import ANSI from "./utils/ANSI.mjs";
import KeyBoardManager from "./utils/KeyBoardManager.mjs";
import { readMapFile, readRecordFile } from "./utils/fileHelpers.mjs";
import * as CONST from "./constants.mjs";


const startingLevel = CONST.START_LEVEL_ID;
const { levels, order: levelOrder } = loadLevelListings();

function loadLevelListings(source = CONST.LEVEL_LISTING_FILE) {
    let data = readRecordFile(source);
    let levels = {};
    let order = [];
    for (const item of data) {
        let keyValue = item.split(":");
        if (keyValue.length >= 2) {
            let key = keyValue[0];
            let value = keyValue[1];
            levels[key] = value;
            order.push(key);
        }
    }
    return { levels, order };
}

let currentLevel = CONST.START_LEVEL_ID;
let levelData = readMapFile(levels[currentLevel]);
let level = levelData; 

let pallet = {
    "█": ANSI.COLOR.LIGHT_GRAY,
    "H": ANSI.COLOR.RED,
    "$": ANSI.COLOR.YELLOW,
    "B": ANSI.COLOR.GREEN,
    "D": ANSI.COLOR.WHITE,
    "T": ANSI.COLOR.BLUE,
    "C": ANSI.COLOR.YELLOW,
    "X": ANSI.COLOR.RED,
}


let isDirty = true;

let playerPos = {
    row: null,
    col: null,
}

let previousLevel = null;

const EMPTY = " ";
const HERO = "H";
const LOOT = "$";
const DOOR = "D";
const TELEPORT = "T";
const BACKDOOR = "C";
const NPC = "X";

let direction = -1;

let items = [];

const THINGS = [LOOT, EMPTY, DOOR, TELEPORT, BACKDOOR, NPC];

let eventText = "";

const HP_MAX = 10;

const playerStats = {
    hp: 8,
    chash: 0
}

class Labyrinth {
    updateNpcPatrols() {
        this.npcs.forEach(npc => {
            let { row, col, patrolDirection, patrolRange } = npc;

            if (patrolDirection === 'right') {
                if (col < patrolRange.right) {
                    col++;
                } else {
                    patrolDirection = 'left';  
                }
            } else {
                if (col > patrolRange.left) {
                    col--;
                } else {
                    patrolDirection = 'right';  
                }
            }
            level[npc.row][npc.col] = EMPTY;  
            level[row][col] = 'X';  

            npc.col = col;
            npc.patrolDirection = patrolDirection;
        });
    }
    identifyNpcPatrols() {
        this.npcs = [];
        for (let row = 0; row < level.length; row++) {
            for (let col = 0; col < level[row].length; col++) {
                if (level[row][col] == 'X') {  
                    let patrolRange = { left: col - 2, right: col + 2 };
                    this.npcs.push({
                        row: row,
                        col: col,
                        patrolDirection: 'right',  
                        patrolRange: patrolRange,
                    });
                }
            }
        }
    }

    update() {


        if (playerPos.row == null) {
            for (let row = 0; row < level.length; row++) {
                for (let col = 0; col < level[row].length; col++) {
                    if (level[row][col] == "H") {
                        playerPos.row = row;
                        playerPos.col = col;
                        break;
                    }
                }
                if (playerPos.row != undefined) {
                    break;
                }
            }
        }

        let drow = 0;
        let dcol = 0;

        if (KeyBoardManager.isUpPressed()) {
            drow = -1;
        } else if (KeyBoardManager.isDownPressed()) {
            drow = 1;
        }

        if (KeyBoardManager.isLeftPressed()) {
            dcol = -1;
        } else if (KeyBoardManager.isRightPressed()) {
            dcol = 1;
        }

        let tRow = playerPos.row + (1 * drow);
        let tcol = playerPos.col + (1 * dcol);

        if (THINGS.includes(level[tRow][tcol])) { 

            let currentItem = level[tRow][tcol];
            if (currentItem == LOOT) {
                let loot = Math.round(Math.random() * 7) + 3;
                playerStats.chash += loot;
                eventText = `Player gained ${loot}$`;
            }
            if (currentItem == DOOR) {
                let nextLevelKey = getNextLevelKey(currentLevel); 
                if (nextLevelKey) {
                    this.loadNextLevel(nextLevelKey); 
                    eventText = `Player entered ${nextLevelKey}`;
                    return;
                } else {
                    eventText = "Coming soon...";
                }
            }
            if (currentItem == TELEPORT) {
                this.teleportPlayer(tRow, tcol);
                return;
            }
            if (currentItem == BACKDOOR) {  
                this.returnToPreviousLevel();  
                return;
            }

            level[playerPos.row][playerPos.col] = EMPTY;
            level[tRow][tcol] = HERO;

            playerPos.row = tRow;
            playerPos.col = tcol;

            isDirty = true;
        } else {
            direction *= -1;
        }
        this.updateNpcPatrols();
    }
    returnToPreviousLevel() {
        if (previousLevel) {
            level = readMapFile(levels[previousLevel]);  
            currentLevel = previousLevel;  
            previousLevel = null;  
            resetPlayerPosition();  
            identifyTeleportLocations();
            this.identifyNpcPatrols();
            isDirty = true;
            eventText = `Returned to ${currentLevel}`;
        } else {
            eventText = "No previous level to return to!";
        }
    }
    teleportPlayer(tRow, tCol) {

        let otherTeleport = teleportLocations.find(loc => loc.row !== tRow || loc.col !== tCol);

        if (otherTeleport) {
            playerPos.row = otherTeleport.row;
            playerPos.col = otherTeleport.col;

            level[playerPos.row][playerPos.col] = HERO;

            level[tRow][tCol] = EMPTY;

            eventText = `Player teleported to (${playerPos.row}, ${playerPos.col})`;
            isDirty = true;
        }
    }

    draw() {

        if (isDirty == false) {
            return;
        }
        isDirty = false;

        console.log(ANSI.CLEAR_SCREEN, ANSI.CURSOR_HOME);

        let rendring = "";

        rendring += renderHud();

        for (let row = 0; row < level.length; row++) {
            let rowRendering = "";
            for (let col = 0; col < level[row].length; col++) {
                let symbol = level[row][col];
                if (pallet[symbol] != undefined) {
                    rowRendering += pallet[symbol] + symbol + ANSI.COLOR_RESET;
                } else {
                    rowRendering += symbol;
                }
            }
            rowRendering += "\n";
            rendring += rowRendering;
        }

        console.log(rendring);
        if (eventText != "") {
            console.log(eventText);
            eventText = "";
        }
    }
    loadNextLevel(levelKey) {
        previousLevel = currentLevel;  
        currentLevel = levelKey;  
        level = readMapFile(levels[currentLevel]);  
        resetPlayerPosition();  
        identifyTeleportLocations();
        this.identifyNpcPatrols();
        isDirty = true; 
    }
    
}


let teleportLocations = [];

function identifyTeleportLocations() {
    teleportLocations = []; 
    for (let row = 0; row < level.length; row++) {
        for (let col = 0; col < level[row].length; col++) {
            if (level[row][col] == TELEPORT) { 
                teleportLocations.push({ row, col });
            }
        }
    }
    console.log("Teleport Locations:", teleportLocations);
}


function getNextLevelKey(currentKey) {
    let currentIndex = levelOrder.indexOf(currentKey);
    if (currentIndex < 0 || currentIndex + 1 >= levelOrder.length) {
        return null; 
    }
    return levelOrder[currentIndex + 1]; 
}

function loadNextLevel(levelKey) {
    level = readMapFile(levels[levelKey]); 
    resetPlayerPosition(); 
    identifyTeleportLocations();
    isDirty = true; 
}

function resetPlayerPosition() {
    playerPos.row = null;
    playerPos.col = null;
    for (let row = 0; row < level.length; row++) {
        for (let col = 0; col < level[row].length; col++) {
            if (level[row][col] == HERO) {
                playerPos.row = row;
                playerPos.col = col;
                return;
            }
        }
    }
}

function renderHud() {
    let hpBar = `Life:[${ANSI.COLOR.RED + pad(playerStats.hp, "♥︎") + ANSI.COLOR_RESET}${ANSI.COLOR.LIGHT_GRAY + pad(HP_MAX - playerStats.hp, "♥︎") + ANSI.COLOR_RESET}]`
    let cash = `$:${playerStats.chash}`;
    return `${hpBar} ${cash}\n`;
}

function pad(len, text) {
    let output = "";
    for (let i = 0; i < len; i++) {
        output += text;
    }
    return output;
}


export default Labyrinth;