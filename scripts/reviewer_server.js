const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET';

app.use(express.json());

// Serve the UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'reviewer_ui.html'));
});

// Serve images from the dataset
app.use('/images', express.static(ROOT_TARGET));

// List all files in a specific split/category/status
app.get('/api/files', (req, res) => {
    const { split, category, status } = req.query;
    const dirPath = path.join(ROOT_TARGET, split || 'train', category || 'TRASH', status || 'DURING');
    
    if (!fs.existsSync(dirPath)) return res.json([]);
    
    const files = fs.readdirSync(dirPath)
        .filter(f => f.match(/\.(jpg|jpeg|png)$/i))
        .map(f => ({
            name: f,
            path: `${split}/${category}/${status}/${f}`,
            fullPath: path.join(dirPath, f)
        }));
    
    res.json(files);
});

let history = [];

// Move file
app.post('/api/move', (req, res) => {
    const { sourcePath, targetStatus, category, split } = req.body;
    const fullSourcePath = path.join(ROOT_TARGET, sourcePath);
    
    let targetDir;
    if (targetStatus === 'AFTER') {
        targetDir = path.join(ROOT_TARGET, split, 'VERIFIED_CLEAN');
    } else if (targetStatus === 'SIGNIFICANT') {
        targetDir = path.join(ROOT_TARGET, split, 'SIGNIFICANT_FINDINGS');
    } else if (targetStatus === 'DELETED') {
        targetDir = path.join(ROOT_TARGET, split, 'TRASH_REJECTED');
    } else if (targetStatus === 'DAMAGED') {
        targetDir = path.join(ROOT_TARGET, split, 'DAMAGED_INTERIOR');
    } else {
        targetDir = path.join(ROOT_TARGET, split, category, targetStatus);
    }
    
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    
    const fileName = path.basename(fullSourcePath);
    const newName = fileName.replace(/_(BEFORE|DURING|AFTER)_/, `_${targetStatus}_`);
    const fullTargetPath = path.join(targetDir, newName);
    
    try {
        fs.renameSync(fullSourcePath, fullTargetPath);
        
        // Save to history for UNDO
        history.push({
            originalPath: fullSourcePath,
            newPath: fullTargetPath
        });
        if (history.length > 50) history.shift();

        res.json({ success: true, newPath: fullTargetPath });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Undo last move
app.post('/api/undo', (req, res) => {
    if (history.length === 0) return res.status(400).json({ error: "No history to undo" });
    
    const lastOp = history.pop();
    try {
        fs.renameSync(lastOp.newPath, lastOp.originalPath);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Reviewer backend running at http://localhost:${port}`);
});
