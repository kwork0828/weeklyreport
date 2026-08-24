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
  const hiresDraft = buildNewHiresDraftText(start, end);
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
  lines.push('--- [취업자] 초안 (자동 대조: 취업설문 응답 vs 구미캠퍼스 교육생 탭) ---');
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
