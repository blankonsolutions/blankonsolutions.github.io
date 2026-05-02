const fs = require('fs');
const raw = fs.readFileSync('admin_lines.txt', 'utf16le'); // PowerShell > creates utf-16le!
const lines = raw.split('\n');
const originalLines = lines.map(l => {
    // lines are like "1: <!DOCTYPE html>\r"
    // find the first colon and space
    const idx = l.indexOf(': ');
    if(idx !== -1 && idx < 10) {
        return l.substring(idx + 2).replace(/\r$/, '');
    }
    return l.replace(/\r$/, '');
});
// Remove any empty lines at the very end
while(originalLines.length > 0 && originalLines[originalLines.length - 1] === '') {
    originalLines.pop();
}

let restoredHtml = originalLines.join('\n');

// Now apply the fixes safely
const newAdminJS = `
		function handleFinalAudit(id, action) {
			if(action === 'approve') {
				const name = document.getElementById('approve_name').value;
				const adminId = document.getElementById('approve_id').value;
				if(!name || !adminId) return alert('승인자 정보를 입력해주세요.');
				if(confirm('정말로 승인하시겠습니까?')) {
					alert(name + ' (' + adminId + ') 님에 의해 승인되었습니다.');
					setPage('vendors');
				}
			} else if(action === 'reject') {
				const name = document.getElementById('reject_name').value;
				const adminId = document.getElementById('reject_id').value;
				const reason = document.getElementById('reject_reason').value;
				if(!name || !adminId) return alert('반려자 정보를 입력해주세요.');
				if(confirm('선택한 사유(' + reason + ')로 반려하시겠습니까?')) {
					alert(name + ' (' + adminId + ') 님에 의해 반려되었습니다.');
					setPage('vendors');
				}
			}
		}

		function renderLogin`;

// 1. Inject handleFinalAudit before renderLogin
restoredHtml = restoredHtml.replace('function renderLogin', newAdminJS);

// 2. Fix the duplicate reject_confirm safely
// Find the first instance of ';; margin-bottom:10px;">반려자 확인</div>'
// The syntax error block looks like:
// `;; margin-bottom:10px;">반려자 확인</div>...
// and ends around `case 'settings':`
// Wait, actually I can just use a regex to fix it because I know the exact duplicate text.
// Or I can just write it out to 'admin.html' and check the syntax using my manual fix file.
// Let's first restore it.
fs.writeFileSync('admin.html', restoredHtml, 'utf8');
console.log('Restored admin.html');
