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
const courseCsv = `id,name,term,year,credits,category,middle
1,建学の精神と人生,前期,1,2,基礎総合科目,総合教養,
2,宗教学,後期,1,2,基礎総合科目,総合教養
3,心理学,前期,1,2,基礎総合科目,総合教養
4,文学,前期,1,2,基礎総合科目,総合教養
5,情報倫理,後期,1,2,基礎総合科目,総合教養
6,法学,前期,1,2,基礎総合科目,総合教養
7,日本国憲法,後期,1,2,基礎総合科目,総合教養
8,社会学,後期,1,2,基礎総合科目,総合教養
9,政治学,後期,1,2,基礎総合科目,総合教養
10,経済学,前期,1,2,基礎総合科目,総合教養
11,日本事情,前期,1,2,基礎総合科目,総合教養
12,基礎数学,前期,1,2,基礎総合科目,総合教養
13,ウェルネス,前期,1,1,基礎総合科目,総合教養
14,スポーツ理論,前期,2,2,基礎総合科目,総合教養
15,ウェルネス理論,後期,2,2,基礎総合科目,総合教養
16,総合英語,前期,1,2,基礎総合科目,総合語学
17,英検中級・TOEIC基礎,後期,1,2,基礎総合科目,総合語学
18,英会話Basic I,前期,1,2,基礎総合科目,総合語学
19,英会話Basic II,後期,1,2,基礎総合科目,総合語学
20,英会話Advanced I,前期,2,2,基礎総合科目,総合語学
21,英会話Advanced II,後期,2,2,基礎総合科目,総合語学
22,初級中国語,前期,2,2,基礎総合科目,総合語学
23,中級中国語,後期,2,2,基礎総合科目,総合語学
24,初級韓国語,前期,2,2,基礎総合科目,総合語学
25,中級韓国語,後期,2,2,基礎総合科目,総合語学
26,日本語 I,前期,1,2,基礎総合科目,総合語学
27,日本語 II,後期,1,2,基礎総合科目,総合語学
28,日本語 III,前期,2,2,基礎総合科目,総合語学
29,日本語 IV,後期,2,2,基礎総合科目,総合語学
30,情報リテラシー演習 I,前期,1,2,基礎総合科目,実践力養成・キャリア開発
31,情報リテラシー演習 II,後期,1,2,基礎総合科目,実践力養成・キャリア開発
32,スタディスキル,前期,1,2,基礎総合科目,実践力養成・キャリア開発
33,ラーニングリテラシー,前期,1,1,基礎総合科目,実践力養成・キャリア開発
34,キャリアデザイン I,前期,1,2,基礎総合科目,実践力養成・キャリア開発
35,キャリアデザイン II,後期,1,2,基礎総合科目,実践力養成・キャリア開発
36,インターンシップ実習,通年期,1-4,2,基礎総合科目,実践力養成・キャリア開発
37,キャリアデザイン III,前期,2,2,基礎総合科目,実践力養成・キャリア開発
38,キャリアデザイン IV,後期,2,2,基礎総合科目,実践力養成・キャリア開発
39,キャリアデザイン V,前期,3,2,基礎総合科目,実践力養成・キャリア開発
40,キャリアデザイン VI,後期,3,2,基礎総合科目,実践力養成・キャリア開発
41,情報学入門,前期,1,2,専門教育科目,専門基礎
42,情報数学 I,後期,1,2,専門教育科目,専門基礎
43,情報ネットワーク入門,後期,1,2,専門教育科目,専門基礎
44,コンピュータ実務演習 I,前期,1,2,専門教育科目,専門基礎
45,コンピュータ実務演習 II,後期,1,2,専門教育科目,専門基礎
46,統計学入門,前期,2,2,専門教育科目,専門基礎
47,情報セキュリティ,前期,3,2,専門教育科目,専門基礎
48,情報システムの開発と管理,前期,3,2,専門教育科目,専門基礎
49,マルチメディア論,前期,3,2,専門教育科目,専門基礎
50,経営学総論 I,前期,1,2,専門教育科目,専門基礎
51,簿記 I,前期,1,2,専門教育科目,専門基礎
52,簿記 II,後期,1,2,専門教育科目,専門基礎
53,マネージメント科学,前期,2,2,専門教育科目,専門基礎
54,ビジネス実務,前期,2,2,専門教育科目,専門基礎
55,民事法,前期,2,2,専門教育科目,専門基礎
56,経営情報学 I,前期,2,2,専門教育科目,専門基礎
57,経営情報学 II,後期,3,2,専門教育科目,専門基礎
58,計算機システム論,後期,1,2,専門教育科目,専門発展
59,プログラミング初歩 I,前期,1,2,専門教育科目,専門発展
60,プログラミング初歩 II,後期,1,2,専門教育科目,専門発展
61,プログラミング実践 I,前期,2,4,専門教育科目,専門発展
62,プログラミング実践 II,後期,2,4,専門教育科目,専門発展
63,ゲームプログラミング,前期,2,2,専門教育科目,専門発展
64,eスポーツ概論,後期,2,2,専門教育科目,専門発展
65,情報処理技術演習 I,前期,2,2,専門教育科目,専門発展
66,情報処理技術演習 II,後期,2,2,専門教育科目,専門発展
67,アルゴリズムとデータ構造,前期,2,2,専門教育科目,専門発展
68,情報数学 II,前期,2,2,専門教育科目,専門発展
69,データベース論,前期,2,2,専門教育科目,専門発展
70,オペレーティングシステム論,後期,2,2,専門教育科目,専門発展
71,計測・制御論,後期,3,2,専門教育科目,専門発展
72,モバイルネットワーク,前期,3,2,専門教育科目,専門発展
73,情報処理技術演習 III,前期,3,2,専門教育科目,専門発展
74,情報処理技術演習 IV,後期,3,2,専門教育科目,専門発展
75,会計学,前期,1,2,専門教育科目,専門発展
76,コマース論,前期,2,2,専門教育科目,専門発展
77,経営組織論,後期,2,2,専門教育科目,専門発展
78,コンピュータ会計,後期,2,2,専門教育科目,専門発展
79,知的財産権,前期,3,2,専門教育科目,専門発展
80,Webデザイン,後期,1,2,専門教育科目,専門応用
81,スイッチング技術,前期,2,2,専門教育科目,専門応用
82,ルーティング技術,後期,2,2,専門教育科目,専門応用
83,SNS活用と問題解決,後期,2,2,専門教育科目,専門応用
84,デジタルビジネス論,後期,2,2,専門教育科目,専門応用
85,Webシステム,前期,2,2,専門教育科目,専門応用
86,Webプログラミング I,後期,2,2,専門教育科目,専門応用
87,Webプログラミング II,前期,3,2,専門教育科目,専門応用
88,Webプログラミング III,後期,3,2,専門教育科目,専門応用
89,ネットワークアプリケーション構築,通年期,3,4,専門教育科目,専門応用
90,インターネット技術,前期,3,2,専門教育科目,専門応用
91,マーケティング論,前期,1,2,専門教育科目,専門応用
92,消費者行動論,後期,1,2,専門教育科目,専門応用
93,経営分析,前期,2,2,専門教育科目,専門応用
94,統計学,後期,2,2,専門教育科目,専門応用
95,ビジネスプログラミング,前期,2,2,専門教育科目,専門応用
96,多変量解析,前期,3,2,専門教育科目,専門応用
97,データ解析,後期,3,2,専門教育科目,専門応用
98,データモデリング,後期,3,2,専門教育科目,専門応用
99,統計プログラミング,後期,3,2,専門教育科目,専門応用
100,機械学習,後期,3,2,専門教育科目,専門応用
101,人工知能,後期,3,2,専門教育科目,専門応用
102,英検上級 I・TOEIC応用 I,前期,2,2,専門教育科目,専門応用
103,英検上級 II・TOEIC応用 II,後期,2,2,専門教育科目,専門応用
104,ビジネス英語,後期,3,2,専門教育科目,専門応用
105,プレゼミ I,前期,1,2,専門教育科目,演習
106,プレゼミ II,後期,1,2,専門教育科目,演習
107,基礎ゼミ,通年,2,4,専門教育科目,演習
108,情報学基礎演習,通年,2,4,専門教育科目,演習
109,専門ゼミ I,通年,3,4,専門教育科目,演習
110,情報学専門演習 I,通年,3,4,専門教育科目,演習
111,専門ゼミ II,通年,4,4,専門教育科目,演習
112,情報学専門演習 II,通年,4,4,専門教育科目,演習
113,スポーツ,後期,1,1,基礎総合科目,総合教養
`;
// id,name,term,year,credits,category,middle

