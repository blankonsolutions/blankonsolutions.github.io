const fs = require('fs');
const path = require('path');

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';

function scanFolders(dir) {
    const folders = [];
    function walk(current) {
        const files = fs.readdirSync(current);
        const images = files.filter(f => f.match(/\.(jpg|jpeg|png)$/i));
        if (images.length > 0) {
            folders.push({
                path: current,
                count: images.length,
                samples: [
                    images[0],
                    images[Math.floor(images.length * 0.25)],
                    images[Math.floor(images.length * 0.5)],
                    images[Math.floor(images.length * 0.75)],
                    images[images.length - 1]
                ]
            });
        }
        files.forEach(f => {
            const full = path.join(current, f);
            if (fs.statSync(full).isDirectory()) walk(full);
        });
    }
    walk(dir);
    return folders;
}

const allFolders = scanFolders(ROOT_SOURCE);
console.log(JSON.stringify(allFolders, null, 2));
