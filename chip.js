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
        console.log(hexOpcode);

        //We have to get it first byte to know the kind of instruction...
        //For example: 0xAD34 & 0xF000 = 0xA000
        switch(opcode & 0xF000){

            //0NNN
            //Jumps to routine at NNN
            case 0x0000:
                switch (opcode & 0x0FFF){
                    case 0x00E0:
                        this.display.forEach((pixel, i) => this.display[i] = 0);
                        this.pc += 2;
                        this.needsRedraw = true;
                        console.log("TODO: Clean screen");
                        break;

                    //Returns a subroutine
                    //Decrease StackPointer by 1
                    //Sets PC to Stack at StackPointer
                    case 0x00EE:
                        console.log(this.stack);
                        this.stackPointer--;
                        const add_ee = this.stack[this.stackPointer] + 2;
                        console.log("Stack_pointer ",  this.stackPointer);
                        console.log("Stack ", this.stack);  
                        console.log("Jumping ", add_ee);  
                        this.pc = add_ee;
                        console.log("Jumping to ", this.pc);
                        break;
                    
                }
                break;

            //1NNN
            //Jumps to NNN
            //Sets PC to NNN
            case 0x1000:
                const address_1 = opcode & 0x0FFF;
                this.pc = address_1;
                break;

            //Calls subroutine NNN
            //Increases stack pointer
            //Sets stack top to PC
            //PC is setted to NNN
            case 0x2000:
                let address = opcode & 0x0FFF;
                console.log("Stack at: ", this.stackPointer, " setted to ", this.pc);
                console.log(this.stack);
                this.stack[this.stackPointer] = this.pc;   
                this.stackPointer++;
                this.pc = address;
                break;

            //3XNN
            //Jumps next instruction if VX = NN
            case 0x3000:
                const index_3 = ( opcode & 0x0F00 ) >> 8;
                const nn_3 = opcode & 0x00FF;
                this.pc += ( this.V[index_3] == nn_3 ? 4 : 2);
                break;

            //Case 6XKK
            //Sets V[X] = KK 
            case 0x6000:
                const x_6 = (opcode & 0x0F00) >> 8;
                const k_6 = opcode & 0x00FF;
                this.V[x_6] = k_6;
                this.pc += 2; //Next instruction
                console.log("OPCODE 0x6000")
                console.log("Setting V[", x_6,  "] to ", this.V[x_6])
                break;

            //Case 7XKK
            case 0x7000:
                const x_7 = ( opcode & 0x0F00 ) >> 8;
                const k_7 = ( opcode & 0x00FF );
                this.V[x_7] = ( this.V[x_7] + k_7 ) & 0x00FF;
                this.pc += 2;
                console.log("Adding ", k_7, " to V[", x_7, "] = ", this.V[x_7])
                break;

            //Case ANNN: Sets I to NNN
            case 0xA000:
                this.I = opcode & 0x0FFF;
                this.pc += 2; //Next inscruction
                console.log("Set I to", this.I.toString(16));
                break;

            //DXYN
            //Draw by XDR-ing to the screen
            //Check collision and set V[0xF]
            //Read the image from I
            case 0xD000:
                let x_D = this.V[( opcode & 0x0F00 ) >> 8];
                let y_D = this.V[( opcode & 0x00F0 )>> 4];
                let height = opcode & 0x000F;
                
                this.V[0xF] = 0;
                for (let _y = 0; _y < height; _y++){
                    const line = this.memory[this.I + _y]
                    for (let _x = 0; _x < 8; _x++){
                        const pixel = line & ( 0x80 >> _x )
                        if( pixel != 0 ){
                            let totalX = x_D + _x;
                            let totalY = y_D + _y;

                            totalX = totalX % 64;
                            totalY = totalY % 32;
                            
                            const index = totalY * 64 + totalX;

                            if(this.display[index] == 1){
                                this.V[0xF] = 1;
                            }
                            this.display[index] ^= 1;
                        }
                    }
                }
                this.needsRedraw = true; //Setting flag to redraw
                this.pc += 2 //Next instruction 
                console.log("Drawing at V[", (opcode & 0x0F00) >> 8, "] = ", x_D, ", V[", (opcode & 0x00F0) >> 4, "] = ", y_D);
                break;

            case 0xF000:
                switch (opcode & 0x00FF) {
                    //FX07	
                    //Vx = delay timer.
                    case 0x0007:
                        const x_f007 = ( opcode & 0x0F00 ) >> 8;
                        this.V[x_f007] = this.delayTimer;
                        this.pc += 2;
                        break;

                    //FX15	
                    //Set Delay Timer = VX.
                    case 0x0015:
                        const x_f015 = ( opcode & 0x0F00 ) >> 8;
                        this.delayTimer = this.V[x_f015];
                        this.pc += 2;
                        break;

                    //FX29
                    //I = VX * SpriteLenght 
                    case 0x0029:
                        const x_f029 = ( opcode & 0x0F00 ) >> 8;
                        const character = this.V[x_f029]
                        this.I = 0x050 + character * 5
                        console.log(`Setting I to character V[${x_f029}] - Offset to ${this.I.toString(16)}`)
                        this.pc += 2; 
                        break;

                    //FX33
                    //Sets V[X] to human format
                    //Hundreds at I
                    //Tens at I + 1
                    //Ones at I + 2
                    case 0x0033:
                        const index_f033 = (opcode & 0x0F00) >> 8;
                        let x_f033 = this.V[index_f033];
                        //Take the reminder of x / 100. Substract it from x, and divide it for 100 to get one
                        const hundreds = (x_f033 - (x_f033 % 100)) / 100;
                        x_f033 -= hundreds * 100;
                        //Same right here
                        const tens = (x_f033 - (x_f033 % 10)) / 10;
                        x_f033 -= tens * 10;
                        //And here's easier
                        const ones = x_f033;

                        this.memory[this.I] = hundreds;
                        this.memory[this.I + 1] = tens;
                        this.memory[this.I + 2] = ones;
                        console.log(`Storing binary coded decimal at V[${index_f033}] as ${hundreds}${tens}${ones}`);

                        this.pc += 2;
                        break;

                    //FX65
                    //Saves memory at I on registers from V0 to VX
                    case 0x0065:
                        const index_f065 = ( opcode & 0x0F00 ) >> 8;
                        for (let i = 0; i <= index_f065; i++){
                            this.V[i] = this.memory[this.I + i];
                        }
                        console.log(`Setting V values from 0 to ${index_f065} to values: ${this.I.toString(16)}`)
                        this.I += ( index_f065 + 1 );
                        this.pc += 2;
                        break;
                }
                break;
            
            default:
                return;

        }
        //Switching with opcode
    }

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