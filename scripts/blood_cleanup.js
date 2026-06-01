const fs = require('fs');
const path = require('path');

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본\\1. 고독사,자살,살인';
const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\ai학습용 1차\\안티그래피티 참고용 샘플자료\\01_BLOOD_DEATH\\고독사, 자살(부패액)';

const KEYWORDS = {
    after: ['후', '완료', '완', '마무리', 'after', 'finish', '결과', '청소후', '정리후'],
    before: ['전', '작업전', '시작', 'before', 'start', '미완료', '청소전', '정리전'],
    during: ['중', '작업중', '진행', 'during', 'process']
};

function scanAndMove() {
    console.log("Starting Focused Blood/Death Clean-up...");
    
    if (!fs.existsSync(ROOT_TARGET)) fs.mkdirSync(ROOT_TARGET, { recursive: true });
    ['before', 'during', 'after', 'X_UNKNOWN'].forEach(d => {
        const p = path.join(ROOT_TARGET, d);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const allFiles = [];
    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) scan(fullPath);
            else if (file.match(/\.(jpg|jpeg|png)$/i)) allFiles.push(fullPath);
        });
    }

    scan(ROOT_SOURCE);
    console.log(`Found ${allFiles.length} files in source.`);

    const report = { before: 0, during: 0, after: 0, X_UNKNOWN: 0 };

    allFiles.forEach(img => {
        const fileName = path.basename(img).toLowerCase();
        const relPath = path.relative(ROOT_SOURCE, img).toLowerCase();
        
        let status = 'X_UNKNOWN';
        if (KEYWORDS.after.some(kw => fileName.includes(kw) || relPath.includes(kw))) status = 'after';
        else if (KEYWORDS.before.some(kw => fileName.includes(kw) || relPath.includes(kw))) status = 'before';
        else if (KEYWORDS.during.some(kw => fileName.includes(kw) || relPath.includes(kw))) status = 'during';
        
        report[status]++;
        
        const targetDir = path.join(ROOT_TARGET, status);
        const targetPath = path.join(targetDir, path.basename(img));
        
        try {
            fs.copyFileSync(img, targetPath);
        } catch (e) {}
    });

    console.log("\n--- FOCUSED WORK REPORT ---");
    console.table(report);
}

scanAndMove();
