/**
 * 이 파일 하나만 Apps Script 편집기의 기본 Code.gs에 통째로 붙여넣으면 됩니다.
 * (Config/Utils/ConsultationSummary/NewHires/ReportBuilder/Menu.gs를 한 파일로 합친 버전 — 내용은 동일)
 * 각 파일을 따로 관리하고 싶다면 나머지 .gs 파일들을 개별로 써도 됩니다.
 */

/**
 * 주간업무보고 자동화 - 환경설정
 * 아래 값들을 본인 상황에 맞게 채운 뒤 저장하세요.
 */
const CONFIG = {
  // 스프레드시트 URL의 https://docs.google.com/spreadsheets/d/[여기부분]/edit 을 그대로 복사
  COUNSEL_SHEET_ID: '1hhpMsc3h-OWqvgFuIlRWes_tNB6d53Cx', // 개인_상담일지
  SURVEY_SHEET_ID: '1lDBtxUvEHs_V2vVvthD7Es5YStXJqcTj4_pSGMGYQEc', // 취업 및 취업준비현황 파악(응답)

  // 상담일지 '컨설턴트' 컬럼에 적힌 본인 이름과 정확히 일치해야 필터링됩니다.
  CONSULTANT_NAME: '황준식',

  // 본인이 담당하는 반(기수) - 취업설문 응답에서 신규 취업자를 걸러낼 때 사용
  MY_COHORTS: ['11기', '12기', '13기', '14기'],

  // 취업설문 응답 중 어느 캠퍼스 값을 내 담당으로 볼지 (복수 캠퍼스 겸임 시 배열에 추가)
  MY_CAMPUSES: ['구미 캠퍼스'],

  // 재학중이라 '취업설문' 대상이 아닌 기수 (입사일만 기재, 완료/예정 문구 생략)
  CURRENT_STUDENT_COHORTS: ['15기', '16기'],

  // 시트/탭 이름 (실제 탭 이름이 다르면 여기만 고치면 됨)
  DAILY_LOG_SHEET_NAME: '★일일상담현황★',
  ROSTER_SHEET_NAME: '구미캠퍼스 교육생',
  SURVEY_RESPONSE_SHEET_NAME: '설문지 응답 시트1',

  // ★일일상담현황★ 탭의 헤더행 번호 / 데이터 시작행
  DAILY_LOG_HEADER_ROW: 2,
  DAILY_LOG_DATA_START_ROW: 3,

  // 구미캠퍼스 교육생 탭의 헤더행 번호 / 데이터 시작행 (인적사항 표 기준)
  ROSTER_HEADER_ROW: 21,
  ROSTER_DATA_START_ROW: 22,

  // 설문지 응답 시트1 헤더행 / 데이터 시작행
  SURVEY_HEADER_ROW: 1,
  SURVEY_DATA_START_ROW: 2,

  // 생성된 보고서 초안 Google Doc을 저장할 Drive 폴더 ID (비워두면 내 드라이브 최상위)
  REPORT_FOLDER_ID: '',

  // 취업설문 '현재 취업 현황' 응답 중 '취업'으로 간주할 키워드 (대학원 진학/교육과정 수강 등은 제외)
  EMPLOYED_STATUS_KEYWORDS: ['정규직', '계약직', '인턴', '파견', '창업'],
};

// ★일일상담현황★ 컬럼 위치 (A=1). 실제 시트 컬럼 순서가 바뀌면 여기만 수정.
const LOG_COL = {
  DATE: 1,        // A 상담일
  STUDENT_ID: 2,  // B 학번
  NAME: 3,        // C 이름
  COHORT: 4,      // D 기수
  CAMPUS: 5,      // E 캠퍼스
  CLASS: 6,       // F 반
  METHOD: 7,      // G 상담방법 (방문/유선/화상/온라인 등)
  TYPE: 8,        // H 상담구분 (초기상담/파이널컨설팅/소그룹 컨설팅 등)
  TOPIC: 9,        // I 상담주제 (면접코칭/이력서 자소서 클리닉 등)
  CONSULTANT: 10,  // J 컨설턴트
  CONTENT: 11,     // K 상담내용
  JOB_MATCH_START: 13, // M~Q 잡매칭1~5
  JOB_MATCH_END: 17,
  SESSION_NO: 18,  // R 회차
};

