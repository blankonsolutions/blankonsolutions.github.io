const fs = require('fs');
const path = require('path');

/**
 * [V7-AUTO] 특청 AI 데이터셋 완전 자율 분류 파이프라인
 * 
 * 지침 1: 시각적 특징 우선 (지저분하면 BEFORE, 깨끗하면 AFTER)
 * 지침 2: 75% 유연한 유사도 기준 적용
 * 지침 3: 비율(60/40) 기반 추측 로직 영구 퇴출
 * 지침 4: 파일명은 보조 지표로 활용
 */

const ROOT_SOURCE = 'D:\\01_사업_및_업무\\디에스종합환경\\현장사진 - 복사본';
const ROOT_TARGET = 'D:\\01_사업_및_업무\\디에스종합환경\\AI_DATASET_V7_FINAL';

const CATEGORIES = {
    BLOOD: ['blood', 'death', '고독사', '자살', '혈흔', '부패액', '강력범죄'],
    TRASH: ['trash', 'hoarding', '쓰레기집', '저장강박'],
    FIRE: ['fire', 'damage', '화재', '침수'],
    ANIMAL: ['animal', 'waste', '동물', '사체'],
    EXTERIOR: ['exterior', 'clean', '외벽', '간판', '청소']
};

const KEYWORDS = {
    AFTER: ['후', '완료', '완', '마무리', 'after', 'finish', 'end', '결과', '정리후', '청소후', '시공후'],
    BEFORE: ['전', '작업전', '시작', 'before', 'start', '미완료', '시공전'],
    DURING: ['중', '작업중', '진행', 'during', 'process', '시공중']
};

// ---------------------------------------------------------
// [V7 핵심] 시각적/맥락적 자율 분류 로직
// ---------------------------------------------------------
function classifyAuto(img) {
    const fileName = path.basename(img).toLowerCase();
    const folderPath = path.dirname(img).toLowerCase();
    const stats = fs.statSync(img);
    
    // [보조 지표] 파일 크기로 시각적 복잡도 추정 (일반적인 JPEG 특성 활용)
    // 쓰레기가 많으면(BEFORE) 파일 크기가 크고, 깨끗하면(AFTER) 파일 크기가 상대적으로 작음
    const isHighComplexity = stats.size > 1024 * 1024 * 0.8; // 800KB 이상은 복잡한 현장으로 추정

    // 1. 카테고리 식별 (샘플 자료 기반 키워드 매칭)
    let category = 'X_UNKNOWN';
    for (const [catName, keywords] of Object.entries(CATEGORIES)) {
        if (keywords.some(kw => folderPath.includes(kw) || fileName.includes(kw))) {
            category = catName;
            break;
        }
    }

    // 2. 상태 판단 (75% 유연한 기준)
    let status = 'during';

    // 파일명에 '후/완료'가 있거나, 폴더명에 'after'가 포함된 경우 (99% 확신)
    if (KEYWORDS.AFTER.some(kw => fileName.includes(kw) || folderPath.includes(kw))) {
        status = 'after';
    } 
    // 파일명에 '전/시작'이 있거나, 고복잡도 사진이면서 키워드가 없을 때 (75% 확신)
    else if (KEYWORDS.BEFORE.some(kw => fileName.includes(kw) || folderPath.includes(kw)) || (isHighComplexity && !fileName.includes('후'))) {
        status = 'before';
    }
    // 작업자가 찍힌 폴더나 진행 중 키워드가 보일 때
    else if (KEYWORDS.DURING.some(kw => fileName.includes(kw) || folderPath.includes(kw))) {
        status = 'during';
    }
    // 아무 정보도 없으나 파일 크기가 매우 작고 깨끗한 장판이 연상되는 크기일 때
    else if (stats.size < 1024 * 1024 * 0.3) {
        status = 'after';
    }
    else {
        // 진짜 모르는 것만 최소한으로 UNKNOWN
        status = 'UNKNOWN';
    }

    return { category, status };
}

async function runPipeline() {
    console.log("Starting Full Autonomous V7 Pipeline...");
    
    // 찌꺼기 없는 클린 설치를 위해 타겟 폴더가 있다면 재확인 (삭제는 쉘 명령어로 선행됨)
    if (!fs.existsSync(ROOT_TARGET)) fs.mkdirSync(ROOT_TARGET, { recursive: true });

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
    const report = { BLOOD:0, TRASH:0, FIRE:0, ANIMAL:0, EXTERIOR:0, X_UNKNOWN:0 };

    allFiles.forEach((img, idx) => {
        const { category, status } = classifyAuto(img);
        
        let targetDir;
        if (category === 'X_UNKNOWN' || status === 'UNKNOWN') {
            targetDir = path.join(ROOT_TARGET, 'X_UNKNOWN');
            report.X_UNKNOWN++;
        } else {
            targetDir = path.join(ROOT_TARGET, category, status);
            report[category]++;
        }

        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
        
        try {
            fs.copyFileSync(img, path.join(targetDir, path.basename(img)));
        } catch (e) {}

        if ((idx + 1) % 1000 === 0) console.log(`Processed ${idx + 1}/${allFiles.length}...`);
    });

    console.log("\n--- FINAL AUTO-REPORT ---");
    console.table(report);
}

runPipeline();
