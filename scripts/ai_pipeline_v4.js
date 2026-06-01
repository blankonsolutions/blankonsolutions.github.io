const fs = require('fs');
const path = require('path');

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';
const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET';

const CATEGORY_MAP = {
    '1': 'BLOOD',
    '2': 'TRASH',
    '3': 'REMOVAL',
    '4': 'FIRE',
    '5': 'DISINFECT',
    '6': 'SMELL',
    '7': 'DEATH',
    '8': 'FAILURE'
};

const KEYWORDS = {
    BEFORE: ['전', '작업전', '시작', 'before', 'start', '미완료'],
    DURING: ['중', '작업중', '진행', 'during', 'process'],
    AFTER: ['후', '작업후', '완료', '완', '마무리', 'after', 'finish', 'end', '결과', '정리후', '청소후']
};

function getCategory(fullPath) {
    const parts = fullPath.split(path.sep);
    for (const part of parts) {
        for (const key in CATEGORY_MAP) {
            if (part.startsWith(key)) return CATEGORY_MAP[key];
        }
    }
    return 'OTHER';
}

function getStatusFromPath(fullPath) {
    const lowerPath = fullPath.toLowerCase();
    const parts = lowerPath.split(path.sep);
    
    // 1. Explicit folder name check (e.g., ".../전/...")
    for (const status in KEYWORDS) {
        if (parts.some(p => KEYWORDS[status].includes(p))) return status;
    }
    
    // 2. Folder name contains status keyword (e.g., "240322 작업후")
    const folderName = path.basename(fullPath).toLowerCase();
    if (KEYWORDS.AFTER.some(kw => folderName.includes(kw))) return 'AFTER';
    if (KEYWORDS.BEFORE.some(kw => folderName.includes(kw))) return 'BEFORE';
    if (KEYWORDS.DURING.some(kw => folderName.includes(kw))) return 'DURING';

    return null; // NO EXPLICIT STATUS
}

function classify(filePath, index, total, category, pathStatus) {
    // If the folder already implies a status, use it.
    if (pathStatus) return pathStatus;

    const fileName = path.basename(filePath).toLowerCase();
    
    // 3. File name keywords (High priority)
    if (KEYWORDS.AFTER.some(kw => fileName.includes(kw))) return 'AFTER';
    if (KEYWORDS.BEFORE.some(kw => fileName.includes(kw))) return 'BEFORE';
    if (KEYWORDS.DURING.some(kw => fileName.includes(kw))) return 'DURING';

    // 4. THE CHANGE: If NO keyword exists in folder or file name, 
    // DO NOT automatically tag as AFTER (CLEAN).
    // Assume it's only a sequence of BEFORE/DURING.
    const ratio = index / total;
    if (ratio < 0.3) return 'BEFORE';
    return 'DURING'; // The rest is DURING, not AFTER.
}

function scanRecursive(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            scanRecursive(filePath, fileList);
        } else if (file.match(/\.(jpg|jpeg|png)$/i)) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

async function runPipeline(dryRun = true) {
    console.log(`Starting AI Pipeline v4... ${dryRun ? '[DRY RUN]' : '[LIVE]'}`);
    
    const allImages = scanRecursive(ROOT_SOURCE);
    const stats = { BEFORE: 0, DURING: 0, AFTER: 0 };
    const categoryStats = {};

    const groups = {};
    allImages.forEach(img => {
        const parent = path.dirname(img);
        if (!groups[parent]) groups[parent] = [];
        groups[parent].push(img);
    });

    for (const parent in groups) {
        const images = groups[parent];
        images.sort();
        const category = getCategory(parent);
        const pathStatus = getStatusFromPath(parent);
        
        if (!categoryStats[category]) categoryStats[category] = { BEFORE: 0, DURING: 0, AFTER: 0 };

        images.forEach((img, idx) => {
            const status = classify(img, idx, images.length, category, pathStatus);
            stats[status]++;
            categoryStats[category][status]++;

            if (!dryRun) {
                const folderName = path.basename(parent);
                const dateMatch = folderName.match(/\d{6}/) || folderName.match(/\d{8}/);
                const date = dateMatch ? dateMatch[0] : '000000';
                const location = folderName.replace(date, '').trim().replace(/\s+/g, '_') || 'UNKNOWN';
                const ext = path.extname(img);
                
                const rand = Math.random();
                let split = 'train';
                if (rand > 0.9) split = 'test';
                else if (rand > 0.8) split = 'val';

                let targetCategoryDir;
                if (status === 'AFTER') {
                    targetCategoryDir = path.join(ROOT_TARGET, split, 'CLEAN_ENVIRONMENT');
                } else {
                    targetCategoryDir = path.join(ROOT_TARGET, split, category, status);
                }

                const newName = `${category}_${status}_${date}_${location}_${String(idx).padStart(3, '0')}${ext}`;
                const targetPath = path.join(targetCategoryDir, newName);

                if (!fs.existsSync(targetCategoryDir)) fs.mkdirSync(targetCategoryDir, { recursive: true });
                fs.copyFileSync(img, targetPath);
            }
        });
    }

    console.log("\n--- Distribution Summary ---");
    console.table(stats);
    console.log("\n--- Category Breakdown ---");
    console.table(categoryStats);
}

runPipeline(false);