// 구미캠퍼스 교육생 탭 컬럼 위치
const ROSTER_COL = {
  NAME: 3,       // C 이름
  COHORT: 4,     // D 기수
  CLASS: 5,      // E 반명
  CONSULTANT: 13, // M 담당컨설
  STATUS: 15,    // O 취업활동 (구직중/취업완료)
  COMPANY: 16,   // P 기업명
  START_DATE: 17, // Q 입사일자
  TRACK: 18,     // R 구분 (자체/연계)
  NOTE: 19,      // S 비고
};

// 설문지 응답 시트1 컬럼 위치
const SURVEY_COL = {
  TIMESTAMP: 1, // A
  CAMPUS: 2,    // B
  COHORT: 3,    // C
  CLASS: 4,     // D
  NAME: 5,      // E
  PHONE: 6,     // F
  STATUS: 7,    // G 현재 취업 현황
  COMPANY: 8,   // H 회사명
  START_DATE: 9, // I 입사/창업 예정일 (텍스트, "2026년8월10일" 형식)
  DEPT: 10,     // J 부서명
  JOB_TYPE: 11, // K 직무
  JOB_DETAIL: 12, // L 직무 상세
  ROUTE: 13,    // M 취업 경로
};

// 상담방법(G열) 원문 -> 주간보고 4개 카테고리 매핑
const METHOD_MAP = {
  '방문(개별)': '대면상담',
  '방문(그룹)': '대면상담',
  '유선': '전화상담',
  '화상(개별)': '화상상담',
  '화상(그룹)': '화상상담',
  '화상': '화상상담',
  '온라인': '온라인상담',
};
const METHOD_CATEGORIES = ['대면상담', '온라인상담', '전화상담', '화상상담'];

// 프로그램 현황 표에서 상담일지로부터 자동 집계 가능한 상담구분(H열) 값
const PROGRAM_TYPE_MAP = {
  '소그룹 컨설팅': '소그룹 컨설팅(개별)',
  '취업스터디자문': '취업스터디 자문컨설팅',
  '미니상담부스': '미니상담부스',
  '모의면접프로그램': '모의면접',
};
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
/**
 * (1) 상담 현황 표 + (2) 프로그램 현황 초안 + (3) 특이사항 중 [컨설팅] 초안
 * 전부 ★일일상담현황★ 탭에서 자동 집계한다.
 */

// 기간 내 본인이 작성한 상담일지 행만 필터링
function filterMyLogRows_(start, end) {
  return getDailyLogRows_().filter(function (row) {
    const consultant = row[LOG_COL.CONSULTANT - 1];
    const date = row[LOG_COL.DATE - 1];
    return consultant === CONFIG.CONSULTANT_NAME && isWithinRange_(date, start, end);
  });
}

// (1) 상담 현황: 기수 x 상담방법 건수표
function buildConsultationSummary(start, end) {
  const rows = filterMyLogRows_(start, end);
  const cohortSet = {};
  const counts = {}; // counts[method][cohort] = n

  METHOD_CATEGORIES.forEach(function (m) {
    counts[m] = {};
  });

  rows.forEach(function (row) {
    let cohort = row[LOG_COL.COHORT - 1];
    const rawMethod = row[LOG_COL.METHOD - 1];
    const method = METHOD_MAP[rawMethod];
    if (!method) return; // 매핑 안 되는 상담방법은 집계에서 제외(수동 확인 필요)
    // 학번-기수 VLOOKUP 오류(#N/A) 등 비정상 기수값은 별도 '확인필요' 열로 모아 표가 깨지지 않게 함
    if (!cohort || !/^[0-9]+기$/.test(String(cohort).trim())) cohort = '확인필요';
    cohortSet[cohort] = true;
    counts[method][cohort] = (counts[method][cohort] || 0) + 1;
  });

  const cohorts = Object.keys(cohortSet).sort(cohortSortFn_);
  const totalsByCohort = {};
  const totalsByMethod = {};
  let grandTotal = 0;

  cohorts.forEach(function (c) {
    totalsByCohort[c] = 0;
  });
  METHOD_CATEGORIES.forEach(function (m) {
    totalsByMethod[m] = 0;
    cohorts.forEach(function (c) {
      const n = counts[m][c] || 0;
      totalsByCohort[c] += n;
      totalsByMethod[m] += n;
      grandTotal += n;
    });
  });

  return { cohorts: cohorts, counts: counts, totalsByCohort: totalsByCohort, totalsByMethod: totalsByMethod, grandTotal: grandTotal };
}

