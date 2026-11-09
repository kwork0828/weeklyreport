/**
 * '교육생_취업자명단' 탭을 직접 훑어서, 아직 주간보고에 반영 안 된(= 비고란에
 * "M/D(화) 보고" 마커가 없는) 취업자를 찾는다.
 *
 * 실제로 써보니 이게 정답이었다: '취업 및 취업준비현황 파악(응답)' 설문 시트와
 * 이번 주 날짜 구간으로 대조하는 방식은, 학생이 설문에 응답한 시점과 상담사가
 * 실제로 '보고'한 시점이 서로 다르게 어긋나는 경우(응답은 몇 주 전인데 아직
 * 마커가 안 찍힌 경우 등)를 놓친다. 마커가 없으면 무조건 후보로 잡는 쪽이
 * 더 안전하고, 실제 업무 흐름과도 일치한다.
 *
 * 교육생_취업자명단 탭 자동 수정은 하지 않는다 - 비고란의 "보고" 마커는
 * 본인이 보고서를 실제로 보낸 뒤 직접 기록한다 (이 스크립트는 읽기 전용).
 */

const ROSTER_EXCLUDED_COMPANIES = ['실습코치']; // 기업 취업이 아닌 placeholder 값

// 담당컨설=본인, 기업명 있음, '보고' 마커 없음 -> 전부 후보 (기간으로 좁히지 않음)
function collectUnreportedRosterHires_() {
  return getRosterRows_()
    .map(function (row, i) {
      return { rowNumber: CONFIG.ROSTER_DATA_START_ROW + i, row: row };
    })
    .filter(function (entry) {
      const row = entry.row;
      const consultant = row[ROSTER_COL.CONSULTANT - 1];
      const company = row[ROSTER_COL.COMPANY - 1];
      if (consultant !== CONFIG.CONSULTANT_NAME) return false;
      if (!company || ROSTER_EXCLUDED_COMPANIES.indexOf(company) >= 0) return false;
      const reportedDate = parseLatestReportedDate_(row[ROSTER_COL.NOTE - 1]);
      return !reportedDate;
    })
    .map(function (entry) {
      const row = entry.row;
      return {
        rowNumber: entry.rowNumber,
        name: row[ROSTER_COL.NAME - 1],
        cohort: row[ROSTER_COL.COHORT - 1],
        klass: row[ROSTER_COL.CLASS - 1],
        campus: row[ROSTER_COL.CAMPUS - 1],
        company: row[ROSTER_COL.COMPANY - 1],
        startDateRaw: row[ROSTER_COL.START_DATE - 1],
        startDate: parseKoreanDate_(row[ROSTER_COL.START_DATE - 1]),
        jobDetail: row[ROSTER_COL.JOB_DETAIL - 1],
        surveyStatus: row[ROSTER_COL.SURVEY_STATUS - 1],
        note: row[ROSTER_COL.NOTE - 1],
      };
    });
}

// 보고서용 한 줄 문구: 기업명(직무)_이름(기수N반)_입사일자 (컨설턴트명) 취업설문(완료/예정)
function formatNewHireLine_(hire) {
  const isCurrentStudent = CONFIG.CURRENT_STUDENT_COHORTS.indexOf(hire.cohort) >= 0;
  const dateStr = hire.startDate ? formatDateYMD_(hire.startDate).slice(2) : String(hire.startDateRaw || '(입사일 확인 필요)');
  const jobLabel = hire.jobDetail || '';
  const klassLabel = hire.klass ? Math.trunc(Number(hire.klass)) + '반' : '';
  const base = hire.company + '(' + jobLabel + ')_' + hire.name + '(' + hire.cohort + klassLabel + ')_' + dateStr + ' (' + CONFIG.CONSULTANT_NAME + ')';
  if (isCurrentStudent) return base; // 재학생(15·16기)은 취업설문 완료/예정 문구 생략

  const status = String(hire.surveyStatus || '');
  let phrase;
  if (status.indexOf('완료') >= 0) phrase = '취업설문(완료)';
  else if (status.indexOf('요청') >= 0 || status.indexOf('필요') >= 0) phrase = '취업설문(예정)';
  else {
    const today = new Date();
    phrase = hire.startDate && hire.startDate <= today ? '취업설문(완료)' : '취업설문(예정)';
  }
  return base + ' ' + phrase;
}

// (3) 특이사항 [취업자] 초안: 기수별로 그룹핑한 텍스트
function buildNewHiresDraftText() {
  const hires = collectUnreportedRosterHires_();
  const byCohort = {};
  const flagged = [];

  hires.forEach(function (hire) {
    const cohort = hire.cohort || '확인필요';
    if (!byCohort[cohort]) byCohort[cohort] = [];
    let line = '- ' + formatNewHireLine_(hire);
    if (hire.note) {
      line += '  ⚠ 비고: ' + String(hire.note).replace(/\n/g, ' ');
      flagged.push(hire);
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
  if (lines.length === 0) lines.push('(마커 없이 밀려있는 취업자 없음)');
  return { text: lines.join('\n'), hires: hires, flaggedCount: flagged.length };
}
