const fs = require('fs');
const path = require('path');

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';
const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET_V6';

const HARD_KEYWORDS = {
    AFTER: ['후', '완료', '완', '마무리', 'after', 'finish', 'end', '결과', '정리후', '청소후', '시공후']
};

const CATEGORIES = ['BLOOD', 'TRASH', 'FIRE', 'ANIMAL', 'EXTERIOR', 'X_UNKNOWN'];
const STATUSES = ['before', 'during', 'after', 'UNKNOWN'];

// Pre-create all folders
CATEGORIES.forEach(cat => {
    if (cat === 'X_UNKNOWN') {
        const dir = path.join(ROOT_TARGET, cat);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } else {
        STATUSES.forEach(st => {
            const dir = path.join(ROOT_TARGET, cat, st);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        });
    }
});

const MAPPINGS = [
    { cat: 'BLOOD', keywords: ['blood', 'death', '고독사', '자살', '혈흔', '부패액', '강력범죄'] },
    { cat: 'TRASH', keywords: ['trash', 'hoarding', '쓰레기집', '저장강박'] },
    { cat: 'FIRE', keywords: ['fire', 'damage', '화재', '침수'] },
    { cat: 'ANIMAL', keywords: ['animal', 'waste', '동물', '사체'] },
    { cat: 'EXTERIOR', keywords: ['exterior', 'clean', '외벽', '간판', '청소'] }
];

function classify(img, folderName) {
    const fileName = path.basename(img).toLowerCase();
    const folderBase = folderName.toLowerCase();
    
    // 1. AFTER Keyword check
    const isAfter = HARD_KEYWORDS.AFTER.some(kw => fileName.includes(kw) || folderBase.includes(kw));
    
    // 2. Category Match (Strict Keyword/Path)
    let detectedCat = null;
    for (const m of MAPPINGS) {
        if (m.keywords.some(kw => folderBase.includes(kw) || fileName.includes(kw))) {
            detectedCat = m.cat;
            break;
        }
    }

    if (!detectedCat) return { status: '', category: 'X_UNKNOWN' };

    let status = 'during';
    if (isAfter) status = 'after';
    else if (fileName.includes('전') || folderBase.includes('전') || fileName.includes('before')) status = 'before';
    else if (fileName.includes('중') || folderBase.includes('중') || fileName.includes('during')) status = 'during';
    else return { status: 'UNKNOWN', category: 'X_UNKNOWN' }; // Ambiguous status -> Unknown

    return { status, category: detectedCat };
}

async function runPipeline() {
    console.log("Starting Optimized Zero Trust Pipeline v6.1...");
    
    const sourceFiles = fs.readFileSync('scripts/source_files.csv', 'utf8')
        .split('\n')
        .slice(1)
        .filter(line => line.trim())
        .map(line => line.replace(/"/g, '').trim());

    const report = {
        BLOOD: 0, TRASH: 0, FIRE: 0, ANIMAL: 0, EXTERIOR: 0, X_UNKNOWN: 0
    };

    let total = sourceFiles.length;
    for (let i = 0; i < total; i++) {
        const img = sourceFiles[i];
        if (!fs.existsSync(img)) continue;

        const folderName = path.dirname(img);
        const { status, category } = classify(img, folderName);
        
        report[category]++;

        const targetPath = category === 'X_UNKNOWN' 
            ? path.join(ROOT_TARGET, category, path.basename(img))
            : path.join(ROOT_TARGET, category, status, path.basename(img));

        try {
            // Using linkSync for near-instant "copy" on same drive
            if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); // Remove if exists to re-link
            fs.linkSync(img, targetPath);
        } catch (e) {
            // If link fails (e.g. cross-partition), fallback to copy
            try { fs.copyFileSync(img, targetPath); } catch (err) {}
        }
        
        if ((i + 1) % 1000 === 0) console.log(`Processed ${i + 1} / ${total} images...`);
    }

    console.log("\n--- FINAL CLASSIFICATION REPORT ---");
    console.table(report);
}

runPipeline();