function cohortSortFn_(a, b) {
  const va = /^[0-9]+기$/.test(a) ? parseInt(a, 10) : Infinity;
  const vb = /^[0-9]+기$/.test(b) ? parseInt(b, 10) : Infinity;
  if (va === vb) return String(a).localeCompare(String(b));
  return va - vb;
}

// (1) 결과를 이메일/엑셀에 그대로 붙여넣을 수 있는 표 형태 문자열로 변환
function renderConsultationSummaryText(summary) {
  const header = ['구분'].concat(summary.cohorts, ['計']);
  const lines = [header.join('\t')];
  METHOD_CATEGORIES.forEach(function (m) {
    const row = [m];
    summary.cohorts.forEach(function (c) {
      const n = summary.counts[m][c] || 0;
      row.push(n || '');
    });
    row.push(summary.totalsByMethod[m] || '');
    lines.push(row.join('\t'));
  });
  const totalRow = ['計'];
  summary.cohorts.forEach(function (c) {
    totalRow.push(summary.totalsByCohort[c] || '');
  });
  totalRow.push(summary.grandTotal || '');
  lines.push(totalRow.join('\t'));
  return lines.join('\n');
}

// (2) 프로그램 현황 초안: 소그룹컨설팅/취업스터디자문/미니상담부스/모의면접만 상담일지에서 뽑을 수 있음
// 주간채용알림 / 취업세미나는 상담일지에 남지 않는 항목이라 항상 수동 입력 필요
function buildProgramStatusDraft(start, end) {
  const rows = filterMyLogRows_(start, end);
  const groups = {}; // groups[programLabel][cohort+date] = {count, dates:Set}

  rows.forEach(function (row) {
    const type = row[LOG_COL.TYPE - 1];
    const label = PROGRAM_TYPE_MAP[type];
    if (!label) return;
    const cohort = row[LOG_COL.COHORT - 1];
    const date = row[LOG_COL.DATE - 1];
    const key = label + '|' + cohort + '|' + formatDateMD_(date);
    if (!groups[key]) {
      groups[key] = { label: label, cohort: cohort, date: date, count: 0 };
    }
    groups[key].count += 1;
  });

  const byLabel = {};
  Object.keys(groups).forEach(function (k) {
    const g = groups[k];
    if (!byLabel[g.label]) byLabel[g.label] = [];
    byLabel[g.label].push(g.cohort + '_' + g.count + '명_' + formatDateMD_(g.date) + ' (' + CONFIG.CONSULTANT_NAME + ')');
  });

  const lines = [];
  lines.push('[주간채용알림(공통)] - 상담일지에 기록되지 않는 항목입니다. 직접 입력하세요.');
  lines.push('[취업세미나(개별/공통)] - 상담일지에 기록되지 않는 항목입니다. 직접 입력하세요.');
  ['소그룹 컨설팅(개별)', '취업스터디 자문컨설팅', '미니상담부스', '모의면접'].forEach(function (label) {
    lines.push('[' + label + ']');
    (byLabel[label] || []).forEach(function (line) {
      lines.push('- ' + line + '  <- 실제 주제명으로 다듬어주세요');
    });
    if (!byLabel[label] || byLabel[label].length === 0) lines.push('- 해당 없음');
  });
  return lines.join('\n');
}

