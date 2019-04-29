class Chip {
    constructor(){
        //Memory
        this.memory = new Uint8Array(4096);

        //Program counter 
        this.pc = 0x200;

        //V/I memory
        this.V = new Uint8ClampedArray(16);
        this.I = null;

        //Stack
        this.stack = new Uint16Array(16);

        //Stackpointer
        this.stackPointer = 0;

        //Timers
        this.delayTimer = 0;
        this.soundTimer = 0;


        //Keys
        this.keys = new Uint8Array(16);

        //Display
        this.display = new Uint16Array(64 * 32);

        this.needsRedraw = false;

                
        this.audio = new Audio('beep.wav');
        this.loadFontset();
        this.initStack();
    }

    initStack(){
        this.stack.forEach((value, index) => {
            this.stack[index] = value.toString().charCodeAt(0);
        })
    }

    run(){
        //To get opcode we get the memory at the program counter (PC)
        //We carry those bytes 8 bits to left ( << operator )
        //Then we add the next ones pair of bytes to it ( | OR Operator )
        const opcode = this.memory[this.pc] << 8 | this.memory[this.pc + 1]
        const hexOpcode = opcode.toString(16);
        console.log("OPCODE:", hexOpcode);

        //We have to get it first byte to know the kind of instruction...
        //For example: 0xAD34 & 0xF000 = 0xA000
        switch(opcode & 0xF000){

            //0NNN
            //Jumps to routine at NNN
            case 0x0000:{
                switch (opcode & 0x0FFF){
                    case 0x00E0:{
                        this.display.forEach((pixel, i) => this.display[i] = 0);
                        this.pc += 2;
                        this.needsRedraw = true;
                        console.log("TODO: Clean screen");
                        break;
                    }

                    //Returns a subroutine
                    //Decrease StackPointer by 1
                    //Sets PC to Stack at StackPointer
                    case 0x00EE:{
                        this.stackPointer--;
                        const address = this.stack[this.stackPointer] + 2;
                        this.pc = address;
                        console.log("Jumping to ", this.pc.toString(16));
                        break;
                    }
                    
                }
                break;
            }

            //1NNN
            //Jumps to NNN
            //Sets PC to NNN
            case 0x1000: {
                const address = opcode & 0x0FFF;
                this.pc = address;
                console.log("JUMPING TO: ", this.pc.toString(16));
                break;
            }


            //Calls subroutine NNN
            //Increases stack pointer
            //Sets stack top to PC
            //PC is setted to NNN
            case 0x2000: {
                let address = opcode & 0x0FFF;
                console.log("Stack at: ", this.stackPointer, " setted to ", this.pc);
                console.log(this.stack);
                this.stack[this.stackPointer] = this.pc;   
                this.stackPointer++;
                this.pc = address;
                break;
            }

            //3XNN
            //Jumps next instruction if VX = NN
            case 0x3000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                const nn = opcode & 0x00FF;
                this.pc += this.V[x] == nn ? 4 : 2;
                break;
            }

            //4XNN
            //Skips next instruction if VX != NN
            case 0x4000: {
                const x = (opcode & 0x0F00) >> 8;
                const nn = (opcode & 0x00FF);
                this.pc += this.V[x] != nn ? 4 : 2;
                break;
            }

            //5XY0
            //Skips the next instruction if VX equals VY
            case 0x5000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                const y = ( opcode & 0x00F0 ) >> 4;
                this.pc += this.V[x] == this.V[y] ? 4 : 2;
                break;
            }

            //Case 6XKK
            //Sets V[X] = KK 
            case 0x6000: {
                const x = (opcode & 0x0F00) >> 8;
                const nn = opcode & 0x00FF;
                this.V[x] = nn;
                this.pc += 2; //Next instruction
                console.log("OPCODE 0x6000")
                console.log("Setting V[", x,  "] to ", this.V[x])
                break;
            }

            //Case 7XKK
            //Adds NN to VX
            case 0x7000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                const nn = ( opcode & 0x00FF );
                this.V[x] = ( this.V[x] + nn ) & 0x00FF;
                this.pc += 2;
                console.log("Adding ", nn, " to V[", x, "] = ", this.V[x])
                break;
            }

            case 0x8000: {
                const x = (opcode & 0x0F00) >> 8;
                const y = (opcode & 0x00F0) >> 4;
                switch (opcode & 0x000F) {
                    //8XY0
                    //Sets VX to the value of VY
                    case 0x0000: {
                        this.V[x] = this.V[y];
                        console.log("Setting V[", x, "] to V[", y, "] = ", this.V[y]);               
                        this.pc += 2;
                        break;
                    }

                    //8XY1
                    //VX = VX OR VY
                    case 0x0001: {
                        this.V[x] = (this.V[x] | this.V[y]) & 0xFF;
                        this.pc += 2;
                        break;
                    }

                    //8XY2
                    //Sets VX to VX AND VY
                    case 0x0002:{
                        this.V[x] = this.V[x] & this.V[y];
                        console.log("Set V[", x, "] to V[",x,"] & V[", y, "] = ", this.V[x]);
                        this.pc += 2;
                        break;
                    }
                    
                    //8XY1
                    //VX = VX XOR VY
                    case 0x0003: {
                        this.V[x] = (this.V[x] ^ this.V[y]) & 0xFF;
                        this.pc += 2;
                        break;
                    }

                    //8XY4
                    //Adds VX to VX. VF is set to 1 when carry applies
                    case 0x0004:{
                        console.log("Adding V[", x, "] to V[", y, "] = ", (this.V[x] + this.V[y]) >> 0x00FF, ". Apply carry if needed");
                        const carryNeeded = this.V[y] > 0xFF - this.V[x];
                        this.V[0xF] = carryNeeded ? 1 : 0;
                        this.V[x] = (this.V[x] + this.V[y]) & 0x00FF;
                        this.pc += 2;
                        break;
                    }
                    
                    //8XY5
                    //VY is substracted from VX
                    //VF is set to 0 when there is a borrow else 1
                    case 0x0005: {
                        this.V[0xF] = this.V[x] > this.V[y] ? 1 : 0;
                        this.V[x] = ( this.V[x] - this.V[y] ) & 0xFF;
                        console.log("V[", x, "] = ", this.V[x], " = V[", y, "] = ", this.V[y], " = ", this.V[x]);
                        this.pc += 2;
                        break;
                    }

                    //8XY6
                    //Shifts VX right by one. VF is set to the least significant bit of VX
                    //La verdad, esto no lo entendí muy bien y busqué una referencia:(
                    case 0x0006: {
                        this.V[0xF] = this.V[x] & 0x1; 
                        this.V[x] = this.V[x] >> 1;
                        this.pc += 2;
                        break;
                    }

                    //8XY7
                    //IF VY > VX: VF = 1 ELSE 0 
                    // VX = VY - VX.
                    case 0x0007: {
                        this.V[0xF] = this.V[x] > this.V[y] ? 0 : 1;
                        this.V[x] = (this.V[y] - this.V[x]) & 0xFF;
                        this.pc += 2;
                        break;
                    }

                    //8XYE
                    //Shifts VX left by one. 
                    //VF is set to the value of the most significant bit of VX before the shift.
                    case 0x000E: {
                        this.V[0xF] = this.V[x]  & 0x80; 
                        this.V[x] = this.V[x] << 1;
                        this.pc += 2;
                        break;
                    }
                }
                break;
            }


            //5XY0
            //Skips the next instruction if VX doesn't equal VY
            case 0x9000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                const y = ( opcode & 0x00F0 ) >> 4;
                this.pc += this.V[x] != this.V[y] ? 4 : 2;
                break;
            }

            //Case ANNN: Sets I to NNN
            case 0xA000: {
                this.I = opcode & 0x0FFF;
                this.pc += 2; //Next inscruction
                console.log("Set I to", this.I.toString(16));
                break;
            }
            
            //BNNN
            //Jumps to V[0] + NNN
            case 0xB000: {
                const nnn = opcode & 0x0FFF;
                this.pc = (this.V[0] & 0xFF) + nnn;
                break;
            }

            //CXNN: Set VX to a random number and NN
            case 0xC000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                const nn = ( opcode & 0x00FF );
                const random = parseInt(Math.random() * 255) & nn;
                console.log("V[", x, "] has been set to random number:", random);
                this.V[x] = random;
                this.pc += 2;
                break;
            }
                
            //DXYN
            //Draw by XDR-ing to the screen
            //Check collision and set V[0xF]
            //Read the image from I
            case 0xD000: {
                let x = this.V[( opcode & 0x0F00 ) >> 8];
                let y = this.V[( opcode & 0x00F0 )>> 4];
                let height = opcode & 0x000F;
                
                this.V[0xF] = 0;
                for (let _y = 0; _y < height; _y++){
                    const line = this.memory[this.I + _y]
                    for (let _x = 0; _x < 8; _x++){
                        const pixel = line & ( 0x80 >> _x )
                        if( pixel != 0 ){
                            let totalX = x + _x;
                            let totalY = y + _y;
                            
                            totalX = totalX % 64;
                            totalY = totalY % 32;
                            
                            const index = (totalY * 64) + totalX;

                            if(this.display[index] == 1){
                                this.V[0xF] = 1;
                            }
                            this.display[index] ^= 1;
                        }
                    }
                }
                this.needsRedraw = true; //Setting flag to redraw
                this.pc += 2 //Next instruction 
                console.log("Drawing at V[", (opcode & 0x0F00) >> 8, "] = ", x, ", V[", (opcode & 0x00F0) >> 4, "] = ", y);
                break;
            }

            case 0xE000: {
                const x = (opcode & 0x0F00) >> 8;
                const key = this.V[x];
                console.log("WAITING KEY", key);
                switch (opcode & 0x00FF){
                    //EX9E
                    //Skip next instruction if the key VX is pressed
                    case 0x009E: {
                        this.pc += (this.keys[key] == 1) ? 4 : 2;
                        console.log("Skipping next instruction? ", this.keys[key] == 1);
                        break;
                    }

                    //EXA1
                    //Skip next instruction if the key VX is NOT pressed
                    case 0x00A1: {
                        this.pc += (this.keys[key] == 0) ? 4 : 2;
                        console.log("Skipping next instruction? ", this.keys[key] == 0);
                        break;
                    }
                }
                break;
            }

            case 0xF000: {
                const x = ( opcode & 0x0F00 ) >> 8;
                switch (opcode & 0x00FF) {
                    //FX07	
                    //Vx = delay timer.
                    case 0x0007: {
                        this.V[x] = this.delayTimer;
                        this.pc += 2;
                        console.log("V[", x,"] has been set to", this.delayTimer);
                        break;
                    }

                    //FX0A
                    //A key pressed is awaited and then stored in VX
                    case 0x000A: {
                        for (let i = 0; i < this.keys.length; i++){
                            const key = this.keys[i]; 
                            console.log("WAITING KEY", key);
                            if(key == 1) {
                                this.V[x] = i;
                                this.pc += 2;
                                break;
                            }
                        }
                        break;  
                    }

                    //FX15	
                    //Set Delay Timer = VX.
                    case 0x0015: {
                        this.delayTimer = this.V[x];
                        this.pc += 2;
                        console.log("Set delayTimer to V[", x, "] = ", this.V[x]);
                        break;
                    }

                    //FX18
                    //Sets soundTimer = VX
                    case 0x0018: {
                        this.soundTimer = this.V[x];
                        this.pc += 2;
                        break;
                    }
                    
                    //FX1E
                    //I = VX + I
                    case 0x001E: {
                        this.I += this.V[x];
                        this.pc += 2;
                        break;
                    }

                    //FX29
                    //I = VX * SpriteLenght 
                    case 0x0029: {
                        const character = this.V[x]
                        this.I = 0x050 + (character * 5);   
                        console.log(`Setting I to character V[${x}] - Offset to ${this.I.toString(16)}`)
                        this.pc += 2; 
                        break;
                    }

                    //FX33
                    //Sets V[X] to human format
                    //Hundreds at I
                    //Tens at I + 1
                    //Ones at I + 2
                    case 0x0033: {
                        let value = this.V[x];
                        //Take the reminder of x / 100. Substract it from x, and divide it for 100 to get one
                        const hundreds = (value - (value % 100)) / 100;
                        value -= hundreds * 100;
                        //Same right here
                        const tens = (value - (value % 10)) / 10;
                        value -= tens * 10;
                        //And here's easier
                        const ones = value;

                        this.memory[this.I] = hundreds;
                        this.memory[this.I + 1] = tens;
                        this.memory[this.I + 2] = ones;
                        console.log(`Storing binary coded decimal at V[${x}] as ${hundreds}${tens}${ones}`);

                        this.pc += 2;
                        break;
                    }

                    //FX55
                    //Stores V0 to VX in memory starting at address I
                    case 0x0055: {
                        for (let i = 0; i <= x; i++){
                            this.memory[this.I + i] = this.V[i];
                        }
                        this.pc += 2;
                        break;
                    }   
                    
                    //FX65
                    //Saves memory at I on registers from V0 to VX 
                    case 0x0065: {
                        for (let i = 0; i <= x; i++){
                            this.V[i] = this.memory[this.I + i];
                        }
                        console.log(`Setting V values from 0 to ${x} to values: ${this.I.toString(16)}`)
                        this.I += ( x + 1 );
                        this.pc += 2;
                        break;
                    }
                }
                break;
            }
            
            default:
                return;

        }


        if(this.soundTimer > 0) {
            this.audio.play();        
            this.soundTimer--;
        }

        if(this.delayTimer > 0) this.delayTimer--;

    }

    /**
     * Removes draw flag from the chip when this doesn't need to be redraw.
     */
    removeDrawFlag(){
        this.needsRedraw = false;
    }

    /**
     * Set the console keys to the player's keyboard mapped
     * @param keyBuffer 
     */
    setKeyBuffer(keyBuffer){
        this.keys.forEach((key, i) => {
            this.keys[i] = keyBuffer[i]
        });
    }
    
    /**
     * Saves the instructions from the file into the console memory since 0x200.
     * @param data 
     */
    loadProgram(data) {
        data.forEach(( instruction, index )=> {
            this.memory[0x200 + index] = instruction;
        });
        console.log("Memory: ", this.memory);
    }


    loadFontset(){
        //TODO: Load fontset
        [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0   
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ].forEach((font, index) => {
            this.memory[0x50 + index] = font & 0xFF;
        })
    }
}