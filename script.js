const STORAGE_KEY = 'in-network-curriculum:user-state:v1';

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------
// Quotes, escaped quotes, CRLF/LF, and empty fields are supported.
function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  csv = csv.replace(/^\uFEFF/, '');

  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\r') {
      // Ignore CR in CRLF; a bare CR is treated as a line break below.
      if (next !== '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      }
    } else {
      field += ch;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(v => v !== ''));
}

function csvToMap(csv, keyName, convert = {}) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return new Map();

  const headers = rows[0];
  const keyIndex = headers.indexOf(keyName);
  if (keyIndex === -1) throw new Error(`CSV key not found: ${keyName}`);

  const map = new Map();

  for (const values of rows.slice(1)) {
    const record = Object.fromEntries(
      headers.map((header, i) => [header, values[i] ?? ''])
    );

    for (const [field, fn] of Object.entries(convert)) {
      record[field] = fn(record[field]);
    }

    const key = record[keyName];

    if (map.has(key)) {
      throw new Error(`Duplicate key in CSV: ${key}`);
    }

    map.set(key, record);
  }

  return map;
}

function csvToGroupedMap(csv, keyName, convert = {}) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return new Map();

  const headers = rows[0];

  if (!headers.includes(keyName)) {
    throw new Error(`CSV key not found: ${keyName}`);
  }

  const map = new Map();

  for (const values of rows.slice(1)) {
    const record = Object.fromEntries(
      headers.map((header, i) => [header, values[i] ?? ''])
    );

    for (const [field, fn] of Object.entries(convert)) {
      record[field] = fn(record[field]);
    }

    const key = record[keyName];

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key).push(record);
  }

  return map;
}

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------
// Human-managed source. Keep IDs stable and never reuse a removed ID.
const courseCsv = `id,name,term,year,credits,category
1,建学の精神と人生,前期,1,2,基礎総合科目
2,宗教学,後期,1,2,基礎総合科目
3,心理学,前期,1,2,基礎総合科目
4,文学,前期,1,2,基礎総合科目
5,情報倫理,後期,1,2,基礎総合科目
6,法学,前期,1,2,基礎総合科目
7,日本国憲法,後期,1,2,基礎総合科目
8,社会学,後期,1,2,基礎総合科目
9,政治学,後期,1,2,基礎総合科目
10,経済学,前期,1,2,基礎総合科目
11,日本事情,前期,1,2,基礎総合科目
12,基礎数学,前期,1,2,基礎総合科目
13,ウェルネス,前期,1,1,基礎総合科目
14,スポーツ理論,前期,2,2,基礎総合科目
15,ウェルネス理論,後期,2,2,基礎総合科目
16,総合英語,前期,1,2,基礎総合科目
17,英検中級・TOEIC基礎,後期,1,2,基礎総合科目
18,英会話Basic I,前期,1,2,基礎総合科目
19,英会話Basic II,後期,1,2,基礎総合科目
20,英会話Advanced I,前期,2,2,基礎総合科目
21,英会話Advanced II,後期,2,2,基礎総合科目
22,初級中国語,前期,2,2,基礎総合科目
23,中級中国語,後期,2,2,基礎総合科目
24,初級韓国語,前期,2,2,基礎総合科目
25,中級韓国語,後期,2,2,基礎総合科目
26,日本語 I,前期,1,2,基礎総合科目
27,日本語 II,後期,1,2,基礎総合科目
28,日本語 III,前期,2,2,基礎総合科目
29,日本語 IV,後期,2,2,基礎総合科目
30,情報リテラシー演習 I,前期,1,2,基礎総合科目
31,情報リテラシー演習 II,後期,1,2,基礎総合科目
32,スタディスキル,前期,1,2,基礎総合科目
33,ラーニングリテラシー,前期,1,1,基礎総合科目
34,キャリアデザイン I,前期,1,2,基礎総合科目
35,キャリアデザイン II,後期,1,2,基礎総合科目
36,インターンシップ実習,通年,1-4,2,基礎総合科目
37,キャリアデザイン III,前期,2,2,基礎総合科目
38,キャリアデザイン IV,後期,2,2,基礎総合科目
39,キャリアデザイン V,前期,3,2,基礎総合科目
40,キャリアデザイン VI,後期,3,2,基礎総合科目
41,情報学入門,前期,1,2,専門教育科目
42,情報数学 I,後期,1,2,専門教育科目
43,情報ネットワーク入門,後期,1,2,専門教育科目
44,コンピュータ実務演習 I,前期,1,2,専門教育科目
45,コンピュータ実務演習 II,後期,1,2,専門教育科目
46,統計学入門,前期,2,2,専門教育科目
47,情報セキュリティ,前期,3,2,専門教育科目
48,情報システムの開発と管理,前期,3,2,専門教育科目
49,マルチメディア論,前期,3,2,専門教育科目
50,経営学総論 I,前期,1,2,専門教育科目
51,簿記 I,前期,1,2,専門教育科目
52,簿記 II,後期,1,2,専門教育科目
53,マネージメント科学,前期,2,2,専門教育科目
54,ビジネス実務,前期,2,2,専門教育科目
55,民事法,前期,2,2,専門教育科目
56,経営情報学 I,前期,2,2,専門教育科目
57,経営情報学 II,後期,3,2,専門教育科目
58,計算機システム論,後期,1,2,専門教育科目
59,プログラミング初歩 I,前期,1,2,専門教育科目
60,プログラミング初歩 II,後期,1,2,専門教育科目
61,プログラミング実践 I,前期,2,4,専門教育科目
62,プログラミング実践 II,後期,2,4,専門教育科目
63,ゲームプログラミング,前期,2,2,専門教育科目
64,eスポーツ概論,後期,2,2,専門教育科目
65,情報処理技術演習 I,前期,2,2,専門教育科目
66,情報処理技術演習 II,後期,2,2,専門教育科目
67,アルゴリズムとデータ構造,前期,2,2,専門教育科目
68,情報数学 II,前期,2,2,専門教育科目
69,データベース論,前期,2,2,専門教育科目
70,オペレーティングシステム論,後期,2,2,専門教育科目
71,計測・制御論,後期,3,2,専門教育科目
72,モバイルネットワーク,前期,3,2,専門教育科目
73,情報処理技術演習 III,前期,3,2,専門教育科目
74,情報処理技術演習 IV,後期,3,2,専門教育科目
75,会計学,前期,1,2,専門教育科目
76,コマース論,前期,2,2,専門教育科目
77,経営組織論,後期,2,2,専門教育科目
78,コンピュータ会計,後期,2,2,専門教育科目
79,知的財産権,前期,3,2,専門教育科目
80,Webデザイン,後期,1,2,専門教育科目
81,スイッチング技術,前期,2,2,専門教育科目
82,ルーティング技術,後期,2,2,専門教育科目
83,SNS活用と問題解決,後期,2,2,専門教育科目
84,デジタルビジネス論,後期,2,2,専門教育科目
85,Webシステム,前期,2,2,専門教育科目
86,Webプログラミング I,後期,2,2,専門教育科目
87,Webプログラミング II,前期,3,2,専門教育科目
88,Webプログラミング III,後期,3,2,専門教育科目
89,ネットワークアプリケーション構築,通年,3,4,専門教育科目
90,インターネット技術,前期,3,2,専門教育科目
91,マーケティング論,前期,1,2,専門教育科目
92,消費者行動論,後期,1,2,専門教育科目
93,経営分析,前期,2,2,専門教育科目
94,統計学,後期,2,2,専門教育科目
95,ビジネスプログラミング,前期,2,2,専門教育科目
96,多変量解析,前期,3,2,専門教育科目
97,データ解析,後期,3,2,専門教育科目
98,データモデリング,後期,3,2,専門教育科目
99,統計プログラミング,後期,3,2,専門教育科目
100,機械学習,後期,3,2,専門教育科目
101,人工知能,後期,3,2,専門教育科目
102,英検上級 I・TOEIC応用 I,前期,2,2,専門教育科目
103,英検上級 II・TOEIC応用 II,後期,2,2,専門教育科目
104,ビジネス英語,後期,3,2,専門教育科目
105,プレゼミ I,前期,1,2,専門教育科目
106,プレゼミ II,後期,1,2,専門教育科目
107,基礎ゼミ,通年,2,4,専門教育科目
108,情報学基礎演習,通年,2,4,専門教育科目
109,専門ゼミ I,通年,3,4,専門教育科目
110,情報学専門演習 I,通年,3,4,専門教育科目
111,専門ゼミ II,通年,4,4,専門教育科目
112,情報学専門演習 II,通年,4,4,専門教育科目
113,スポーツ,後期,1,1,基礎総合科目
`;

