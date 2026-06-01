const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';
const ROOT_SAMPLES = 'D:\\01_사업_및_업무\\디에스종합환경\\ai학습용 1차\\안티그래피티 참고용 샘플자료';

app.use(express.json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'vision_engine_v11.html'));
});

app.use('/source', express.static(ROOT_SOURCE));
app.use('/samples', express.static(ROOT_SAMPLES));

// 1. Get all source images
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

// 2. Get all Golden Label anchors (The 653 files)
app.get('/api/anchors', (req, res) => {
    const anchors = [];
    const absoluteRoot = path.resolve(ROOT_SAMPLES);
    
    function scan(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                scan(fullPath);
            } else if (entry.isFile() && entry.name.match(/\.(jpg|jpeg|png)$/i)) {
                const rel = path.relative(absoluteRoot, fullPath).toLowerCase();
                
                let status = 'UNKNOWN';
                if (rel.includes('perfect')) status = 'C_AFTER_PERFECT';
                else if (rel.includes('stained')) status = 'C_AFTER_STAINED';
                else if (rel.includes('stripped')) status = 'C_AFTER_STRIPPED';
                else if (rel.includes('organized')) status = 'C_AFTER_ORGANIZED';
                else if (rel.includes('before')) status = 'A_BEFORE';
                else if (rel.includes('during')) status = 'B_DURING';
                else if (rel.includes('after')) status = 'C_AFTER_PERFECT';
                
                if (rel.includes('insect')) status = 'INSECT';

                const parts = rel.split(/[\\/]/);
                const cat = parts[0];
                
                anchors.push({
                    cat, status,
                    relPath: rel
                });
            }
        }
    }
    scan(absoluteRoot);
    console.log(`Loaded ${anchors.length} golden anchors from ${absoluteRoot}`);
    res.json(anchors);
});

// 3. Move Golden Match to target
app.post('/api/classify', (req, res) => {
    const { relPath, category, status, similarity } = req.body;
    
    // ONLY move if similarity > 0.95 (99% confidence proxy)
    if (similarity < 0.95) return res.json({ success: false, reason: 'Low similarity' });

    const sourcePath = path.join(ROOT_SOURCE, relPath);
    const targetDir = path.join(ROOT_SAMPLES, category, status);
    
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
    console.log(`V11 GOLDEN Matcher Backend running at http://localhost:${port}`);
});
