/**
 * 공통 유틸리티
 */

// 기준일 이전(포함)의 가장 최근 월요일을 반환
// 월요일에 실행하면 오늘 자신이, 화요일에 실행하면 어제(월요일)가 됨 -> 실행 요일에 상관없이 항상 같은 주간 경계를 계산
function getMostRecentMonday_(refDate) {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=일 1=월 2=화 ...
  const diff = (day + 6) % 7; // 월요일로부터 며칠 지났는지
  d.setDate(d.getDate() - diff);
  return d;
}

// 이번 주 보고 대상 기간: [지난주 화요일, 이번주 월요일]
// 월요일/화요일 둘 중 언제 실행하든 같은 구간이 나오도록 '가장 최근 월요일'을 기준으로 계산
function getReportDateRange_(refDate) {
  const recentMonday = getMostRecentMonday_(refDate || new Date());
  const end = new Date(recentMonday);
  end.setHours(23, 59, 59, 999);
  const start = new Date(recentMonday);
  start.setDate(start.getDate() - 6); // 지난주 화요일
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

// 비고란에 실제로 적는 표기와 동일한 형식: "8/11(화)"
function formatKoreanShortDateWithWeekday_(date) {
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const md = Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Seoul', 'M/d');
  return md + '(' + weekdays[date.getDay()] + ')';
}

// 구미캠퍼스 교육생 탭 비고란의 "8/11(화) 보고" 같은 메모에서 가장 최근 보고일을 뽑아낸다.
// 같은 셀에 여러 번 누적 기재된 경우 가장 늦은 날짜를 기준으로 삼는다.
function parseLatestReportedDate_(noteText) {
  if (!noteText) return null;
  const re = /(\d{1,2})\s*\/\s*(\d{1,2})\s*\([^)]*\)\s*보고/g;
  const year = new Date().getFullYear();
  let m;
  let latest = null;
  while ((m = re.exec(String(noteText))) !== null) {
    const d = new Date(year, Number(m[1]) - 1, Number(m[2]), 23, 59, 59, 999);
    if (!latest || d > latest) latest = d;
  }
  return latest;
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