// SAMPLE ONLY: replace with the actual institutional mapping.
const certCsv = `cert_id,cert_name,course_id
FE,基本情報技術者,2
FE,基本情報技術者,3
AP,応用情報技術者,2`;

const courseDb = csvToMap(courseCsv, 'id', {
  credits: Number,
});

const certificationDb = csvToGroupedMap(certCsv, 'cert_id', {
  course_id: String,
});

// ---------------------------------------------------------------------------
// User state
// ---------------------------------------------------------------------------
const STATE_ORDER = ['unselected', 'in-progress', 'completed'];
let userState = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    return new Map(
      Object.entries(saved).map(([id, state]) => [
        String(id),
        state
      ])
    );
  } catch (error) {
    console.warn(
      'Failed to load user state; starting empty.',
      error
    );

    return new Map();
  }
}

function saveState() {
  const object = Object.fromEntries(userState.entries());
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(object)
  );
}

function getStatus(courseId) {
  return userState.get(courseId) || 'unselected';
}

function cycleStatus(courseId) {
  const current = getStatus(courseId);

  const next =
    STATE_ORDER[
      (STATE_ORDER.indexOf(current) + 1) %
      STATE_ORDER.length
    ];

  if (next === 'unselected') {
    userState.delete(courseId);
  } else {
    userState.set(courseId, next);
  }

  saveState();
  renderCourseStatuses();
  updateSummary();
}

