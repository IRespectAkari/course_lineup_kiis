const $ = (q, d = document) => d.querySelector(q);
const $$ = (q, d = document) => Array.from(d.querySelectorAll(q));

/* Labelに入ったinputを生成
 * type   string inputのtype( text | checkbox | radio | ... )
 * txt    string label内文字列
 * option object 追加項目
 *   checked     boolean
 *   placeholder string
 *   display     string   css
 *   value       string   値
 *   event       object 
 *   eventType   string   イベント対象( click | change )
 *   eventFunc   function 関数
 */// input入りLabel生成(タイプ、文字列、追加項目)
function createInputLabel(type, child = null, options = {}) {
  const {
    id = null,
    classList = [],
    display = "",
    value = null,
    title = null,
    checked = false,
    placeholder = "",
    eventType = null,
    eventFunc = null,
    capture = null,
  } = options;

  const input = document.createElement("input");
  input.type = type;

  const label = create("label", [input, child].flat())
  // const label = document.createElement("label");
  // label.appendChild(input);
  // if (child) {
  //   if (Array.isArray(child)) {
  //     // child.forEach(e => label.appendChild(e));
  //     child.forEach(e => label.appendChild("string" != typeof e ? e : document.createTextNode(e)));
  //   } else {
  //     label.appendChild("string" != typeof child ? child : document.createTextNode(child));
  //   }
  // }
  // label.appendChild(document.createTextNode(txt));

  if (id) label.id = id;
  if (Array.isArray(classList) && classList.length > 0) label.classList.add(...classList);

  input.checked = checked;
  if (display) input.style.display = display;
  if (value) input.value = value;
  if (eventType && eventFunc) input.addEventListener(eventType, eventFunc, { capture: capture });
  if (placeholder) input.placeholder = placeholder;

  if (title) label.title = title;

  return label;
};

const debugState = { DEBUGMODE: false };
const dt = _=>debugState.DEBUGMODE = true;//  set True
const df = _=>debugState.DEBUGMODE = false;// set false
const gs = _=>debugState.DEBUGMODE;// get debugState
const pd = _=>console.log("DEBUGMODE:", DEBUGMODE);// print DEBUGMODE
const dp = (...args)=>{if(debugState.DEBUGMODE) console.log(args)};// debug print


// 子要素の追加
function addChild(parent, children) {
  if (!Array.isArray(children)) children = [children].flat(Infinity);

  children
    .filter(e => e !== null && e !== undefined)
    // .filter(e=>e)
    .forEach(e => {
      if ("string" === typeof e || 'number' === typeof e) {
        String(e).split("\n").forEach(E => parent.appendChild(document.createTextNode(E)));
      } else {
        parent.appendChild(e);
      }
    });
}

/* 要素作成
 * tagName string           タグ名
 * child   string | element 文字列または要素
 * option  object           追加項目
 *   id        string 設定するID
 *   classList Array  設定するクラスの配列
 * { event: { type: "click", func: func } }
 * { events: { click: func, mouseover: { func: func, capture: true } } }
 */// 要素作成(タグ名、子要素、追加項目)
function create(tagName = "div", children = [], options = {}) {
  const element = document.createElement(tagName);

  // 子要素の追加
  addChild(element, children);
  // if (!Array.isArray(children)) children = [children].flat(Infinity);
  // children
  //   .filter(e => e !== null && e !== undefined)
  //   // .filter(e=>e)
  //   .forEach(e => {
  //     if ("string" === typeof e || 'number' === typeof e) {
  //       String(e).split("\n").forEach(E => element.appendChild(document.createTextNode(E)));
  //     } else {
  //       element.appendChild(e);
  //     }
  //   });


  for (let [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) continue;
    // if (!value) continue;

    switch(key){
      case "className":// className: ""
      case "classList":// classList: [...]
        if (Array.isArray(value)) {
          element.classList.add(...value);
        }else {
          element.className = value;
        }
        break;

      case "event":// { type, func, capture }
        if (value.type && "function" === typeof value.func)
          element.addEventListener(value.type, value.func, value.capture ?? false);
        break;

      case "events":// 複数イベント { click: f, mouseover: { func: g, capture: true } }
        for (const [evType, evHandler] of Object.entries(value)) {
          if ("function" === typeof evHandler) {
            element.addEventListener(evType, evHandler);
          }else if ("object" === typeof evHandler && "function" === typeof evHandler.func) {
            // { func, capture } 形式
            element.addEventListener(evType, evHandler.func, evHandler.capture ?? false);
          }
        }
        break;

      case "style":// style: { color: "red", maxHeight: "100px" }
        if ("object" === typeof value) Object.assign(element.style, value);
        break;

      case "color":
      case "display":
      case "fontSize":
        element.style[key] = value;
        break;

      default:// 上記以外
        if(gs()) console.trace(key, value);
        try {
          element[key] = value;
        } catch (e) {}// 適用できないオプションは無視
    }
  }

  return element;
}

  // children.filter(e=>e).forEach(e => {
  //   if ("string" === typeof e) {
  //     e.split("\n").forEach(element.appendChild(document.createTextNode(e)))
  //   }else {
  //     element.appendChild(e)
  //   }
  // });

