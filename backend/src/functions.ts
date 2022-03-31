const allowedChars = 'abcdefghijklmnopqrstuvwxyz';

function rndChars(size: number) {
    let result = '';
    for (let i = 0; i < size; i++) {
        result += allowedChars.charAt(Math.floor(Math.random() * allowedChars.length));
    }
    return result;
}

export function generateUltraAccountName(s?: string) {
    if (s) {
        for (let i = 0; i < s.length; i++) {
            if (!allowedChars.includes(s.charAt(i))) {
                throw new Error(`invalid char [${s.charAt(i)}] on ${s}`);
            }
        }
    }
    if (s && s.length === 12) {
        return `1${s.substring(1, 3)}2${s.substring(4, 6)}3${s.substring(7, 9)}4${s.substring(10, 12)}`;
    }
    if (s && s.length === 8) {
        return `1${s.substring(0, 2)}2${s.substring(2, 4)}3${s.substring(4, 6)}4${s.substring(6, 8)}`;
    }
    return `1${rndChars(2)}2${rndChars(2)}3${rndChars(2)}4${rndChars(2)}`;
}