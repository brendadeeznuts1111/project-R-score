// batch-push.ts - Changelog #3
import { readdirSync } from 'fs';

async function batchPush(dir: string, phoneFile: string) {
    if (!dir || !phoneFile) {
        console.error('Usage: bun scripts/batch-push.ts <directory_with_videos> <phones_list_file>');
        process.exit(1);
    }

    console.log(`📦 Starting batch push from ${dir} to phones in ${phoneFile}...`);
    
    try {
        const files = readdirSync(dir).filter(f => f.endsWith('.mp4'));
        const phones = (await Bun.file(phoneFile).text()).split('\n').filter(p => p.trim() !== '');

        console.log(`Found ${files.length} videos and ${phones.length} phones.`);

        for (const phone of phones) {
            for (const file of files) {
                const start = Bun.nanoseconds();
                // Simulate Zstd compression + Bun.write or fetch to DuoPlus API
                // const videoData = await Bun.file(`${dir}/${file}`).arrayBuffer();
                console.log(`Pushing ${file} to ${phone}...`);
                await Bun.sleep(100); // Simulate network/io
                console.log(`✅ Pushed ${file} to ${phone} in ${(Bun.nanoseconds() - start) / 1e6}ms`);
            }
        }
    } catch (e: any) {
        console.error(`Error during batch push: ${e.message}`);
    }
}

if (import.meta.main) {
    batchPush(Bun.argv[2], Bun.argv[3]).catch(console.error);
}
