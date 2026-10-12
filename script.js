// script.js
// 請將此處換成你的 Google Apps Script 網頁應用程式網址
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxzAz_DZlVD_71pRW9ZSbP8SMa6HcntzU1WjCICfk75Q7JEz6TPWbGabOYRZnbPW__B/exec";

let students = [];
let activities = [];
let statuses = [];
let attendance = {};

// 顯示與隱藏 Loading 遮罩
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// 初始化：從 Google Sheet 載入資料
async function loadDataFromGoogleSheet() {
    showLoading(); // 顯示 Loading
    try {
        const response = await fetch(`${SCRIPT_URL}?action=getAllData`);
        const data = await response.json();
        students = data.students || [];
        activities = data.activities || [];
        statuses = data.statuses || [];
        attendance = data.attendance || {};
        renderAll();
    } catch (error) {
        console.error("載入資料失敗：", error);
        alert("無法從 Google 試算表載入資料，請檢查網路連線或指令碼網址。");
    } finally {
        hideLoading(); // 無論成功或失敗，最後都關閉 Loading
    }
}

// 儲存資料至 Google Sheet
async function saveData() {
    renderAll(); // 即時更新前端畫面
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script 跨域設定
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'saveAllData',
                payload: { students, activities, statuses, attendance }
            })
        });
        console.log("資料已同步至 Google Sheet");
    } catch (error) {
        console.error("儲存至 Google Sheet 失敗：", error);
    }
}

// 頁面載入時執行
window.onload = function() {
    currentSortColumn = 'activityCount';
    currentSortDirection = 'desc';
    loadDataFromGoogleSheet();
};

// 取得系統中最高學年（用來判定是否為新生）
function getLatestAcademicYear() {
    if (students.length === 0) return "115";
    const years = students.map(s => String(s.year)).sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
    return years[0];
}

function isFreshman(student) {
    const latestYear = getLatestAcademicYear();
    return String(student.year) === String(latestYear);
}

function getStudentTypes(student) {
    let types = student.types ? [...student.types] : [];
    if (isFreshman(student) && !types.includes('新生')) {
        types.push('新生');
    }
    return types;
}

// 身份層級判定：講師 > 幹部 > 新生 > 其他
function getHighestPriorityType(student) {
    const typesArr = getStudentTypes(student);
    if (!typesArr || typesArr.length === 0) return '其他';
    if (typesArr.includes('講師')) return '講師';
    if (typesArr.includes('幹部')) return '幹部';
    if (typesArr.includes('新生')) return '新生';
    return '其他';
}

let currentSortColumn = 'activityCount';
let currentSortDirection = 'desc';

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    event.currentTarget.classList.add('active');
}

function renderAll() {
    renderCheckboxGroups();
    filterAndRenderStudents();
    renderActivityTable();
    renderStatusTable();
    renderDropdowns();
    populateFilterOptions();
}

// Modal 控制
function openStudentModal() {
    document.getElementById('edit-student-id').value = '';
    document.getElementById('student-form').reset();
    clearCheckboxes();
    document.getElementById('student-form-title').innerText = '新增道親';
    document.getElementById('student-submit-btn').innerText = '新增道親';
    document.getElementById('student-modal').style.display = 'flex';
}

function closeStudentModal() {
    document.getElementById('student-modal').style.display = 'none';
}