// ---------------------------------------------------------------------------
// DOM initialization
// ---------------------------------------------------------------------------
function initializeCourses() {
  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      const courseId =
        String(element.dataset.courseId);

      const course =
        courseDb.get(courseId);

      if (!course) {
        element.classList.add('data-error');
        element.textContent =
          `未登録ID: ${courseId}`;
        return;
      }

      element.replaceChildren(
        Object.assign(
          document.createElement('span'),
          {
            className: 'course-name',
            textContent: course.name
          }
        ),
        Object.assign(
          document.createElement('span'),
          {
            className: 'course-term',
            textContent: `(${course.term})`
          }
        ),
        Object.assign(
          document.createElement('span'),
          {
            className: 'course-credits',
            textContent:
              course.credits
                ? `${course.credits}`
                // ? `${course.credits}単位`
                : ''
          }
        )
      );

      element.setAttribute(
        'aria-label',
        `${course.name} / ` +
        `${course.credits || 0}単位 / ` +
        `${course.term} / ` +
        `${course.year}年`
      );

      element.addEventListener(
        'click',
        () => cycleStatus(courseId)
      );

      element.addEventListener(
        'keydown',
        event => {
          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {
            event.preventDefault();
            cycleStatus(courseId);
          }
        }
      );
    });

  renderCourseStatuses();
}

function renderCourseStatuses() {
  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      const id =
        String(element.dataset.courseId);

      const status = getStatus(id);

      element.classList.remove(
        'status-in-progress',
        'status-completed',
        'status-planned'
      );

      if (status === 'in-progress') {
        element.classList.add(
          'status-in-progress'
        );
      }

      if (status === 'completed') {
        element.classList.add(
          'status-completed'
        );
      }

      // Planned is available as a class for future UI use,
      // but not used in the 3-step click cycle.
      if (status === 'planned') {
        element.classList.add(
          'status-planned'
        );
      }

      element.dataset.status = status;
    });
}

// ---------------------------------------------------------------------------
// Certification JOIN-like lookup
// ---------------------------------------------------------------------------
function getCertificationCourses(certId) {
  return new Set(
    (certificationDb.get(certId) || [])
      .map(row => row.course_id)
  );
}

function applyCertificationHighlight(certId) {
  const ids =
    getCertificationCourses(certId);

  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      const id =
        String(element.dataset.courseId);

      element.classList.toggle(
        'cert-highlight',
        ids.has(id)
      );
    });
}

function populateCertificationSelect() {
  const select =
    document.querySelector('#cert-select');

  for (const [certId, rows] of certificationDb) {
    const option =
      document.createElement('option');

    option.value = certId;

    option.textContent =
      rows[0]?.cert_name
        ? `${rows[0].cert_name} (${certId})`
        : certId;

    select.append(option);
  }

  select.addEventListener(
    'change',
    event =>
      applyCertificationHighlight(
        event.target.value
      )
  );

  document
    .querySelector('#clear-cert')
    .addEventListener(
      'click',
      () => {
        select.value = '';
        applyCertificationHighlight('');
      }
    );
}

// ---------------------------------------------------------------------------
// Credits / summary
// ---------------------------------------------------------------------------
function sumCompleted(panelSelector) {
  let sum = 0;

  document
    .querySelectorAll(
      `${panelSelector} .course[data-course-id]`
    )
    .forEach(element => {
      if (
        getStatus(
          String(element.dataset.courseId)
        ) !== 'completed'
      ) {
        return;
      }

      const course =
        courseDb.get(
          String(element.dataset.courseId)
        );

      sum += course?.credits || 0;
    });

  return sum;
}

function countInProgress() {
  let count = 0;

  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      if (
        getStatus(
          String(element.dataset.courseId)
        ) === 'in-progress'
      ) {
        count++;
      }
    });

  return count;
}

function updateSummary() {
  const basic =
    sumCompleted('#basic-curriculum');

  const specialized =
    sumCompleted('#specialized-curriculum');

  const total =
    basic + specialized;

  document.querySelector(
    '#basic-completed'
  ).textContent =
    `${basic} / 40`;

  document.querySelector(
    '#specialized-completed'
  ).textContent =
    `${specialized} / 84`;

  document.querySelector(
    '#total-completed'
  ).textContent =
    `${total} / 124`;

  document.querySelector(
    '#in-progress-count'
  ).textContent =
    `${countInProgress()}科目`;
}

function resetState() {
  if (
    !confirm(
      '履修状態をすべて未選択に戻しますか？'
    )
  ) {
    return;
  }

  userState.clear();
  saveState();
  renderCourseStatuses();
  updateSummary();
}

document.addEventListener(
  'DOMContentLoaded',
  () => {
    initializeCourses();
    populateCertificationSelect();

    document
      .querySelector('#reset-state')
      .addEventListener(
        'click',
        resetState
      );

    updateSummary();
  }
);