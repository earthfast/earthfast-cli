import { create } from 'multiformats/hashes/digest'
import { sha256 } from 'multiformats/hashes/sha2'
import { CID } from 'multiformats/cid'
import fs from 'fs'

export async function computeCIDv1(filePath: string): Promise<string> {
    const fileBuffer = fs.readFileSync(filePath)
    const hash = await sha256.digest(fileBuffer)
    const cid = CID.create(1, 0x70, hash) // 0x70 is the codec for raw
    return cid.toString()
}