function renderCheckboxGroups() {
    const statusContainer = document.getElementById('s-status-checkboxes');
    if (statusContainer) {
        statusContainer.innerHTML = '';
        if (statuses.length === 0) {
            statusContainer.innerHTML = '<span style="font-size:0.85rem; color:#64748b;">尚無狀態，請先至「成全狀態管理」新增</span>';
        } else {
            statuses.forEach(st => {
                statusContainer.innerHTML += `
                    <label class="checkbox-item">
                        <input type="checkbox" name="student-status" value="${st.name}">
                        ${st.name}
                    </label>
                `;
            });
        }
    }

    const seniorContainer = document.getElementById('s-seniors-checkboxes');
    if (seniorContainer) {
        seniorContainer.innerHTML = '';
        const eligibleSeniors = students.filter(s => {
            const t = s.types || [];
            return t.includes('講師') || t.includes('幹部');
        });

        if (eligibleSeniors.length === 0) {
            seniorContainer.innerHTML = '<span style="font-size:0.85rem; color:#64748b;">尚無符合資格的講師/幹部聯絡人</span>';
        } else {
            eligibleSeniors.forEach(s => {
                seniorContainer.innerHTML += `
                    <label class="checkbox-item">
                        <input type="checkbox" name="student-senior" value="${s.name}">
                        ${s.name} (${s.dept})
                    </label>
                `;
            });
        }
    }
}

function handleStudentForm(event) {
    event.preventDefault();
    const editId = document.getElementById('edit-student-id').value;

    const checkedTypes = document.querySelectorAll('input[name="student-type"]:checked');
    const selectedTypes = Array.from(checkedTypes).map(cb => cb.value);

    const checkedStatuses = document.querySelectorAll('input[name="student-status"]:checked');
    const selectedStatuses = Array.from(checkedStatuses).map(cb => cb.value);

    const checkedSeniors = document.querySelectorAll('input[name="student-senior"]:checked');
    const selectedSeniors = Array.from(checkedSeniors).map(cb => cb.value);

    const studentData = {
        name: document.getElementById('s-name').value,
        year: document.getElementById('s-year').value,
        gender: document.getElementById('s-gender').value,
        dept: document.getElementById('s-dept').value,
        hometown: document.getElementById('s-hometown').value,
        types: selectedTypes,
        statuses: selectedStatuses,
        seniors: selectedSeniors,
        note: document.getElementById('s-note').value
    };

    if (editId) {
        const index = students.findIndex(s => s.id == editId);
        if (index !== -1) {
            students[index] = { id: Number(editId), ...studentData };
        }
    } else {
        studentData.id = Date.now();
        students.push(studentData);
    }
    closeStudentModal();
    saveData();
}

function clearCheckboxes() {
    document.querySelectorAll('input[name="student-type"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="student-status"]').forEach(cb => cb.checked = false);
    document.querySelectorAll('input[name="student-senior"]').forEach(cb => cb.checked = false);
}

function editStudent(id) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    openStudentModal();

    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('s-name').value = student.name;
    document.getElementById('s-year').value = student.year;
    document.getElementById('s-gender').value = student.gender;
    document.getElementById('s-dept').value = student.dept;
    document.getElementById('s-hometown').value = student.hometown || '';
    document.getElementById('s-note').value = student.note || '';

    document.querySelectorAll('input[name="student-type"]').forEach(cb => {
        cb.checked = student.types && student.types.includes(cb.value);
    });

    document.querySelectorAll('input[name="student-status"]').forEach(cb => {
        cb.checked = student.statuses && student.statuses.includes(cb.value);
    });

    document.querySelectorAll('input[name="student-senior"]').forEach(cb => {
        cb.checked = student.seniors && student.seniors.includes(cb.value);
    });

    document.getElementById('student-form-title').innerText = `編輯道親：${student.name}`;
    document.getElementById('student-submit-btn').innerText = '儲存修改';
}

function deleteStudent(id) {
    if (confirm('確定要刪除這位道親嗎？')) {
        students = students.filter(s => s.id !== id);
        saveData();
    }
}

