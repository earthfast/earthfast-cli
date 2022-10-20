import { createHash } from 'crypto';
import { createReadStream } from 'fs';

export async function sha1File(path) {
    return hashFile('sha1', path);
}

export async function sha256File(path) {
    return hashFile('sha256', path);
}

async function hashFile(algorithm, path) {
    const hash = createHash(algorithm);
    hash.setEncoding('hex');

    return new Promise((resolve, reject) => {
        const fd = createReadStream(path);
        fd.on('end', () => {
            hash.end();
            resolve(hash.read());
        });
        fd.on('error', reject);
        fd.pipe(hash);
    });
}