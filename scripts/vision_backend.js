const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';
const ROOT_SAMPLES = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET\\안티그래피티 참고용 샘플자료';
const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET_V8_CV';

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vision_engine.html'));
});

app.use('/source', express.static(ROOT_SOURCE));
app.use('/samples', express.static(ROOT_SAMPLES));

// 1. Get all source images for batch processing
app.get('/api/inventory', (req, res) => {
    const files = [];
    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) scan(fullPath);
            else if (file.match(/\.(jpg|jpeg|png)$/i)) {
                files.push({
                    name: file,
                    relPath: path.relative(ROOT_SOURCE, fullPath),
                    fullPath: fullPath
                });
            }
        });
    }
    scan(ROOT_SOURCE);
    res.json(files);
});

// 2. Get all anchor samples
app.get('/api/anchors', (req, res) => {
    const anchors = [];
    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) scan(fullPath);
            else if (file.match(/\.(jpg|jpeg|png)$/i)) {
                const parts = fullPath.split(path.sep);
                // Extract category/status from path (Zero Trust)
                const status = parts[parts.length - 2];
                const cat = parts[parts.length - 3];
                anchors.push({
                    cat, status,
                    relPath: path.relative(ROOT_SAMPLES, fullPath)
                });
            }
        });
    }
    scan(ROOT_SAMPLES);
    res.json(anchors);
});

// 3. Move file based on Path + CV decision
app.post('/api/classify', (req, res) => {
    const { relPath, category: cvCategory, status } = req.body;
    const sourcePath = path.join(ROOT_SOURCE, relPath);
    const folderPath = relPath.toLowerCase();

    // [V9 핵심] 경로명(Path) 우선 분석 - 사용자 지시 절대 준수
    let category = 'X_UNKNOWN';
    if (folderPath.includes('고독사') || folderPath.includes('자살') || folderPath.includes('살인') || folderPath.includes('1.')) {
        category = '01_BLOOD_DEATH';
    } else if (folderPath.includes('쓰레기집') || folderPath.includes('퇴거') || folderPath.includes('저장강박') || folderPath.includes('2.')) {
        category = '02_TRASH_HOARDING';
    } else if (folderPath.includes('화재') || folderPath.includes('4.')) {
        category = '03_FIRE_DAMAGE';
    } else if (folderPath.includes('동물') || folderPath.includes('사체')) {
        category = '04_ANIMAL_WASTE';
    } else if (folderPath.includes('침수')) {
        category = '05_EXTERIOR_CLEAN'; // 침수 카테고리 임시 할당
    } else {
        category = cvCategory; 
    }
    
    let targetDir = (category === 'X_UNKNOWN') 
        ? path.join(ROOT_TARGET, 'X_UNKNOWN')
        : path.join(ROOT_TARGET, category, status);
    
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const targetPath = path.join(targetDir, path.basename(sourcePath));
    
    try {
        fs.copyFileSync(sourcePath, targetPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Vision CV Engine Backend running at http://localhost:${port}`);
});