function populateFilterOptions() {
    const yearSelect = document.getElementById('filter-year');
    const statusSelect = document.getElementById('filter-status');
    const contactSelect = document.getElementById('filter-contact');
    
    const currentYear = yearSelect.value;
    const currentStatus = statusSelect.value;
    const currentContact = contactSelect.value;

    const years = [...new Set(students.map(s => String(s.year)))].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
    yearSelect.innerHTML = '<option value="">全部學年</option>';
    years.forEach(y => {
        yearSelect.innerHTML += `<option value="${y}">${y}學年</option>`;
    });
    yearSelect.value = currentYear;

    statusSelect.innerHTML = '<option value="">全部狀態</option>';
    statuses.forEach(st => {
        statusSelect.innerHTML += `<option value="${st.name}">${st.name}</option>`;
    });
    statusSelect.value = currentStatus;

    const contactsMap = new Map();
    students.forEach(s => {
        if (s.seniors) s.seniors.forEach(c => contactsMap.set(c, true));
    });
    contactSelect.innerHTML = '<option value="">全部聯絡人</option>';
    contactsMap.forEach((_, cName) => {
        contactSelect.innerHTML += `<option value="${cName}">${cName}</option>`;
    });
    contactSelect.value = currentContact;
}

function resetFilters() {
    document.getElementById('filter-keyword').value = '';
    document.getElementById('filter-year').value = '';
    document.getElementById('filter-type').value = '';
    document.getElementById('filter-status').value = '';
    document.getElementById('filter-contact').value = '';
    filterAndRenderStudents();
}

function sortStudents(column) {
    if (currentSortColumn === column) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortDirection = 'asc';
    }
    filterAndRenderStudents();
}

function updateSortIndicators() {
    ['name', 'year', 'status', 'activityCount'].forEach(col => {
        const th = document.getElementById(`th-${col}`);
        if (th) {
            let baseText = col === 'name' ? '姓名' : col === 'year' ? '學年' : col === 'status' ? '成全狀態' : '參加過的活動';
            if (currentSortColumn === col) {
                // 當前排序欄位才顯示對應的上下箭頭
                th.innerText = `${baseText} ${currentSortDirection === 'asc' ? '▲' : '▼'}`;
            } else {
                // 非當前排序欄位不顯示 icon
                th.innerText = baseText;
            }
        }
    });
}

