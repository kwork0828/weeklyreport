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
