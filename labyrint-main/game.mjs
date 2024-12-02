//import { renderSplashScreen } from "./splashScreen.mjs";
import Labyrinth from "./labyrint.mjs"
import ANSI from "./utils/ANSI.mjs";

const REFRESH_RATE = 250;

console.log(ANSI.RESET, ANSI.CLEAR_SCREEN, ANSI.HIDE_CURSOR);

let intervalID = null;
let isBlocked = false;
let state = null;

//function showSplashScreen() {
//    renderSplashScreen();
//    setTimeout(() => {
//        init(); 
//    }, 2000); 
//}


function init() {
    state = new Labyrinth();
    state.identifyNpcPatrols();
    intervalID = setInterval(update, REFRESH_RATE);
}

function update() {

    if (isBlocked) { return; }
    isBlocked = true;
    //#region core game loop
    state.update();
    state.draw();
    //#endregion
    isBlocked = false;
}


//showSplashScreen();
init();