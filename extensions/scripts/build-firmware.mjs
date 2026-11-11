// Compiles the CODE AI board firmware (firmware/codeai-board) with arduino-cli and keeps
// the result in firmware/codeai-board.hex, which is committed: the normal build only copies
// it, so arduino-cli is needed only when the firmware changes. Run: npm run build-firmware
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const cli = process.env.ARDUINO_CLI || 'arduino-cli';
execFileSync(cli, ['compile', '-b', 'arduino:avr:uno', '--output-dir', 'firmware/build', 'firmware/codeai-board'], { stdio: 'inherit' });
fs.copyFileSync('firmware/build/codeai-board.ino.hex', 'firmware/codeai-board.hex');
console.log('firmware/codeai-board.hex updated');
