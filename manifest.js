import { sha256File } from './checksum.js';
import { NodeFilesystem } from './filesystem.js';

const MANIFEST_FILENAME = 'armada.json';
const MANIFEST_PATH = '/' + MANIFEST_FILENAME;

function newManifest() {
    return {
        configVersion: 1,
        timestamp: Date.now(),
        index: '/index.html',
        assetGroups: [
            {
                name: 'main',
                installMode: 'lazy',
                updateMode: 'lazy',
                cacheQueryOptions: { 'ignoreVary': true },
                urls: [],
                patterns: [],
            },
        ],
        dataGroups: [],
        hashTable: {},
        navigationUrls: [
            { positive: true, regex: '^\\/.*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*\\.[^/]*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*__[^/]*$' },
            { positive: false, regex: '^\\/(?:.+\\/)?[^/]*__[^/]*\\/.*$' },
        ],
        navigationRequestStrategy: 'performance',
    };
}

export async function generateManifest(buildDir) {
    const manifest = newManifest();
    const fs = new NodeFilesystem(buildDir);

    const files = (await fs.list('/')).filter(val => val != MANIFEST_PATH);
    for (const fPath of files) {
        const hash = await sha256File(fs.canonical(fPath));
        const url = encodeURI(fPath);
        manifest.assetGroups[0].urls.push(url);
        manifest.hashTable[url] = hash;
    }

    fs.write(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2));
    return fs.canonical(MANIFEST_FILENAME);
}