// (3) 특이사항 중 [컨설팅] 초안: 상담주제(자소서/면접) + 잡매칭 기업명 기준으로 기수별 정리
function buildConsultingHighlightsDraft(start, end) {
  const rows = filterMyLogRows_(start, end);
  const byCohort = {}; // byCohort[cohort] = {essay:Set, interview:Set}

  rows.forEach(function (row) {
    const cohort = row[LOG_COL.COHORT - 1];
    if (!cohort) return;
    const topic = String(row[LOG_COL.TOPIC - 1] || '');
    const jobMatches = [];
    for (let c = LOG_COL.JOB_MATCH_START - 1; c <= LOG_COL.JOB_MATCH_END - 1; c++) {
      const v = row[c];
      if (v) jobMatches.push(String(v).trim());
    }
    if (jobMatches.length === 0) return; // 잡매칭 기업명이 없으면 특이사항 문구로 뽑을 근거 부족

    if (!byCohort[cohort]) byCohort[cohort] = { essay: {}, interview: {}, other: {} };
    let bucket = byCohort[cohort].other;
    if (topic.indexOf('자소서') >= 0 || topic.indexOf('이력서') >= 0) bucket = byCohort[cohort].essay;
    else if (topic.indexOf('면접') >= 0) bucket = byCohort[cohort].interview;
    jobMatches.forEach(function (name) {
      bucket[name] = true;
    });
  });

  const cohorts = Object.keys(byCohort).sort(cohortSortFn_);
  const lines = [];
  cohorts.forEach(function (cohort) {
    lines.push(cohort);
    lines.push('[컨설팅]');
    const essay = Object.keys(byCohort[cohort].essay);
    const interview = Object.keys(byCohort[cohort].interview);
    if (essay.length) lines.push('- 자소서 컨설팅_' + essay.join('/') + ' (권역 확인)');
    if (interview.length) lines.push('- 면접 컨설팅_' + interview.join('/') + ' (권역 확인)');
    if (!essay.length && !interview.length) lines.push('- (잡매칭 기록 없음, 상담내용 직접 확인)');
    lines.push('');
  });
  return lines.join('\n');
}
/**
 * 취업 및 취업준비현황 파악(응답) 스프레드시트에서 이번 주 새로 들어온 취업 응답을 찾고,
 * 개인_상담일지 > '구미캠퍼스 교육생' 탭에 이미 반영되어 있는지 대조한다.
 */

function isEmployedStatus_(statusText) {
  const s = String(statusText || '');
  return CONFIG.EMPLOYED_STATUS_KEYWORDS.some(function (kw) {
    return s.indexOf(kw) >= 0;
  });
}

// 내가 담당하는 캠퍼스/기수의 취업 응답 전체 목록.
// 일부러 '이번 주' 기간으로 좁히지 않는다 - 이미 보고했는지 여부는 날짜 구간이 아니라
// '구미캠퍼스 교육생' 탭 비고란의 "8/11(화) 보고" 메모(= 실제로 보고서에 넣은 시점)로 판단한다.
// 그래야 주간 실행일이 월/화로 흔들려도, 혹은 특정 주에 깜빡 누락돼도 중복·누락 없이 처리된다.
function collectSurveyHires_() {
  return getSurveyRows_()
    .filter(function (row) {
      const campus = row[SURVEY_COL.CAMPUS - 1];
      const cohort = row[SURVEY_COL.COHORT - 1];
      const status = row[SURVEY_COL.STATUS - 1];
      return (
        CONFIG.MY_CAMPUSES.indexOf(campus) >= 0 &&
        CONFIG.MY_COHORTS.indexOf(cohort) >= 0 &&
        isEmployedStatus_(status)
      );
    })
    .map(function (row) {
      return {
        timestamp: row[SURVEY_COL.TIMESTAMP - 1],
        cohort: row[SURVEY_COL.COHORT - 1],
        klass: row[SURVEY_COL.CLASS - 1],
        name: row[SURVEY_COL.NAME - 1],
        company: row[SURVEY_COL.COMPANY - 1],
        startDate: parseKoreanDate_(row[SURVEY_COL.START_DATE - 1]),
        dept: row[SURVEY_COL.DEPT - 1],
        jobType: row[SURVEY_COL.JOB_TYPE - 1],
        jobDetail: row[SURVEY_COL.JOB_DETAIL - 1],
        route: row[SURVEY_COL.ROUTE - 1],
      };
    });
}

