# Interview Lab — 주니어 백엔드 면접 대비

## 스크린샷 (배포본 https://tmdghks-dev.github.io/interview-lab/)
| 홈 | 학습 카드 | 모의면접 결과 |
|---|---|---|
| ![홈](tools/e2e/shots-live/1280-light-home.png) | ![학습](tools/e2e/shots-live/1280-light-study.png) | ![결과](tools/e2e/shots-live/1280-light-result.png) |

모바일(390px) · 다크: ![모바일 다크 학습](tools/e2e/shots-live/390-dark-study.png)

공유 미리보기는 `og.png`(1200×630, `node tools/og.js`로 재생성). 인쇄(Ctrl/Cmd+P)는 `css/app.css`의 `@media print`로 조작 UI를 숨깁니다.

## 앱 실행
- `index.html`을 브라우저로 열면 바로 동작(서버 불필요, `questions.js`로 데이터 로드). 로컬 서버: `python3 -m http.server`.
- 기능: 분야·난이도·상태 필터+검색 학습 카드(답안·키워드·꼬리질문·출처), 답변 메모, 3단계 자기평가, 모의면접(문항 수·시간·분야·약점 우선, 타이머, 시간 초과 시 자동 공개, 이어하기), 결과·복습 목록, 오늘 진행도·연속 학습, 라이트/다크 전환, 기록 초기화. 모든 기록은 localStorage(`il.v1`).
- 자동 점검: `cd tools/e2e && npm i && node e2e.js` (Chrome·playwright-core, 스크린샷은 `tools/e2e/shots/`). `node tools/build.js`는 `questions.json`과 `questions.js`를 함께 만든다.
- 배포: `index.html`·`css/`·`js/`·`questions.js`가 있는 이 폴더를 Pages 루트로.

## 실행·배포 (먼저 읽기)
```bash
node tools/validate.js   # data/*.json 검사 (개수·id·followups·source)
node tools/build.js      # data/*.json → questions.json 병합
node tools/validate.js   # 병합본까지 재확인
```
- 의존성 없음(Node 18+). 정적 파일이라 GitHub Pages로 배포: 저장소 Settings → Pages → 브랜치 루트 선택.
- 배포 전 반드시 `validate.js` 통과 확인. 새 분야는 `tools/config.js`에 한 줄 추가.

## 구성
| 파일 | 설명 |
|---|---|
| `data/{java,spring,jpa,sql}.json` | 각 25문항(공식 문서 `source` 포함, 꼬리질문 2개 이상) |
| `data/cs.json` | CS 30문항 (id `cs-NN`) |
| `data/behavior.json` | 인성 10문항 (id `beh-NN`, `source` 선택) |
| `questions.json` | build 산출물(직접 수정 금지) |
| `tools/config.js` | 분야별 문항 수·필수 여부 |
| `REVIEW.md` | 내용 검증 기록 틀 |

문항 스키마: `id, topic, level(하/중/상), question, answer, keywords[], source, followups[]`

## 한계
- 모범 답안은 **요약본**이며 면접관마다 기대 답이 다릅니다. 암기용이 아니라 이해 점검용입니다.
- 근거는 공식 문서 링크이나 버전(Spring 6.2, MySQL 8.4 등)이 바뀌면 달라질 수 있습니다.
- validate는 **형식**만 검사합니다. 내용 정확성은 REVIEW.md의 사람 검증으로 확인합니다.
