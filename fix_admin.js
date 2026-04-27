const fs = require('fs');
let admin = fs.readFileSync('admin.html', 'utf8');

// The file has a broken section. Let's find it.
const startStr = "case 'vendors':";
const endStr = "case 'vendor_detail':";

const idx1 = admin.indexOf(startStr);
const idx2 = admin.indexOf(endStr);

if (idx1 !== -1 && idx2 !== -1) {
    const fixed = `case 'vendors': return \`
					<div class="padding">
						<h2 style="margin-bottom:25px;">파트너 입점 심사</h2>
						\${state.pendingVendors.map(v => \`
							<div class="card">
								<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
									<div>
										<div style="font-weight:bold; font-size:17px;">\${v.name}</div>
										<div style="font-size:12px; color:var(--text-sub);">\${v.type} 사업자 • \${v.date} 신청</div>
									</div>
									<div class="status-pill status-warn">서류 검토중</div>
								</div>
								<div style="font-size:12px; color:var(--text-dark); margin-bottom:15px;">첨부 파일: \${v.files}건</div>
								<button class="primaryBtn" style="padding:12px; font-size:13px; background:var(--surface-light); border:1px solid var(--border);" onclick="setPage('vendor_detail', \${JSON.stringify(v)})">서류 검토 및 심사하기</button>
							</div>
						\`).join('')}
					</div>
				\`;
				case 'vendor_detail':`;
    
    admin = admin.substring(0, idx1) + fixed + admin.substring(idx2 + "case 'vendor_detail':".length);
    fs.writeFileSync('admin.html', admin, 'utf8');
    console.log("Fixed admin.html");
} else {
    console.log("Could not find boundaries");
}
