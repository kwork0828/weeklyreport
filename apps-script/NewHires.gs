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

// 이번 주(응답 제출일 기준) 내가 담당하는 캠퍼스/기수의 신규 취업 응답 목록
function collectWeeklySurveyHires_(start, end) {
  return getSurveyRows_()
    .filter(function (row) {
      const ts = row[SURVEY_COL.TIMESTAMP - 1];
      const campus = row[SURVEY_COL.CAMPUS - 1];
      const cohort = row[SURVEY_COL.COHORT - 1];
      const status = row[SURVEY_COL.STATUS - 1];
      return (
        isWithinRange_(ts, start, end) &&
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

// 신규 취업 응답과 명단을 대조해 '이미 반영됨 / 신규 반영 필요 / 명단에서 못 찾음'으로 분류
function detectNewHires(start, end) {
  const hires = collectWeeklySurveyHires_(start, end);
  const rosterIndex = buildRosterIndex_();

  return hires.map(function (hire) {
    const key = hire.cohort + '|' + String(hire.name).trim();
    const matches = rosterIndex[key] || [];
    let result = { hire: hire, status: 'NOT_FOUND', match: null };

    if (matches.length === 1) {
      const m = matches[0];
      const alreadyRecorded =
        m.row[ROSTER_COL.STATUS - 1] === '취업완료' &&
        String(m.row[ROSTER_COL.COMPANY - 1] || '').trim() === String(hire.company || '').trim();
      result.status = alreadyRecorded ? 'ALREADY_RECORDED' : 'NEEDS_UPDATE';
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
function buildNewHiresDraftText(start, end) {
  const detections = detectNewHires(start, end);
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
function applyConfirmedHiresToRoster(start, end) {
  const detections = detectNewHires(start, end);
  const sheet = getRosterSheet_();
  let updated = 0;

  detections.forEach(function (d) {
    if (d.status !== 'NEEDS_UPDATE') return;
    const r = d.match.rowNumber;
    sheet.getRange(r, ROSTER_COL.STATUS).setValue('취업완료');
    sheet.getRange(r, ROSTER_COL.COMPANY).setValue(d.hire.company);
    if (d.hire.startDate) sheet.getRange(r, ROSTER_COL.START_DATE).setValue(d.hire.startDate);
    const noteCell = sheet.getRange(r, ROSTER_COL.NOTE);
    const existingNote = noteCell.getValue();
    noteCell.setValue((existingNote ? existingNote + '\n' : '') + formatDateYMD_(new Date()) + ' 주간보고 자동화로 취업 반영');
    updated++;
  });

  return updated;
}