// SAMPLE ONLY: replace with the actual institutional mapping.
const certCsv = `cert_id,cert_name,course_id
FE,基本情報技術者,60
FE,基本情報技術者,61
FE,基本情報技術者,62
FE,基本情報技術者,67
FE,基本情報技術者,70
FE,基本情報技術者,73
FE,基本情報技術者,74
AP,応用情報技術者,2
`;

// console.log(
//   SELECT(courseDb, "id", "name")
//     .filter(e=>[
//       "オペレーティングシステム論",
//       "プログラミング実践 I",
//       "プログラミング実践 II",
//       "計算機システム論",
//       "アルゴリズムとデータ構造",
//       "情報処理技術演習 III",
//       "情報処理技術演習 IV"
//     ].includes(e[1]))
//     .map(e=>e[0])
//     .map(e=>"FE,基本情報技術者,"+e)
//     .join("\n")
// );

const creditsListCsv = `credit_name,credit_id,credit_limit
総修得,total_completed,124
基礎総合,basic_completed,40
総合教養,generalEducation_completed,12
総合語学,language_completed,6
実践力養成・キャリア開発,careerAndSkills_completed,12
専門教育科目,specialized_completed,84
専門基礎,specialized_basic_completed,20
専門発展,specialized_advanced_completed,14
専門応用,specialized_applied_completed,24
履修中,in_progress_count,0
`;
/*総修得,total-completed,124
基礎総合,basic-completed,40
総合教養,generalEducation-completed,12
総合語学,language-completed,6
実践力養成・キャリア開発,careerAndSkills-completed,12
専門教育科目,specialized-completed,84
専門基礎,specialized_basic-completed,20
専門発展,specialized_advanced-completed,14
専門応用,specialized_applied-completed,24
履修中,in-progress-count,0
*/

