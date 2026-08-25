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
