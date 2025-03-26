import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

export async function saveTempFile(
    buffer: Buffer,
    extension: string,
): Promise<string> {
    const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(7)}.${extension}`;
    const filePath = path.join(tempDir, fileName);

    await writeFile(filePath, buffer);
    return filePath;
}

export async function deleteTempFile(filePath: string): Promise<void> {
    try {
        await unlink(filePath);
    } catch (error) {
        console.error('❌ Error deleting temp file:', error);
    }
}
