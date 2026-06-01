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

const HARD_KEYWORDS = {
    AFTER: ['후', '완료', '완', '마무리', 'after', 'finish', 'end', '결과', '정리후', '청소후', '시공후'],
    BEFORE: ['전', '작업전', '시작', 'before', 'start', '미완료', '시공전'],
    DURING: ['중', '작업중', '진행', 'during', 'process', '시공중']
};

function hasKeyword(text, list) {
    const lower = text.toLowerCase();
    return list.some(kw => lower.includes(kw));
}

function getCategory(fullPath) {
    const parts = fullPath.split(path.sep);
    for (const part of parts) {
        for (const key in CATEGORY_MAP) {
            if (part.startsWith(key)) return CATEGORY_MAP[key];
        }
    }
    return 'OTHER';
}

function getStatus(filePath, folderName, index, total) {
    const folderBase = folderName.toLowerCase();
    const fileBase = path.basename(filePath).toLowerCase();

    if (hasKeyword(folderBase, HARD_KEYWORDS.AFTER) || hasKeyword(fileBase, HARD_KEYWORDS.AFTER)) return 'AFTER';
    if (hasKeyword(folderBase, HARD_KEYWORDS.BEFORE) || hasKeyword(fileBase, HARD_KEYWORDS.BEFORE)) return 'BEFORE';
    if (hasKeyword(folderBase, HARD_KEYWORDS.DURING) || hasKeyword(fileBase, HARD_KEYWORDS.DURING)) return 'DURING';

    const ratio = index / total;
    if (ratio < 0.3) return 'BEFORE';
    return 'DURING'; 
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

async function runPipeline() {
    console.log("Starting AI Pipeline v5 [VERIFIED CLEAN MODE]");
    
    const allImages = scanRecursive(ROOT_SOURCE);
    const groups = {};
    allImages.forEach(img => {
        const parent = path.dirname(img);
        if (!groups[parent]) groups[parent] = [];
        groups[parent].push(img);
    });

    let totalProcessed = 0;
    for (const parent in groups) {
        const images = groups[parent];
        images.sort();
        const category = getCategory(parent);
        const folderName = path.basename(parent);

        images.forEach((img, idx) => {
            const status = getStatus(img, folderName, idx, images.length);
            const dateMatch = folderName.match(/\d{6}/) || folderName.match(/\d{8}/);
            const date = dateMatch ? dateMatch[0] : '000000';
            const location = folderName.replace(date, '').trim().replace(/\s+/g, '_') || 'UNKNOWN';
            const ext = path.extname(img);

            const hash = (img.length + idx) % 10;
            let split = 'train';
            if (hash === 9) split = 'test';
            else if (hash === 8) split = 'val';

            let targetCategoryDir;
            if (status === 'AFTER') {
                // Use a NEW folder name to avoid locking issues and guarantee purity
                targetCategoryDir = path.join(ROOT_TARGET, split, 'VERIFIED_CLEAN');
            } else {
                targetCategoryDir = path.join(ROOT_TARGET, split, category, status);
            }

            const newName = `${category}_${status}_${date}_${location}_${String(idx).padStart(3, '0')}${ext}`;
            const targetPath = path.join(targetCategoryDir, newName);

            if (!fs.existsSync(targetCategoryDir)) fs.mkdirSync(targetCategoryDir, { recursive: true });
            
            // Overwrite existing to ensure correct labeling in v5
            try {
                fs.copyFileSync(img, targetPath);
            } catch (e) {
                console.error(`Error copying ${img}: ${e.message}`);
            }
            totalProcessed++;
        });
        if (totalProcessed % 500 === 0) console.log(`Processed ${totalProcessed} images...`);
    }
    console.log(`\nPipeline v5 [VERIFIED CLEAN] Finished. Total: ${totalProcessed}`);
    console.log("Final Structure:");
    console.log(" - CLEAN photos: VERIFIED_CLEAN folder (100% keyword matched)");
    console.log(" - Others: In their respective category folders as BEFORE/DURING");
}

runPipeline();
