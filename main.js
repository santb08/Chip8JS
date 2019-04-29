var iter = 0;

/**
 * Gets file input from element #file at HTML
 * Uses FileReader to read that file ArrayBuffer when the file's read'n loaded.
 * Finally, converts that arrayBuffer to a Byte array and sends it to chip to be loaded. 
 */
function loadFile(){
    const file = document.getElementById('file').files[0];
    const reader  = new FileReader();
    reader.onload = function () {
        const arrayBuffer = reader.result;
        const bArray = new Uint8Array(arrayBuffer);
        chip.loadProgram(bArray);
        setInterval(start, 1/60);
    }
    reader.readAsArrayBuffer(file);
}
   

function fitToContainer(canvas){
    // Make it visually fill the positioned parent
    canvas.style.width ='100%';
    canvas.style.height='100%';
    // ...then set the internal size to match
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

/**
 * Get the display from the chip and loops it to check the pixels and paint it.
 */
function redrawCanvas(){
    const drawPixel = (coor, color) => {
        const { x, y } = coor;
        ctx.fillStyle = color;
        ctx.fillRect(x * PIXEL_WIDTH, y * PIXEL_HEIGHT, PIXEL_WIDTH, PIXEL_HEIGHT);
    }
    const { display } = chip;
    console.log(display);
    display.forEach( (pixel, index) => {
        const coor = {
            x: index % 64,
            y: parseInt(index / 64) 
        };
        drawPixel(coor, ( pixel == 1 ) ? "green" : "black");
    })

    chip.needsRedraw = false;
}

function start(){
    if(chip) {
        if(chip.needsRedraw) {
            redrawCanvas();
        }
        chip.setKeyBuffer(keyboard.getKeyBuffer());
        chip.run();
        iter++;
        console.log("ITERATION ", iter);
    }
    
}


function addListeners(){
    const getKey = keyCode => String.fromCharCode(keyCode);
    document.addEventListener('keydown', event => {
        keyboard.keyPressed(getKey(event.keyCode));
    } );

    document.addEventListener('keyup', event => {
        keyboard.keyReleased(getKey(event.keyCode));
    } );
}

function initEmulator(){
    //Fullscreen canvas
    redrawCanvas();
    addListeners();
}



//Getting canvas
const canvas = document.getElementById("canvas");
fitToContainer(canvas);
//Useful constants
const PIXEL_WIDTH = canvas.width / 64;
const PIXEL_HEIGHT =  canvas.height / 32;
//Getting context
const ctx = canvas.getContext('2d');
//Init chip
const chip = new Chip();
const keyboard = new Keyboard(chip);

initEmulator()