// const courseDb = csvToMap(courseCsv, 'id', { credits: Number });
const courseDb = csvToMap(courseCsv, 'id', { year: Number, credits: Number });

const certificationDb = csvToGroupedMap(certCsv, 'cert_id', { course_id: String });

const creditsSummaryDb = csvToMap(creditsListCsv, 'credit_id', { credit_limit: Number });

const middleSet = new Set(SELECT(courseDb, "middle").flat());

// ---------------------------------------------------------------------------
// SELECT 再現
// ---------------------------------------------------------------------------
function SELECT(DB, ...columns) {
  return [...DB.values()].map(e=>columns.map(column => e[column]))
}

// DBのcolumnがequalsを含むレコードを返す
function WHEREcreditsList(equals) {
  return creditsListCsv.split("\n").map(e=>e.split(",")).find(e=>e.includes(equals))
}


// ---------------------------------------------------------------------------
// User state
// ---------------------------------------------------------------------------
const STATE_ORDER = ['unselected', 'in-progress', 'completed'];
let userState = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

    return new Map(
      Object.entries(saved)
        .map(([id, state]) => [String(id), state])
    );
  } catch (error) {
    console.warn('Failed to load user state; starting empty.', error);

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
      const courseId = String(element.dataset.courseId);

      const course = courseDb.get(courseId);

      if (!course) {
        element.classList.add('data-error');
        element.textContent = `未登録ID: ${courseId}`;
        return;
      }

      element.replaceChildren(
        create("span", course.name,        {classList: "course-name"}),
        create("span", `(${course.term})`, {classList: "course-term"}),
        create("span", course.credits ? `${course.credits}` : '', {classList: "course-credits"}),
      )

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
          if (event.key === 'Enter' || event.key === ' ') {
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
      const id = String(element.dataset.courseId);

      const status = getStatus(id);

      element.classList.remove(
        'status-in-progress',
        'status-completed',
        'status-planned'
      );

      if (status === 'in-progress') {
        element.classList.add('status-in-progress');
      }

      if (status === 'completed') {
        element.classList.add('status-completed');
      }

      // Planned is available as a class for future UI use,
      // but not used in the 3-step click cycle.
      if (status === 'planned') {
        element.classList.add('status-planned');
      }

      element.dataset.status = status;
    });
}