// 구미캠퍼스 교육생 탭을 (기수, 이름) 키로 색인화. 동명이인은 배열로 보관.
function buildRosterIndex_() {
  const rows = getRosterRows_();
  const index = {};
  rows.forEach(function (row, i) {
    const name = row[ROSTER_COL.NAME - 1];
    const cohort = row[ROSTER_COL.COHORT - 1];
    if (!name || !cohort) return;
    const key = cohort + '|' + String(name).trim();
    if (!index[key]) index[key] = [];
    index[key].push({ rowNumber: CONFIG.ROSTER_DATA_START_ROW + i, row: row });
  });
  return index;
}

// 취업 응답과 명단을 대조해 '이미 반영됨 / 신규 반영 필요 / 명단에서 못 찾음'으로 분류
function detectNewHires() {
  const hires = collectSurveyHires_();
  const rosterIndex = buildRosterIndex_();

  return hires.map(function (hire) {
    const key = hire.cohort + '|' + String(hire.name).trim();
    const matches = rosterIndex[key] || [];
    let result = { hire: hire, status: 'NOT_FOUND', match: null };

    if (matches.length === 1) {
      const m = matches[0];
      const note = m.row[ROSTER_COL.NOTE - 1];
      const reportedDate = parseLatestReportedDate_(note);
      // 비고란에 "OO(화) 보고" 메모가 있고 그 시점이 응답 제출일 이후면, 이미 그 주 보고에 반영된 건으로 본다.
      const coveredByReportNote = !!(reportedDate && hire.timestamp && hire.timestamp <= reportedDate);
      const companyMatches =
        m.row[ROSTER_COL.STATUS - 1] === '취업완료' &&
        String(m.row[ROSTER_COL.COMPANY - 1] || '').trim() === String(hire.company || '').trim();
      result.status = coveredByReportNote || companyMatches ? 'ALREADY_RECORDED' : 'NEEDS_UPDATE';
      result.match = m;
    } else if (matches.length > 1) {
      result.status = 'AMBIGUOUS'; // 동명이인 - 반명 등으로 수동 확인 필요
      result.match = matches;
    }
    return result;
  });
}

// 보고서용 한 줄 문구 생성: 기업명(부서/직무)_이름(기수N반)_취업일자 (컨설턴트명) 취업설문(완료/예정)
function formatNewHireLine_(hire) {
  const isCurrentStudent = CONFIG.CURRENT_STUDENT_COHORTS.indexOf(hire.cohort) >= 0;
  const dateStr = hire.startDate ? formatDateYMD_(hire.startDate).slice(2) : '(입사일 확인 필요)';
  const jobLabel = hire.jobDetail || hire.jobType || '';
  const base =
    hire.company + '(' + jobLabel + ')_' + hire.name + '(' + hire.cohort + (hire.klass ? hire.klass + '반' : '') + ')_' + dateStr + ' (' + CONFIG.CONSULTANT_NAME + ')';
  if (isCurrentStudent) return base; // 재학생은 취업설문 완료/예정 문구 생략
  const today = new Date();
  const surveyPhrase = hire.startDate && hire.startDate <= today ? '취업설문(완료)' : '취업설문(예정)';
  return base + ' ' + surveyPhrase;
}

// (3) 특이사항 [취업자] 초안: 기수별로 그룹핑한 텍스트
function buildNewHiresDraftText() {
  const detections = detectNewHires();
  const byCohort = {};
  const followUps = [];

  detections.forEach(function (d) {
    const cohort = d.hire.cohort;
    if (!byCohort[cohort]) byCohort[cohort] = [];
    if (d.status === 'ALREADY_RECORDED') return; // 이미 명단에 반영된 건은 보고서 초안에서 제외

    let line = '- ' + formatNewHireLine_(d.hire);
    if (d.status === 'AMBIGUOUS') {
      line += '  ⚠ 동명이인 ' + d.match.length + '명 - 반 번호로 직접 확인 필요';
      followUps.push(d);
    } else if (d.status === 'NOT_FOUND') {
      line += '  ⚠ 구미캠퍼스 교육생 탭에서 이름을 못 찾음 - 신규 행 직접 추가 필요';
      followUps.push(d);
    }
    byCohort[cohort].push(line);
  });

  const cohorts = Object.keys(byCohort).sort(cohortSortFn_);
  const lines = [];
  cohorts.forEach(function (c) {
    if (byCohort[c].length === 0) return;
    lines.push('[' + c + ' 취업자]');
    byCohort[c].forEach(function (l) {
      lines.push(l);
    });
    lines.push('');
  });
  if (lines.length === 0) lines.push('(이번 주 신규 취업 응답 없음)');
  return { text: lines.join('\n'), detections: detections, followUpCount: followUps.length };
}