// elmのタグを生成し、elm内にtxtを T:innerText, H:innerHTML として記入
const createAndSetH = (tag, txt) => { var E = document.createElement(tag); E.innerHTML = txt; return E; };
const createInput = (type) => create("input", null, { type: type });

/* 引数のタグで囲うcreate関数を返す関数
 * example : Wrap("label") は e => create("label", e) を返す
 */
//使い方 .map(Wrap("label"))
function Wrap(tag, options = {}) {
  return e => create(tag, e, options);
}

// selector に当てはまる要素をすべて削除
function remove(selector) {
  // const element = ("string" == typeof selector ? $(selector) : selector);
  // element.parentNode.removeChild(element);

  const elements = ("string" == typeof selector) ? $$(selector) : selector;
  elements.map(e=>e.parentNode.removeChild(e));
}

// JSONオブジェクトでないかを判定（maybeJson != JSONオブジェクト ⇒ true を返す、maybeJson == JSONオブジェクト ⇒ false）
function isNotJson(maybeJson) {
  try {
    JSON.parse(maybeJson);
  } catch (error) {
    return true;
  }
  return false;
}

// range(5) ----------> [0, 1, 2, 3, 4]
// range(5, 1) -------> [1, 2, 3, 4, 5]
// range(5, 50, 50) --> [50, 100, 150, 200, 250]
function range(length, start = 0, step = 1) {
  return Array.from({length: length}, (_, i) => i * step + start);
}

// label { input[checkbox], span } を返す
function abstract_createLIS(txt, isInclude, func, labelOptions = {}) {
  const input = create("input", null, {
    type: "checkbox",
    value: txt,
    checked: isInclude,
    events: { change: func }
  });
  const span = create("span", txt);

  return create("label", [input, span], labelOptions);
}

// append(div, spanList)
// append("div#test", spanList)
function append(parent, children) {
  const Parent = typeof parent === "string" ? $(parent) : parent
  Parent.append(...[children].flat());
  // parent.append(...children);
}

// repeat()
function repeat(repeatElement, repeatCount) {
  return Array.from({length: repeatCount}, _=>repeatElement.cloneNode(true));
}

function peek(e) {
  console.trace(e);

  return e;
}

function getFragment(children) {
  const fragment = document.createDocumentFragment();
  fragment.append(...children);
  return fragment;
}

function skip(n) {
  return (e, i) => i >= n;
}

function addEvent(event, func) {
  return e => e.addEventListener(event, func);
}

// strToObj("color:red,width:100px") -> { color: "red", width: "100px" }
function strToObj(str, split1 = ",", split2 = ":") {
  return str.split(split1)
    .map(s => s.split(split2))
    .reduce((a, [k, v]) => Object.assign({ [k]: v }, a), {});
}


function getRadioChecked(name, formSelector) {
  return $(formSelector).elements[name].value;
}

// ジェネレータ関数
function* toggleGen(a, b) {
  while (true) {
    yield a;
    yield b;
  }
}

// 2次配列の転置処理（縦横入れ替え）
function transpose(arr) {
  return arr[0]
    .map((col, i) => arr.map((row) => row[i]));
}
