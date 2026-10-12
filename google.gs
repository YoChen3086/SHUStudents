const ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getAllData') {
    return ContentService.createTextOutput(JSON.stringify(getAllData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid action'}))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (action === 'saveAllData') {
      saveAllData(data.payload);
      return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Invalid action'}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getAllData() {
  return {
    students: getTableData('Students', ['id', 'name', 'year', 'gender', 'dept', 'hometown', 'types', 'statuses', 'seniors', 'note'], row => ({
      id: Number(row[0]),
      name: row[1],
      year: String(row[2]),
      gender: row[3],
      dept: row[4],
      hometown: row[5],
      types: row[6] ? row[6].split(',') : [],
      statuses: row[7] ? row[7].split(',') : [],
      seniors: row[8] ? row[8].split(',') : [],
      note: row[9]
    })),
    activities: getTableData('Activities', ['id', 'date', 'name', 'type', 'isThisYear'], row => ({
      id: Number(row[0]),
      date: row[1],
      name: row[2],
      type: row[3],
      isThisYear: row[4],
    })),
    statuses: getTableData('Statuses', ['id', 'name'], row => ({
      id: Number(row[0]),
      name: row[1]
    })),
    attendance: getAttendanceData()
  };
}

function getTableData(sheetName, headers, mapper) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return rows.map(mapper);
}

function getAttendanceData() {
  const sheet = ss.getSheetByName('Attendance');
  if (!sheet || sheet.getLastRow() <= 1) return {};
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  let obj = {};
  rows.forEach(row => {
    if (row[0]) {
      obj[String(row[0])] = row[1] ? String(row[1]).split(',').map(Number) : [];
    }
  });
  return obj;
}

function saveAllData(payload) {
  saveTableData('Students', payload.students, s => [s.id, s.name, s.year, s.gender, s.dept, s.hometown, (s.types||[]).join(','), (s.statuses||[]).join(','), (s.seniors||[]).join(','), s.note]);
  saveTableData('Activities', payload.activities, a => [a.id, a.date, a.name, a.type, a.isThisYear]);
  saveTableData('Statuses', payload.statuses, st => [st.id, st.name]);
  saveAttendanceData(payload.attendance);
}

function saveTableData(sheetName, dataArray, mapper) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  if (dataArray && dataArray.length > 0) {
    const rows = dataArray.map(mapper);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function saveAttendanceData(attObj) {
  const sheet = ss.getSheetByName('Attendance');
  if (!sheet) return;
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  let rows = [];
  for (let actId in attObj) {
    rows.push([actId, (attObj[actId] || []).join(',')]);
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}