// 검토 후 확정된 건만 '구미캠퍼스 교육생' 탭에 반영 (NEEDS_UPDATE 상태인 건만 갱신, 새 행 생성은 하지 않음)
// 비고란에는 실제 수기로 적던 것과 같은 "8/11(화) 보고" 형식으로 기록해서, 다음 실행 때 이 기록으로 중복을 걸러낸다.
function applyConfirmedHiresToRoster() {
  const detections = detectNewHires();
  const sheet = getRosterSheet_();
  const reportedTag = formatKoreanShortDateWithWeekday_(new Date()) + ' 보고';
  let updated = 0;

  detections.forEach(function (d) {
    if (d.status !== 'NEEDS_UPDATE') return;
    const r = d.match.rowNumber;
    sheet.getRange(r, ROSTER_COL.STATUS).setValue('취업완료');
    sheet.getRange(r, ROSTER_COL.COMPANY).setValue(d.hire.company);
    if (d.hire.startDate) sheet.getRange(r, ROSTER_COL.START_DATE).setValue(d.hire.startDate);
    const noteCell = sheet.getRange(r, ROSTER_COL.NOTE);
    const existingNote = noteCell.getValue();
    noteCell.setValue(existingNote ? existingNote + '\n' + reportedTag : reportedTag);
    updated++;
  });

  return updated;
}
/**
 * 각 파트를 조립해서 실제 메일에 붙여넣을 수 있는 주간보고 초안을 만든다.
 * 사람이 검토/보완해야 하는 부분은 명시적으로 표시한다.
 */

function getWeekNumber_(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
}

function buildWeeklyReportText_(start, end) {
  const summary = buildConsultationSummary(start, end);
  const summaryText = renderConsultationSummaryText(summary);
  const programDraft = buildProgramStatusDraft(start, end);
  const consultingDraft = buildConsultingHighlightsDraft(start, end);
  const hiresDraft = buildNewHiresDraftText();
  const weekNo = getWeekNumber_(end);

  const lines = [];
  lines.push('※ 아래는 자동 초안입니다. [자동] 표시가 없는 서술형 항목은 직접 검토/보완 후 발송하세요.');
  lines.push('');
  lines.push('(1) 상담 현황 *' + formatDateYMD_(start).slice(2) + '(화) ~ ' + formatDateYMD_(end).slice(2) + '(월) 상담 완료 기준 [자동집계]');
  lines.push(summaryText);
  lines.push('');
  lines.push('(2) 프로그램 현황 [부분 자동집계 - 주간채용알림/취업세미나는 직접 입력]');
  lines.push(programDraft);
  lines.push('');
  lines.push('(3) 특이 사항');
  lines.push('--- [컨설팅] 초안 (잡매칭 기록 기준, 문구 다듬기 필요) ---');
  lines.push(consultingDraft);
  lines.push('--- [취업자] 초안 (자동 대조: 취업설문 응답 vs 구미캠퍼스 교육생 탭 비고란의 "보고" 기록) ---');
  lines.push(hiresDraft.text);
  lines.push('');
  lines.push('(참고) ' + weekNo + '주차 / 대상 기간: ' + formatDateYMD_(start) + ' ~ ' + formatDateYMD_(end));
  if (hiresDraft.followUpCount > 0) {
    lines.push('⚠ 확인 필요한 취업자 ' + hiresDraft.followUpCount + '건이 있습니다. (동명이인 또는 명단 미확인)');
  }

  return lines.join('\n');
}

