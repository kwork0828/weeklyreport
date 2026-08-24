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
