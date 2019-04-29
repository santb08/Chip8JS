class Keyboard {
    constructor(chip){
        this.keyIdToKey = new Int8Array(256);   
        this.keyBuffer = new Int8Array(16);
        this.fillKeyIds();
    }

    
    fillKeyIds(){
        const { keyIdToKey } = this;
        for(let i = 0; i < keyIdToKey.length; i++) {
			keyIdToKey[i] = -1;
		}
		keyIdToKey['1'] = 1;
		keyIdToKey['2'] = 2;
		keyIdToKey['3'] = 3;		
		keyIdToKey['Q'] = 4;
		keyIdToKey['W'] = 5;
		keyIdToKey['E'] = 6;
		keyIdToKey['A'] = 7;
		keyIdToKey['S'] = 8;
		keyIdToKey['D'] = 9;
		keyIdToKey['Z'] = 0xA;
		keyIdToKey['X'] = 0;
		keyIdToKey['C'] = 0xB;
		keyIdToKey['4'] = 0xC;
		keyIdToKey['R'] = 0xD;
		keyIdToKey['F'] = 0xE;
		keyIdToKey['V'] = 0xF;
    }

    keyPressed(key){
        const { keyIdToKey, keyBuffer } = this;
        if(keyIdToKey[key] != -1) {
			keyBuffer[keyIdToKey[key]] = 1;
        }
    }

    keyReleased(key){
        const { keyIdToKey, keyBuffer } = this;
        if(keyIdToKey[key] != -1) {
			keyBuffer[keyIdToKey[key]] = 0;
		}   
    }

    getKeyBuffer(){
        return this.keyBuffer;
    }
}