// 메인 함수: Google Doc으로 초안 생성 (매주 화요일 트리거로 실행)
function generateWeeklyReportDraft() {
  const range = getReportDateRange_(new Date());
  const text = buildWeeklyReportText_(range.start, range.end);

  const title = '주간업무보고 초안_' + formatDateYMD_(range.end);
  const doc = DocumentApp.create(title);
  doc.getBody().setText(text);
  doc.saveAndClose();

  if (CONFIG.REPORT_FOLDER_ID) {
    const file = DriveApp.getFileById(doc.getId());
    DriveApp.getFolderById(CONFIG.REPORT_FOLDER_ID).addFile(file);
    DriveApp.getRootFolder().removeFile(file);
  }

  return { docUrl: doc.getUrl(), text: text, range: range };
}

// 스프레드시트에서 바로 확인만 하고 싶을 때 (UI 알림으로 표시)
function previewWeeklyReportDraft() {
  const range = getReportDateRange_(new Date());
  const text = buildWeeklyReportText_(range.start, range.end);
  const ui = SpreadsheetApp.getUi();
  ui.alert(
    '주간보고 초안 미리보기 (' + formatDateYMD_(range.start) + ' ~ ' + formatDateYMD_(range.end) + ')',
    text.length > 1500 ? text.slice(0, 1500) + '\n... (전체 내용은 [초안 Doc 생성]으로 확인)' : text,
    ui.ButtonSet.OK
  );
}
/**
 * 개인_상담일지 스프레드시트를 열 때 커스텀 메뉴를 띄운다.
 * (이 스크립트를 개인_상담일지 스프레드시트에 바인딩했을 때만 동작)
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('주간보고 자동화')
    .addItem('이번 주 초안 미리보기', 'previewWeeklyReportDraft')
    .addItem('이번 주 초안 Google Doc으로 생성', 'generateWeeklyReportDraftUi')
    .addSeparator()
    .addItem('신규 취업자만 확인', 'previewNewHiresUi')
    .addItem('확인된 취업자 → 구미캠퍼스 교육생 탭에 반영', 'applyConfirmedHiresUi')
    .addSeparator()
    .addItem('매주 화요일 09:00 자동 실행 등록', 'createWeeklyTrigger')
    .addItem('자동 실행 해제', 'removeWeeklyTrigger')
    .addToUi();
}

function generateWeeklyReportDraftUi() {
  const result = generateWeeklyReportDraft();
  SpreadsheetApp.getUi().alert('초안 생성 완료', result.docUrl, SpreadsheetApp.getUi().ButtonSet.OK);
}

function previewNewHiresUi() {
  const draft = buildNewHiresDraftText();
  SpreadsheetApp.getUi().alert('신규 취업자 초안', draft.text, SpreadsheetApp.getUi().ButtonSet.OK);
}

function applyConfirmedHiresUi() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert(
    '구미캠퍼스 교육생 탭 반영',
    '아직 보고되지 않은 취업 확인 건 중, 명단에서 정확히 1명이 매칭된 건만 자동으로 반영합니다.\n' +
      '반영 시 비고란에 "오늘 날짜(요일) 보고"가 자동 기록되어 다음부터는 중복으로 잡히지 않습니다.\n' +
      '동명이인/명단 미발견 건은 반영되지 않으니 직접 확인해주세요.\n계속할까요?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;
  const updated = applyConfirmedHiresToRoster();
  ui.alert('반영 완료: ' + updated + '건');
}

function createWeeklyTrigger() {
  removeWeeklyTrigger_();
  ScriptApp.newTrigger('generateWeeklyReportDraft')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.TUESDAY)
    .atHour(9)
    .create();
  SpreadsheetApp.getUi().alert('매주 화요일 09:00에 초안이 자동 생성되도록 등록했습니다.');
}

function removeWeeklyTrigger_() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'generateWeeklyReportDraft') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function removeWeeklyTrigger() {
  removeWeeklyTrigger_();
  SpreadsheetApp.getUi().alert('자동 실행을 해제했습니다.');
}