function filterAndRenderStudents() {
    const keyword = document.getElementById('filter-keyword').value.toLowerCase();
    const filterYear = document.getElementById('filter-year').value;
    const filterType = document.getElementById('filter-type').value;
    const filterStatus = document.getElementById('filter-status').value;
    const filterContact = document.getElementById('filter-contact').value;

    let result = students.filter(s => {
        const matchKeyword = !keyword || 
            s.name.toLowerCase().includes(keyword) || 
            s.dept.toLowerCase().includes(keyword) || 
            (s.hometown && s.hometown.toLowerCase().includes(keyword));
        
        const matchYear = !filterYear || String(s.year) === String(filterYear);
        const sTypes = getStudentTypes(s);
        const matchType = !filterType || sTypes.includes(filterType);
        const matchStatus = !filterStatus || (s.statuses && s.statuses.includes(filterStatus));
        const matchContact = !filterContact || (s.seniors && s.seniors.includes(filterContact));

        return matchKeyword && matchYear && matchType && matchStatus && matchContact;
    });

    if (currentSortColumn) {
        result.sort((a, b) => {
            let valA, valB;

            if (currentSortColumn === 'status') {
                valA = (a.statuses && a.statuses.length > 0) ? a.statuses.join(', ') : '';
                valB = (b.statuses && b.statuses.length > 0) ? b.statuses.join(', ') : '';
            } else if (currentSortColumn === 'activityCount') {
                // 計算今年參與活動的數量
                valA = 0;
                valB = 0;
                for (let actId in attendance) {
                    const act = activities.find(actItem => actItem.id == actId);
                    if (act && act.isThisYear === '是') {
                        if (attendance[actId].includes(a.id)) valA++;
                        if (attendance[actId].includes(b.id)) valB++;
                    }
                }
            } else {
                valA = a[currentSortColumn] || '';
                valB = b[currentSortColumn] || '';
                if (currentSortColumn === 'year') {
                    valA = Number(valA) || 0;
                    valB = Number(valB) || 0;
                }
            }

            if (valA < valB) return currentSortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    updateSortIndicators();
    document.getElementById('student-count-badge').innerText = `總人數：${result.length} 人`;

    const tbody = document.querySelector('#student-table tbody');
    tbody.innerHTML = '';
    
    if (result.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #64748b;">沒有符合條件的道親資料</td></tr>`;
        return;
    }

    result.forEach((s, index) => {
        const typesStr = getStudentTypes(s).join(', ') || '-';
        const statusesStr = (s.statuses && s.statuses.length > 0) ? s.statuses.join(', ') : '-';
        const seniorsStr = (s.seniors && s.seniors.length > 0) ? s.seniors.join(', ') : '-';
        const formattedNote = s.note ? s.note.replace(/\n/g, '<br>') : '-';

        // 找出該道親參與過的活動，並且只留下「是否為今年」為「是」的活動
        let joinedActivities = [];
        for (let actId in attendance) {
            if (attendance[actId].includes(s.id)) {
                const act = activities.find(a => a.id == actId);
                if (act && act.isThisYear === '是') {
                    joinedActivities.push(act);
                }
            }
        }
        joinedActivities.sort((a, b) => b.date.localeCompare(a.date));

        let activitiesHtml = '<span style="color: #64748b;">無今年紀錄</span>';
        if (joinedActivities.length > 0) {
            let listItems = joinedActivities.map(a => `<li>${formatDate(a.date)} - ${a.name}</li>`).join('');
            activitiesHtml = `
                <details>
                    <summary style="cursor: pointer; color: var(--accent-color); font-weight: 500;">查看今年活動 (${joinedActivities.length}場)</summary>
                    <ul style="margin-top: 5px; padding-left: 18px; font-size: 0.85rem; max-height: 120px; overflow-y: auto;">
                        ${listItems}
                    </ul>
                </details>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${s.name}</td>
                <td>${s.year}</td>
                <td>${s.gender}</td>
                <td>${s.dept}</td>
                <td>${s.hometown || '-'}</td>
                <td>${typesStr}</td>
                <td>${statusesStr}</td>
                <td style='max-width: 150px'>${seniorsStr}</td>
                <td style='max-width: 150px'>${formattedNote}</td>
                <td>${activitiesHtml}</td>
                <td>
                    <button class="btn btn-warning" onclick="editStudent(${s.id})">編輯</button>
                    <button class="btn btn-danger" onclick="deleteStudent(${s.id})">刪除</button>
                </td>
            </tr>
        `;
    });
}

function addActivity(event) {
    event.preventDefault();
    const typeInput = document.getElementById('act-type').value.trim();
    const newAct = {
        id: Date.now(),
        date: document.getElementById('act-date').value,
        name: document.getElementById('act-name').value,
        type: typeInput === '' ? '其他' : typeInput,
        isThisYear: document.getElementById('act-is-this-year').value
    };
    activities.push(newAct);
    saveData();
    document.getElementById('activity-form').reset();
}

function deleteActivity(id) {
    if (confirm('確定要刪除這個活動嗎？')) {
        activities = activities.filter(a => a.id !== id);
        delete attendance[id];
        saveData();
    }
}

// 細分計算：講師 / 幹部 / 新生 / 其他
function calculateActivityBreakdown(actId) {
    const attendedIds = attendance[actId] || [];
    let counts = { lecturer: 0, cadre: 0, freshman: 0, other: 0, total: attendedIds.length };

    attendedIds.forEach(id => {
        const person = students.find(s => s.id === id);
        if (!person) return;
        const mainType = getHighestPriorityType(person);
        if (mainType === '講師') counts.lecturer++;
        else if (mainType === '幹部') counts.cadre++;
        else if (mainType === '新生') counts.freshman++;
        else counts.other++;
    });

    return counts;
}

function renderActivityTable() {
    const tbody = document.querySelector('#activity-table tbody');
    tbody.innerHTML = '';
    
    // 活動列表以日期最新的排序 (降冪)
    const sortedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));

    document.getElementById('activity-count-badge').innerText = `總活動數：${sortedActivities.length} 場`;

    sortedActivities.forEach(a => {
        const breakdown = calculateActivityBreakdown(a.id);
        const displayType = (!a.type || a.type.trim() === '') ? '其他' : a.type;
        const formattedDate = formatDate(a.date); // 格式化日期
        
        // 讀取手動指定的「是否為今年」
        const isThisYear = a.isThisYear === '是';
        const yearBadgeHtml = isThisYear 
            ? '<span style="background: #27ae60; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">是</span>' 
            : '<span style="background: #cbd5e1; color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">否</span>';

        // 取得參加這場活動的人員清單
        const attendedIds = attendance[a.id] || [];
        const attendees = students.filter(s => attendedIds.includes(s.id));
        let attendeesHtml = '<span style="color: #64748b;">無出席紀錄</span>';
        if (attendees.length > 0) {
            let attendeeItems = attendees.map(s => `<li>${s.name} (${s.dept} - ${getHighestPriorityType(s)})</li>`).join('');
            attendeesHtml = `
                <details>
                    <summary style="cursor: pointer; color: var(--accent-color); font-weight: 500;">查看名單 (${attendees.length}人)</summary>
                    <ul style="margin-top: 5px; padding-left: 18px; font-size: 0.85rem; max-height: 120px; overflow-y: auto;">
                        ${attendeeItems}
                    </ul>
                </details>
            `;
        }

        tbody.innerHTML += `
            <tr>
                <td>${formattedDate}</td>
                <td>${yearBadgeHtml}</td>
                <td>${a.name}</td>
                <td>${displayType}</td>
                <td><strong>${breakdown.total}</strong> 人</td>
                <td>講師: ${breakdown.lecturer} | 幹部: ${breakdown.cadre} | 新生: ${breakdown.freshman} | 其他: ${breakdown.other}</td>
                <td>${attendeesHtml}</td>
                <td><button class="btn btn-danger" onclick="deleteActivity(${a.id})">刪除</button></td>
            </tr>
        `;
    });
}

function addStatusTag(event) {
    event.preventDefault();
    const name = document.getElementById('st-name').value.trim();
    if (statuses.some(st => st.name === name)) {
        alert('此狀態名稱已存在！');
        return;
    }
    statuses.push({ id: Date.now(), name });
    saveData();
    document.getElementById('status-form').reset();
}

function deleteStatusTag(id) {
    const st = statuses.find(s => s.id === id);
    if (confirm(`確定要刪除成全狀態「${st.name}」嗎？`)) {
        statuses = statuses.filter(s => s.id !== id);
        students.forEach(s => {
            if (s.statuses) {
                s.statuses = s.statuses.filter(name => name !== st.name);
            }
        });
        saveData();
    }
}

function renderStatusTable() {
    const tbody = document.querySelector('#status-table tbody');
    tbody.innerHTML = '';
    
    document.getElementById('status-count-badge').innerText = `總狀態數：${statuses.length} 個`;

    statuses.forEach(st => {
        const count = students.filter(s => s.statuses && s.statuses.includes(st.name)).length;
        tbody.innerHTML += `
            <tr>
                <td>${st.name}</td>
                <td><strong>${count}</strong> 位</td>
                <td><button class="btn btn-danger" onclick="deleteStatusTag(${st.id})">刪除</button></td>
            </tr>
        `;
    });
}

function renderDropdowns() {
    // 活動點名與查詢下拉選單也依日期最新排序
    const sortedActivities = [...activities].sort((a, b) => b.date.localeCompare(a.date));

    const actSelects = [
        document.getElementById('attend-activity-select'),
        document.getElementById('query-act-select')
    ];
    actSelects.forEach(sel => {
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">-- 請選擇活動 --</option>';
        sortedActivities.forEach(a => {
            const formattedDate = formatDate(a.date); // 格式化日期
            sel.innerHTML += `<option value="${a.id}">${formattedDate} - ${a.name}</option>`;
        });
        sel.value = currentVal;
    });

    renderStudentQueryDropdowns();
}

// 填入道親個人查詢的四個分類下拉選單
function renderStudentQueryDropdowns() {
    const categories = [
        { key: 'lecturer', id: 'query-stu-lecturer', label: '講師' },
        { key: 'cadre', id: 'query-stu-cadre', label: '幹部' },
        { key: 'freshman', id: 'query-stu-freshman', label: '新生' },
        { key: 'other', id: 'query-stu-other', label: '其他' }
    ];

    categories.forEach(cat => {
        const selectEl = document.getElementById(cat.id);
        if (!selectEl) return;
        const currentVal = selectEl.value;
        selectEl.innerHTML = `<option value="">-- 請選擇${cat.label} --</option>`;
        
        const filteredStudents = students.filter(s => getHighestPriorityType(s) === cat.label);
        filteredStudents.forEach(s => {
            selectEl.innerHTML += `<option value="${s.id}">${s.name} (${s.year}學年 - ${s.dept})</option>`;
        });
        selectEl.value = currentVal;
    });
}

// 處理道親個人查詢下拉選單的互斥選取
function handleStudentQuerySelect(categoryKey) {
    const categories = ['lecturer', 'cadre', 'freshman', 'other'];
    categories.forEach(cat => {
        if (cat !== categoryKey) {
            const el = document.getElementById(`query-stu-${cat}`);
            if (el) el.value = "";
        }
    });

    const activeEl = document.getElementById(`query-stu-${categoryKey}`);
    if (activeEl && activeEl.value) {
        queryStudentDetail(activeEl.value);
    } else {
        document.getElementById('stu-query-result').style.display = 'none';
    }
}

// 點名分成 講師/幹部/新生/其他，以名單方式勾選
function renderAttendanceList() {
    const actId = document.getElementById('attend-activity-select').value;
    const container = document.getElementById('attendance-container');
    const sectionsContainer = document.getElementById('attendance-sections-container');

    if (!actId) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    sectionsContainer.innerHTML = '';
    
    const attendedIds = attendance[actId] || [];

    const groups = [
        { title: '講師', type: '講師' },
        { title: '幹部', type: '幹部' },
        { title: '新生', type: '新生' },
        { title: '其他', type: '其他' }
    ];

    groups.forEach(g => {
        const groupStudents = students.filter(s => getHighestPriorityType(s) === g.type);
        if (groupStudents.length > 0) {
            let html = `
                <div class="attendance-group-box">
                    <h4 style="font-size:0.95rem; color:var(--primary-color); margin-bottom: 8px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">${g.title} (${groupStudents.length}人)</h4>
                    <div class="list-checkbox-container" style="display: flex; flex-direction: column; gap: 6px; padding: 8px; background: #fafafa; border: 1px solid var(--border-color); border-radius: 6px; max-height: 200px; overflow-y: auto;">
            `;
            groupStudents.forEach(s => {
                const isChecked = attendedIds.includes(s.id) ? 'checked' : '';
                html += `
                    <label class="checkbox-item" style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; cursor: pointer;">
                        <input type="checkbox" value="${s.id}" ${isChecked}>
                        <span><strong>${s.name}</strong> (${s.year}學年 - ${s.dept})</span>
                    </label>
                `;
            });
            html += `</div></div>`;
            sectionsContainer.innerHTML += html;
        }
    });
}

function saveAttendance() {
    const actId = document.getElementById('attend-activity-select').value;
    if (!actId) return;

    const checkedBoxes = document.querySelectorAll('#attendance-sections-container input[type="checkbox"]:checked');
    const checkedIds = Array.from(checkedBoxes).map(cb => Number(cb.value));

    attendance[actId] = checkedIds;
    saveData();
    alert('出席紀錄儲存成功！');
}

function queryActivityDetail() {
    const actId = document.getElementById('query-act-select').value;
    const resultDiv = document.getElementById('act-query-result');

    if (!actId) {
        resultDiv.style.display = 'none';
        return;
    }

    resultDiv.style.display = 'block';
    const breakdown = calculateActivityBreakdown(actId);

    document.getElementById('stat-count').innerText = breakdown.total;
    document.getElementById('stat-lecturer').innerText = breakdown.lecturer;
    document.getElementById('stat-cadre').innerText = breakdown.cadre;
    document.getElementById('stat-freshman').innerText = breakdown.freshman;
    document.getElementById('stat-other').innerText = breakdown.other;

    const tbody = document.querySelector('#act-attendees-table tbody');
    tbody.innerHTML = '';

    const attendedIds = attendance[actId] || [];
    const attendees = students.filter(s => attendedIds.includes(s.id));
    if (attendees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #64748b;">此活動尚無人出席</td></tr>`;
    } else {
        attendees.forEach(s => {
            const mainType = getHighestPriorityType(s);
            const statusesStr = (s.statuses && s.statuses.length > 0) ? s.statuses.join(', ') : '-';
            tbody.innerHTML += `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.year}學年</td>
                    <td>${s.dept}</td>
                    <td>${mainType}</td>
                    <td>${statusesStr}</td>
                </tr>
            `;
        });
    }
}

function queryStudentDetail(stuIdParam) {
    const stuId = Number(stuIdParam);
    const resultDiv = document.getElementById('stu-query-result');

    if (!stuId) {
        resultDiv.style.display = 'none';
        return;
    }

    const student = students.find(s => s.id === stuId);
    if (!student) return;

    resultDiv.style.display = 'block';

    document.getElementById('p-name').innerText = student.name;
    document.getElementById('p-year').innerText = student.year + '學年';
    document.getElementById('p-gender').innerText = student.gender;
    document.getElementById('p-dept').innerText = student.dept;
    document.getElementById('p-hometown').innerText = student.hometown || '-';
    
    const typesStr = getStudentTypes(student).join(', ') || '-';
    document.getElementById('p-types').innerText = typesStr;

    const statusesStr = (student.statuses && student.statuses.length > 0) ? student.statuses.join(', ') : '-';
    document.getElementById('p-status').innerText = statusesStr;
    
    const seniorsStr = (student.seniors && student.seniors.length > 0) ? student.seniors.join(', ') : '-';
    document.getElementById('p-senior').innerText = seniorsStr;
    document.getElementById('p-note').innerText = student.note || '-';

    const tbody = document.querySelector('#stu-history-table tbody');
    tbody.innerHTML = '';

    let joinedActivities = [];
    for (let actId in attendance) {
        if (attendance[actId].includes(student.id)) {
            const act = activities.find(a => a.id == actId);
            if (act) joinedActivities.push(act);
        }
    }

    // 歷史活動依日期最新的排序
    joinedActivities.sort((a, b) => b.date.localeCompare(a.date));

    if (joinedActivities.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #64748b;">該道親尚無參與任何活動紀錄</td></tr>`;
    } else {
        joinedActivities.forEach(a => {
            const displayType = (!a.type || a.type.trim() === '') ? '其他' : a.type;
            const formattedDate = formatDate(a.date); // 格式化日期
            tbody.innerHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${a.name}</td>
                    <td>${displayType}</td>
                </tr>
            `;
        });
    }
}


// 確保日期格式為 yyyy-MM-dd
function formatDate(dateString) {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    return dateString.substring(0, 10);
}