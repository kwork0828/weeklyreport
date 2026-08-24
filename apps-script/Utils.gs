/**
 * 공통 유틸리티
 */

// 기준일 이전(포함)의 가장 최근 화요일을 반환
function getMostRecentTuesday_(refDate) {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=일 ... 2=화
  const diff = (day - 2 + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// 이번 주 보고 대상 기간: [지난주 화요일, 이번주 월요일] (사용자가 실제 사용하는 기준)
// refDate를 화요일에 실행한다고 가정하면 자동으로 맞는 구간이 계산됨
function getReportDateRange_(refDate) {
  const thisTue = getMostRecentTuesday_(refDate || new Date());
  const end = new Date(thisTue);
  end.setDate(end.getDate() - 1); // 이번주 월요일
  end.setHours(23, 59, 59, 999);
  const start = new Date(thisTue);
  start.setDate(start.getDate() - 7); // 지난주 화요일
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function isWithinRange_(date, start, end) {
  if (!(date instanceof Date) || isNaN(date)) return false;
  return date >= start && date <= end;
}

function formatDateYMD_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Seoul', 'yyyy.MM.dd');
}

function formatDateMD_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Seoul', 'M.d');
}

// "2026년8월10일" / "2026년 8월 10일" 같은 표기를 Date로 파싱
function parseKoreanDate_(value) {
  if (value instanceof Date) return value;
  if (!value) return null;
  const s = String(value).trim();
  const m = s.match(/(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const parsed = new Date(s);
  return isNaN(parsed) ? null : parsed;
}

function openCounselSheet_() {
  return SpreadsheetApp.openById(CONFIG.COUNSEL_SHEET_ID);
}

function openSurveySheet_() {
  return SpreadsheetApp.openById(CONFIG.SURVEY_SHEET_ID);
}

function getDailyLogRows_() {
  const sheet = openCounselSheet_().getSheetByName(CONFIG.DAILY_LOG_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < CONFIG.DAILY_LOG_DATA_START_ROW) return [];
  return sheet
    .getRange(CONFIG.DAILY_LOG_DATA_START_ROW, 1, lastRow - CONFIG.DAILY_LOG_DATA_START_ROW + 1, lastCol)
    .getValues();
}

function getRosterSheet_() {
  return openCounselSheet_().getSheetByName(CONFIG.ROSTER_SHEET_NAME);
}

function getRosterRows_() {
  const sheet = getRosterSheet_();
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < CONFIG.ROSTER_DATA_START_ROW) return [];
  return sheet
    .getRange(CONFIG.ROSTER_DATA_START_ROW, 1, lastRow - CONFIG.ROSTER_DATA_START_ROW + 1, lastCol)
    .getValues();
}

function getSurveyRows_() {
  const sheet = openSurveySheet_().getSheetByName(CONFIG.SURVEY_RESPONSE_SHEET_NAME);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < CONFIG.SURVEY_DATA_START_ROW) return [];
  return sheet
    .getRange(CONFIG.SURVEY_DATA_START_ROW, 1, lastRow - CONFIG.SURVEY_DATA_START_ROW + 1, lastCol)
    .getValues();
}