// ---------------------------------------------------------------------------
// Certification JOIN-like lookup
// ---------------------------------------------------------------------------
function getCertificationCourses(certId) {
  return new Set(
    (certificationDb.get(certId) || []).map(row => row.course_id)
  );
}

function applyCertificationHighlight(certId) {
  const ids = getCertificationCourses(certId);

  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      const id = String(element.dataset.courseId);

      element.classList.toggle('cert-highlight', ids.has(id));
    });
}

function populateCertificationSelect() {
  const select = document.querySelector('#cert-select');

  for (const [certId, rows] of certificationDb) {
    const option = document.createElement('option');

    option.value = certId;

    option.textContent =
      rows[0]?.cert_name
        ? `${rows[0].cert_name} (${certId})`
        : certId;

    select.append(option);
  }

  select.addEventListener(
    'change',
    event => applyCertificationHighlight(event.target.value)
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
function initializeSummary() {
  const parent = document.querySelector(".summary-grid");

  creditsSummaryDb.forEach(e => {
    const credit_id = e["credit_id"];
    const credit_name = e["credit_name"]
    const credit_limit = e["credit_limit"];

    const div = create("div", null, {classList: "summary-card", id: credit_id});

    const span = create("span", credit_name);
    const values = create("div", [
      create("strong", "0", {id: credit_id}),
      credit_limit ? ` / ${credit_limit}` : " 科目"
    ]);
    const progressDiff = create("span", [
      create("progress", null, {max: credit_limit, value: 0}),
      create("span", null, { classList: "diff" }),
    ]);

    div.append(span);
    div.append(values);
    if(credit_id != "in_progress_count") div.append(progressDiff);

    parent.append(div);
  })
}

function sumCompleted(panelSelector) {
  let sum = 0;

  document.querySelectorAll(`${panelSelector} .course[data-course-id]`)
    .forEach(element => {
      if (getStatus(String(element.dataset.courseId)) !== 'completed') return;

      const course = courseDb.get(String(element.dataset.courseId));

      sum += course?.credits || 0;
    });

  return sum;
}

// 中分類 => 中分類の取得単位の合計
/*
<中分類>の講義id達を取得し、userStateから検索し、completedのみをfilterし、合計する
総合教養の講義idを取得
  SELECT(courseDb, "id", "middle").filter(([id, middle]) => middle == "総合教養").flatMap(([id, middle]) => id)
userStateから検索し、completedのみをfilterし、
  getStatus("3") == "completed"
  new Set(userState.keys()).has("3")


*/
/*['total-completed']
['basic-completed']
['generalEducation-completed']
['language-completed']
['careerAndSkills-completed']
['specialized-completed']
['specialized_basic-completed']
['specialized_advanced-completed']
['specialized_applied-completed']
['in-progress-count']
*/
function sumCompleted2(middle) {
console.log(middle)

  // const middleName = WHEREcreditsList(middle[0])[0];
  const middleName = WHEREcreditsList(middle)[0];

// middle(総合教養)の講義idを取得
  const middlesID = SELECT(courseDb, "id", "middle")
    .filter(([id, m]) => m == middleName)// middleName == 総合教養
    .flatMap(([id, m]) => id);
// console.log(middlesID)
// userStateから検索し、completedのみをfilterし、
  // const completedSet = new Set(userState.keys())
  // completedのidのみ取得
  const completed = middlesID.filter(id => getStatus(id) == "completed");
  const credits = SELECT(courseDb, "id", "credits")
    .filter(([id, c]) => completed.includes(id))
    .flatMap(([id, c]) => c)

  const sum = credits.reduce((c, a) => c + a, 0);
console.log(middle, credits, sum)
  return sum;
}

function countInProgress() {
  let count = 0;

  document
    .querySelectorAll('.course[data-course-id]')
    .forEach(element => {
      if (getStatus(String(element.dataset.courseId)) === 'in-progress') count++;
    });

  return count;
}

function updateSummary() {
  const idAndMiddle = SELECT(courseDb, "id", "middle");
// console.log(idAndMiddle)

  const summarys = SELECT(creditsSummaryDb, "credit_id");
console.log(summarys)

  // summarys.forEach(e=>{
  // // middleSet.forEach(e=>console.log(e))
  //   const completedCredits = sumCompleted2(e);
  //   $(`#${e}`).textContent = completedCredits;
  // })

  const generalEducation     = sumCompleted2("generalEducation_completed");
  const language             = sumCompleted2("language_completed");
  const careerAndSkills      = sumCompleted2("careerAndSkills_completed");

  const specialized_basic    = sumCompleted2("specialized_basic_completed");
  const specialized_advanced = sumCompleted2("specialized_advanced_completed");
  const specialized_applied  = sumCompleted2("specialized_applied_completed");

  // const in_progress_count    = sumCompleted2("in_progress_count");
  const in_progress_count    = countInProgress();

  const basic       = generalEducation + language + careerAndSkills;
  const specialized = specialized_basic + specialized_advanced + specialized_applied;

  const total = basic + specialized;

  // ----> value <----
  $("#generalEducation_completed strong").textContent = generalEducation;
  $("#language_completed strong").textContent         = language;
  $("#careerAndSkills_completed strong").textContent  = careerAndSkills;

  $("#specialized_basic_completed strong").textContent    = specialized_basic;
  $("#specialized_advanced_completed strong").textContent = specialized_advanced;
  $("#specialized_applied_completed strong").textContent  = specialized_applied;

  $("#in_progress_count strong").textContent = in_progress_count;

  $("#basic_completed strong").textContent       = basic;
  $("#specialized_completed strong").textContent = specialized;

  $("#total_completed strong").textContent = total;

  // ----> progress <----
  $("#generalEducation_completed progress").value = generalEducation;
  $("#language_completed progress").value         = language;
  $("#careerAndSkills_completed progress").value  = careerAndSkills;

  $("#specialized_basic_completed progress").value    = specialized_basic;
  $("#specialized_advanced_completed progress").value = specialized_advanced;
  $("#specialized_applied_completed progress").value  = specialized_applied;

  // $("#in_progress_count progress").value = in_progress_count;

  $("#basic_completed progress").value       = basic;
  $("#specialized_completed progress").value = specialized;

  $("#total_completed progress").value = total;

  // ----> diff <----
  const limitList = SELECT(creditsSummaryDb, "credit_id", "credit_limit")

  $("#generalEducation_completed .diff").textContent = generalEducation - limitList.find(e=>e[0]=="generalEducation_completed")[1];
  $("#language_completed .diff").textContent         = language - limitList.find(e=>e[0]=="language_completed")[1];
  $("#careerAndSkills_completed .diff").textContent  = careerAndSkills - limitList.find(e=>e[0]=="careerAndSkills_completed")[1];

  $("#specialized_basic_completed .diff").textContent    = specialized_basic - limitList.find(e=>e[0]=="specialized_basic_completed")[1];
  $("#specialized_advanced_completed .diff").textContent = specialized_advanced - limitList.find(e=>e[0]=="specialized_advanced_completed")[1];
  $("#specialized_applied_completed .diff").textContent  = specialized_applied - limitList.find(e=>e[0]=="specialized_applied_completed")[1];

  // $("#in_progress_count .diff").textContent = in_progress_count - limitList.find(e=>e[0]=="in_progress_count")[1];

  $("#basic_completed .diff").textContent       = basic - limitList.find(e=>e[0]=="basic_completed")[1];
  $("#specialized_completed .diff").textContent = specialized - limitList.find(e=>e[0]=="specialized_completed")[1];

  $("#total_completed .diff").textContent = total - limitList.find(e=>e[0]=="total_completed")[1];

  return;

  // const basic       = sumCompleted('#basic-curriculum');
  // const specialized = sumCompleted('#specialized-curriculum');

  // const total = basic + specialized;

  // $('#basic-completed').textContent = `${basic} / 40`;

  // document.querySelector('#specialized-completed').textContent = `${specialized} / 84`;
  // document.querySelector('#total-completed').textContent = `${total} / 124`;
  // document.querySelector('#in-progress-count').textContent = `${countInProgress()}科目`;
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
    initializeSummary();
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