// Teacher-only data that must not be readable in this public repository (the Teacher
// Guide's reference code): encrypted with AES-256-GCM into api/_teacher/<id>.enc, which
// api/teacher.js decrypts with the TEACHER_DATA_KEY environment variable after the
// teacher password. The key lives in ../.teacher-data-key locally (git-ignored) and in
// the Vercel project's settings; the plain data stays outside the repository.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function dataKey() {
  if (process.env.TEACHER_DATA_KEY) return process.env.TEACHER_DATA_KEY.trim();
  const file = path.join('..', '.teacher-data-key');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim() : null;
}

/** Encrypts `data` (any JSON) into api/_teacher/<id>.enc and the same in gui/api. */
export function saveSecret(id, data, keyBase64) {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) throw new Error('TEACHER_DATA_KEY must be 32 bytes, base64');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);
  const sealed = JSON.stringify({ v: 1, iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: body.toString('base64') }) + '\n';
  for (const dir of [path.join('..', 'api', '_teacher'), path.join('..', 'gui', 'api', '_teacher')]) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${id}.enc`), sealed);
  }
  console.log(`teacher data: ${id}.enc (encrypted)`);
}
