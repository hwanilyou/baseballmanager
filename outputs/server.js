const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 8766);
const ROOT = __dirname;
const SAVE_PATH = path.join(ROOT, "save.json");
const USERS_PATH = path.join(ROOT, "users.json");
const SAVES_DIR = path.join(ROOT, "saves");
const BOARD_PATH = path.join(ROOT, "board.json");
const DATA_IMPORT_PATH = path.join(ROOT, "data", "kbo_players.csv");
const DATA_SOURCE_URL_PATH = path.join(ROOT, "data", "source-url.txt");
const HAND_DATA_VERSION = "2026-06-26-bats-throws";
const DRAFT_DAY = 120;
const DRAFT_ROUNDS = 11;
const HS_DRAFT_POOL_SIZE = 120;
const ACTIVE_VISITOR_WINDOW_MS = 2 * 60 * 1000;
const activeVisitors = new Map();

fs.mkdirSync(SAVES_DIR, { recursive: true });

const teamTemplates = [
  { id: "daejeon-orange-eagles", city: "대전", name: "오렌지이글스", short: "오렌지", primary: "#f37321", secondary: "#1f2933", power: 68 },
  { id: "seoul-twin-stars", city: "서울", name: "트윈스타즈", short: "트윈", primary: "#c9162f", secondary: "#111827", power: 71 },
  { id: "busan-giant-waves", city: "부산", name: "자이언트웨이브스", short: "자이언트", primary: "#0f3b78", secondary: "#d43d2a", power: 69 },
  { id: "daegu-blue-lions", city: "대구", name: "블루라이온즈", short: "블루", primary: "#1e62ad", secondary: "#c8a24a", power: 67 },
  { id: "gwangju-tiger-kings", city: "광주", name: "타이거킹즈", short: "타이거", primary: "#d71920", secondary: "#101820", power: 72 },
  { id: "incheon-landing", city: "인천", name: "랜더스카이", short: "랜더", primary: "#c8102e", secondary: "#f4c430", power: 70 },
  { id: "changwon-dino-force", city: "창원", name: "다이노포스", short: "다이노", primary: "#2454a6", secondary: "#b5a36a", power: 66 },
  { id: "suwon-wizpark", city: "수원", name: "위즈파크", short: "위즈", primary: "#111111", secondary: "#e31b23", power: 65 },
  { id: "gocheok-heroes", city: "고척", name: "히어로즈나인", short: "히어로", primary: "#6f263d", secondary: "#c5a46d", power: 62 },
  { id: "jamsil-bears", city: "잠실", name: "베어스클럽", short: "베어스", primary: "#14213d", secondary: "#ffffff", power: 73 }
];

const playerSeeds = {
  "daejeon-orange-eagles": [
    ["노시훈", "3B", "BAT", 25, 80, 91, "거포 코어", 8], ["문동진", "SP", "PIT", 23, 79, 93, "파이어볼러", 1], ["김서훈", "RP", "PIT", 22, 68, 88, "강속구 원석", 54],
    ["채은준", "1B", "BAT", 36, 74, 74, "베테랑 해결사", 22], ["페라준", "RF", "BAT", 27, 76, 82, "외인 장타", 30], ["문현준", "2B", "BAT", 23, 69, 84, "내야 유망주", 64],
    ["하주민", "SS", "BAT", 32, 67, 70, "수비 경험", 16], ["최재민", "C", "BAT", 36, 66, 66, "안방 리더", 13], ["황영준", "LF", "BAT", 26, 64, 78, "근성형 타자", 95],
    ["류현민", "SP", "PIT", 37, 76, 76, "관록의 좌완", 99], ["장시준", "RP", "PIT", 38, 63, 63, "베테랑 불펜", 28], ["주현준", "CL", "PIT", 34, 75, 76, "마무리 카드", 55]
  ],
  "seoul-twin-stars": [
    ["김한수", "LF", "BAT", 38, 75, 75, "프랜차이즈 리더"], ["오지훈", "SS", "BAT", 36, 77, 77, "수비 사령관"], ["문보윤", "3B", "BAT", 26, 76, 85, "핫코너 코어"],
    ["홍찬기", "RF", "BAT", 33, 78, 80, "출루 장인"], ["박해준", "CF", "BAT", 36, 70, 70, "외야 수비"], ["임찬우", "SP", "PIT", 34, 74, 75, "토종 선발"],
    ["손주완", "SP", "PIT", 28, 72, 82, "좌완 성장주"], ["유영준", "CL", "PIT", 29, 76, 81, "끝판 불펜"], ["신민우", "2B", "BAT", 30, 68, 73, "기동력"],
    ["박도원", "C", "BAT", 36, 71, 71, "장타 포수"], ["오스먼", "1B", "BAT", 33, 81, 82, "외인 중심타자"], ["정우진", "RP", "PIT", 27, 69, 78, "사이드암"]
  ],
  "busan-giant-waves": [
    ["전준호", "LF", "BAT", 40, 74, 74, "주장"], ["윤도희", "RF", "BAT", 23, 71, 86, "차세대 외야수"], ["고승우", "2B", "BAT", 26, 70, 82, "좌타 코어"],
    ["나승윤", "1B", "BAT", 24, 68, 84, "장신 유망주"], ["손호준", "3B", "BAT", 31, 72, 76, "공격형 내야"], ["박세민", "SP", "PIT", 31, 78, 80, "안경 에이스"],
    ["나균호", "SP", "PIT", 28, 70, 78, "전환 선발"], ["김원준", "CL", "PIT", 33, 77, 78, "마무리"], ["유강준", "C", "BAT", 34, 66, 66, "프레이밍"],
    ["황성윤", "CF", "BAT", 29, 65, 73, "스피드"], ["정도훈", "DH", "BAT", 39, 67, 67, "대타 카드"], ["최준서", "RP", "PIT", 25, 71, 83, "강한 어깨"]
  ],
  "daegu-blue-lions": [
    ["구자민", "RF", "BAT", 33, 82, 84, "프랜차이즈 스타"], ["원태준", "SP", "PIT", 26, 81, 88, "국대 에이스"], ["강민재", "C", "BAT", 40, 72, 72, "베테랑 포수"],
    ["김지완", "2B", "BAT", 25, 72, 82, "출루와 주루"], ["이재윤", "SS", "BAT", 23, 70, 85, "차세대 유격수"], ["김영준", "3B", "BAT", 23, 68, 86, "좌타 장타"],
    ["오승준", "RP", "PIT", 43, 68, 68, "전설의 돌직구"], ["백정우", "SP", "PIT", 38, 68, 68, "좌완 베테랑"], ["맥키언", "1B", "BAT", 32, 73, 75, "외인 컨택"],
    ["이성준", "LF", "BAT", 32, 67, 72, "파워 백업"], ["김헌재", "CF", "BAT", 37, 64, 64, "수비 백업"], ["최지윤", "RP", "PIT", 28, 67, 76, "불펜 재건"]
  ],
  default: [
    ["강도윤", "CF", "BAT", 24, 73, 91, "5툴 유망주"], ["한서준", "SS", "BAT", 29, 79, 82, "수비 리더"], ["박민재", "1B", "BAT", 31, 76, 78, "장타 카드"],
    ["이준호", "RF", "BAT", 22, 66, 88, "고잠재 외야수"], ["최우진", "C", "BAT", 27, 71, 76, "투수 조련"], ["장현수", "3B", "BAT", 26, 70, 80, "꾸준함"],
    ["문시온", "LF", "BAT", 20, 58, 86, "원석"], ["윤태하", "2B", "BAT", 33, 68, 68, "베테랑"], ["서지후", "SP", "PIT", 25, 81, 90, "에이스 후보"],
    ["권라온", "SP", "PIT", 28, 75, 79, "땅볼 유도"], ["오지완", "RP", "PIT", 23, 69, 84, "강속구"], ["백태민", "CL", "PIT", 30, 77, 78, "마무리 경험"]
  ]
};

const nameMigration = {
  "노시환": "노시우", "문동주": "문도준", "김서현": "김서율", "채은성": "채윤성", "페라자": "페르난", "문현빈": "문하빈",
  "하주석": "하준석", "최재훈": "최재윤", "황영묵": "황영민", "류현준": "류현민", "장시환": "장시윤", "주현상": "주현민",
  "김현수": "김한수", "오지환": "오지훈", "문보경": "문보윤", "홍창기": "홍찬기", "박해민": "박해준", "임찬규": "임찬우",
  "손주영": "손주완", "유영찬": "유영준", "신민재": "신민우", "박동원": "박도원", "오스틴": "오스먼", "정우영": "정우진",
  "전준우": "전준호", "윤동희": "윤도희", "고승민": "고승우", "나승엽": "나승윤", "손호영": "손호준", "박세웅": "박세민",
  "나균안": "나균호", "김원중": "김원준", "유강남": "유강준", "황성빈": "황성윤", "정훈": "정도훈", "최준용": "최준서",
  "구자욱": "구자민", "원태인": "원태준", "강민호": "강민재", "김지찬": "김지완", "이재현": "이재윤", "김영웅": "김영준",
  "오승환": "오승준", "백정현": "백정우", "맥키넌": "맥키언", "이성규": "이성준", "김헌곤": "김헌재", "최지광": "최지윤"
};

const FIELD_POSITIONS = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

const publicAliasSyllables = ["준","민","훈","윤","현","율","성","진","우","원","호","빈","재","겸","서","안","도","혁","형","찬","수","욱","태","영"];
const koreanSurnames = new Set([... "김이박최정강조윤장임한오서신권황안송전홍유고문양손배조백허남심노하곽성차주우구민류나진지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국"]);

function hashText(text) {
  let h = 0;
  for (const ch of String(text || "")) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function publicAliasName(name, salt = "") {
  const chars = [...String(name || "").trim()];
  if (!chars.length) return name;
  const h = hashText(`${name}-${salt}`);
  const replaceAt = (index, offset) => {
    let next = publicAliasSyllables[(h + offset) % publicAliasSyllables.length];
    if (next === chars[index]) next = publicAliasSyllables[(h + offset + 1) % publicAliasSyllables.length];
    chars[index] = next;
  };
  replaceAt(chars.length - 1, 0);
  return chars.join("");
}

function readUsers() {
  try {
    const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf8"));
    users.accounts ||= [];
    users.sessions ||= {};
    return users;
  } catch {
    return { accounts: [], sessions: {} };
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
}

function readBoard() {
  try {
    const board = JSON.parse(fs.readFileSync(BOARD_PATH, "utf8"));
    board.posts ||= [];
    return board;
  } catch {
    return { posts: [] };
  }
}

function writeBoard(board) {
  fs.writeFileSync(BOARD_PATH, JSON.stringify(board, null, 2), "utf8");
}

function publicBoard() {
  const board = readBoard();
  return {
    posts: board.posts
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 100)
      .map((post) => ({
        id: post.id,
        category: post.category,
        title: post.title,
        body: post.body,
        author: post.author,
        createdAt: post.createdAt
      }))
  };
}

function createBoardPost(user, body) {
  const title = String(body.title || "").trim().slice(0, 60);
  const text = String(body.body || "").trim().slice(0, 1200);
  const allowedCategories = new Set(["suggestion", "bug", "balance", "free"]);
  const category = allowedCategories.has(body.category) ? body.category : "suggestion";
  if (title.length < 2 || text.length < 4) {
    return { error: "제목은 2자 이상, 내용은 4자 이상 적어주세요." };
  }
  const board = readBoard();
  const post = {
    id: `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
    category,
    title,
    body: text,
    author: user.username,
    authorId: user.id,
    createdAt: new Date().toISOString()
  };
  board.posts ||= [];
  board.posts.unshift(post);
  board.posts = board.posts.slice(0, 300);
  writeBoard(board);
  return { post };
}

function safeUserId(username) {
  const raw = String(username || "").trim();
  const base = raw.toLowerCase().replace(/[^a-z0-9_-]/g, "_").replace(/^_+|_+$/g, "").slice(0, 18) || "user";
  return `${base}_${hashText(raw).toString(36)}`.slice(0, 32);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password || ""), salt, 120000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, account) {
  if (!account?.salt || !account?.passwordHash) return false;
  return hashPassword(password, account.salt).hash === account.passwordHash;
}

function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || "").split(";").map((part) => {
    const index = part.indexOf("=");
    if (index < 0) return ["", ""];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

function sessionUser(req) {
  const token = parseCookies(req).bm_session;
  if (!token) return null;
  const users = readUsers();
  const userId = users.sessions?.[token];
  return users.accounts.find((account) => account.id === userId) || null;
}

function visitorKey(req, user) {
  if (user?.id) return `user:${user.id}`;
  const ip = String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  const agent = String(req.headers["user-agent"] || "").slice(0, 80);
  return `anon:${ip}:${agent}`;
}

function touchVisitor(req, user) {
  const now = Date.now();
  activeVisitors.set(visitorKey(req, user), now);
  for (const [key, seenAt] of activeVisitors) {
    if (now - seenAt > ACTIVE_VISITOR_WINDOW_MS) activeVisitors.delete(key);
  }
  return activeVisitors.size;
}

function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", `bm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "bm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function isLikelyForeignName(name) {
  const chars = [...String(name || "").trim().replace(/\s+/g, "")];
  if (!chars.length) return false;
  if (chars.length >= 4) return true;
  return !koreanSurnames.has(chars[0]);
}

function isForeignPlayer(p) {
  return Boolean(p?.foreignPlayer);
}

function isPitcherPos(pos) {
  return ["SP", "RP", "CL"].includes(pos);
}

function fieldPositionForPlayer(p) {
  if (!p) return "DH";
  if (FIELD_POSITIONS.includes(p.pos)) return p.pos;
  if (p.pos === "OF") return "CF";
  if (p.pos === "IF") return "SS";
  return "DH";
}

function defaultFieldPositions(lineup, state) {
  const used = new Set();
  const ids = lineup || [];
  const positions = ids.map((id) => {
    const p = state?.players?.find((player) => player.id === id);
    const preferred = fieldPositionForPlayer(p);
    if (preferred !== "DH" && !used.has(preferred)) {
      used.add(preferred);
      return preferred;
    }
    return null;
  });
  return positions.map((pos, index) => {
    if (pos) return pos;
    const p = state?.players?.find((player) => player.id === ids[index]);
    const candidates = [
      ...(p?.secondaryPositions || []),
      fieldPositionForPlayer(p),
      "DH",
      ...FIELD_POSITIONS
    ].filter((value) => FIELD_POSITIONS.includes(value));
    const chosen = candidates.find((value) => !used.has(value)) || FIELD_POSITIONS.find((value) => !used.has(value)) || "DH";
    used.add(chosen);
    return chosen;
  });
}

function normalizeLineupPositions(lineup, positions, state) {
  const defaults = defaultFieldPositions(lineup, state);
  const clean = Array.isArray(positions) ? positions : [];
  return (lineup || []).map((_, i) => FIELD_POSITIONS.includes(clean[i]) ? clean[i] : defaults[i]);
}

function hasCompleteFieldPositions(positions) {
  return Array.isArray(positions)
    && positions.length === FIELD_POSITIONS.length
    && FIELD_POSITIONS.every((pos) => positions.includes(pos))
    && new Set(positions).size === FIELD_POSITIONS.length;
}

function ensurePositionData(p) {
  if (!p.secondaryPositions) p.secondaryPositions = [];
  if (!p.positionTraining) p.positionTraining = {};
  if (p.type === "BAT" && p.pos && !p.secondaryPositions.includes(p.pos)) p.secondaryPositions.unshift(p.pos);
  p.secondaryPositions = [...new Set(p.secondaryPositions)].filter((pos) => FIELD_POSITIONS.includes(pos) || isPitcherPos(pos));
}

const PITCH_CATALOG = [
  { type: "포심", speed: [142, 154], weight: 100 },
  { type: "투심", speed: [139, 151], weight: 42 },
  { type: "슬라이더", speed: [128, 141], weight: 82 },
  { type: "커브", speed: [112, 128], weight: 54 },
  { type: "체인지업", speed: [122, 136], weight: 58 },
  { type: "스플리터", speed: [130, 143], weight: 42 },
  { type: "커터", speed: [136, 148], weight: 34 },
  { type: "싱커", speed: [137, 149], weight: 30 }
];

const KBO_SERVICE_DAYS_PER_YEAR = 145;

function buildPitchArsenal(p) {
  if (!p || p.type !== "PIT") return [];
  const base = Math.max(50, Math.min(95, p.pit || p.ovr || 62));
  const count = base >= 78 ? rnd(4, 5) : rnd(3, 4);
  const pool = PITCH_CATALOG
    .map((pitch) => ({ ...pitch, score: pitch.weight + rnd(-18, 18) + (pitch.type === "포심" ? 40 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
  const rawUsage = pool.map((pitch, index) => Math.max(8, pitch.weight + rnd(-12, 16) - index * 8));
  const total = rawUsage.reduce((sum, value) => sum + value, 0);
  return pool.map((pitch, index) => ({
    type: pitch.type,
    grade: Math.max(35, Math.min(99, base + rnd(-10, 12) - index * 2)),
    velo: rnd(pitch.speed[0], pitch.speed[1]),
    usage: Math.max(5, Math.round(rawUsage[index] / total * 100))
  }));
}

function ensurePitchArsenal(p) {
  if (!p || p.type !== "PIT") return;
  if (!Array.isArray(p.pitchArsenal) || !p.pitchArsenal.length) p.pitchArsenal = buildPitchArsenal(p);
  p.pitchArsenal = p.pitchArsenal
    .filter((pitch) => pitch && pitch.type)
    .map((pitch) => ({
      type: pitch.type,
      grade: Math.max(20, Math.min(99, Number(pitch.grade) || Math.max(45, p.pit || p.ovr || 60))),
      velo: Math.max(80, Math.min(165, Number(pitch.velo) || 135)),
      usage: Math.max(1, Math.min(70, Number(pitch.usage) || 10))
    }));
}

function estimateContractForPlayer(p, index = 0) {
  const ovr = Number(p.ovr) || 60;
  const pot = Number(p.pot) || ovr;
  const age = Number(p.age) || 24;
  const service = Number.isFinite(Number(p.serviceYears)) ? Number(p.serviceYears) : Math.max(0, Math.min(12, age - 21));
  const isActive = p.rosterStatus === "ACTIVE" || index < 28;
  const isForeign = p.foreignPlayer === true || isLikelyForeignName(p.name || "");
  const grade = p.faGrade || (ovr >= 78 ? "A" : ovr >= 70 ? "B" : "C");
  let annual = 0.35;
  let yearsLeft = 1;
  let kind = "연봉계약";
  let signingBonus = Number(p.signingBonus) || 0;
  if (p.rosterStatus === "DEV" || p.development) {
    return { yearsLeft: 1, annual: 0.3, kind: "육성계약", signingBonus };
  }
  if (isForeign) {
    annual = Math.max(5.5, Math.min(18, (ovr - 55) * 0.42 + rnd(0, 35) / 10));
    yearsLeft = 1;
    kind = "외국인계약";
  } else if (service >= 8 && ovr >= 74) {
    annual = Math.max(5, Math.min(25, (ovr - 58) * 0.62 + (pot - ovr) * 0.12 + rnd(0, 45) / 10));
    yearsLeft = 1;
    kind = "연봉계약";
  } else if (service >= 5 || ovr >= 72) {
    annual = Math.max(1.4, Math.min(12, (ovr - 55) * 0.32 + service * 0.32 + rnd(0, 25) / 10));
    yearsLeft = 1;
    kind = "연봉계약";
  } else if (isActive) {
    annual = Math.max(0.6, Math.min(4.2, (ovr - 50) * 0.13 + service * 0.18 + rnd(0, 12) / 10));
    yearsLeft = 1;
    kind = "연봉계약";
  } else {
    annual = Math.max(0.35, Math.min(1.6, (ovr - 48) * 0.055 + rnd(0, 8) / 10));
    yearsLeft = 1;
    kind = "퓨처스계약";
  }
  if (age <= 22 && pot >= 80 && !signingBonus) signingBonus = Math.round((0.5 + (pot - 75) * 0.08 + rnd(0, 8) / 10) * 10) / 10;
  annual = Math.round(annual * 10) / 10;
  return { yearsLeft, annual, kind, signingBonus };
}

function csvNumber(row, headers, name) {
  const index = headers.indexOf(name);
  if (index < 0 || row[index] === undefined || row[index] === "") return null;
  const value = Number(row[index]);
  return Number.isFinite(value) ? value : null;
}

function csvText(row, headers, name) {
  const index = headers.indexOf(name);
  return index >= 0 && row[index] !== undefined ? String(row[index]).trim() : "";
}

function applyDetailedContractFromCsv(p, row, headers) {
  if (!p) return;
  const total = csvNumber(row, headers, "contractTotal");
  const years = csvNumber(row, headers, "contractYears");
  const startYear = csvNumber(row, headers, "contractStartYear");
  const endYear = csvNumber(row, headers, "contractEndYear");
  const guarantee = csvNumber(row, headers, "guaranteedMoney");
  const optionMoney = csvNumber(row, headers, "optionMoney");
  const note = csvText(row, headers, "contractNote");
  const source = csvText(row, headers, "contractSource");
  const signedTeam = csvText(row, headers, "signedTeam");
  p.contract ||= {};
  if (total !== null) p.contract.total = total;
  if (years !== null) p.contract.contractYears = years;
  if (startYear !== null) p.contract.startYear = startYear;
  if (endYear !== null) p.contract.endYear = endYear;
  if (guarantee !== null) p.contract.guaranteed = guarantee;
  if (optionMoney !== null) p.contract.optionMoney = optionMoney;
  if (note) p.contract.note = note;
  if (source) p.contract.source = source;
  if (signedTeam) p.contract.signedTeam = signedTeam;
  if (years !== null && total !== null && (!p.contract.annual || p.contract.annual <= 0)) {
    p.contract.annual = Math.round((total / Math.max(1, years)) * 10) / 10;
    p.salary = p.contract.annual;
  }
}

function applyDetailedHealthFromCsv(p, row, headers, state) {
  if (!p) return;
  const status = csvText(row, headers, "injuryStatus") || csvText(row, headers, "healthStatus");
  const injury = csvText(row, headers, "injuryName") || csvText(row, headers, "injury");
  const days = csvNumber(row, headers, "injuryDays");
  const rehab = csvNumber(row, headers, "rehab");
  const returnSeasonYear = csvNumber(row, headers, "returnSeasonYear");
  const returnDay = csvNumber(row, headers, "returnDay");
  const source = csvText(row, headers, "injurySource") || csvText(row, headers, "healthSource");
  if (!status && !injury && days === null && returnSeasonYear === null && returnDay === null) return;
  const normalized = status
    ? status.toUpperCase()
    : returnSeasonYear !== null || returnDay !== null || days !== null
      ? "INJURED"
      : "OK";
  p.health = {
    status: normalized,
    injury: injury || (normalized === "INJURED" ? "부상" : null),
    days: Math.max(0, days ?? 0),
    rehab: Math.max(0, Math.min(100, rehab ?? 0)),
    returnSeasonYear: returnSeasonYear ?? null,
    returnDay: returnDay ?? null,
    source: source || ""
  };
  if (normalized === "INJURED") {
    p.rosterStatus = "FARM";
    p.form = Math.min(Number(p.form) || 65, 45);
    const currentSeason = Number(state?.seasonYear) || 1;
    const currentDay = Number(state?.day) || 1;
    if (returnSeasonYear !== null && returnSeasonYear > currentSeason) p.health.days = Math.max(p.health.days, 999);
    if (returnSeasonYear === currentSeason && returnDay !== null) p.health.days = Math.max(p.health.days, Math.max(0, returnDay - currentDay));
  }
}

function progressScheduledInjuryReturns(state) {
  const seasonYear = Number(state?.seasonYear) || 1;
  const day = Number(state?.day) || 1;
  for (const p of state?.players || []) {
    const health = p.health;
    if (!health || health.status !== "INJURED") continue;
    const returnSeasonYear = Number(health.returnSeasonYear);
    const returnDay = Number(health.returnDay);
    const seasonDue = Number.isFinite(returnSeasonYear) && returnSeasonYear <= seasonYear;
    const dayDue = !Number.isFinite(returnDay) || returnDay <= day;
    if (seasonDue && dayDue) {
      p.health = {
        status: "REHAB",
        injury: health.injury || null,
        days: 0,
        rehab: Math.max(60, Number(health.rehab) || 60),
        returnSeasonYear,
        returnDay: Number.isFinite(returnDay) ? returnDay : null,
        source: health.source || ""
      };
      p.form = Math.min(70, Math.max(45, Number(p.form) || 55));
      addNews(state, "재활조 복귀", `${p.name}이 장기 부상에서 돌아와 재활 단계에 들어갔다.`, "의료");
    }
  }
  return state;
}

function progressInjuryRecovery(state) {
  const seasonYear = Number(state?.seasonYear) || 1;
  const day = Number(state?.day) || 1;
  for (const p of state?.players || []) {
    if (Number(p.reinjuryWatchDays) > 0) p.reinjuryWatchDays = Math.max(0, Number(p.reinjuryWatchDays) - 1);
    const health = p.health;
    if (!health || health.status === "OK") continue;
    const returnSeasonYear = Number(health.returnSeasonYear);
    const returnDay = Number(health.returnDay);
    const nextSeasonOut = Number.isFinite(returnSeasonYear) && returnSeasonYear > seasonYear;
    if (nextSeasonOut) continue;

    if (health.status === "INJURED") {
      const totalDays = Math.max(1, Number(health.totalDays) || Number(health.days) || 1);
      health.days = Math.max(0, (Number(health.days) || 0) - 1);
      const elapsedRatio = Math.max(0, Math.min(1, (totalDays - health.days) / totalDays));
      if (elapsedRatio >= 0.45) {
        const target = Math.max(Number(health.rehabTarget) || 35, Math.round(elapsedRatio * 70));
        health.rehab = Math.min(95, Math.max(Number(health.rehab) || 0, target + rnd(0, 3)));
      }
      if (health.days <= 0 || (Number.isFinite(returnDay) && returnDay <= day)) {
        p.health = {
          ...health,
          status: "REHAB",
          days: 0,
          rehab: Math.max(Number(health.rehab) || 0, 62)
        };
        p.form = Math.min(72, Math.max(42, Number(p.form) || 55));
        addNews(state, "재활 단계 전환", `${p.name}이 ${health.injury || "부상"} 치료를 마치고 재활 단계로 넘어갔다.`, "의료");
      }
    } else if (health.status === "REHAB") {
      const before = Number(health.rehab) || 0;
      health.rehab = Math.min(100, before + rnd(2, 5));
      p.form = Math.min(78, (Number(p.form) || 55) + 1);
      if (before < 100 && health.rehab >= 100) {
        addNews(state, "복귀 승인 대기", `${p.name}의 재활이 100%에 도달했다. 복귀 승인 버튼으로 1군/2군 운영에 다시 넣을 수 있다.`, "의료");
      }
    }
  }
  return state;
}

function gameContractYears(p, annual = Number(p?.contract?.annual || p?.salary || 0)) {
  if (!p || p.rosterStatus === "DEV" || p.development || p.foreignPlayer === true || isLikelyForeignName(p.name || "")) return 1;
  const ovr = Number(p.ovr) || 60;
  const pot = Number(p.pot) || ovr;
  const age = Number(p.age) || 24;
  const service = Number.isFinite(Number(p.serviceYears)) ? Number(p.serviceYears) : Math.max(0, Math.min(12, age - 21));
  const required = age <= 27 ? 9 : 8;
  const controlYears = Number.isFinite(Number(p.controlYears)) ? Number(p.controlYears) : Math.max(0, Math.ceil(required - service));
  if (controlYears <= 0) {
    if (ovr >= 80 || annual >= 7) return 3;
    if (ovr >= 73 || annual >= 3) return 2;
    return 1;
  }
  if (ovr >= 82 && age <= 31) return Math.min(5, Math.max(2, controlYears));
  if (ovr >= 76 && age <= 30) return Math.min(4, Math.max(2, controlYears));
  if (ovr >= 70 && p.rosterStatus === "ACTIVE") return Math.min(3, Math.max(1, controlYears));
  if (pot >= 82 && age <= 24) return Math.min(4, Math.max(2, controlYears));
  if (annual >= 2.5 && p.rosterStatus === "ACTIVE") return 2;
  return 1;
}

function shouldRebuildPrivateContract(p) {
  return false;
}

function hasFakeReserveContract(p) {
  const kind = String(p?.contract?.kind || "");
  const source = String(p?.contract?.source || "");
  return kind.includes("보류권 기반")
    || kind.includes("연봉계약+보류권")
    || source.includes("KBO 공식")
    || source.includes("계약기간 비공개")
    || source.includes("기간 추정")
    || source.includes("보류권/FA기간 반영")
    || source.includes("기존 저장값 보정");
}

function normalizeContractReality(p) {
  if (!p) return;
  if (!p.contract) {
    const estimated = estimateContractForPlayer(p);
    p.contract = {
      yearsLeft: estimated.yearsLeft,
      annual: Number(p.salary || estimated.annual),
      kind: estimated.kind,
      source: p.rosterStatus === "DEV" ? "육성계약" : "추정 연봉 · 서비스타임 반영"
    };
  }
  if (hasFakeReserveContract(p)) {
    const annual = Number(p.contract.annual || p.salary || 0);
    p.contract.yearsLeft = 1;
    p.contract.annual = annual;
    p.contract.kind = p.rosterStatus === "FARM" && annual < 1 ? "퓨처스/최저연봉권" : "연봉계약";
    p.contract.source = annual ? "공시 연봉 · 서비스타임 반영" : "추정 연봉 · 서비스타임 반영";
    p.years = 1;
    p.salary = annual;
  }
}

function hasPlaceholderContract(p) {
  const years = Number(p.contract?.yearsLeft);
  const annual = Number(p.contract?.annual || p.salary);
  return !p.contract || !Number.isFinite(years) || !Number.isFinite(annual) || (years === 1 && annual <= 1.2 && (p.ovr || 0) >= 68) || (years === 1 && annual <= 3.5 && (p.ovr || 0) >= 78);
}

function faServiceRequired(p) {
  return p.age <= 27 ? 9 : 8;
}

function faServiceRequiredDays(p) {
  return faServiceRequired(p) * KBO_SERVICE_DAYS_PER_YEAR;
}

function ensureServiceTime(p) {
  if (!p || p.rosterStatus === "DEV") {
    if (p) {
      p.serviceDays = 0;
      p.serviceYears = 0;
    }
    return;
  }
  if (!Number.isFinite(Number(p.serviceDays))) {
    const years = Number.isFinite(Number(p.serviceYears)) ? Number(p.serviceYears) : Math.max(0, Math.min(12, (p.age || 24) - 21));
    p.serviceDays = Math.max(0, Math.round(years * KBO_SERVICE_DAYS_PER_YEAR + rnd(0, KBO_SERVICE_DAYS_PER_YEAR - 1)));
  }
  p.serviceYears = Math.floor((Number(p.serviceDays) || 0) / KBO_SERVICE_DAYS_PER_YEAR);
  p.faRemainingDays = Math.max(0, faServiceRequiredDays(p) - (Number(p.serviceDays) || 0));
  p.faEligibleSeason = p.faRemainingDays <= 0 ? "자격 충족" : `${Math.ceil(p.faRemainingDays / KBO_SERVICE_DAYS_PER_YEAR)}시즌 후`;
}

function accrueServiceDays(state) {
  for (const p of state.players || []) {
    ensureServiceTime(p);
    if (p.rosterStatus === "ACTIVE" && p.rosterStatus !== "DEV" && !isForeignPlayer(p)) {
      p.serviceDays = (Number(p.serviceDays) || 0) + 1;
      ensureServiceTime(p);
    }
  }
}

function pitchCatalogByType(type) {
  return PITCH_CATALOG.find((pitch) => pitch.type === type);
}

function availableNewPitchTypes(p) {
  ensurePitchArsenal(p);
  const known = new Set((p.pitchArsenal || []).map((pitch) => pitch.type));
  return PITCH_CATALOG.map((pitch) => pitch.type).filter((type) => !known.has(type));
}

function progressPitchTraining(state) {
  const reports = [];
  for (const p of state.players || []) {
    if (p.type !== "PIT" || !p.pitchTraining) continue;
    ensurePitchArsenal(p);
    if (p.health?.status === "INJURED") continue;
    const training = p.pitchTraining;
    const growth = rnd(9, 16) + Math.max(0, (p.pot || p.ovr || 65) - (p.ovr || 60)) * 0.35 + ((p.form || 65) - 65) * 0.08;
    training.days = (training.days || 0) + 1;
    training.progress = Math.min(100, Math.round((training.progress || 0) + growth));
    if (training.mode === "new") {
      if (training.progress >= 100) {
        const catalog = pitchCatalogByType(training.type);
        if (catalog && !p.pitchArsenal.some((pitch) => pitch.type === training.type)) {
          p.pitchArsenal.push({
            type: training.type,
            grade: Math.max(34, Math.min(48, Math.round((p.pit || 60) * 0.55 + rnd(0, 10)))),
            velo: rnd(catalog.speed[0], catalog.speed[1]),
            usage: 5
          });
          p.pitchTraining = null;
          reports.push(`${p.name} ${training.type} 습득`);
        }
      }
    } else {
      const pitch = p.pitchArsenal.find((item) => item.type === training.type);
      if (!pitch) {
        p.pitchTraining = null;
        continue;
      }
      if (training.progress >= 100) {
        pitch.grade = Math.min(99, pitch.grade + rnd(2, 5));
        if (rnd(1, 100) <= 25) pitch.velo = Math.min(165, pitch.velo + 1);
        p.pit = Math.min(99, p.pit + (pitch.grade >= 82 ? 1 : 0));
        p.ovr = recalcOvr(p);
        training.progress = 0;
        training.days = 0;
        reports.push(`${p.name} ${pitch.type} 숙련도 ${pitch.grade}`);
      }
    }
  }
  if (reports.length) addNews(state, "구종 훈련 리포트", reports.slice(0, 4).join(" · "), "육성");
}

function enforceActiveRosterLimit(state, limit = 28) {
  const active = state.players.filter((p) => p.rosterStatus === "ACTIVE");
  if (active.length <= limit) return;
  active
    .slice()
    .sort((a, b) => a.ovr - b.ovr || a.form - b.form || b.age - a.age)
    .slice(0, active.length - limit)
    .forEach((p) => {
      p.rosterStatus = "FARM";
      p.options = Math.max(0, (p.options || 0) - 1);
    });
}

function migrateState(state) {
  if (!state) return state;
  if (Array.isArray(state.players)) {
    state.players = state.players.filter((p) => p && typeof p === "object");
    for (const [index, p] of state.players.entries()) {
      if (!String(p.dataSource || "").startsWith("공시") && nameMigration[p.name]) p.name = nameMigration[p.name];
      if (!p.jerseyNumber) p.jerseyNumber = defaultJerseyNumber(index);
      if (!p.serviceYears && p.serviceYears !== 0) p.serviceYears = Math.max(0, Math.min(12, (p.age || 24) - 21));
      ensureServiceTime(p);
      if (!p.rosterStatus) p.rosterStatus = index < 10 ? "ACTIVE" : "FARM";
      if (!p.options && p.options !== 0) p.options = 2;
      if (!p.arm && p.arm !== 0) p.arm = playerArmFallback(p);
      if (!p.durability && p.durability !== 0) p.durability = defaultDurability(p);
      if (p.development !== true) p.development = false;
      if (p.trait === "실데이터 import") p.trait = "";
      if (p.foreignPlayer === undefined) p.foreignPlayer = isLikelyForeignName(p.name);
      if (!p.faGrade) p.faGrade = p.ovr >= 78 ? "A" : p.ovr >= 70 ? "B" : "C";
      if (hasPlaceholderContract(p) || shouldRebuildPrivateContract(p) || !p.contract?.kind) {
        const estimated = estimateContractForPlayer(p, index);
        const annual = Number(p.contract?.annual || p.salary || estimated.annual);
        const yearsLeft = shouldRebuildPrivateContract(p) ? gameContractYears(p, annual) : estimated.yearsLeft;
        const kind = shouldRebuildPrivateContract(p) ? (yearsLeft >= 3 ? "보류권 기반 다년관리" : "연봉계약+보류권") : estimated.kind;
        p.contract = { yearsLeft, annual, kind, source: shouldRebuildPrivateContract(p) ? "기존 저장값 보정 · 보류권/FA기간 반영" : p.contract?.source };
        p.salary = annual;
        p.signingBonus = Number(p.signingBonus) || estimated.signingBonus;
      }
      normalizeContractReality(p);
      if (!p.pitcherRole && p.type === "PIT") p.pitcherRole = p.pos === "SP" ? "SP" : p.pos === "CL" ? "CL" : "MR";
      if (!p.stamina && p.stamina !== 0) p.stamina = p.type === "PIT" ? rnd(p.pos === "SP" ? 68 : 38, p.pos === "SP" ? 92 : 66) : rnd(45, 85);
      if (p.type === "PIT") ensurePitchArsenal(p);
      if (p.type === "PIT") {
        p.restDays = Math.max(0, Number(p.restDays) || 0);
        p.lastPitchCount = Math.max(0, Number(p.lastPitchCount) || 0);
      }
      if (!p.health) p.health = { status: "OK", injury: null, days: 0, rehab: 0 };
      if (p.type === "BAT" && p.stats) {
        ["hr","rbi","avg","sb","h","r","pa","ab","obp","slg","bb","so","tb","hbp","sf"].forEach((key) => {
          if (!Number.isFinite(p.stats[key])) p.stats[key] = key === "avg" ? 0 : 0;
        });
        if (!p.stats.ab && p.stats.pa) p.stats.ab = Math.max(0, (Number(p.stats.pa) || 0) - (Number(p.stats.bb) || 0));
        if (!p.stats.tb && p.stats.h) p.stats.tb = (Number(p.stats.h) || 0) + (Number(p.stats.hr) || 0) * 3;
        updateRateStats(p);
      }
      if (p.type === "PIT" && p.stats) {
        ["era","win","loss","so","sv","hold","ip"].forEach((key) => {
          if (!Number.isFinite(p.stats[key])) p.stats[key] = 0;
        });
      }
      if (!p.complaint) p.complaint = complaintFor(p);
      ensurePositionData(p);
    }
    progressScheduledInjuryReturns(state);
  }
  if (!state.seasonGames || state.seasonGames < 144) state.seasonGames = 144;
  state.seasonGames = 144;
  if (!Array.isArray(state.schedule) || state.schedule.length !== state.seasonGames) {
    state.schedule = buildSeasonSchedule(state.teams || teamTemplates, state.selectedTeamId, state.seasonGames);
  }
  state.schedule.forEach((entry, index) => {
    if (entry.isHome === undefined) entry.isHome = Math.floor(index / 3) % 2 === 1;
  });
  if (state.activeGame && state.activeGame.isHome === undefined) {
    const activeEntry = state.schedule[Math.max(0, Math.min((state.day || 1) - 1, state.schedule.length - 1))];
    state.activeGame.isHome = Boolean(activeEntry?.isHome);
  }
  if (!state.seasonGoal) state.seasonGoal = { level: "playoff", label: "포스트시즌 진출", reward: 8, penalty: 4 };
  if (!state.lastLineup) state.lastLineup = null;
  if (!Array.isArray(state.tradeOffers)) state.tradeOffers = [];
  if (!Array.isArray(state.tradeTargets)) state.tradeTargets = [];
  if (!Array.isArray(state.awards)) state.awards = [];
  if (!state.postseason || typeof state.postseason !== "object") {
    state.postseason = { active: false, completed: false, seasonYear: state.seasonYear || 1, series: [], roundIndex: 0, championId: null };
  }
  if (!Array.isArray(state.draftClass)) state.draftClass = [];
  if (!Array.isArray(state.draftHistory)) state.draftHistory = [];
  if (!Array.isArray(state.draftOrder)) state.draftOrder = [];
  if (!state.draftRound) state.draftRound = 1;
  if (!Number.isFinite(state.draftPick)) state.draftPick = 0;
  if (!Number.isFinite(state.draftCycle)) state.draftCycle = 0;
  if (!Number.isFinite(state.seasonYear)) state.seasonYear = 1;
  if (!Number.isFinite(state.draftDay)) state.draftDay = DRAFT_DAY;
  if (typeof state.draftWindowOpen !== "boolean") state.draftWindowOpen = false;
  if (!Number.isFinite(state.draftCompletedSeason)) state.draftCompletedSeason = 0;
  if (!Array.isArray(state.hsCohorts)) state.hsCohorts = [];
  if ((state.day || 1) < (state.draftDay || DRAFT_DAY) && !state.draftWindowOpen) {
    state.draftClass = [];
    state.draftOrder = [];
    state.draftRound = 1;
    state.draftPick = 0;
  }
  ensureHighSchoolCohorts(state);
  ensureLeaguePlayers(state);
  ensureTeamStats(state);
  backfillStandingsGames(state);
  ensureTeamStats(state);
  ensureDraftWindow(state);
  if (state.day > state.seasonGames && !state.postseason?.active && !state.postseason?.completed) startPostseason(state);
  if (state.seasonAwarded !== true && state.postseason?.completed) finalizeSeasonAwards(state);
  if (!Array.isArray(state.freeAgents)) state.freeAgents = [];
  pruneInvalidOffers(state);
  if (state.activeGame?.lineup) {
    state.activeGame.lineup = state.activeGame.lineup.filter((id) => state.players.some((p) => p.id === id));
    state.activeGame.lineupPositions = normalizeLineupPositions(state.activeGame.lineup, state.activeGame.lineupPositions, state);
  }
  ensureActiveGameDetails(state);
  return state;
}

function ensureActiveGameDetails(state) {
  const game = state?.activeGame;
  if (!game) return state;
  const opp = state.teams?.find((t) => t.id === game.opponentId) || currentOpponent(state);
  if (!game.count) game.count = { balls: 0, strikes: 0 };
  if (!game.runnerTactic) game.runnerTactic = "normal";
  if (!Number.isFinite(game.paPitchCount)) game.paPitchCount = 0;
  ensureOpponentPersonnel(state, game, opp);
  if (!Array.isArray(game.opponentLineup) || game.opponentLineup.length < 9) game.opponentLineup = makeOpponentLineup(state, opp);
  if (!game.opponentPitcher) game.opponentPitcher = selectOpponentStarter(state, opp);
  if (!Array.isArray(game.opponentBullpen) || game.opponentBullpen.length < 5) game.opponentBullpen = makeOpponentBullpen(opp, opp.id);
  game.opponentBullpen = applyOpponentBullpenHistory(state, opp, game.opponentBullpen);
  if (!Array.isArray(game.opponentUsedPitchers)) game.opponentUsedPitchers = [game.opponentPitcher?.name].filter(Boolean);
  if (!game.opponentPitcherUsage || typeof game.opponentPitcherUsage !== "object") game.opponentPitcherUsage = {};
  if (!Number.isFinite(game.opponentPitcher.battersFaced)) game.opponentPitcher.battersFaced = 0;
  if (!Number.isFinite(game.opponentPitcher.runsAllowed)) game.opponentPitcher.runsAllowed = 0;
  if (!Number.isFinite(game.opponentPitcher.runnersAllowed)) game.opponentPitcher.runnersAllowed = 0;
  if (!Number.isFinite(game.opponentPitcher.hitsAllowed)) game.opponentPitcher.hitsAllowed = 0;
  if (!Number.isFinite(game.opponentPitcher.walksAllowed)) game.opponentPitcher.walksAllowed = 0;
  if (!Number.isFinite(game.opponentLineupIndex)) game.opponentLineupIndex = 0;
  fillOpponentJerseyNumbers(game, opp);
  if (!Number.isFinite(game.pitchCount)) game.pitchCount = 0;
  if (!game.pitcherMood) game.pitcherMood = "정상";
  if (!Array.isArray(game.usedPitchers)) game.usedPitchers = [game.pitcherId].filter(Boolean);
  if (!Array.isArray(game.usedPositionPlayers)) game.usedPositionPlayers = [...(game.lineup || [])];
  if (!Array.isArray(game.removedPositionPlayers)) game.removedPositionPlayers = [];
  if (!game.pitcherUsage) game.pitcherUsage = {};
  if (!game.pitcherOuts) game.pitcherOuts = {};
  if (!game.pitcherRuns) game.pitcherRuns = {};
  if (!game.pitcherStrikeouts) game.pitcherStrikeouts = {};
  if (game.pitcherId && !Number.isFinite(game.pitcherUsage[game.pitcherId])) game.pitcherUsage[game.pitcherId] = 0;
  if (game.pitcherId && !Number.isFinite(game.pitcherOuts[game.pitcherId])) game.pitcherOuts[game.pitcherId] = 0;
  if (game.pitcherId && !Number.isFinite(game.pitcherRuns[game.pitcherId])) game.pitcherRuns[game.pitcherId] = 0;
  if (game.pitcherId && !Number.isFinite(game.pitcherStrikeouts[game.pitcherId])) game.pitcherStrikeouts[game.pitcherId] = 0;
  if (game.complete && !game.pitchingStatsApplied) {
    updateManualPitchingStats(state, game, (Number(game.score?.user) || 0) > (Number(game.score?.opp) || 0));
    game.pitchingStatsApplied = true;
  }
  return state;
}

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseBatsThrows(value, type) {
  const raw = String(value || "").trim();
  const throwMatch = raw.match(/([좌우양])\s*투/);
  const batMatch = raw.match(/([좌우양])\s*타/);
  const throwHand = throwMatch ? throwMatch[1] : raw.includes("좌완") ? "좌" : raw.includes("우완") ? "우" : raw === "L" ? "좌" : raw === "R" ? "우" : "";
  const batHand = batMatch ? batMatch[1] : raw.includes("좌타") ? "좌" : raw.includes("우타") ? "우" : raw.includes("양타") ? "양" : "";
  return {
    batsThrows: raw,
    throwHand: throwHand || (type === "PIT" ? "" : "우"),
    batHand: batHand || (type === "PIT" ? "" : throwHand || "우"),
    hand: type === "PIT" ? (throwHand || "우") : (batHand || throwHand || "우")
  };
}

function applyBatsThrows(player, value) {
  if (!player || !value) return player;
  const parsed = parseBatsThrows(value, player.type);
  player.batsThrows = parsed.batsThrows;
  if (parsed.throwHand) player.throwHand = parsed.throwHand;
  if (parsed.batHand) player.batHand = parsed.batHand;
  player.hand = parsed.hand;
  return player;
}

function weightedChoice(entries) {
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = Math.random() * Math.max(1, total);
  for (const entry of entries) {
    roll -= Math.max(0, entry.weight);
    if (roll <= 0) return entry.value;
  }
  return entries[entries.length - 1]?.value;
}

function userBattedBallEvent(batter, opponentPitcher, tactic) {
  const hit = batter.hit || batter.ovr || 60;
  const pow = batter.pow || 55;
  const spd = batter.spd || 55;
  const form = batter.form || 65;
  const pitcherPower = opponentEffectivePower(opponentPitcher);
  const command = opponentEffectiveCommand(opponentPitcher);
  let contactEdge = (hit - 64) * 0.35 + (form - 65) * 0.22 - (pitcherPower - 64) * 0.3 - (command - 62) * 0.16;
  let powerEdge = (pow - 62) * 0.18 - (pitcherPower - 64) * 0.12;
  const speedEdge = (spd - 60) * 0.04;
  const buntOutBoost = tactic === "bunt" ? 12 : 0;
  if (tactic === "contactSwing") {
    contactEdge += 6;
    powerEdge -= 2.5;
  } else if (tactic === "powerSwing") {
    contactEdge -= 5;
    powerEdge += 5;
  } else if (tactic === "forceSwing") {
    contactEdge -= 2;
    powerEdge += 2;
  }
  return weightedChoice([
    { value: { bases: 0, label: "범타" }, weight: clampValue(62 - contactEdge + buntOutBoost, 42, 82) },
    { value: { bases: 1, label: "안타" }, weight: clampValue(23 + contactEdge * 0.45, 12, 38) },
    { value: { bases: 2, label: "2루타" }, weight: clampValue(7 + powerEdge, 2, 16) },
    { value: { bases: 3, label: "3루타" }, weight: clampValue(1 + speedEdge, 0.4, 4) },
    { value: { bases: 4, label: "홈런" }, weight: clampValue(3 + powerEdge * 0.7, 0.6, 11) },
    { value: { bases: 1, label: "실책 출루", error: true }, weight: 2.4 }
  ]);
}

function battingTacticProfile(tactic, count) {
  const strikes = count?.strikes || 0;
  if (tactic === "forceSwing") {
    return { ballLimit: 13, strikeLimit: 38, foulLimit: 69, rollBonus: 9, strikeWord: "헛스윙" };
  }
  if (tactic === "contactSwing") {
    return { ballLimit: 27, strikeLimit: 43, foulLimit: 82, rollBonus: 3, strikeWord: "컨택 실패" };
  }
  if (tactic === "powerSwing") {
    return { ballLimit: 24, strikeLimit: 60, foulLimit: 76, rollBonus: 5, strikeWord: "큰 스윙 헛스윙" };
  }
  if (tactic === "take") {
    return strikes < 2
      ? { ballLimit: 48, strikeLimit: 76, foulLimit: 80, rollBonus: -13, strikeWord: "지켜본 스트라이크" }
      : { ballLimit: 37, strikeLimit: 58, foulLimit: 78, rollBonus: -5, strikeWord: "커트 실패" };
  }
  return { ballLimit: 34, strikeLimit: 49, foulLimit: 73, rollBonus: 0, strikeWord: "스트라이크" };
}

function opponentBattedBallEvent(batter, pitchPower, defense) {
  const contact = batter.contact || 62;
  const power = batter.power || 60;
  const defenseEdge = ((defense.def || 60) - 62) * 0.22 + ((defense.arm || 60) - 62) * 0.08;
  const contactEdge = (contact - 63) * 0.28 - (pitchPower - 64) * 0.28 - defenseEdge;
  const powerEdge = (power - 62) * 0.18 - (pitchPower - 64) * 0.12;
  return weightedChoice([
    { value: { bases: 0, label: "범타" }, weight: clampValue(63 - contactEdge, 43, 84) },
    { value: { bases: 1, label: "안타" }, weight: clampValue(22 + contactEdge * 0.42, 12, 37) },
    { value: { bases: 2, label: "2루타" }, weight: clampValue(7 + powerEdge, 2, 16) },
    { value: { bases: 3, label: "3루타" }, weight: 1.0 },
    { value: { bases: 4, label: "홈런" }, weight: clampValue(3 + powerEdge * 0.7, 0.6, 11) },
    { value: { bases: 1, label: "송구 실책", error: true }, weight: clampValue(2.8 - defenseEdge * 0.15, 0.8, 5) }
  ]);
}

function money(v) {
  return `${Number(v).toFixed(1)}억`;
}

function avg(values) {
  return values.reduce((sum, v) => sum + v, 0) / Math.max(1, values.length);
}

function playerArmFallback(p) {
  const base = Number(p?.ovr) || 60;
  if (p?.type === "PIT") return rnd(Math.max(45, base - 8), Math.min(96, base + 12));
  return rnd(Math.max(42, base - 14), Math.min(96, base + 14));
}

function recalcOvr(p) {
  if (!p) return 0;
  const arm = Number.isFinite(Number(p.arm)) ? Number(p.arm) : playerArmFallback(p);
  p.arm = arm;
  const raw = p.type === "PIT"
    ? p.pit * 0.68 + p.def * 0.08 + arm * 0.08 + p.form * 0.16
    : p.hit * 0.32 + p.pow * 0.23 + p.spd * 0.13 + p.def * 0.14 + arm * 0.1 + p.form * 0.08;
  return Math.min(p.pot, Math.round(raw));
}

function defaultDurability(p) {
  const age = Number(p?.age) || 25;
  const form = Number(p?.form) || 70;
  const stamina = Number(p?.stamina) || 65;
  let value = rnd(48, 88);
  if (p?.type === "PIT") value -= 3;
  if (p?.pitcherRole === "SP" || p?.pos === "SP") value -= 2;
  if (age >= 34) value -= rnd(4, 10);
  if (form < 55) value -= rnd(3, 8);
  if (stamina >= 78) value += rnd(2, 6);
  return Math.max(25, Math.min(96, value));
}

function makePlayer(seed, i) {
  const [name, pos, type, age, ovr, pot, trait, jerseyNumber] = seed;
  const isPitcher = type === "PIT";
  const player = {
    id: i + 1,
    name,
    jerseyNumber: jerseyNumber || defaultJerseyNumber(i),
    pos,
    type,
    age,
    ovr,
    pot,
    hit: isPitcher ? rnd(7, 18) : rnd(Math.max(45, ovr - 12), Math.min(95, ovr + 8)),
    pow: isPitcher ? rnd(8, 18) : rnd(Math.max(40, ovr - 14), Math.min(96, ovr + 10)),
    spd: isPitcher ? rnd(30, 55) : rnd(30, 90),
    def: rnd(Math.max(42, ovr - 16), Math.min(92, ovr + 12)),
    arm: isPitcher ? rnd(Math.max(48, ovr - 8), Math.min(96, ovr + 12)) : rnd(Math.max(42, ovr - 14), Math.min(96, ovr + 14)),
    pit: isPitcher ? rnd(Math.max(55, ovr - 6), Math.min(98, ovr + 10)) : rnd(8, 24),
    form: rnd(58, 86),
    durability: defaultDurability({ type, pos, age, form: ovr, stamina: isPitcher ? ovr : 65 }),
    serviceYears: Math.max(0, Math.min(12, age - 21 + rnd(-2, 2))),
    rosterStatus: i < 10 ? "ACTIVE" : "FARM",
    options: rnd(1, 3),
    development: false,
    faGrade: ovr >= 78 ? "A" : ovr >= 70 ? "B" : "C",
    pitcherRole: isPitcher ? (pos === "SP" ? "SP" : pos === "CL" ? "CL" : "MR") : null,
    stamina: isPitcher ? rnd(pos === "SP" ? 68 : 38, pos === "SP" ? 92 : 66) : rnd(45, 85),
    health: { status: "OK", injury: null, days: 0, rehab: 0 },
    secondaryPositions: isPitcher ? [pos] : [pos],
    positionTraining: {},
    complaint: null,
    happy: rnd(58, 88),
    trait,
    stats: isPitcher ? { era: 0, win: 0, loss: 0, so: 0, sv: 0, hold: 0, ip: 0 } : { hr: 0, rbi: 0, avg: 0, sb: 0, h: 0, r: 0, pa: 0, ab: 0, obp: 0, slg: 0, bb: 0, so: 0, tb: 0, hbp: 0, sf: 0 }
  };
  player.serviceDays = player.serviceYears * KBO_SERVICE_DAYS_PER_YEAR + rnd(0, KBO_SERVICE_DAYS_PER_YEAR - 1);
  ensureServiceTime(player);
  const estimated = estimateContractForPlayer(player, i);
  player.years = estimated.yearsLeft;
  player.salary = estimated.annual;
  player.contract = { yearsLeft: estimated.yearsLeft, annual: estimated.annual, kind: estimated.kind };
  player.signingBonus = estimated.signingBonus;
  if (isPitcher) player.pitchArsenal = buildPitchArsenal(player);
  return player;
}

function cloneLeaguePlayer(seed, team, index) {
  const p = makePlayer(seed, index);
  p.id = `L-${team.id}-${index + 1}`;
  p.teamId = team.id;
  p.teamName = `${team.city} ${team.name}`;
  p.rosterStatus = "ACTIVE";
  p.dataSource = "league-rival";
  return p;
}

function buildLeaguePlayers(selectedTeamId) {
  const players = [];
  for (const team of teamTemplates) {
    if (team.id === selectedTeamId) continue;
    const seeds = playerSeeds[team.id] || playerSeeds.default;
    seeds.forEach((seed, index) => players.push(cloneLeaguePlayer(seed, team, index)));
  }
  return players;
}

function ensureLeaguePlayers(state) {
  if (!state) return state;
  if (!Array.isArray(state.leaguePlayers) || state.leaguePlayers.length < 70) {
    state.leaguePlayers = buildLeaguePlayers(state.selectedTeamId);
  }
  for (const p of state.leaguePlayers) {
    const team = state.teams?.find((t) => t.id === p.teamId) || teamTemplates.find((t) => t.id === p.teamId);
    if (team && !p.teamName) p.teamName = `${team.city} ${team.name}`;
    normalizeContractReality(p);
    if (p.type === "BAT" && !p.stats) p.stats = { hr: 0, rbi: 0, avg: 0, sb: 0, h: 0, r: 0, pa: 0, ab: 0, obp: 0, slg: 0, bb: 0, so: 0, tb: 0, hbp: 0, sf: 0 };
    if (p.type === "PIT" && !p.stats) p.stats = { era: 0, win: 0, loss: 0, so: 0, sv: 0, hold: 0, ip: 0 };
    if (p.type === "PIT") ensurePitchingStats(p);
    ensurePositionData(p);
  }
  backfillLeaguePlayerStats(state);
  return state;
}

function leagueRecordPlayers(state) {
  ensureLeaguePlayers(state);
  return [...(state.players || []), ...(state.leaguePlayers || [])];
}

function normalizePitcherDecisionRecords(state) {
  const teams = state.teams || teamTemplates;
  const players = leagueRecordPlayers(state);
  teams.forEach((team) => {
    const games = Math.max(0, (Number(team.w) || 0) + (Number(team.l) || 0));
    if (!games) return;
    const starters = players
      .filter((p) => p.teamId === team.id && p.type === "PIT" && (p.pitcherRole === "SP" || p.pos === "SP"))
      .sort((a, b) => (b.ovr || 0) - (a.ovr || 0))
      .slice(0, 5);
    if (!starters.length) return;
    const maxStarterDecisions = Math.max(1, Math.ceil(games / starters.length));
    starters.forEach((p) => {
      const stats = ensurePitchingStats(p);
      stats.win = Math.min(Number(stats.win) || 0, maxStarterDecisions);
      stats.loss = Math.min(Number(stats.loss) || 0, maxStarterDecisions);
    });
  });
}

function backfillLeaguePlayerStats(state) {
  const playedDays = Math.max(0, (state.day || 1) - 1);
  const completed = Math.max(0, state.leagueStatsBackfilledForDay || 0);
  if (playedDays <= completed) return;
  const teams = (state.teams || teamTemplates).filter((team) => team.id !== state.selectedTeamId);
  for (let day = completed; day < playedDays; day += 1) {
    teams.forEach((team) => simulateTeamPlayerStats(state, team));
  }
  state.leagueStatsBackfilledForDay = playedDays;
}

function defaultJerseyNumber(i) {
  const pool = [1, 3, 5, 7, 8, 10, 11, 13, 15, 16, 17, 18, 19, 21, 22, 25, 27, 28, 30, 31, 33, 34, 37, 41, 47, 51, 54, 55, 61, 64, 66, 68, 77, 88, 95, 99];
  return pool[i % pool.length];
}

function ensureRosterDepth(state) {
  if (!state?.players) return state;
  if (state.realDataMode) {
    state.players.forEach(ensurePositionData);
    enforceActiveRosterLimit(state);
    return state;
  }
  const benchNames = ["강태율", "서민규", "이로운", "백도하", "윤지성", "차현우", "도하준", "민시우", "오서율", "한재겸", "유건우", "정라온"];
  const pitcherNames = ["남지완", "홍태민", "신도윤", "안서준", "배로운", "송지혁", "권하람", "임태오", "조이현", "마준서", "서하늘", "문재겸"];
  let nextId = Math.max(0, ...state.players.map((p) => p.id || 0)) + 1;
  while (state.players.filter((p) => p.type === "BAT").length < 22) {
    const name = benchNames[(nextId - 1) % benchNames.length] + (nextId > 30 ? nextId : "");
    state.players.push(makePlayer([name, ["LF", "CF", "2B", "C", "DH", "SS", "3B", "1B"][rnd(0, 7)], "BAT", rnd(21, 31), rnd(54, 68), rnd(68, 84), "2군/백업 야수"], nextId - 1));
    state.players[state.players.length - 1].id = nextId;
    nextId += 1;
  }
  while (state.players.filter((p) => p.type === "PIT").length < 20) {
    const isStarter = state.players.filter((p) => p.type === "PIT" && p.pitcherRole === "SP").length < 7;
    const pos = isStarter ? "SP" : (rnd(0, 5) === 0 ? "CL" : "RP");
    const role = pos === "SP" ? "SP" : pos === "CL" ? "CL" : ["LR", "MR", "SU"][rnd(0, 2)];
    const name = pitcherNames[(nextId - 1) % pitcherNames.length] + (nextId > 30 ? nextId : "");
    const p = makePlayer([name, pos, "PIT", rnd(21, 33), rnd(52, 69), rnd(66, 84), isStarter ? "2군 선발 후보" : "2군 불펜"], nextId - 1);
    p.id = nextId;
    p.pitcherRole = role;
    p.rosterStatus = "FARM";
    state.players.push(p);
    nextId += 1;
  }
  if (!state.rosterInitialized) {
    assignDefaultRoster(state);
    state.rosterInitialized = true;
  }
  return state;
}

function assignDefaultRoster(state) {
  const protectedStatuses = new Set(["DEV"]);
  const hitters = state.players.filter((p) => p.type === "BAT" && !protectedStatuses.has(p.rosterStatus)).sort((a, b) => b.ovr - a.ovr);
  const pitchers = state.players.filter((p) => p.type === "PIT" && !protectedStatuses.has(p.rosterStatus)).sort((a, b) => {
    const roleDiff = (a.pitcherRole === "SP" ? 0 : 1) - (b.pitcherRole === "SP" ? 0 : 1);
    return roleDiff || b.ovr - a.ovr;
  });
  state.players.forEach((p) => {
    if (p.rosterStatus !== "DEV") p.rosterStatus = "FARM";
  });
  const activeHitters = hitters.slice(0, 15);
  const activePitchers = pitchers.slice(0, 13);
  [...activeHitters, ...activePitchers].slice(0, 28).forEach((p) => { p.rosterStatus = "ACTIVE"; });
}

function complaintFor(p) {
  if (!p) return null;
  if (p.health?.status === "INJURED") return { topic: "부상", text: "복귀 일정과 재활 방향을 알고 싶어합니다.", heat: 36 };
  if (p.rosterStatus === "FARM" && p.ovr >= 70) return { topic: "2군 강등", text: "1군 기회를 원하고 있습니다.", heat: 62 };
  if (p.type === "PIT" && p.pos === "SP" && p.pitcherRole && p.pitcherRole !== "SP") return { topic: "보직", text: "선발 보직을 원하고 있습니다.", heat: 58 };
  if ((p.contract?.yearsLeft || 0) <= 1 && p.ovr >= 72) return { topic: "계약", text: "장기 계약 논의를 기대하고 있습니다.", heat: 46 };
  if (p.happy < 55) return { topic: "불만", text: "최근 팀 내 역할에 불만이 있습니다.", heat: 55 };
  return { topic: "안정", text: "현재 특별한 불만은 없습니다.", heat: 12 };
}

function updateComplaints(state) {
  for (const p of state.players) p.complaint = complaintFor(p);
  return state;
}

function createState(teamId) {
  const selected = teamTemplates.find((t) => t.id === teamId) || teamTemplates[0];
  const teams = teamTemplates.map((t) => ({ ...t, w: 0, l: 0, t: 0, teamStats: emptyTeamStats() }));
  const seeds = playerSeeds[selected.id] || playerSeeds.default;
  const state = {
    selectedTeamId: selected.id,
    seasonYear: 1,
    day: 1,
    seasonGames: 144,
    budget: 82,
    morale: 66,
    fanInterest: 61,
    trainingPts: 8,
    selectedId: 1,
    lastGame: null,
    news: [
      { day: 1, kind: "구단", title: "새 시즌 준비 완료", body: `${selected.city} ${selected.name} 프런트가 플레이오프와 유망주 육성을 동시에 목표로 잡았다.` },
      { day: 1, kind: "스카우트", title: "해외 스카우트 파견", body: "북미와 일본 시장에서 주전급 선수들에게 관심이 붙을 수 있다는 보고가 올라왔다." }
    ],
    games: [],
    offers: [],
    tradeOffers: [],
    tradeTargets: [],
    scout: [],
    freeAgents: [],
    draftClass: [],
    draftHistory: [],
    draftOrder: [],
    draftRound: 1,
    draftPick: 0,
    draftCycle: 0,
    draftDay: DRAFT_DAY,
    draftWindowOpen: false,
    draftCompletedSeason: 0,
    hsCohorts: [],
    awards: [],
    seasonAwarded: false,
    schedule: buildSeasonSchedule(teams, selected.id, 144),
    seasonGoal: { level: "playoff", label: "포스트시즌 진출", reward: 8, penalty: 4 },
    rules: {
      activeLimit: 28,
      registeredLimit: 65,
      faEligibility: "고졸 9시즌/대졸 8시즌을 게임식 서비스타임으로 단순화",
      compensation: "A: 보상선수+전년도 연봉 200% 또는 연봉 300%, B: 보상선수+100% 또는 200%, C: 150% 현금 보상"
    },
    teams,
    players: seeds.map(makePlayer),
    leaguePlayers: buildLeaguePlayers(selected.id)
  };
  return ensureRosterDepth(state);
}

function userSavePath(user) {
  return user ? path.join(SAVES_DIR, `${user.id}.json`) : SAVE_PATH;
}

function readState(user) {
  try {
    return ensureRosterDepth(migrateState(JSON.parse(fs.readFileSync(userSavePath(user), "utf8"))));
  } catch {
    return null;
  }
}

function saveState(state, user) {
  fs.writeFileSync(userSavePath(user), JSON.stringify(state, null, 2), "utf8");
}

function currentTeam(state) {
  return state.teams.find((t) => t.id === state.selectedTeamId);
}

function opponents(state) {
  return state.teams.filter((t) => t.id !== state.selectedTeamId);
}

function buildSeasonSchedule(teams, selectedTeamId, totalGames = 144) {
  const rivals = teams.filter((t) => t.id !== selectedTeamId);
  const schedule = [];
  let seriesNo = 1;
  for (let series = 0; schedule.length < totalGames; series += 1) {
    const opponent = rivals[series % rivals.length];
    for (let game = 1; game <= 3 && schedule.length < totalGames; game += 1) {
      schedule.push({
        day: schedule.length + 1,
        opponentId: opponent.id,
        seriesNo,
        seriesGame: game,
        isHome: series % 2 === 1
      });
    }
    seriesNo += 1;
  }
  return schedule;
}

function currentScheduleEntry(state) {
  if (!Array.isArray(state.schedule) || state.schedule.length !== state.seasonGames) {
    state.schedule = buildSeasonSchedule(state.teams || teamTemplates, state.selectedTeamId, state.seasonGames || 144);
  }
  state.schedule.forEach((entry, index) => {
    if (entry.isHome === undefined) entry.isHome = Math.floor(index / 3) % 2 === 1;
  });
  return state.schedule[Math.max(0, Math.min((state.day || 1) - 1, state.schedule.length - 1))];
}

function currentOpponent(state) {
  const postseasonOpp = currentPostseasonOpponent(state);
  if (postseasonOpp) return postseasonOpp;
  const entry = currentScheduleEntry(state);
  return state.teams.find((t) => t.id === entry?.opponentId) || opponents(state)[0];
}

function currentScheduleInfo(state) {
  const postseason = currentPostseasonSeries(state);
  if (postseason) {
    const opp = currentPostseasonOpponent(state);
    return {
      day: state.seasonGames || 144,
      totalGames: state.seasonGames || 144,
      seriesNo: postseason.name,
      seriesGame: (postseason.games?.length || 0) + 1,
      isHome: true,
      venue: "postseason",
      opponentId: opp?.id,
      opponentName: opp ? `${opp.city} ${opp.name}` : "-",
      postseason: {
        name: postseason.name,
        game: (postseason.games?.length || 0) + 1,
        wins: postseason.wins || {},
        targetWins: postseason.targetWins || 1,
        teamIds: postseason.teamIds || [],
        teamNames: postseason.teamNames || [],
        championId: state.postseason?.championId || null,
        completed: Boolean(state.postseason?.completed)
      }
    };
  }
  if (state.postseason?.completed) {
    const champion = state.teams.find((t) => t.id === state.postseason.championId);
    return {
      day: state.seasonGames || 144,
      totalGames: state.seasonGames || 144,
      seriesNo: "season-finished",
      seriesGame: "-",
      isHome: true,
      venue: "offseason",
      opponentId: null,
      opponentName: champion ? `${champion.city} ${champion.name}` : "-",
      postseason: {
        name: "시즌 종료",
        game: "-",
        wins: {},
        targetWins: 0,
        teamIds: [],
        teamNames: champion ? [`${champion.city} ${champion.name}`] : [],
        championId: state.postseason.championId,
        completed: true
      }
    };
  }
  const entry = currentScheduleEntry(state);
  const opp = currentOpponent(state);
  const scheduleEntry = currentScheduleEntry(state);
  return {
    day: Math.min(state.day || 1, state.seasonGames || 144),
    totalGames: state.seasonGames || 144,
    seriesNo: entry?.seriesNo || 1,
    seriesGame: entry?.seriesGame || 1,
    isHome: Boolean(entry?.isHome),
    venue: entry?.isHome ? "홈" : "원정",
    opponentId: opp?.id,
    opponentName: opp ? `${opp.city} ${opp.name}` : "-"
  };
}

function isUserBattingHalf(game) {
  return Boolean(game?.isHome) ? game?.half === "bottom" : game?.half === "top";
}

function isOpponentBattingHalf(game) {
  return Boolean(game?.isHome) ? game?.half === "top" : game?.half === "bottom";
}

function halfLabel(game) {
  return `${game.inning}회${game.half === "top" ? "초" : "말"}`;
}

function halfOffenseName(state, game) {
  return isUserBattingHalf(game) ? currentTeam(state).short : currentOpponent(state).short;
}

function awayScore(game) {
  return game?.isHome ? (Number(game.score?.opp) || 0) : (Number(game.score?.user) || 0);
}

function homeScore(game) {
  return game?.isHome ? (Number(game.score?.user) || 0) : (Number(game.score?.opp) || 0);
}

function shouldFinishAfterHalf(game) {
  if (!game || game.inning < 9) return false;
  if (game.half === "top" && homeScore(game) > awayScore(game)) return true;
  if (game.half === "bottom" && homeScore(game) !== awayScore(game)) return true;
  if (game.half === "bottom" && game.inning >= 12) return true;
  return false;
}

function isWalkoffState(game) {
  return Boolean(game) && game.half === "bottom" && game.inning >= 9 && homeScore(game) > awayScore(game);
}

function finishWalkoffIfNeeded(state) {
  const game = state.activeGame;
  if (!isWalkoffState(game)) return false;
  finishManualGame(state);
  return true;
}

function opponentRoster(state, teamId) {
  return (state?.leaguePlayers || [])
    .filter((p) => p && String(p.teamId) === String(teamId) && p.health?.status !== "INJURED")
    .slice();
}

function rosterBackedOpponentName(state, opp, name) {
  if (!name) return false;
  return opponentRoster(state, opp?.id).some((p) => p.name === name);
}

function activeOpponentPitcherName(state, opp, game, name) {
  if (!name) return false;
  if (rosterBackedOpponentName(state, opp, name)) return true;
  return Array.isArray(game?.opponentBullpen) && game.opponentBullpen.some((p) => p?.name === name);
}

function opponentBatterFromPlayer(p, order, fallbackPos = "DH") {
  const contact = Math.max(35, Math.min(99, Number(p.hit || p.ovr || 60)));
  const power = Math.max(30, Math.min(99, Number(p.pow || p.ovr || 55)));
  return {
    playerId: p.id,
    order,
    name: p.name,
    jerseyNumber: p.jerseyNumber || p.no || defaultJerseyNumber(order),
    pos: p.pos || fallbackPos,
    hand: p.batHand || p.hand || "우",
    contact,
    power,
    speed: Number(p.spd || 55),
    defense: Number(p.def || 55),
    arm: Number(p.arm || 55)
  };
}

function makeOpponentLineup(state, opp) {
  const batters = opponentRoster(state, opp?.id)
    .filter((p) => p.type === "BAT")
    .sort((a, b) => {
      const activeDiff = (b.rosterStatus === "ACTIVE" ? 1 : 0) - (a.rosterStatus === "ACTIVE" ? 1 : 0);
      const offenseDiff = ((b.hit || b.ovr || 0) + (b.pow || 0) * 0.55 + (b.spd || 0) * 0.18) - ((a.hit || a.ovr || 0) + (a.pow || 0) * 0.55 + (a.spd || 0) * 0.18);
      return activeDiff || offenseDiff;
    });

  if (batters.length >= 9) {
    const needed = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"];
    const picked = [];
    const used = new Set();
    for (const pos of needed) {
      const exact = batters.find((p) => !used.has(p.id) && (p.pos === pos || (p.secondaryPositions || []).includes(pos)));
      if (exact) {
        picked.push({ player: exact, pos });
        used.add(exact.id);
      }
    }
    for (const p of batters) {
      if (picked.length >= 9) break;
      if (!used.has(p.id)) {
        picked.push({ player: p, pos: picked.length >= 8 ? "DH" : p.pos || "DH" });
        used.add(p.id);
      }
    }
    return picked.slice(0, 9).map((entry, index) => opponentBatterFromPlayer(entry.player, index + 1, entry.pos));
  }

  const surnames = ["김", "이", "박", "최", "정", "강", "윤", "조", "한"];
  const names = ["도윤", "서준", "민재", "지후", "태오", "현우", "준서", "시온", "라온"];
  const positions = ["CF", "SS", "RF", "1B", "LF", "3B", "DH", "C", "2B"];
  const numbers = [37, 5, 30, 50, 65, 8, 25, 13, 51];
  return positions.map((pos, i) => ({
    order: i + 1,
    name: `${opp.short}${surnames[i]}${names[i]}`,
    jerseyNumber: numbers[i],
    pos,
    hand: i % 3 === 0 ? "좌" : "우",
    contact: Math.max(45, Math.min(88, opp.power + rnd(-10, 10))),
    power: Math.max(40, Math.min(90, opp.power + rnd(-14, 12)))
  }));
}

function defaultLineup(state) {
  return state.players
    .filter((p) => p.type === "BAT" && p.rosterStatus === "ACTIVE")
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 9)
    .map((p) => p.id);
}

function startingPitcher(state, starterId) {
  const selected = state.players.find((p) => p.id === Number(starterId) && p.type === "PIT" && p.rosterStatus === "ACTIVE" && p.health?.status !== "INJURED");
  if (selected) return selected.id;
  return state.players
    .filter((p) => p.type === "PIT" && p.rosterStatus === "ACTIVE" && p.health?.status !== "INJURED")
    .sort((a, b) => b.ovr - a.ovr)[0]?.id || null;
}

function opponentBatterPower(opp, inning) {
  return Math.max(44, Math.min(88, opp.power + rnd(-12, 8) + (inning > 6 ? 2 : 0)));
}

function seededRndFactory(seed) {
  let h = hashText(seed || "seed");
  return (min, max) => {
    h = (h * 1664525 + 1013904223) >>> 0;
    return min + (h % (max - min + 1));
  };
}

function makeOpponentPitcher(opp, seed = "", sourcePlayer = null) {
  const roll = seed ? seededRndFactory(`${opp.id}-${seed}`) : rnd;
  const names = ["김도현", "이준서", "박민준", "최시온", "정태오"];
  const power = Math.max(48, Math.min(90, opp.power + roll(-8, 10)));
  const command = Math.max(45, Math.min(90, power + roll(-10, 10)));
  const stamina = roll(72, 98);
  const generated = {
    name: `${opp.short}${names[roll(0, names.length - 1)]}`,
    jerseyNumber: roll(11, 99),
    role: "SP",
    power,
    command,
    pickoff: Math.max(35, Math.min(90, power + roll(-16, 12))),
    stamina,
    hand: roll(1, 100) <= 28 ? "좌" : "우",
    style: power >= 78 ? "파워형" : command >= 75 ? "제구형" : stamina >= 88 ? "이닝이터" : "밸런스형",
    pitchCount: 0,
    mood: "정상"
  };
  if (!sourcePlayer) return generated;
  const pit = Math.max(35, Math.min(99, Number(sourcePlayer.pit || sourcePlayer.ovr || generated.power)));
  const commandFromPlayer = Math.max(35, Math.min(99, Math.round((Number(sourcePlayer.form || 65) * 0.45) + (pit * 0.55))));
  return {
    ...generated,
    playerId: sourcePlayer.id,
    name: sourcePlayer.name,
    jerseyNumber: sourcePlayer.jerseyNumber || sourcePlayer.no || generated.jerseyNumber,
    role: sourcePlayer.pitcherRole || sourcePlayer.pos || generated.role,
    power: pit,
    command: commandFromPlayer,
    pickoff: Math.max(25, Math.min(95, Number(sourcePlayer.pickoff || sourcePlayer.arm || commandFromPlayer))),
    stamina: Math.max(25, Math.min(110, Number(sourcePlayer.stamina || generated.stamina))),
    hand: sourcePlayer.throwHand || sourcePlayer.hand || generated.hand,
    style: sourcePlayer.trait || generated.style,
    mood: "정상"
  };
}

function selectOpponentStarter(state, opp) {
  const pitchers = opponentRoster(state, opp?.id)
    .filter((p) => p.type === "PIT" && (p.pitcherRole === "SP" || p.pos === "SP"))
    .sort((a, b) => {
      const activeDiff = (b.rosterStatus === "ACTIVE" ? 1 : 0) - (a.rosterStatus === "ACTIVE" ? 1 : 0);
      const restDiff = (Number(a.restDays) || 0) - (Number(b.restDays) || 0);
      const valueDiff = (Number(b.ovr || b.pit || 0) + Number(b.stamina || 0) * 0.16) - (Number(a.ovr || a.pit || 0) + Number(a.stamina || 0) * 0.16);
      return activeDiff || restDiff || valueDiff;
    });
  const seed = `${state?.day || 1}-${opp?.id || "opp"}`;
  const starter = pitchers.length ? pitchers[(Math.max(0, (Number(state?.day) || 1) - 1)) % Math.min(5, pitchers.length)] : null;
  return makeOpponentPitcher(opp, seed, starter);
}

function ensureOpponentPersonnel(state, game, opp) {
  if (!game || !opp) return;
  ensureOpponentBullpen(state, game, opp);
  const generatedPitcher = !game.opponentPitcher || !activeOpponentPitcherName(state, opp, game, game.opponentPitcher.name);
  const generatedLineup = !Array.isArray(game.opponentLineup)
    || game.opponentLineup.length < 9
    || game.opponentLineup.some((b) => !rosterBackedOpponentName(state, opp, b?.name));
  if (generatedPitcher) {
    game.opponentPitcher = {
      ...selectOpponentStarter(state, opp),
      pitchCount: Number(game.opponentPitcher?.pitchCount) || 0,
      mood: game.opponentPitcher?.mood || "정상",
      battersFaced: Number(game.opponentPitcher?.battersFaced) || 0,
      runsAllowed: Number(game.opponentPitcher?.runsAllowed) || 0,
      runnersAllowed: Number(game.opponentPitcher?.runnersAllowed) || 0,
      hitsAllowed: Number(game.opponentPitcher?.hitsAllowed) || 0,
      walksAllowed: Number(game.opponentPitcher?.walksAllowed) || 0
    };
  }
  if (generatedLineup) game.opponentLineup = makeOpponentLineup(state, opp);
}

function makeOpponentBullpen(opp, seed = "") {
  const roll = seed ? seededRndFactory(`${opp.id}-pen-${seed}`) : rnd;
  const roles = ["LR", "MR", "MR", "MR", "SU", "SU", "CL"];
  const names = ["강민재", "윤태성", "오시현", "한도윤", "문서준", "조하람", "배건우", "임태겸"];
  const numbers = [18, 21, 34, 46, 52, 61, 67];
  return roles.map((role, index) => {
    const leverageBoost = role === "CL" ? 8 : role === "SU" ? 5 : role === "MR" ? 1 : -4;
    const power = Math.max(42, Math.min(88, opp.power + leverageBoost + roll(-9, 8)));
    const command = Math.max(40, Math.min(88, power + roll(-12, 9)));
    const fatigue = Math.max(0, Math.min(35, roll(0, 18) + (role === "CL" ? roll(0, 8) : 0)));
    const restDays = fatigue >= 24 ? roll(1, 2) : roll(0, 1);
    return {
      name: `${opp.short}${names[(index + roll(0, names.length - 1)) % names.length]}`,
      jerseyNumber: numbers[index] || roll(11, 99),
      role,
      power,
      command,
      pickoff: Math.max(32, Math.min(88, command + roll(-12, 13))),
      stamina: role === "LR" ? roll(34, 48) : role === "MR" ? roll(22, 34) : roll(16, 27),
      hand: roll(1, 100) <= 32 ? "좌" : "우",
      style: role === "CL" ? "마무리" : role === "SU" ? "필승조" : role === "LR" ? "롱릴리프" : "중간",
      fatigue,
      restDays,
      pitchCount: 0,
      mood: fatigue >= 24 || restDays > 0 ? "피로" : "정상"
    };
  });
}

function makeOpponentBullpenFromRoster(state, opp, seed = "") {
  const roleRank = { CL: 0, SU: 1, MR: 2, LR: 3, RP: 4, SP: 5 };
  const rosterPitchers = opponentRoster(state, opp?.id)
    .filter((p) => p.type === "PIT")
    .sort((a, b) => {
      const activeDiff = (b.rosterStatus === "ACTIVE" ? 1 : 0) - (a.rosterStatus === "ACTIVE" ? 1 : 0);
      const roleDiff = (roleRank[a.pitcherRole || a.pos] ?? 6) - (roleRank[b.pitcherRole || b.pos] ?? 6);
      const valueDiff = Number(b.ovr || b.pit || 0) - Number(a.ovr || a.pit || 0);
      return activeDiff || roleDiff || valueDiff;
    });
  const relievers = rosterPitchers
    .filter((p) => p.pitcherRole !== "SP" && p.pos !== "SP")
    .concat(rosterPitchers.filter((p) => p.pitcherRole === "SP" || p.pos === "SP"))
    .filter((p, index, arr) => arr.findIndex((x) => x.id === p.id) === index)
    .slice(0, 7);
  if (relievers.length < 4) return makeOpponentBullpen(opp, seed || opp?.id);
  return relievers.map((source, index) => {
    const pitcher = makeOpponentPitcher(opp, `${seed || opp?.id}-pen-${index}`, source);
    const sourceRole = source.pitcherRole || source.pos || pitcher.role;
    const role = sourceRole === "SP" ? "LR" : sourceRole;
    return {
      ...pitcher,
      role,
      stamina: role === "LR" ? Math.max(34, Math.min(54, pitcher.stamina || 44)) : Math.max(16, Math.min(36, pitcher.stamina || 26)),
      pitchCount: 0,
      mood: (Number(source.restDays) || 0) > 0 ? "피로" : "정상",
      restDays: Number(source.restDays) || 0,
      fatigue: Math.max(0, 20 - (Number(source.form) || 65) / 4)
    };
  });
}

function fillOpponentJerseyNumbers(game, opp) {
  if (!game) return;
  const seedRoll = seededRndFactory(`${opp?.id || "opp"}-numbers`);
  if (game.opponentPitcher && !game.opponentPitcher.jerseyNumber) {
    game.opponentPitcher.jerseyNumber = seedRoll(11, 99);
  }
  const lineupNumbers = [37, 5, 30, 50, 65, 8, 25, 13, 51];
  (game.opponentLineup || []).forEach((batter, index) => {
    if (batter && !batter.jerseyNumber) batter.jerseyNumber = lineupNumbers[index % lineupNumbers.length];
  });
  const bullpenNumbers = [18, 21, 34, 46, 52, 61, 67];
  (game.opponentBullpen || []).forEach((pitcher, index) => {
    if (pitcher && !pitcher.jerseyNumber) pitcher.jerseyNumber = bullpenNumbers[index % bullpenNumbers.length] || seedRoll(11, 99);
  });
}

function applyOpponentBullpenHistory(state, opp, bullpen) {
  if (!state.opponentBullpenFatigue || typeof state.opponentBullpenFatigue !== "object") state.opponentBullpenFatigue = {};
  return (bullpen || []).map((p) => {
    const key = `${opp.id}:${p.name}`;
    const history = state.opponentBullpenFatigue[key] || {};
    const restDays = Math.max(Number(p.restDays) || 0, Number(history.restDays) || 0);
    const fatigue = Math.max(Number(p.fatigue) || 0, Number(history.fatigue) || 0);
    return { ...p, restDays, fatigue, mood: restDays > 0 || fatigue >= 24 ? "피로" : p.mood };
  });
}

function recoverOpponentBullpenFatigue(state) {
  const history = state.opponentBullpenFatigue;
  if (!history || typeof history !== "object") return;
  Object.keys(history).forEach((key) => {
    const item = history[key] || {};
    item.restDays = Math.max(0, (Number(item.restDays) || 0) - 1);
    item.fatigue = Math.max(0, (Number(item.fatigue) || 0) - (item.restDays > 0 ? 8 : 13));
    if (item.restDays <= 0 && item.fatigue <= 0) delete history[key];
    else history[key] = item;
  });
}

function rememberOpponentPitcherUsage(game, pitcher) {
  if (!game || !pitcher?.name) return;
  if (!game.opponentPitcherUsage || typeof game.opponentPitcherUsage !== "object") game.opponentPitcherUsage = {};
  game.opponentPitcherUsage[pitcher.name] = (Number(game.opponentPitcherUsage[pitcher.name]) || 0) + (Number(pitcher.pitchCount) || 0);
}

function applyOpponentGamePitcherFatigue(state, game, opp) {
  if (!state.opponentBullpenFatigue || typeof state.opponentBullpenFatigue !== "object") state.opponentBullpenFatigue = {};
  if (game?.opponentPitcher) rememberOpponentPitcherUsage(game, game.opponentPitcher);
  const bullpenNames = new Set((game?.opponentBullpen || []).map((p) => p.name));
  Object.entries(game?.opponentPitcherUsage || {}).forEach(([name, pitches]) => {
    if (!bullpenNames.has(name)) return;
    const pitchCount = Number(pitches) || 0;
    const key = `${opp.id}:${name}`;
    const prev = state.opponentBullpenFatigue[key] || {};
    const restDays = pitchCount >= 35 ? 3 : pitchCount >= 22 ? 2 : pitchCount >= 9 ? 1 : 0;
    const fatigue = Math.max(Number(prev.fatigue) || 0, Math.min(45, pitchCount + (Number(prev.fatigue) || 0) * 0.45));
    state.opponentBullpenFatigue[key] = {
      fatigue,
      restDays: Math.max(Number(prev.restDays) || 0, restDays),
      lastDay: state.day
    };
  });
}

function opponentFatiguePenalty(p) {
  if (!p) return 0;
  const pitchFatigue = Math.max(0, (Number(p.pitchCount) || 0) - (Number(p.stamina) || 65)) * 0.42;
  const recentFatigue = Math.max(0, Number(p.fatigue) || 0) * 0.28 + Math.max(0, Number(p.restDays) || 0) * 4.2;
  const meltdown = Math.max(0, Number(p.runsAllowed) || 0) * 1.5 + Math.max(0, Number(p.runnersAllowed) || 0) * 0.7;
  return pitchFatigue + recentFatigue + meltdown;
}

function opponentEffectivePower(p) {
  return Math.max(35, (Number(p?.power) || 62) - opponentFatiguePenalty(p));
}

function opponentEffectiveCommand(p) {
  return Math.max(32, (Number(p?.command) || 60) - opponentFatiguePenalty(p) * 0.65);
}

function ensureOpponentBullpen(state, game, opp) {
  const invalidBullpen = !Array.isArray(game.opponentBullpen)
    || game.opponentBullpen.length < 5
    || game.opponentBullpen.some((p) => p?.name && !rosterBackedOpponentName(state, opp, p.name));
  if (invalidBullpen) {
    game.opponentBullpen = makeOpponentBullpenFromRoster(state, opp, opp.id);
  }
  game.opponentBullpen = applyOpponentBullpenHistory(state, opp, game.opponentBullpen);
  if (!Array.isArray(game.opponentUsedPitchers)) {
    game.opponentUsedPitchers = [game.opponentPitcher?.name].filter(Boolean);
  }
  return game.opponentBullpen;
}

function opponentRolePriority(role, inning, closeGame, meltdown) {
  if (meltdown && inning <= 5) return role === "LR" ? 35 : role === "MR" ? 18 : 0;
  if (inning >= 9 && closeGame) return role === "CL" ? 40 : role === "SU" ? 20 : 3;
  if (inning >= 7 && closeGame) return role === "SU" ? 35 : role === "CL" ? 18 : role === "MR" ? 12 : 0;
  if (inning >= 6) return role === "MR" ? 24 : role === "SU" ? 15 : role === "LR" ? 4 : 0;
  return role === "LR" ? 20 : role === "MR" ? 12 : 0;
}

function chooseOpponentReliever(game) {
  const used = new Set(game.opponentUsedPitchers || []);
  const bullpen = (game.opponentBullpen || []).filter((p) => p && !used.has(p.name));
  if (!bullpen.length) return null;
  const diff = Math.abs((Number(game.score?.user) || 0) - (Number(game.score?.opp) || 0));
  const closeGame = diff <= 3;
  const current = game.opponentPitcher || {};
  const meltdown = (Number(current.runsAllowed) || 0) >= 4 || (Number(current.runnersAllowed) || 0) >= 7;
  return bullpen
    .map((p) => ({
      p,
      score: opponentEffectivePower(p) + opponentEffectiveCommand(p) * 0.35 + opponentRolePriority(p.role, game.inning, closeGame, meltdown) - (Number(p.restDays) || 0) * 7 - (Number(p.fatigue) || 0) * 0.35
    }))
    .sort((a, b) => b.score - a.score)[0]?.p || null;
}

function countBasesOccupied(bases) {
  return (bases || []).filter(Boolean).length;
}

function creditOpponentPitcherAfterPa(game, before, text) {
  const p = game?.opponentPitcher;
  if (!p || !before) return false;
  const paEnded = game.lineupIndex !== before.lineupIndex || (game.outs !== before.outs && game.count?.balls === 0 && game.count?.strikes === 0);
  if (!paEnded) return false;
  const runs = Math.max(0, (Number(game.score?.user) || 0) - before.userScore);
  const outsAdded = Math.max(0, game.outs - before.outs);
  const baseDelta = countBasesOccupied(game.bases) - before.baseCount + runs;
  p.battersFaced = (Number(p.battersFaced) || 0) + 1;
  p.runsAllowed = (Number(p.runsAllowed) || 0) + runs;
  if (outsAdded === 0 && baseDelta > 0) p.runnersAllowed = (Number(p.runnersAllowed) || 0) + 1;
  if (/안타|2루타|3루타|홈런/.test(text || "")) p.hitsAllowed = (Number(p.hitsAllowed) || 0) + 1;
  if (/볼넷/.test(text || "")) p.walksAllowed = (Number(p.walksAllowed) || 0) + 1;
  return true;
}

function maybeChangeOpponentPitcher(state, paEnded) {
  const game = state.activeGame;
  if (!game || game.complete || !paEnded || game.outs >= 3 || isWalkoffState(game) || !isUserBattingHalf(game)) return "";
  const opp = state.teams.find((t) => t.id === game.opponentId) || currentOpponent(state);
  ensureOpponentBullpen(state, game, opp);
  const current = game.opponentPitcher;
  if (!current) return "";
  const pitches = Number(current.pitchCount) || 0;
  const stamina = Number(current.stamina) || 75;
  const runs = Number(current.runsAllowed) || 0;
  const runners = Number(current.runnersAllowed) || 0;
  const fatigue = opponentFatiguePenalty(current);
  const diff = Math.abs((Number(game.score.user) || 0) - (Number(game.score.opp) || 0));
  const closeGame = diff <= 3;
  const starter = current.role === "SP";
  const tired = pitches >= stamina || pitches >= (starter ? 92 : 24);
  const danger = runs >= (game.inning <= 4 ? 5 : 3) || runners >= (game.inning <= 4 ? 8 : 5) || fatigue >= 16;
  const leverageHook = game.inning >= 7 && closeGame && pitches >= Math.max(16, stamina - 8);
  const earlyPatience = starter && game.inning <= 4 && pitches < 78 && runs < 5 && runners < 7;
  if (!tired && !danger && !leverageHook) return "";
  if (earlyPatience && !danger) return "";
  const next = chooseOpponentReliever(game);
  if (!next) return "";
  const old = current;
  rememberOpponentPitcherUsage(game, old);
  game.opponentUsedPitchers = [...(game.opponentUsedPitchers || [old.name]), next.name].filter(Boolean);
  game.opponentPitcher = {
    ...next,
    pitchCount: 0,
    mood: (Number(next.restDays) || 0) > 0 || (Number(next.fatigue) || 0) >= 24 ? "피로" : "정상",
    battersFaced: 0,
    runsAllowed: 0,
    runnersAllowed: 0,
    hitsAllowed: 0,
    walksAllowed: 0
  };
  const reason = danger ? "난조" : tired ? "투구수 관리" : "승부처";
  const restText = (Number(next.restDays) || 0) > 0 ? `, 연투 피로 ${next.restDays}일` : "";
  return `${halfLabel(game)} 상대 벤치 투수 교체(${reason}): ${old.name} ${pitches}구 ${runs}실점 -> ${next.name}(${next.role}${restText})`;
}

function ensureProbableOpponentPitcher(state) {
  if (!state.opponentProbables || typeof state.opponentProbables !== "object") state.opponentProbables = {};
  const opp = currentOpponent(state);
  const key = `${state.day}-${opp.id}`;
  if (!state.opponentProbables[key] || !rosterBackedOpponentName(state, opp, state.opponentProbables[key].name)) {
    state.opponentProbables[key] = selectOpponentStarter(state, opp);
  }
  if (!state.opponentProbables[key].jerseyNumber) {
    const roll = seededRndFactory(`${opp.id}-${key}-probable-number`);
    state.opponentProbables[key].jerseyNumber = roll(11, 99);
  }
  return state.opponentProbables[key];
}

function basesLabel(bases) {
  return `${bases[0] ? "1" : "-"}${bases[1] ? "2" : "-"}${bases[2] ? "3" : "-"}`;
}

function resolveGroundDoublePlay(game) {
  const [first, second, third] = game.bases;
  const outsBefore = game.outs;
  let runs = 0;
  const nextBases = [null, null, null];

  if (outsBefore === 0) {
    if (third) runs += 1;
    if (second) nextBases[2] = second;
  }

  game.bases = nextBases;
  game.outs = Math.min(3, outsBefore + 2);
  return { runs, bases: basesLabel(game.bases), first, second, third };
}

function resolveGroundOut(game, batterName) {
  const [first, second, third] = game.bases;
  const outsBefore = game.outs;
  let runs = 0;
  let text = `${batterName} 1루 아웃`;

  if (first) {
    const nextBases = [batterName, null, null];
    if (second) {
      if (third) {
        nextBases[1] = first;
        nextBases[2] = second;
        text = `3루 주자 홈 포스아웃, ${batterName} 1루 출루`;
      } else {
        nextBases[1] = first;
        text = `2루 주자 3루 포스아웃, ${batterName} 1루 출루`;
      }
    } else {
      nextBases[2] = third || null;
      text = `1루 주자 2루 포스아웃, ${batterName} 1루 출루`;
    }
    game.bases = nextBases;
  } else {
    const nextBases = [null, null, null];
    if (third && outsBefore < 2) runs += 1;
    else if (third) nextBases[2] = third;
    if (second) nextBases[2] = second;
    game.bases = nextBases;
    text = `${batterName} 1루 아웃${runs ? ", 3루 주자 득점" : ""}`;
  }

  game.outs = Math.min(3, outsBefore + 1);
  return { runs, bases: basesLabel(game.bases), text };
}

function createActiveGame(state, lineup, starterId, lineupPositions) {
  if ((state.day || 1) > (state.seasonGames || 144) && !state.postseason?.active && !state.postseason?.completed) {
    startPostseason(state);
  }
  if (state.postseason?.completed) {
    addNews(state, "새 시즌 준비", "한국시리즈까지 끝났습니다. 리그 화면에서 다음 시즌 시작을 진행하세요.", "구단");
    return state;
  }
  const currentSeries = currentPostseasonSeries(state);
  if (currentSeries && !currentSeries.teamIds.includes(state.selectedTeamId)) {
    addNews(state, "포스트시즌 대기", `${currentSeries.name}은 우리 팀 경기가 아닙니다. 경기 스킵으로 해당 라운드를 자동 진행합니다.`, "포스트시즌");
    advancePostseasonGame(state);
    return state;
  }
  const rawLineup = Array.isArray(lineup) ? lineup.map(Number).slice(0, 9) : [];
  if (rawLineup.length !== 9 || new Set(rawLineup).size !== 9) {
    addNews(state, "라인업 제출 실패", "타순에는 1군 야수 9명이 중복 없이 들어가야 한다.", "경기");
    return state;
  }
  const cleanLineup = Array.isArray(lineup)
    ? lineup.map(Number).filter((id, index, arr) => arr.indexOf(id) === index && state.players.some((p) => p.id === id && p.type === "BAT" && p.rosterStatus === "ACTIVE")).slice(0, 9)
    : defaultLineup(state);
  if (cleanLineup.length !== 9) {
    addNews(state, "라인업 제출 실패", "라인업에는 현재 1군에 등록된 야수만 넣을 수 있다.", "경기");
    return state;
  }
  const cleanPositions = normalizeLineupPositions(cleanLineup, lineupPositions, state);
  if (!hasCompleteFieldPositions(cleanPositions)) {
    addNews(state, "라인업 제출 실패", "수비 포지션은 C, 1B, 2B, 3B, SS, LF, CF, RF, DH가 각각 한 번씩 필요하다.", "경기");
    return state;
  }
  const opp = currentOpponent(state);
  const postseasonSeries = currentPostseasonSeries(state);
  const scheduleEntry = currentScheduleEntry(state);
  const pitcherId = startingPitcher(state, starterId);
  const opponentStarter = { ...ensureProbableOpponentPitcher(state), pitchCount: 0, mood: "정상", battersFaced: 0, runsAllowed: 0, runnersAllowed: 0, hitsAllowed: 0, walksAllowed: 0 };
  state.lastLineup = {
    lineup: cleanLineup,
    lineupPositions: cleanPositions,
    starterId: pitcherId,
    day: state.day
  };
  state.activeGame = {
    opponentId: opp.id,
    isHome: postseasonSeries ? true : Boolean(scheduleEntry?.isHome),
    lineup: cleanLineup,
    lineupPositions: cleanPositions,
    usedPositionPlayers: [...cleanLineup],
    removedPositionPlayers: [],
    pitcherId,
    usedPitchers: [pitcherId].filter(Boolean),
    pitcherUsage: pitcherId ? { [pitcherId]: 0 } : {},
    pitcherOuts: pitcherId ? { [pitcherId]: 0 } : {},
    pitcherRuns: pitcherId ? { [pitcherId]: 0 } : {},
    pitcherStrikeouts: pitcherId ? { [pitcherId]: 0 } : {},
    pitcherEntries: pitcherId ? { [pitcherId]: { inning: 1, half: "top", outs: 0, userScore: 0, oppScore: 0 } } : {},
    pitchCount: 0,
    pitcherMood: "정상",
    opponentPitcher: opponentStarter,
    opponentBullpen: applyOpponentBullpenHistory(state, opp, makeOpponentBullpen(opp, opp.id)),
    opponentUsedPitchers: [opponentStarter.name].filter(Boolean),
    opponentPitcherUsage: {},
    tactic: "swing",
    pendingSteal: null,
    runnerTactic: "normal",
    count: { balls: 0, strikes: 0 },
    opponentLineup: makeOpponentLineup(state, opp),
    opponentLineupIndex: 0,
    inning: 1,
    half: "top",
    outs: 0,
    bases: [null, null, null],
    lineupIndex: 0,
    score: { user: 0, opp: 0 },
    complete: false,
    log: [`1회초 ${currentTeam(state).short} 공격 시작. 감독은 작전과 교체 타이밍만 지시한다.`]
  };
  state.activeGame.log = [`1회초 ${state.activeGame.isHome ? opp.short : currentTeam(state).short} 공격 시작. ${state.activeGame.isHome ? "홈경기라 먼저 수비합니다." : "원정경기라 먼저 공격합니다."}`];
  return state;
}

function resetActiveGame(state) {
  state.activeGame = null;
  addNews(state, "라인업 재작성", "진행 중인 수동 경기 상태를 초기화하고 새 라인업을 작성할 수 있게 했다.", "경기");
  return state;
}

function advanceRunners(game, batterName, bases) {
  let runs = 0;
  if (bases >= 4) {
    runs += 1 + game.bases.filter(Boolean).length;
    game.bases = [null, null, null];
    return { runs, text: `${batterName} 홈런` };
  }
  const moved = [null, null, null];
  for (let i = 2; i >= 0; i--) {
    const runner = game.bases[i];
    if (!runner) continue;
    const target = i + bases;
    if (target >= 3) runs += 1;
    else moved[target] = runner;
  }
  moved[bases - 1] = batterName;
  game.bases = moved;
  return { runs, text: `${batterName} ${bases === 1 ? "안타" : bases === 2 ? "2루타" : "3루타"}` };
}

function walkBatter(game, batterName) {
  let runs = 0;
  const [first, second, third] = game.bases;
  if (first && second && third) runs += 1;
  const newThird = second && first ? second : third;
  const newSecond = first ? first : second;
  game.bases = [batterName, newSecond, newThird];
  return { runs, text: `${batterName} 볼넷` };
}

function advanceOnPassedBall(game) {
  let runs = 0;
  const [first, second, third] = game.bases;
  if (third) runs += 1;
  game.bases = [null, first || null, second || null];
  return { runs, bases: basesLabel(game.bases) };
}

function nextHalfInning(state) {
  const game = state.activeGame;
  game.outs = 0;
  game.bases = [null, null, null];
  game.count = { balls: 0, strikes: 0 };
  game.paPitchCount = 0;
  game.pendingSteal = null;
  if (shouldFinishAfterHalf(game)) {
    finishManualGame(state);
    return;
  }
  if (game.half === "top") {
    game.half = "bottom";
  } else {
    game.inning += 1;
    game.half = "top";
  }
  game.log.unshift(`${halfLabel(game)} ${halfOffenseName(state, game)} 공격`);
}

function finishManualGame(state) {
  const game = state.activeGame;
  if (!game || game.complete) return;
  const me = currentTeam(state);
  const opp = state.teams.find((t) => t.id === game.opponentId) || currentOpponent(state);
  const won = game.score.user > game.score.opp;
  const tied = game.score.user === game.score.opp;
  if (state.postseason?.active) {
    if (tied) game.score.user += 1;
    const finalWon = game.score.user > game.score.opp;
    const winnerId = finalWon ? me.id : opp.id;
    const loserId = finalWon ? opp.id : me.id;
    const scoreText = finalWon
      ? `${me.city} ${me.name} ${game.score.user}-${game.score.opp} ${opp.city} ${opp.name}`
      : `${opp.city} ${opp.name} ${game.score.opp}-${game.score.user} ${me.city} ${me.name}`;
    state.morale += finalWon ? 4 : -3;
    state.fanInterest += finalWon ? 3 : -2;
    state.trainingPts += 2;
    state.morale = Math.max(20, Math.min(95, state.morale));
    state.fanInterest = Math.max(25, Math.min(98, state.fanInterest));
    updateManualPitchingStats(state, game, finalWon);
    game.pitchingStatsApplied = true;
    recoverOpponentBullpenFatigue(state);
    applyOpponentGamePitcherFatigue(state, game, opp);
    applyPostGameFatigue(state, game.pitcherUsage, game.lineup, game.lineupPositions);
    const playedIds = [...(game.lineup || []), ...(game.usedPitchers || []), game.pitcherId].filter(Boolean);
    maybeAutomaticInjury(state, playedIds.map((id) => state.players.find((p) => p.id === id)), "postseason-game");
    progressPitchTraining(state);
    progressTrainingAssignments(state);
    progressScheduledInjuryReturns(state);
    progressInjuryRecovery(state);
    recoverPitcherRest(state);
    game.complete = true;
    game.log.unshift(`포스트시즌 경기 종료: ${scoreText}`);
    registerPostseasonGame(state, winnerId, loserId, scoreText, true);
    return;
  }
  if (won) {
    me.w += 1;
    opp.l += 1;
    state.morale += 4;
    state.fanInterest += 3;
    state.trainingPts += 3;
  } else if (tied) {
    me.t = (me.t || 0) + 1;
    opp.t = (opp.t || 0) + 1;
    state.morale += 1;
    state.fanInterest += 1;
    state.trainingPts += 2;
  } else {
    me.l += 1;
    opp.w += 1;
    state.morale -= 2;
    state.fanInterest -= 1;
    state.trainingPts += 1;
  }
  recordTeamGame(me, game.score.user, game.score.opp, estimateTeamErrors(me, game.score.opp));
  recordTeamGame(opp, game.score.opp, game.score.user, estimateTeamErrors(opp, game.score.user));
  state.morale = Math.max(20, Math.min(95, state.morale));
  state.fanInterest = Math.max(25, Math.min(98, state.fanInterest));
  state.budget += won ? 0.5 : tied ? 0.25 : 0.15;
  state.lastGame = { opp: `${opp.city} ${opp.name}`, me: game.score.user, them: game.score.opp, won, tied };
  state.games.unshift({ day: state.day, text: `${won ? "승" : tied ? "무" : "패"} · ${me.city} ${me.name} ${game.score.user}-${game.score.opp} ${opp.city} ${opp.name}` });
  state.games = state.games.slice(0, 12);
  addNews(state, won ? `${me.short}, 벤치 작전으로 승리` : `${me.short}, 수동 운영 경기 패배`, `${opp.city} ${opp.name}전 ${game.score.user}-${game.score.opp}. 작전 로그가 경기 리포트에 저장됐다.`, "경기");
  updateManualPitchingStats(state, game, won);
  game.pitchingStatsApplied = true;
  recoverOpponentBullpenFatigue(state);
  applyOpponentGamePitcherFatigue(state, game, opp);
  applyPostGameFatigue(state, game.pitcherUsage, game.lineup, game.lineupPositions);
  const playedIds = [...(game.lineup || []), ...(game.usedPitchers || []), game.pitcherId].filter(Boolean);
  maybeAutomaticInjury(state, playedIds.map((id) => state.players.find((p) => p.id === id)), "manual-game");
  if (state.day % 6 === 0 || Math.random() < 0.18) generateOffer(state);
  maybeAutomaticTradeInquiry(state, "game");
  progressPitchTraining(state);
  progressTrainingAssignments(state);
  accrueServiceDays(state);
  simulateOtherTeams(state);
  state.day += 1;
  progressScheduledInjuryReturns(state);
  progressInjuryRecovery(state);
  recoverPitcherRest(state);
  game.complete = true;
  game.log.unshift(`경기 종료: ${me.short} ${game.score.user}-${game.score.opp} ${opp.short}`);
}

function isBuntTactic(tactic) {
  return ["bunt", "sacBunt", "safetyBunt", "squeezeBunt", "dragBunt"].includes(tactic);
}

function advanceSacrificeBunt(game) {
  const thirdScores = Boolean(game.bases[2]);
  game.bases = [null, game.bases[0], game.bases[1]];
  return thirdScores ? 1 : 0;
}

function buntStartText(game, tactic) {
  const pending = stealCommandToBases(game.pendingSteal).filter((index) => game.bases[index]);
  if (tactic === "squeezeBunt" && game.bases[2] && !pending.includes(2)) pending.push(2);
  const unique = [...new Set(pending)].sort((a, b) => b - a);
  if (!unique.length) return "";
  return unique.map((index) => `${index + 1}루 주자 스타트`).join(" / ");
}

function finishBuntPlay(game) {
  game.pendingSteal = null;
  game.count = { balls: 0, strikes: 0 };
  game.lineupIndex += 1;
}

function ensureBattingStats(player) {
  if (!player.stats) player.stats = {};
  ["hr", "rbi", "avg", "sb", "h", "r", "pa", "ab", "obp", "slg", "bb", "so", "tb", "hbp", "sf"].forEach((key) => {
    player.stats[key] = Number(player.stats[key]) || 0;
  });
  return player.stats;
}

function updateRateStats(player) {
  const stats = ensureBattingStats(player);
  const atBats = Math.max(0, stats.ab || 0);
  const obpDenominator = atBats + (stats.bb || 0) + (stats.hbp || 0) + (stats.sf || 0);
  stats.avg = atBats > 0 ? (stats.h || 0) / atBats : 0;
  stats.obp = obpDenominator > 0 ? ((stats.h || 0) + (stats.bb || 0) + (stats.hbp || 0)) / obpDenominator : 0;
  stats.slg = atBats > 0 ? (stats.tb || stats.h || 0) / atBats : 0;
}

function recordPlateAppearance(player, result = {}) {
  if (!player || player.type !== "BAT") return;
  const stats = ensureBattingStats(player);
  const countsAtBat = result.countsAtBat !== false;
  stats.pa += 1;
  if (countsAtBat) stats.ab += 1;
  if (result.hitBases && !result.error) stats.h += 1;
  if (result.hitBases && !result.error) stats.tb += Math.max(1, Number(result.hitBases) || 1);
  if (result.hitBases >= 4 && !result.error) stats.hr += 1;
  if (result.walk) stats.bb += 1;
  if (result.hitByPitch) stats.hbp += 1;
  if (result.sacFly) stats.sf += 1;
  if (result.strikeout) stats.so += 1;
  stats.rbi += Math.max(0, Number(result.rbi) || 0);
  stats.r += Math.max(0, Number(result.runs) || 0);
  updateRateStats(player);
}

function resolveBuntAttempt(state, game, batter, opponentPitcher, pitcherEdge, tactic) {
  const hasRunner = game.bases.some(Boolean);
  const hasRunnerOnThird = Boolean(game.bases[2]);
  const roll = rnd(1, 100);
  const baseSkill = batter.hit * 0.32 + batter.spd * 0.22 + batter.form * 0.24 - pitcherEdge * 0.12;
  const buntSkill = Math.max(24, Math.min(88, baseSkill + (tactic === "sacBunt" ? 12 : tactic === "squeezeBunt" ? 4 : tactic === "dragBunt" ? -2 : 0)));
  const label = tacticLabel(tactic);
  const startText = buntStartText(game, tactic);
  const startPrefix = startText ? `${startText}. ` : "";
  const pitchNo = Math.max(1, Number(game.paPitchCount) || 1);
  if (roll < 14) {
    game.count.balls += 1;
    if (game.count.balls >= 4) {
      const result = walkBatter(game, batter.name);
      game.score.user += result.runs;
      recordPlateAppearance(batter, { countsAtBat: false, walk: true, rbi: result.runs });
      finishBuntPlay(game);
      game.paPitchCount = 0;
      return `${startPrefix}${opponentPitcher.name} ${pitchNo}구, ${label} 지시였지만 볼넷. ${result.text}${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${basesLabel(game.bases)}`;
    }
    return `${startPrefix}${opponentPitcher.name} ${pitchNo}구, ${label} 지시였지만 볼. 카운트 ${game.count.balls}-${game.count.strikes}`;
  }
  if (roll < 32 && game.count.strikes < 2) {
    game.count.strikes += 1;
    return `${startPrefix}${opponentPitcher.name} ${pitchNo}구, ${label} 시도 중 ${foulBallDescription()}. 카운트 ${game.count.balls}-${game.count.strikes}`;
  }
  if (tactic === "safetyBunt" || tactic === "dragBunt") {
    const hitChance = Math.max(12, Math.min(58, buntSkill - 26 + (batter.spd || 55) * 0.18));
    if (roll < hitChance + 32) {
      const result = advanceRunners(game, batter.name, 1);
      game.score.user += result.runs;
      recordPlateAppearance(batter, { hitBases: 1, rbi: result.runs });
      finishBuntPlay(game);
      game.paPitchCount = 0;
      return `${startPrefix}${batter.name} ${label} 성공, ${result.text}${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${basesLabel(game.bases)}`;
    }
    game.outs += 1;
    recordPlateAppearance(batter, { out: true });
    finishBuntPlay(game);
    game.paPitchCount = 0;
    return `${startPrefix}${batter.name} ${label} 실패. 타자 아웃, 주자 ${basesLabel(game.bases)}`;
  }
  if (tactic === "squeezeBunt") {
    if (!hasRunnerOnThird) {
      game.outs += 1;
      recordPlateAppearance(batter, { out: true });
      finishBuntPlay(game);
      return `${startPrefix}${batter.name} 스퀴즈 지시였지만 3루 주자가 없어 번트 아웃. ${game.outs}아웃`;
    }
    if (roll < buntSkill) {
      game.bases[2] = null;
      const extraRun = advanceSacrificeBunt(game);
      game.score.user += 1 + extraRun;
      game.outs += 1;
      recordPlateAppearance(batter, { countsAtBat: false, rbi: 1 + extraRun });
      finishBuntPlay(game);
      game.paPitchCount = 0;
      return `${startPrefix}${batter.name} 스퀴즈 번트 성공. 3루 주자 홈인, ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`;
    }
    game.bases[2] = null;
    game.outs += 1;
    recordPlateAppearance(batter, { out: true });
    finishBuntPlay(game);
    game.paPitchCount = 0;
    return `${startPrefix}${batter.name} 스퀴즈 실패. 3루 주자 홈에서 아웃, ${game.outs}아웃`;
  }
  if (hasRunner && roll < buntSkill) {
    const runs = advanceSacrificeBunt(game);
    game.score.user += runs;
    game.outs += 1;
    recordPlateAppearance(batter, { countsAtBat: false, rbi: runs });
    finishBuntPlay(game);
    game.paPitchCount = 0;
    return `${startPrefix}${batter.name} 희생번트 성공${runs ? `, ${runs}득점` : ""}. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`;
  }
  game.outs += 1;
  recordPlateAppearance(batter, { out: true });
  finishBuntPlay(game);
  game.paPitchCount = 0;
  return `${startPrefix}${batter.name} 희생번트 실패. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`;
}

function resolveUserAtBat(state, tactic) {
  const game = state.activeGame;
  if (!game || game.complete || !isUserBattingHalf(game)) return state;
  const batterId = game.lineup[game.lineupIndex % game.lineup.length];
  const batter = state.players.find((p) => p.id === batterId);
  if (!batter) return state;
  const opp = state.teams.find((t) => t.id === game.opponentId) || currentOpponent(state);
  if (!game.count) game.count = { balls: 0, strikes: 0 };
  if ((game.count.balls || 0) === 0 && (game.count.strikes || 0) === 0 && Number(game.paPitchCount) > 0) game.paPitchCount = 0;
  ensureOpponentPersonnel(state, game, opp);
  if (!game.opponentPitcher) game.opponentPitcher = selectOpponentStarter(state, opp);
  ensureOpponentBullpen(state, game, opp);
  const opponentPitcher = game.opponentPitcher;
  const pitcherEdge = Math.max(38, opponentEffectivePower(opponentPitcher));
  const beforePa = {
    lineupIndex: game.lineupIndex,
    outs: game.outs,
    baseCount: countBasesOccupied(game.bases),
    userScore: Number(game.score?.user) || 0
  };
  const runnerIndexes = game.bases.map((runner, index) => runner ? index : -1).filter((index) => index >= 0);
  const isBuntCall = isBuntTactic(tactic);
  let stealCommand = game.pendingSteal;
  let stealSource = stealCommand ? "bench" : null;
  if (!isBuntCall && !stealCommand) {
    stealCommand = autoRunnerStealCommand(state, game);
    if (stealCommand) stealSource = "runner";
  }
  const stealAttempts = isBuntCall ? [] : stealCommandToBases(stealCommand).filter((index) => game.bases[index]);
  let text = "";
  let stealText = "";
  let pitchThrown = false;
  const throwOpponentPitch = () => {
    if (!pitchThrown) {
      opponentPitcher.pitchCount = (opponentPitcher.pitchCount || 0) + 1;
      game.paPitchCount = (Number(game.paPitchCount) || 0) + 1;
    }
    pitchThrown = true;
  };
  const paPitchNo = () => Math.max(1, Number(game.paPitchCount) || 1);

  if (runnerIndexes.length && !stealAttempts.length && rnd(1, 100) < Math.max(2, Math.min(8, (opponentPitcher.pickoff || 55) * 0.08))) {
    const pickoffTargets = runnerIndexes.filter((index) => !(index === 0 && game.bases[1]));
    const baseIndex = pickoffTargets.length ? pickoffTargets[rnd(0, pickoffTargets.length - 1)] : runnerIndexes[rnd(0, runnerIndexes.length - 1)];
    const runnerName = game.bases[baseIndex];
    const runner = state.players.find((p) => p.name === runnerName);
    const occupiedAhead = baseIndex < 2 && Boolean(game.bases[baseIndex + 1]);
    const safeChance = Math.max(78, Math.min(98, (runner?.spd || 60) + (runner?.form || 60) * 0.2 - (opponentPitcher.pickoff || 55) * 0.12 + (occupiedAhead ? 18 : 8)));
    if (rnd(1, 100) > safeChance) {
      game.bases[baseIndex] = null;
      game.outs += 1;
      text = `${opponentPitcher.name} 견제구, ${baseIndex + 1}루 주자 아웃. ${game.outs}아웃`;
    } else {
      text = `${opponentPitcher.name} 견제구, ${baseIndex + 1}루 주자 귀루. 카운트 ${game.count.balls}-${game.count.strikes}`;
    }
    game.tactic = "swing";
    game.log.unshift(`${halfLabel(game)} ${text}`);
    if (game.outs >= 3) nextHalfInning(state);
    return state;
  }

  if (stealAttempts.length) {
    throwOpponentPitch();
    const results = [];
    for (const stealFrom of stealAttempts) {
      if (game.outs >= 3 || !game.bases[stealFrom]) continue;
      const targetBase = stealFrom + 1;
      const runnerName = game.bases[stealFrom];
      const runner = state.players.find((p) => p.name === runnerName);
      const targetOccupiedByStayingRunner = targetBase < 3 && game.bases[targetBase] && !stealAttempts.includes(targetBase);
      if (targetOccupiedByStayingRunner) {
        results.push(`${stealFrom + 1}루 ${runnerName} 대기`);
        continue;
      }
      const speedEdge = stealFrom === 2 ? -18 : stealFrom === 1 ? -8 : 0;
      const multiPenalty = stealAttempts.length > 1 ? 5 : 0;
      const successChance = Math.max(10, Math.min(84, (runner?.spd || batter.spd || 55) + (runner?.form || batter.form || 60) / 3 - 20 + speedEdge - multiPenalty - (opponentPitcher.pickoff || 55) * 0.08));
      const success = rnd(1, 100) < successChance;
      if (success) {
        game.bases[stealFrom] = null;
        if (runner?.stats) runner.stats.sb = (runner.stats.sb || 0) + 1;
        if (targetBase >= 3) {
          game.score.user += 1;
          if (runner?.stats) {
            runner.stats.r = (runner.stats.r || 0) + 1;
            updateRateStats(runner);
          }
          results.push(`${stealFrom + 1}루 ${runnerName} 홈스틸 성공, 1득점`);
        } else {
          game.bases[targetBase] = runnerName;
          results.push(`${stealFrom + 1}루 ${runnerName} ${targetBase + 1}루 도루 성공`);
        }
      } else {
        game.outs += 1;
        game.bases[stealFrom] = null;
        results.push(`${stealFrom + 1}루 ${runnerName} 도루 실패`);
      }
    }
    const startKind = stealSource === "runner" ? `${runnerTacticLabel(game.runnerTactic)} 자율 스타트` : "스타트";
    text = `${opponentPitcher.name} ${paPitchNo()}구 ${startKind}, ${results.join(" / ")}. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`;
    stealText = text;
    if (game.outs >= 3) game.count = { balls: 0, strikes: 0 };
    game.pendingSteal = null;
  }
  if (game.outs >= 3) {
    // 도루 실패로 이닝이 끝난 경우 타격 결과는 진행하지 않는다.
  } else if (isBuntTactic(tactic)) {
    throwOpponentPitch();
    text = resolveBuntAttempt(state, game, batter, opponentPitcher, pitcherEdge, tactic);
  } else if (false && tactic === "bunt" && game.bases.some(Boolean)) {
    throwOpponentPitch();
    const roll = rnd(1, 100);
    const buntSkill = Math.max(28, Math.min(82, batter.hit * 0.35 + batter.spd * 0.18 + batter.form * 0.22 - pitcherEdge * 0.12));
    if (roll < 18) {
      game.count.balls += 1;
      if (game.count.balls >= 4) {
        const result = walkBatter(game, batter.name);
        game.score.user += result.runs;
        text = `${opponentPitcher.name} ${paPitchNo()}구, 번트 지시였지만 볼넷. ${result.text}${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${basesLabel(game.bases)}`;
        game.count = { balls: 0, strikes: 0 };
        game.lineupIndex += 1;
        game.paPitchCount = 0;
      } else {
        text = `${opponentPitcher.name} ${paPitchNo()}구, 번트 지시였지만 볼. 카운트 ${game.count.balls}-${game.count.strikes}`;
      }
    } else if (roll < 36 && game.count.strikes < 2) {
      game.count.strikes += 1;
      text = `${opponentPitcher.name} ${paPitchNo()}구, 번트 시도 중 ${foulBallDescription()}. 카운트 ${game.count.balls}-${game.count.strikes}`;
    } else if (roll < buntSkill) {
      const runnerNames = [...game.bases];
      game.bases = [null, game.bases[0], game.bases[1]];
      if (runnerNames[2]) game.score.user += 1;
      game.outs += 1;
      text = `${batter.name} 희생번트 성공. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`;
      game.count = { balls: 0, strikes: 0 };
      game.lineupIndex += 1;
      game.paPitchCount = 0;
    } else {
      game.outs += 1;
      text = `${batter.name} 번트 실패. ${game.outs}아웃`;
      game.count = { balls: 0, strikes: 0 };
      game.lineupIndex += 1;
      game.paPitchCount = 0;
    }
  } else {
    throwOpponentPitch();
    const wildChance = Math.max(0.2, Math.min(2.1, 1.65 - opponentEffectiveCommand(opponentPitcher) * 0.016 + game.count.balls * 0.14));
    if (game.bases.some(Boolean) && rnd(1, 100) <= wildChance) {
      game.count.balls += 1;
      const passed = advanceOnPassedBall(game);
      game.score.user += passed.runs;
      text = `${opponentPitcher.name} ${paPitchNo()}구 폭투. 주자 ${passed.bases}${passed.runs ? `, ${passed.runs}득점` : ""}. 카운트 ${game.count.balls}-${game.count.strikes}`;
      if (game.count.balls >= 4) {
        const result = walkBatter(game, batter.name);
        game.score.user += result.runs;
        recordPlateAppearance(batter, { countsAtBat: false, walk: true, rbi: result.runs });
        text += ` / ${result.text}${result.runs ? `, ${result.runs}득점` : ""}`;
        game.count = { balls: 0, strikes: 0 };
        game.lineupIndex += 1;
        game.paPitchCount = 0;
      }
    } else {
    const contact = batter.hit * 0.5 + batter.pow * 0.2 + batter.form * 0.16 + batter.happy * 0.08 - pitcherEdge * 0.22;
    const tacticProfile = battingTacticProfile(tactic, game.count);
    const pitchRoll = rnd(1, 100) + tacticProfile.rollBonus + opponentEffectiveCommand(opponentPitcher) * 0.12 - batter.hit * 0.1 - batter.form * 0.04;
    if (pitchRoll < tacticProfile.ballLimit) {
      game.count.balls += 1;
      if (game.count.balls >= 4) {
        const result = walkBatter(game, batter.name);
        game.score.user += result.runs;
        recordPlateAppearance(batter, { countsAtBat: false, walk: true, rbi: result.runs });
        text = `${opponentPitcher.name} ${paPitchNo()}구 볼넷. ${result.text}${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${basesLabel(game.bases)}`;
        game.count = { balls: 0, strikes: 0 };
        game.lineupIndex += 1;
        game.paPitchCount = 0;
      } else {
        text = `${opponentPitcher.name} ${paPitchNo()}구 볼. 카운트 ${game.count.balls}-${game.count.strikes}`;
      }
    } else if (pitchRoll < tacticProfile.strikeLimit) {
      game.count.strikes += 1;
      if (game.count.strikes >= 3) {
        game.outs += 1;
        recordPlateAppearance(batter, { out: true, strikeout: true });
        text = `${opponentPitcher.name} ${paPitchNo()}구, ${batter.name} 삼진. ${game.outs}아웃`;
        game.count = { balls: 0, strikes: 0 };
        game.lineupIndex += 1;
        game.paPitchCount = 0;
      } else {
        text = `${opponentPitcher.name} ${paPitchNo()}구 ${tacticProfile.strikeWord}. 카운트 ${game.count.balls}-${game.count.strikes}`;
      }
    } else if ((game.count.strikes >= 2 && pitchRoll < tacticProfile.foulLimit + Math.max(0, batter.hit - 65) * 0.18) || (pitchRoll < Math.min(tacticProfile.foulLimit, 59) && game.count.strikes < 2)) {
      const wasTwoStrike = game.count.strikes >= 2;
      game.count.strikes = wasTwoStrike ? 2 : game.count.strikes + 1;
      text = `${opponentPitcher.name} ${paPitchNo()}구, ${foulBallDescription()}. 카운트 ${game.count.balls}-${game.count.strikes}`;
    } else {
      const event = userBattedBallEvent(batter, opponentPitcher, tactic);
      const fielding = opponentFielderDetail(event, batter);
      const battedText = battedBallDescription(event, fielding, batter);
      if (event.bases > 0) {
        const result = advanceRunners(game, batter.name, event.bases);
        game.score.user += result.runs;
        recordPlateAppearance(batter, { hitBases: event.bases, error: event.error, rbi: event.error ? 0 : result.runs, runs: !event.error && event.bases >= 4 ? 1 : 0 });
        const errorText = event.error ? ` (${fielding.name} ${fielding.errorType})` : "";
        const touchText = hitDefenseTouchText(event, fielding);
        text = `${opponentPitcher.name} ${paPitchNo()}구, ${battedText}. ${result.text}${errorText}${touchText}${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${basesLabel(game.bases)}`;
      } else if (game.bases[0] && game.outs <= 1 && rnd(1, 100) < Math.max(5, Math.min(24, 28 - (batter.spd || 55) * 0.2 + opponentEffectiveCommand(opponentPitcher) * 0.05))) {
        const result = resolveGroundDoublePlay(game);
        game.score.user += result.runs;
        recordPlateAppearance(batter, { out: true, rbi: result.runs });
        text = `${opponentPitcher.name} ${paPitchNo()}구, ${battedText}. ${batter.name} 병살타. 상대 유격수-2루수-1루수 처리, ${game.outs}아웃${result.runs ? `, ${result.runs}득점` : ""}. 주자 ${result.bases}`;
      } else {
        game.outs += 1;
        const great = rnd(1, 100) < fielding.greatChance;
        if (fielding.isAir) {
          const sac = trySacrificeFly(game, "user", 64);
          recordPlateAppearance(batter, { countsAtBat: !sac.scored, out: true, rbi: sac.scored ? 1 : 0, sacFly: Boolean(sac.scored) });
          text = `${opponentPitcher.name} ${paPitchNo()}구, ${battedText}. ${great ? `${fielding.name} 호수비! ` : ""}${fielding.name} ${fielding.outType}${sac.scored ? " · 희생플라이" : ""}${sac.text}. ${game.outs}아웃`;
        } else {
          game.outs -= 1;
          const ground = resolveGroundOut(game, batter.name);
          game.score.user += ground.runs;
          const batterOut = ground.text.includes("1루 아웃");
          recordPlateAppearance(batter, { out: batterOut, rbi: ground.runs });
          text = `${opponentPitcher.name} ${paPitchNo()}구, ${battedText}. ${great ? `${fielding.name} 호수비! ` : ""}${fielding.name} ${fielding.outType}, ${ground.text}${ground.runs ? `, ${ground.runs}득점` : ""}. ${game.outs}아웃, 주자 ${ground.bases}`;
        }
      }
      game.count = { balls: 0, strikes: 0 };
      game.lineupIndex += 1;
      game.paPitchCount = 0;
    }
    }
  }
  if (opponentPitcher.pitchCount > opponentPitcher.stamina + 18) opponentPitcher.mood = "난조";
  else if (opponentPitcher.pitchCount > opponentPitcher.stamina) opponentPitcher.mood = "피로";
  else opponentPitcher.mood = "정상";
  const paEnded = creditOpponentPitcherAfterPa(game, beforePa, text);
  const opponentChangeText = maybeChangeOpponentPitcher(state, paEnded);
  if (stealText && !text.includes(stealText)) text = `${stealText} / ${text}`;
  game.tactic = "swing";
  if (isWalkoffState(game)) {
    game.log.unshift(`${halfLabel(game)} ${text}`);
    if (opponentChangeText) game.log.unshift(opponentChangeText);
    finishManualGame(state);
    return state;
  }
  game.log.unshift(`${halfLabel(game)} ${text}`);
  if (opponentChangeText) game.log.unshift(opponentChangeText);
  if (game.outs >= 3) nextHalfInning(state);
  return state;
}

function userRelieverPriority(role, inning, closeGame, trouble) {
  if (trouble && inning <= 5) return role === "LR" ? 36 : role === "MR" ? 22 : role === "SU" ? 8 : 0;
  if (inning >= 9 && closeGame) return role === "CL" ? 42 : role === "SU" ? 24 : role === "MR" ? 8 : 0;
  if (inning >= 7 && closeGame) return role === "SU" ? 34 : role === "CL" ? 20 : role === "MR" ? 14 : 0;
  if (inning >= 6) return role === "MR" ? 24 : role === "SU" ? 14 : role === "LR" ? 8 : 0;
  return role === "LR" ? 22 : role === "MR" ? 14 : 0;
}

function chooseUserReliever(state, game, trouble = false) {
  const used = new Set((game.usedPitchers || []).map(Number));
  const diff = Math.abs((Number(game.score?.user) || 0) - (Number(game.score?.opp) || 0));
  const closeGame = diff <= 3;
  const pool = (state.players || [])
    .filter((p) => (p.teamId === state.selectedTeamId || !p.teamId) && p.type === "PIT" && p.rosterStatus === "ACTIVE")
    .filter((p) => p.health?.status !== "INJURED" && p.id !== game.pitcherId && !used.has(Number(p.id)));
  if (!pool.length) return null;
  return pool
    .map((p) => {
      const role = p.pitcherRole || (p.pos === "SP" ? "SP" : p.pos === "CL" ? "CL" : "MR");
      const starterPenalty = role === "SP" ? (trouble && game.inning <= 4 ? 8 : 34) : 0;
      const restPenalty = Math.max(0, Number(p.restDays) || 0) * 8;
      const staminaFit = role === "LR" && game.inning <= 5 ? 9 : role === "CL" && game.inning < 8 ? -12 : 0;
      return {
        p,
        score:
          (Number(p.ovr) || 60) * 0.55 +
          (Number(p.pit) || 60) * 0.34 +
          (Number(p.form) || 65) * 0.18 +
          (Number(p.stamina) || 45) * 0.08 +
          userRelieverPriority(role, game.inning, closeGame, trouble) +
          staminaFit -
          restPenalty -
          starterPenalty
      };
    })
    .sort((a, b) => b.score - a.score)[0]?.p || null;
}

function maybeAutoChangeUserPitcher(state) {
  const game = state.activeGame;
  if (!game || game.complete || !isOpponentBattingHalf(game) || game.outs >= 3) return false;
  if ((game.count?.balls || 0) !== 0 || (game.count?.strikes || 0) !== 0) return false;
  const current = state.players.find((p) => p.id === game.pitcherId);
  if (!current) return false;
  const role = current.pitcherRole || (current.pos === "SP" ? "SP" : current.pos === "CL" ? "CL" : "MR");
  const starter = role === "SP";
  const pitches = Number(game.pitchCount) || 0;
  const stamina = Number(current.stamina) || (starter ? 78 : 36);
  const runs = Number(game.pitcherRuns?.[current.id]) || 0;
  const runners = countBasesOccupied(game.bases);
  const scoreDiff = Math.abs((Number(game.score?.user) || 0) - (Number(game.score?.opp) || 0));
  const closeGame = scoreDiff <= 3;
  const trouble = runs >= (game.inning <= 4 ? 5 : 3) || runners >= 2 || game.pitcherMood === "난조";
  const fatigueLine = starter
    ? Math.max(78, Math.min(104, stamina + 14))
    : Math.max(17, Math.min(34, Math.round(stamina * 0.62)));
  const tired = pitches >= fatigueLine || (starter && game.inning >= 6 && pitches >= Math.max(72, stamina + 2));
  const forced = pitches >= fatigueLine + (starter ? 15 : 8);
  const leverageHook = !starter && game.inning >= 7 && closeGame && pitches >= Math.max(16, fatigueLine - 4);
  const earlyPatience = starter && game.inning <= 4 && pitches < 82 && runs < 5;
  if (!forced && earlyPatience) return false;
  if (!forced && !tired && !trouble && !leverageHook) return false;
  const next = chooseUserReliever(state, game, trouble || forced);
  if (!next) return false;
  const oldName = current.name;
  const reason = forced ? "한계 투구수" : trouble ? "실점 위기" : tired ? "피로 누적" : "승부처";
  changePitcher(state, next.id);
  game.log.unshift(`${halfLabel(game)} 자동 불펜 운영(${reason}): ${oldName} ${pitches}구 ${runs}실점 -> ${next.name}(${pitcherRoleLabel(next.pitcherRole || next.pos)})`);
  return true;
}

function resolveOpponentHalf(state) {
  const game = state.activeGame;
  if (!game || game.complete || !isOpponentBattingHalf(game)) return state;
  const inning = game.inning;
  const half = game.half;
  let guard = 0;
  while (!game.complete && game.inning === inning && game.half === half && guard < 120) {
    resolveOpponentPlateAppearance(state);
    guard += 1;
  }
  return state;
}

function addPitchToActivePitcher(game, pitcher, amount = 1) {
  const pitches = Math.max(0, Number(amount) || 0);
  if (!game || pitches <= 0) return;
  game.pitchCount = (game.pitchCount || 0) + pitches;
  game.paPitchCount = (Number(game.paPitchCount) || 0) + pitches;
  if (pitcher) {
    if (!game.pitcherUsage) game.pitcherUsage = {};
    game.pitcherUsage[pitcher.id] = (game.pitcherUsage[pitcher.id] || 0) + pitches;
  }
}

function finishAtBatPitchTax(game, pitcher) {
  const count = Number(game.paPitchCount) || 0;
  const extra = count <= 1 ? rnd(1, 3) : count <= 2 ? rnd(1, 2) : count <= 4 && Math.random() < 0.45 ? 1 : 0;
  addPitchToActivePitcher(game, pitcher, extra);
}

function updatePitcherMood(game, pitcher, hardContact) {
  if (!pitcher) {
    game.pitcherMood = "불명";
    return;
  }
  const fatigue = game.pitchCount - Math.max(45, pitcher.stamina || 60);
  if (hardContact >= 2 || fatigue > 28) game.pitcherMood = "난조";
  else if (fatigue > 12) game.pitcherMood = "피로";
  else if ((pitcher.form || 60) >= 78) game.pitcherMood = "좋음";
  else game.pitcherMood = "정상";
}

function recordPitcherGameLine(game, pitcher, outsAdded, runsAdded, strikeoutsAdded = 0) {
  if (!game || !pitcher) return;
  const id = pitcher.id;
  if (!game.pitcherOuts) game.pitcherOuts = {};
  if (!game.pitcherRuns) game.pitcherRuns = {};
  if (!game.pitcherStrikeouts) game.pitcherStrikeouts = {};
  game.pitcherOuts[id] = (game.pitcherOuts[id] || 0) + Math.max(0, outsAdded || 0);
  game.pitcherRuns[id] = (game.pitcherRuns[id] || 0) + Math.max(0, runsAdded || 0);
  game.pitcherStrikeouts[id] = (game.pitcherStrikeouts[id] || 0) + Math.max(0, strikeoutsAdded || 0);
}

function ensurePitchingStats(player) {
  if (!player.stats) player.stats = {};
  player.stats.era = Number.isFinite(Number(player.stats.era)) ? Number(player.stats.era) : 0;
  player.stats.win = Number(player.stats.win) || 0;
  player.stats.loss = Number(player.stats.loss) || 0;
  player.stats.so = Number(player.stats.so) || 0;
  player.stats.sv = Number(player.stats.sv) || 0;
  player.stats.hold = Number(player.stats.hold) || 0;
  player.stats.ip = Number(player.stats.ip) || 0;
  return player.stats;
}

function pitcherEntrySnapshot(game) {
  return {
    inning: Number(game?.inning) || 1,
    half: game?.half || "top",
    outs: Number(game?.outs) || 0,
    userScore: Number(game?.score?.user) || 0,
    oppScore: Number(game?.score?.opp) || 0
  };
}

function ensurePitcherEntryTracking(game) {
  if (!game) return {};
  if (!game.pitcherEntries) game.pitcherEntries = {};
  const starterId = Number((game.usedPitchers || [])[0] || game.pitcherId);
  if (starterId && !game.pitcherEntries[starterId]) {
    game.pitcherEntries[starterId] = { inning: 1, half: "top", outs: 0, userScore: 0, oppScore: 0 };
  }
  return game.pitcherEntries;
}

function applyManualSaveHoldStats(state, game, outsMap) {
  if (!game || !state || (Number(game.score?.user) || 0) <= (Number(game.score?.opp) || 0)) return;
  const used = [...new Set((game.usedPitchers || []).map(Number).filter(Boolean))];
  if (used.length < 2) return;
  const entries = ensurePitcherEntryTracking(game);
  const starterId = used[0];
  const finalId = Number(game.pitcherId || used[used.length - 1]);
  const finalLead = (Number(game.score?.user) || 0) - (Number(game.score?.opp) || 0);
  const finalOuts = Number(outsMap[finalId]) || 0;
  const finalEntry = entries[finalId] || {};
  const finalEntryLead = (Number(finalEntry.userScore) || 0) - (Number(finalEntry.oppScore) || 0);
  const finalInning = Number(finalEntry.inning) || Number(game.inning) || 9;
  const saveEligible = finalId !== starterId
    && finalOuts > 0
    && (finalLead <= 3 || (finalEntryLead > 0 && finalEntryLead <= 3) || finalOuts >= 9 || finalInning >= 8);
  if (saveEligible) {
    const closer = state.players.find((p) => p.id === finalId && p.type === "PIT");
    if (closer) ensurePitchingStats(closer).sv += 1;
  }
  used.forEach((id) => {
    if (id === starterId || id === finalId) return;
    const outs = Number(outsMap[id]) || 0;
    if (outs <= 0) return;
    const entry = entries[id] || {};
    const entryLead = (Number(entry.userScore) || 0) - (Number(entry.oppScore) || 0);
    const inning = Number(entry.inning) || 6;
    if (entryLead <= 0) return;
    if (entryLead <= 3 || inning >= 6 || finalLead <= 3) {
      const reliever = state.players.find((p) => p.id === id && p.type === "PIT");
      if (reliever) ensurePitchingStats(reliever).hold += 1;
    }
  });
}

function updateManualPitchingStats(state, game, won) {
  if (!game) return;
  ensurePitcherEntryTracking(game);
  const outsMap = { ...(game.pitcherOuts || {}) };
  const runsMap = { ...(game.pitcherRuns || {}) };
  const soMap = { ...(game.pitcherStrikeouts || {}) };
  const trackedOuts = Object.values(outsMap).reduce((sum, value) => sum + (Number(value) || 0), 0);
  if (trackedOuts < 18) {
    const starterId = (game.usedPitchers || [])[0] || game.pitcherId;
    const starter = state.players.find((p) => p.id === Number(starterId));
    if (starter) {
      const inferredOuts = game.inning >= 9 ? 27 : Math.max(0, (game.inning - 1) * 3 + (game.outs || 0));
      outsMap[starterId] = Math.max(Number(outsMap[starterId]) || 0, inferredOuts);
      runsMap[starterId] = Math.max(Number(runsMap[starterId]) || 0, Number(game.score?.opp) || 0);
      const pitches = Number(game.pitcherUsage?.[starterId]) || Number(game.pitchCount) || 0;
      const estimatedKs = Math.max(Number(soMap[starterId]) || 0, Math.round((pitches * (starter.pit || 65)) / 720));
      soMap[starterId] = estimatedKs;
    }
  }
  Object.entries(outsMap).forEach(([id, rawOuts]) => {
    const outs = Number(rawOuts) || 0;
    const pitcher = state.players.find((p) => p.id === Number(id));
    if (!pitcher || pitcher.type !== "PIT" || outs <= 0) return;
    const stats = ensurePitchingStats(pitcher);
    const oldIp = Number(stats.ip) || 0;
    const oldEarnedRuns = (Number(stats.era) || 0) * oldIp / 9;
    const runs = Number(runsMap[id]) || 0;
    const newIp = oldIp + outs / 3;
    const newEarnedRuns = oldEarnedRuns + runs;
    stats.ip = Math.round(newIp * 10) / 10;
    stats.era = newIp > 0 ? Math.round((newEarnedRuns * 9 / newIp) * 100) / 100 : 0;
    stats.so += Number(soMap[id]) || 0;
  });
  const starterId = (game.usedPitchers || [])[0] || game.pitcherId;
  const starter = state.players.find((p) => p.id === Number(starterId));
  if (starter?.type === "PIT" && won) ensurePitchingStats(starter).win += 1;
  if (starter?.type === "PIT" && !won && (Number(game.score?.user) || 0) < (Number(game.score?.opp) || 0)) ensurePitchingStats(starter).loss += 1;
  if (won) applyManualSaveHoldStats(state, game, outsMap);
}

function defensiveUnit(state, game) {
  const fielders = (game.lineup || [])
    .map((id, index) => ({ player: state.players.find((p) => p.id === id), pos: game.lineupPositions?.[index] || FIELD_POSITIONS[index] || "DH" }))
    .filter((entry) => entry.player && entry.pos !== "DH");
  const byPos = (positions) => fielders.filter((entry) => positions.includes(entry.pos)).map((entry) => entry.player);
  const all = fielders.map((entry) => entry.player);
  const infield = byPos(["C", "1B", "2B", "3B", "SS"]);
  const outfield = byPos(["LF", "CF", "RF"]);
  const catcher = fielders.find((entry) => entry.pos === "C")?.player;
  return {
    fielders,
    def: avg(all.map((p) => p.def || 55)),
    arm: avg(all.map((p) => p.arm || 55)),
    infieldArm: avg(infield.map((p) => p.arm || 55)),
    outfieldArm: avg(outfield.map((p) => p.arm || 55)),
    catcherArm: catcher?.arm || avg(all.map((p) => p.arm || 55))
  };
}

function fielderByPos(defense, pos) {
  return defense?.fielders?.find((entry) => entry.pos === pos)?.player || null;
}

function chooseFielder(defense, positions) {
  const pool = (defense?.fielders || []).filter((entry) => positions.includes(entry.pos));
  if (!pool.length) return null;
  return pool[rnd(0, pool.length - 1)];
}

function battedBallDefenseDetail(defense, batter, event = {}) {
  const pull = rnd(1, 100);
  const isAir = event.bases >= 2 || rnd(1, 100) > 58;
  const positions = isAir
    ? (pull < 34 ? ["LF"] : pull < 67 ? ["CF"] : ["RF"])
    : (pull < 22 ? ["3B"] : pull < 43 ? ["SS"] : pull < 65 ? ["2B"] : pull < 84 ? ["1B"] : ["P", "C"]);
  let entry = chooseFielder(defense, positions);
  if (!entry && positions.includes("P")) entry = { pos: "P", player: null };
  if (!entry) entry = chooseFielder(defense, isAir ? ["LF", "CF", "RF"] : ["1B", "2B", "3B", "SS", "C"]);
  const player = entry?.player;
  const name = player?.name || (entry?.pos === "P" ? "투수" : "야수");
  const pos = entry?.pos || "?";
  const def = player?.def || defense?.def || 60;
  const arm = player?.arm || defense?.arm || 60;
  const hard = (batter?.power || batter?.contact || 60) + (event.bases || 0) * 8;
  const errorChance = Math.max(1, Math.min(18, 10 + hard * 0.06 - def * 0.09 - arm * 0.03));
  const greatChance = Math.max(2, Math.min(20, def * 0.17 + arm * 0.06 - hard * 0.07));
  const errorType = isAir ? "포구 실책" : (rnd(1, 100) > 55 ? "송구 실책" : "포구 실책");
  const outType = isAir ? "뜬공 처리" : (pos === "C" ? "포수 앞 땅볼 처리" : "땅볼 처리");
  return { name, pos, def, arm, isAir, errorChance, greatChance, errorType, outType };
}

function opponentFielderDetail(event = {}, batter = {}) {
  const pull = rnd(1, 100);
  const isAir = event.bases >= 2 || rnd(1, 100) > 58;
  const pos = isAir
    ? (pull < 34 ? "LF" : pull < 67 ? "CF" : "RF")
    : (pull < 22 ? "3B" : pull < 43 ? "SS" : pull < 65 ? "2B" : pull < 84 ? "1B" : "C");
  const posKo = { C: "포수", "1B": "1루수", "2B": "2루수", "3B": "3루수", SS: "유격수", LF: "좌익수", CF: "중견수", RF: "우익수" }[pos] || "야수";
  const hard = (batter?.pow || batter?.hit || 60) + (event.bases || 0) * 8;
  return {
    pos,
    name: `상대 ${posKo}`,
    isAir,
    outType: isAir ? "뜬공 처리" : "땅볼 처리",
    errorType: isAir ? "포구 실책" : (rnd(1, 100) > 55 ? "송구 실책" : "포구 실책"),
    errorChance: Math.max(1, Math.min(12, 7 + hard * 0.04 - 4)),
    greatChance: Math.max(2, Math.min(16, 8 - hard * 0.03 + rnd(0, 7)))
  };
}

function sampleText(list) {
  return list[rnd(0, list.length - 1)];
}

function battedBallDescription(event = {}, fielding = {}, batter = {}) {
  const pos = fielding.pos || "CF";
  const posKo = { C: "포수", P: "투수", "1B": "1루수", "2B": "2루수", "3B": "3루수", SS: "유격수", LF: "좌익수", CF: "중견수", RF: "우익수" }[pos] || "야수";
  const batterPower = batter.pow || batter.power || batter.hit || batter.contact || 60;
  if (event.error) {
    return sampleText([
      `${posKo} 정면 땅볼이었지만 글러브 밑으로 빠집니다`,
      `${posKo}가 잡고 던지는 과정에서 송구가 높았습니다`,
      `평범한 타구처럼 보였지만 ${posKo} 처리 실수`
    ]);
  }
  if (event.bases >= 4) {
    return sampleText([
      "좌중간 담장을 그대로 넘기는 홈런",
      "높게 뜬 타구가 우측 담장을 넘어갑니다",
      batterPower >= 78 ? "맞는 순간 넘어간 걸 알 수 있는 대형 홈런" : "외야수가 따라갔지만 담장 밖으로 넘어갑니다"
    ]);
  }
  if (event.bases === 3) {
    return sampleText([
      "우중간을 완전히 가르는 3루타",
      "좌중간 깊숙한 곳까지 굴러가는 장타",
      "외야 사이를 꿰뚫고 담장까지 굴러갑니다"
    ]);
  }
  if (event.bases === 2) {
    const byPos = {
      LF: ["좌익선상 깊숙한 2루타", "좌중간을 가르는 2루타", "좌익수 뒤쪽으로 뻗는 장타"],
      CF: ["중견수 키를 넘기는 2루타", "중견수 앞에서 크게 튀어 담장 쪽으로 갑니다", "가운데 펜스까지 굴러가는 2루타"],
      RF: ["우익선상으로 흐르는 2루타", "우중간을 가르는 장타", "우익수 뒤로 떨어지는 2루타"]
    };
    return sampleText(byPos[pos] || byPos.CF);
  }
  if (event.bases === 1) {
    const byPos = {
      P: ["투수 옆을 스치고 빠지는 내야안타성 타구", "마운드 맞고 굴절되는 안타"],
      C: ["포수 앞에 멈춘 빗맞은 타구, 타자주자 빠르게 1루", "홈 앞에서 크게 튄 타구가 안타가 됩니다"],
      "1B": ["1루수 옆을 빠져나가는 우전 안타", "1루 선상 안쪽으로 빠지는 안타"],
      "2B": ["1·2간을 깨끗하게 빠져나가는 안타", "먹힌 타구지만 2루수 뒤에 떨어집니다"],
      "3B": ["3루수 옆을 빠져 좌익수 앞으로 굴러가는 안타", "3루 선상 안쪽으로 빠지는 좌전 안타"],
      SS: ["유격수 키 살짝 넘기는 안타", "3·유간 사이로 빠지는 좌전 안타"],
      LF: ["좌익수 앞에 떨어지는 좌전 안타", "3·유간을 지나 좌익수 앞으로 굴러갑니다"],
      CF: ["중견수 앞에 떨어지는 깨끗한 중전 안타", "2루 베이스 뒤쪽을 지나 중견수 앞으로 굴러갑니다"],
      RF: ["우익수 앞에 떨어지는 우전 안타", "1·2간을 빠져 우익수 앞으로 갑니다"]
    };
    return sampleText(byPos[pos] || byPos.CF);
  }
  if (fielding.isAir) {
    return sampleText([
      `${posKo} 방향 높은 뜬공`,
      `${posKo} 파울 지역으로 밀려가는 파울플라이`,
      `외야 정면으로 힘없이 뜬 타구`,
      `${posKo}가 한 걸음 앞으로 나오며 잡을 수 있는 뜬공`
    ]);
  }
  return sampleText([
    `${posKo} 정면 땅볼`,
    `${posKo} 왼쪽으로 빠지는 듯했지만 잡아냅니다`,
    `빗맞은 땅볼이 ${posKo} 쪽으로 갑니다`,
    `강한 땅볼, ${posKo}가 몸으로 막아냅니다`
  ]);
}

function hitDefenseTouchText(event = {}, fielding = {}) {
  if ((event.bases || 0) >= 4) return "";
  const pos = fielding.pos || "";
  const name = fielding.name || "야수";
  if ((event.bases || 0) >= 2) {
    if (["LF", "CF", "RF"].includes(pos)) return `, ${name}이 펜스 쪽 타구를 쫓아갑니다`;
    return `, ${name}이 중계 플레이를 준비합니다`;
  }
  if (["LF", "CF", "RF"].includes(pos)) return `, ${name}이 전진해 잡아 중계`;
  if (["SS", "2B", "3B", "1B", "P"].includes(pos)) return `, ${name}이 글러브를 뻗었지만 통과`;
  if (pos === "C") return `, ${name}이 잡아 던지기엔 늦었습니다`;
  return `, ${name}이 타구를 따라갑니다`;
}

function foulBallDescription() {
  return sampleText([
    "백네트 뒤로 넘어가는 파울",
    "1루 관중석 쪽 파울",
    "3루 파울라인 바깥으로 빠지는 파울",
    "포수 뒤쪽으로 살짝 뜬 파울",
    "투 스트라이크 이후 힘겹게 걷어낸 파울",
    "배트 끝에 맞아 옆으로 흐르는 파울"
  ]);
}

function trySacrificeFly(game, offense, fielderArm = 60) {
  if (!game.bases?.[2] || game.outs >= 2) return { scored: false, text: "" };
  const runnerName = game.bases[2];
  const chance = Math.max(18, Math.min(72, 58 - fielderArm * 0.32 + rnd(-8, 12)));
  if (rnd(1, 100) <= chance) {
    game.bases[2] = null;
    if (offense === "user") game.score.user += 1;
    else game.score.opp += 1;
    return { scored: true, text: `, 3루 주자 ${runnerName} 태그업 홈인` };
  }
  return { scored: false, text: `, 3루 주자 ${runnerName} 태그업 보류` };
}

function resolveOpponentPlateAppearance(state) {
  const game = state.activeGame;
  if (!game || game.complete || !isOpponentBattingHalf(game)) return state;
  const opp = state.teams.find((t) => t.id === game.opponentId) || currentOpponent(state);
  const pitcher = state.players.find((p) => p.id === game.pitcherId);
  const defense = defensiveUnit(state, game);
  const orderIndex = Number.isFinite(game.opponentLineupIndex) ? game.opponentLineupIndex : 0;
  const batter = game.opponentLineup?.[orderIndex % 9] || { name: `${opp.short} 타자`, contact: opp.power, power: opp.power, order: (orderIndex % 9) + 1, pos: "?" };
  const restPenalty = pitcher ? Math.max(0, Number(pitcher.restDays) || 0) * 3.2 + Math.max(0, 55 - (Number(pitcher.form) || 70)) * 0.25 : 0;
  const pitchPower = pitcher ? pitcher.pit * 0.72 + pitcher.form * 0.2 + pitcher.happy * 0.08 - restPenalty : teamPower(state);
  const attack = opponentBatterPower(opp, game.inning);
  const outsBefore = game.outs || 0;
  const runsBefore = Number(game.score?.opp) || 0;
  let strikeoutAdded = 0;
  addPitchToActivePitcher(game, pitcher, 1);
  if (!game.count) game.count = { balls: 0, strikes: 0 };
  if ((game.count.balls || 0) === 0 && (game.count.strikes || 0) === 0 && Number(game.paPitchCount) > 1) game.paPitchCount = 1;
  const pitchSummary = () => `${pitcher?.name || "우리 투수"} ${Math.max(1, Number(game.paPitchCount) || 1)}구, ${batter.order}번 ${batter.name}`;
  const wildChance = Math.max(
    0.2,
    Math.min(2.0, 1.55 - (pitcher?.pit || 60) * 0.014 + game.count.balls * 0.13 + Math.max(0, game.pitchCount - (pitcher?.stamina || 65)) * 0.012)
  );
  if (game.bases.some(Boolean) && rnd(1, 100) <= wildChance) {
    game.count.balls += 1;
    const passed = advanceOnPassedBall(game);
    game.score.opp += passed.runs;
    game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 폭투${passed.runs ? `, ${passed.runs}실점` : ""}. 주자 ${passed.bases}, 카운트 ${game.count.balls}-${game.count.strikes}`);
    if (game.count.balls >= 4) {
      const result = walkBatter(game, `${opp.short} 주자`);
      game.score.opp += result.runs;
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 폭투 뒤 볼넷 허용${result.runs ? `, ${result.runs}실점` : ""}. 주자 ${basesLabel(game.bases)}`);
      finishAtBatPitchTax(game, pitcher);
      game.count = { balls: 0, strikes: 0 };
      game.paPitchCount = 0;
      game.opponentLineupIndex += 1;
    }
    updatePitcherMood(game, pitcher, 1);
    if (pitcher) pitcher.form = Math.max(30, pitcher.form - 0.4);
    recordPitcherGameLine(game, pitcher, 0, Math.max(0, (Number(game.score?.opp) || 0) - runsBefore), 0);
    if (finishWalkoffIfNeeded(state)) return state;
    return state;
  }
  const stealTryChance = Math.max(1.2, Math.min(8.5, 5.0 + (batter.contact || 60) * 0.018 + attack * 0.012 - defense.catcherArm * 0.045 - (pitcher?.pickoff || 55) * 0.022));
  if (game.bases[0] && !game.bases[1] && rnd(1, 100) < stealTryChance) {
    const catcher = fielderByPos(defense, "C");
    if (rnd(1, 100) + defense.catcherArm + (pitcher?.pickoff || 55) * 0.18 > 126) {
      game.bases[0] = null;
      game.outs += 1;
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${catcher?.name || "포수"} 송구로 2루 도루 저지. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`);
      if (game.outs >= 3) {
        updatePitcherMood(game, pitcher, 0);
        recordPitcherGameLine(game, pitcher, Math.max(0, Math.min(3, game.outs) - outsBefore), Math.max(0, (Number(game.score?.opp) || 0) - runsBefore), strikeoutAdded);
        nextHalfInning(state);
        return state;
      }
    } else {
      game.bases[1] = game.bases[0];
      game.bases[0] = null;
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 상대 주자 2루 도루 성공. ${catcher?.name || "포수"} 송구 ${Math.round(defense.catcherArm)}, 주자 ${basesLabel(game.bases)}`);
    }
  }
  const fatiguePenalty = Math.max(0, game.pitchCount - (pitcher?.stamina || 65)) * 0.48 + Math.max(0, Number(pitcher?.restDays) || 0) * 1.8;
  const earlyCountDrag = game.paPitchCount <= 1 ? -11 : game.paPitchCount === 2 ? -5 : 0;
  const deepCountFinish = Math.max(0, game.paPitchCount - 5) * 3.5;
  const pitchRoll = rnd(1, 100) + attack * 0.2 + batter.contact * 0.12 - pitchPower * 0.25 + fatiguePenalty + earlyCountDrag + deepCountFinish;
  let hardContact = 0;
  if (pitchRoll < 27 && game.count.strikes < 2) {
    game.count.strikes += 1;
    game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 스트라이크. ${game.count.balls}-${game.count.strikes}`);
  } else if (pitchRoll < 44) {
    game.count.strikes += 1;
    if (game.count.strikes >= 3) {
      game.outs += 1;
      strikeoutAdded += 1;
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 삼진. ${game.outs}아웃`);
      finishAtBatPitchTax(game, pitcher);
      game.count = { balls: 0, strikes: 0 };
      game.paPitchCount = 0;
      game.opponentLineupIndex += 1;
    } else {
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${foulBallDescription()}. ${game.count.balls}-${game.count.strikes}`);
    }
  } else if (pitchRoll < 66) {
    game.count.balls += 1;
    if (game.count.balls >= 4) {
      const result = walkBatter(game, `${opp.short} 주자`);
      game.score.opp += result.runs;
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 볼넷 허용${result.runs ? `, ${result.runs}실점` : ""}. 주자 ${basesLabel(game.bases)}`);
      finishAtBatPitchTax(game, pitcher);
      game.count = { balls: 0, strikes: 0 };
      game.paPitchCount = 0;
      game.opponentLineupIndex += 1;
    } else {
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, 볼. ${game.count.balls}-${game.count.strikes}`);
    }
  } else if ((game.count.strikes >= 2 && pitchRoll < 91 + Math.max(0, batter.contact - 65) * 0.1) || (pitchRoll < 82 && game.count.strikes < 2)) {
    const wasTwoStrike = game.count.strikes >= 2;
    game.count.strikes = wasTwoStrike ? 2 : game.count.strikes + 1;
    game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${foulBallDescription()}. ${game.count.balls}-${game.count.strikes}`);
  } else {
    const event = opponentBattedBallEvent(batter, pitchPower, defense);
    const fielding = battedBallDefenseDetail(defense, batter, event);
    const battedText = battedBallDescription(event, fielding, batter);
    if (event.bases > 0) {
      hardContact = event.bases >= 2 || event.error ? 2 : 1;
      const result = advanceRunners(game, `${opp.short} 타자`, event.bases);
      game.score.opp += result.runs;
      let throwText = "";
      if (event.bases < 4 && game.outs < 3 && rnd(1, 100) + defense.outfieldArm > 134) {
        const thrower = chooseFielder(defense, ["LF", "CF", "RF"])?.player;
        game.outs += 1;
        throwText = `, ${thrower?.name || "외야수"} 송구로 추가 주자 아웃`;
      }
      const errorText = event.error ? ` (${fielding.name} ${fielding.errorType})` : "";
      const touchText = hitDefenseTouchText(event, { ...fielding, name: `${fielding.pos} ${fielding.name}` });
      game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${battedText}. ${result.text}${errorText}${touchText}${result.runs ? `, ${result.runs}실점` : ""}${throwText}`);
      finishAtBatPitchTax(game, pitcher);
      game.count = { balls: 0, strikes: 0 };
      game.paPitchCount = 0;
      game.opponentLineupIndex += 1;
    } else {
      if (rnd(1, 100) < fielding.errorChance) {
        const result = advanceRunners(game, `${opp.short} 타자`, 1);
        game.score.opp += result.runs;
        game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${battedText}. ${fielding.pos} ${fielding.name} ${fielding.errorType}${result.runs ? `, ${result.runs}실점` : ""}. 주자 ${basesLabel(game.bases)}`);
      } else {
        if (game.bases[0] && game.outs <= 1 && rnd(1, 100) < Math.max(10, Math.min(38, defense.def * 0.28 + defense.infieldArm * 0.12 - batter.contact * 0.12))) {
          const result = resolveGroundDoublePlay(game);
          game.score.opp += result.runs;
          const ss = fielderByPos(defense, "SS");
          const second = fielderByPos(defense, "2B");
          const first = fielderByPos(defense, "1B");
          game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${battedText}. ${ss?.name || "유격수"}-${second?.name || "2루수"}-${first?.name || "1루수"} 병살 처리. ${game.outs}아웃${result.runs ? `, ${result.runs}실점` : ""}, 주자 ${result.bases}`);
        } else {
          game.outs += 1;
          const great = rnd(1, 100) < fielding.greatChance;
          const prefix = great ? `${fielding.name} 호수비! ` : "";
          if (fielding.isAir) {
            const sac = trySacrificeFly(game, "opp", fielding.arm);
            game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${battedText}. ${prefix}${fielding.pos} ${fielding.name} ${fielding.outType}${sac.scored ? " · 희생플라이 허용" : ""}${sac.text}. ${game.outs}아웃`);
          } else {
            game.outs -= 1;
            const ground = resolveGroundOut(game, `${opp.short} 타자`);
            game.score.opp += ground.runs;
            game.log.unshift(`${game.inning}회말 ${pitchSummary()}, ${battedText}. ${prefix}${fielding.pos} ${fielding.name} ${fielding.outType}, ${ground.text}${ground.runs ? `, ${ground.runs}실점` : ""}. ${game.outs}아웃, 주자 ${ground.bases}`);
          }
        }
      }
      finishAtBatPitchTax(game, pitcher);
      game.count = { balls: 0, strikes: 0 };
      game.paPitchCount = 0;
      game.opponentLineupIndex += 1;
    }
  }
  updatePitcherMood(game, pitcher, hardContact);
  if (pitcher) {
    pitcher.form = Math.max(30, pitcher.form - Math.max(0, game.pitchCount - (pitcher.stamina || 65)) / 45);
  }
  recordPitcherGameLine(game, pitcher, Math.max(0, Math.min(3, game.outs) - outsBefore), Math.max(0, (Number(game.score?.opp) || 0) - runsBefore), strikeoutAdded);
  if (finishWalkoffIfNeeded(state)) return state;
  if (game.outs >= 3) nextHalfInning(state);
  return state;
}

function setGameTactic(state, tactic) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  if (isUserBattingHalf(game)) return resolveUserAtBat(state, tactic || "swing");
  game.tactic = tactic || "swing";
  game.log.unshift(`벤치 지시: ${tacticLabel(game.tactic)}`);
  return state;
}

function commandSteal(state, steal) {
  const game = state.activeGame;
  if (!game || game.complete || !isUserBattingHalf(game)) return state;
  if (steal === "cancel") {
    if (game.pendingSteal) {
      game.log.unshift(`도루 지시 취소: ${tacticLabel(game.pendingSteal)} 대기를 해제했다.`);
      game.pendingSteal = null;
    }
    return state;
  }
  const valid = new Set(["steal1", "steal2", "steal3", "steal12", "steal13", "steal23", "steal123", "stealAll"]);
  if (!valid.has(steal)) return state;
  const requestedBases = stealCommandToBases(steal);
  const currentBases = new Set(stealCommandToBases(game.pendingSteal));
  const singleBaseCommand = requestedBases.length === 1;
  const nextBases = singleBaseCommand ? new Set(currentBases) : new Set(requestedBases);
  if (singleBaseCommand) {
    const base = requestedBases[0];
    if (nextBases.has(base)) nextBases.delete(base);
    else nextBases.add(base);
  }
  const orderedBases = [...nextBases].sort((a, b) => a - b);
  if (!orderedBases.length) {
    game.pendingSteal = null;
    game.log.unshift("도루 지시 취소: 대기 중인 도루 작전을 해제했다.");
    return state;
  }
  const ready = orderedBases.length && orderedBases.every((index) => game.bases[index]);
  if (!ready) {
    game.log.unshift("도루 지시 실패: 해당 루에 주자가 없습니다.");
    return state;
  }
  game.pendingSteal = basesToStealCommand(orderedBases);
  game.log.unshift(`도루 지시 대기: ${tacticLabel(game.pendingSteal)}. 이제 강공/번트/다음 플레이를 선택하세요.`);
  return state;
}

function setRunnerTactic(state, tactic) {
  const game = state.activeGame;
  if (!game || game.complete || !isUserBattingHalf(game)) return state;
  const valid = new Set(["normal", "hold", "greenLight", "aggressiveRun", "autoStart"]);
  game.runnerTactic = valid.has(tactic) ? tactic : "normal";
  if (game.runnerTactic === "hold") game.pendingSteal = null;
  game.log.unshift(`주루 지시: ${runnerTacticLabel(game.runnerTactic)}${game.runnerTactic === "hold" ? " - 대기 중인 도루 사인을 해제했습니다." : ""}`);
  return state;
}

function advanceOnPickoffError(game, base) {
  const moving = [];
  for (let index = 2; index >= base; index -= 1) {
    if (game.bases[index]) {
      moving.push({ index, name: game.bases[index] });
      game.bases[index] = null;
    }
  }
  moving.forEach(({ index, name }) => {
    const nextBase = index + 1;
    if (nextBase >= 3) {
      game.score.opp += 1;
    } else {
      game.bases[nextBase] = name;
    }
  });
}

function commandPickoff(state, baseIndex) {
  const game = state.activeGame;
  if (!game || game.complete || !isOpponentBattingHalf(game)) return state;
  const base = Math.max(0, Math.min(2, Number(baseIndex) || 0));
  const runnerName = game.bases?.[base];
  if (!runnerName) {
    game.log.unshift(`견제 실패: ${base + 1}루에 주자가 없습니다.`);
    return state;
  }
  const pitcher = state.players.find((p) => p.id === game.pitcherId);
  const defense = defensiveUnit(state, game);
  const outsBefore = game.outs || 0;
  const runsBefore = Number(game.score?.opp) || 0;
  const pickoff = pitcher?.pickoff || Math.round((pitcher?.pit || 58) * 0.6 + (pitcher?.def || 55) * 0.4);
  const occupiedAhead = base < 2 && Boolean(game.bases[base + 1]);
  const stackedFirstBase = base === 0 && occupiedAhead;
  const baseOutBonus = base === 0 ? 0.2 : base === 1 ? 0.9 : 0.5;
  let outChance = Math.max(0.05, Math.min(2.6, 0.1 + pickoff * 0.012 + defense.infieldArm * 0.006 + baseOutBonus));
  if (stackedFirstBase) outChance = Math.min(outChance, 0.05);
  if (base === 0 && game.bases[1] && game.bases[2]) outChance = Math.min(outChance, 0.2);
  const badThrowChance = occupiedAhead ? 0 : Math.max(0.05, Math.min(0.9, 0.75 - pickoff * 0.008 + (base === 2 ? 0.15 : 0)));
  const roll = rnd(1, 100);
  if (roll <= outChance) {
    game.bases[base] = null;
    game.outs += 1;
    game.log.unshift(`${game.inning}회말 견제 성공: ${pitcher?.name || "투수"}가 ${base + 1}루 주자 ${runnerName}을 잡았습니다. ${game.outs}아웃, 주자 ${basesLabel(game.bases)}`);
    updatePitcherMood(game, pitcher, 0);
    recordPitcherGameLine(game, pitcher, Math.max(0, Math.min(3, game.outs) - outsBefore), 0, 0);
    if (game.outs >= 3) nextHalfInning(state);
    return state;
  }
  if (rnd(1, 100) <= badThrowChance) {
    advanceOnPickoffError(game, base);
    game.log.unshift(`${game.inning}회말 견제 악송구: ${base + 1}루부터 주자가 한 베이스씩 진루. 주자 ${basesLabel(game.bases)}`);
    updatePitcherMood(game, pitcher, 1);
    recordPitcherGameLine(game, pitcher, 0, Math.max(0, (Number(game.score?.opp) || 0) - runsBefore), 0);
    if (finishWalkoffIfNeeded(state)) return state;
    return state;
  }
  game.log.unshift(`${game.inning}회말 견제: ${pitcher?.name || "투수"}가 ${base + 1}루 주자 ${runnerName}을 묶었습니다. 주자 ${basesLabel(game.bases)}`);
  return state;
}

function stealCommandToBases(command) {
  const map = {
    steal: [0],
    steal1: [0],
    steal2: [1],
    steal3: [2],
    stealHome: [2],
    steal12: [1, 0],
    steal13: [2, 0],
    steal23: [2, 1],
    steal123: [2, 1, 0],
    stealAll: [2, 1, 0]
  };
  return [...(map[command] || [])];
}

function basesToStealCommand(bases) {
  const key = [...new Set(bases)].sort((a, b) => a - b).join("");
  return { "0": "steal1", "1": "steal2", "2": "steal3", "01": "steal12", "02": "steal13", "12": "steal23", "012": "steal123" }[key] || null;
}

function runnerTacticLabel(tactic) {
  return {
    normal: "기본 주루",
    hold: "보수적 주루",
    greenLight: "그린라이트",
    aggressiveRun: "적극 주루",
    autoStart: "무조건 스타트"
  }[tactic] || "기본 주루";
}

function runnerSpeedByName(state, runnerName) {
  const runner = state.players.find((p) => p.name === runnerName);
  return Math.max(35, Math.min(95, runner?.spd || runner?.run || runner?.ovr || 60));
}

function autoRunnerStealCommand(state, game) {
  const mode = game.runnerTactic || "normal";
  if (!["greenLight", "aggressiveRun", "autoStart"].includes(mode)) return null;
  if (!game.bases?.some(Boolean)) return null;
  const possible = [];
  if (game.bases[2] && mode !== "greenLight") possible.push(2);
  if (game.bases[1] && !game.bases[2]) possible.push(1);
  if (game.bases[0] && !game.bases[1]) possible.push(0);
  if (game.bases[0] && game.bases[1] && !game.bases[2] && mode !== "greenLight") possible.push(1, 0);
  if (!possible.length) return null;
  const unique = [...new Set(possible)].sort((a, b) => b - a);
  if (mode === "autoStart") return basesToStealCommand(unique);
  const selected = [];
  unique.forEach((baseIndex) => {
    const runnerName = game.bases[baseIndex];
    if (!runnerName) return;
    const speed = runnerSpeedByName(state, runnerName);
    const countBonus = (game.count?.balls || 0) > (game.count?.strikes || 0) ? 3 : 0;
    const basePenalty = baseIndex === 2 ? 18 : baseIndex === 1 ? 8 : 0;
    const modeBase = mode === "aggressiveRun" ? 13 : 7;
    const maxChance = mode === "aggressiveRun" ? 32 : 20;
    const chance = Math.max(0, Math.min(maxChance, modeBase + (speed - 65) * 0.45 + countBonus - basePenalty));
    if (rnd(1, 100) <= chance) selected.push(baseIndex);
  });
  if (!selected.length) return null;
  return basesToStealCommand(selected);
}

function tacticLabel(tactic) {
  if (tactic === "steal13") return "1·3루 더블스틸";
  const labels = {
    swing: "강공",
    forceSwing: "무조건 스윙",
    take: "기다리기",
    contactSwing: "컨택 스윙",
    powerSwing: "장타 노림",
    bunt: "번트",
    sacBunt: "희생번트",
    safetyBunt: "세이프티 번트",
    squeezeBunt: "스퀴즈",
    dragBunt: "기습번트",
    steal: "도루",
    steal1: "1루 주자 도루",
    steal2: "2루 주자 도루",
    steal3: "홈스틸",
    stealHome: "홈스틸",
    steal12: "더블스틸",
    steal23: "더블스틸",
    steal123: "만루 스타트",
    stealAll: "만루 스타트"
  };
  if (labels[tactic]) return labels[tactic];
  return { swing: "강공", bunt: "번트", steal: "도루" }[tactic] || "강공";
}

function advanceOnePlay(state) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  if (isUserBattingHalf(game)) return resolveUserAtBat(state, game.tactic || "swing");
  return resolveOpponentPlateAppearance(state);
}

function skipCurrentHalfInning(state, options = {}) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  const autoManagePitchers = options.autoManagePitchers !== false;
  const inning = game.inning;
  const half = game.half;
  let guard = 0;
  while (!game.complete && game.inning === inning && game.half === half && guard < 90) {
    if (isUserBattingHalf(game)) resolveUserAtBat(state, "swing");
    else {
      resolveOpponentPlateAppearance(state);
      if (autoManagePitchers && !game.complete && game.inning === inning && game.half === half) {
        maybeAutoChangeUserPitcher(state);
      }
    }
    guard += 1;
  }
  game.log.unshift(`${inning}회${half === "top" ? "초" : "말"} 반이닝 스킵 완료`);
  return state;
}

function skipFullGame(state) {
  if (!state.activeGame && (state.day || 1) > (state.seasonGames || 144)) {
    return playGame(state);
  }
  const game = state.activeGame;
  if (!game || game.complete) return state;
  game.pendingSteal = null;
  game.tactic = "swing";
  game.runnerTactic = game.runnerTactic || "normal";
  game.log.unshift("경기 전체 자동 진행 시작. 라인업과 선발은 그대로 두고 감독 개입 없이 시뮬레이션합니다.");
  let guard = 0;
  while (!game.complete && guard < 36) {
    const before = `${game.inning}-${game.half}-${game.outs}-${game.lineupIndex}-${game.opponentLineupIndex}-${game.score.user}-${game.score.opp}`;
    skipCurrentHalfInning(state, { autoManagePitchers: true });
    guard += 1;
    const after = `${game.inning}-${game.half}-${game.outs}-${game.lineupIndex}-${game.opponentLineupIndex}-${game.score.user}-${game.score.opp}`;
    if (!game.complete && before === after) {
      advanceOnePlay(state);
      guard += 1;
    }
  }
  if (game.complete) {
    game.log.unshift("경기 전체 자동 진행 완료.");
  } else {
    game.log.unshift("경기 자동 진행이 길어져서 중단했습니다. 다음 플레이나 경기 스킵을 다시 눌러 이어갈 수 있습니다.");
  }
  return state;
}

function changePitcher(state, inId) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  inId = Number(inId);
  const incoming = state.players.find((p) => p.id === inId && p.type === "PIT" && p.rosterStatus === "ACTIVE");
  if (!incoming || game.usedPitchers?.includes(inId) || incoming.health?.status === "INJURED") return state;
  const outgoing = state.players.find((p) => p.id === game.pitcherId);
  const entries = ensurePitcherEntryTracking(game);
  entries[inId] = pitcherEntrySnapshot(game);
  game.pitcherId = inId;
  game.usedPitchers = [...(game.usedPitchers || []), inId];
  game.pitchCount = 0;
  if (!game.pitcherUsage) game.pitcherUsage = {};
  if (!game.pitcherOuts) game.pitcherOuts = {};
  if (!game.pitcherRuns) game.pitcherRuns = {};
  if (!game.pitcherStrikeouts) game.pitcherStrikeouts = {};
  if (!Number.isFinite(game.pitcherUsage[inId])) game.pitcherUsage[inId] = 0;
  if (!Number.isFinite(game.pitcherOuts[inId])) game.pitcherOuts[inId] = 0;
  if (!Number.isFinite(game.pitcherRuns[inId])) game.pitcherRuns[inId] = 0;
  if (!Number.isFinite(game.pitcherStrikeouts[inId])) game.pitcherStrikeouts[inId] = 0;
  game.pitcherMood = incoming.form >= 78 ? "좋음" : "정상";
  game.log.unshift(`투수 교체: ${outgoing?.name || "기존 투수"} 내려가고 ${incoming.name} 등판`);
  return state;
}

function substituteBatter(state, outId, inId, position = null) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  outId = Number(outId);
  inId = Number(inId);
  const idx = game.lineup.indexOf(outId);
  const incoming = state.players.find((p) => p.id === inId && p.type === "BAT" && p.rosterStatus === "ACTIVE" && p.health?.status !== "INJURED");
  if (idx < 0 || !incoming || game.lineup.includes(inId) || game.usedPositionPlayers?.includes(inId) || game.removedPositionPlayers?.includes(inId)) return state;
  const outgoing = state.players.find((p) => p.id === outId);
  const oldPosition = game.lineupPositions?.[idx] || outgoing?.pos || incoming.pos;
  game.lineup[idx] = inId;
  game.usedPositionPlayers = [...new Set([...(game.usedPositionPlayers || []), inId])];
  game.removedPositionPlayers = [...new Set([...(game.removedPositionPlayers || []), outId])];
  game.lineupPositions = normalizeLineupPositions(game.lineup, game.lineupPositions, state);
  if (position && FIELD_POSITIONS.includes(position)) {
    const swapIdx = game.lineupPositions.indexOf(position);
    if (swapIdx >= 0 && swapIdx !== idx) {
      game.lineupPositions[swapIdx] = oldPosition;
    }
    game.lineupPositions[idx] = position;
  } else {
    game.lineupPositions[idx] = oldPosition;
  }
  game.log.unshift(`대타/수비 교체: ${idx + 1}번 ${outgoing?.name || "선수"} 대신 ${incoming.name} · 수비 ${game.lineupPositions[idx] || incoming.pos}`);
  return state;
}

function pinchRun(state, baseIndex, inId) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  baseIndex = Number(baseIndex);
  inId = Number(inId);
  if (!Number.isInteger(baseIndex) || baseIndex < 0 || baseIndex > 2) return state;
  const runnerName = game.bases?.[baseIndex];
  if (!runnerName) return state;
  const incoming = state.players.find((p) => p.id === inId && p.type === "BAT" && p.rosterStatus === "ACTIVE" && p.health?.status !== "INJURED");
  if (!incoming || game.lineup.includes(inId) || game.usedPositionPlayers?.includes(inId) || game.removedPositionPlayers?.includes(inId)) return state;
  const idx = game.lineup.findIndex((id) => state.players.find((p) => p.id === id)?.name === runnerName);
  if (idx < 0) return state;
  const outId = game.lineup[idx];
  const outgoing = state.players.find((p) => p.id === outId);
  game.lineup[idx] = inId;
  game.bases[baseIndex] = incoming.name;
  game.usedPositionPlayers = [...new Set([...(game.usedPositionPlayers || []), inId])];
  game.removedPositionPlayers = [...new Set([...(game.removedPositionPlayers || []), outId])];
  game.log.unshift(`대주자 투입: ${baseIndex + 1}루 ${outgoing?.name || runnerName} 대신 ${incoming.name}. ${idx + 1}번 타순을 이어받습니다.`);
  return state;
}

function changeDefensivePositions(state, positions) {
  const game = state.activeGame;
  if (!game || game.complete) return state;
  const clean = Array.isArray(positions) ? positions.slice(0, 9) : [];
  if (!hasCompleteFieldPositions(clean)) {
    game.log.unshift("수비 위치 변경 실패: C, 1B, 2B, 3B, SS, LF, CF, RF, DH를 각각 한 번씩 지정해야 합니다.");
    return state;
  }
  game.lineupPositions = clean;
  const summary = game.lineup.map((id, index) => {
    const p = state.players.find((x) => x.id === id);
    return `${clean[index]} ${p?.name || "선수"}`;
  }).join(" · ");
  game.log.unshift(`수비 위치 변경: ${summary}`);
  return state;
}

function teamPower(state) {
  const players = (state.players || []).filter((p) => p && typeof p === "object");
  const hitters = players.filter((p) => p.type === "BAT");
  const pitchers = players.filter((p) => p.type === "PIT");
  return Math.round(
    avg(hitters.map((p) => p.ovr * 0.72 + p.form * 0.18 + p.happy * 0.1)) * 0.55 +
    avg(pitchers.map((p) => p.ovr * 0.78 + p.form * 0.17 + p.happy * 0.05)) * 0.45
  );
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function sampleRuns(lambda) {
  const target = Math.max(0.8, Math.min(9.5, Number(lambda) || 4.2));
  const limit = Math.exp(-target);
  let product = 1;
  let count = 0;
  while (product > limit && count < 18) {
    count += 1;
    product *= Math.random();
  }
  return Math.max(0, count - 1);
}

function positionFitScore(p, pos) {
  if (!p || p.type !== "BAT") return 0;
  ensurePositionData(p);
  if (pos === "DH") return 1;
  if (p.pos === pos) return 1;
  const trained = Number(p.positionTraining?.[pos]) || 0;
  if ((p.secondaryPositions || []).includes(pos)) return Math.max(0.64, Math.min(0.96, trained / 100 || 0.72));
  const outfield = ["LF", "CF", "RF"];
  const infield = ["1B", "2B", "3B", "SS"];
  if (outfield.includes(p.pos) && outfield.includes(pos)) return pos === "CF" ? 0.58 : 0.68;
  if (infield.includes(p.pos) && infield.includes(pos)) return ["SS", "2B"].includes(pos) ? 0.48 : 0.58;
  if (pos === "C" || p.pos === "C") return 0.18;
  return 0.34;
}

function lineupBalance(state, lineupIds = [], lineupPositions = []) {
  const players = lineupIds
    .map((id) => state.players.find((p) => p.id === Number(id)))
    .filter((p) => p && p.type === "BAT" && p.rosterStatus === "ACTIVE" && p.health?.status !== "INJURED");
  const offense = avg(players.map((p) => (p.hit || 55) * 0.42 + (p.pow || 55) * 0.22 + (p.spd || 55) * 0.1 + (p.form || 65) * 0.18 + (p.happy || 65) * 0.08));
  const weights = { C: 2.2, SS: 2.0, CF: 1.8, "2B": 1.35, "3B": 1.25, RF: 1.05, LF: 1.0, "1B": 0.85, DH: 0 };
  const defensivePenalty = players.reduce((sum, p, index) => {
    const pos = lineupPositions[index] || p.pos || "DH";
    const fit = positionFitScore(p, pos);
    return sum + (1 - fit) * (weights[pos] || 1.1) * 5.2;
  }, Math.max(0, 9 - players.length) * 9);
  const conditionPenalty = players.reduce((sum, p) => sum + Math.max(0, 58 - (Number(p.form) || 65)) * 0.05, 0);
  return {
    players,
    offense: Math.max(35, offense - conditionPenalty),
    defensivePenalty: Math.round(defensivePenalty * 10) / 10,
    missing: Math.max(0, 9 - players.length)
  };
}

function pitcherGameValue(p) {
  if (!p || p.type !== "PIT" || p.health?.status === "INJURED") return 35;
  const starterLike = p.pitcherRole === "SP" || p.pos === "SP";
  const restPenalty = Math.max(0, Number(p.restDays) || 0) * (starterLike ? 10.5 : 8);
  const recentLoadPenalty = Math.max(0, (Number(p.lastPitchCount) || 0) - (starterLike ? 82 : 18)) * (starterLike ? 0.06 : 0.14);
  const formPenalty = Math.max(0, 58 - (Number(p.form) || 65)) * 0.35;
  return Math.max(22, (p.ovr || 55) * 0.48 + (p.pit || p.ovr || 55) * 0.24 + (p.stamina || 55) * 0.12 + (p.form || 65) * 0.16 - restPenalty - recentLoadPenalty - formPenalty);
}

function pickSkipStarter(state, preferredId = null) {
  const activePitchers = state.players
    .filter((p) => p.rosterStatus === "ACTIVE" && p.type === "PIT" && p.health?.status !== "INJURED");
  const preferred = activePitchers.find((p) => p.id === Number(preferredId));
  if (preferred) return preferred;
  return activePitchers
    .slice()
    .sort((a, b) => pitcherGameValue(b) - pitcherGameValue(a))
    .find((p) => p.pitcherRole === "SP" || p.pos === "SP") || activePitchers.sort((a, b) => pitcherGameValue(b) - pitcherGameValue(a))[0] || null;
}

function buildSkipPitchingPlan(state, starter, myRuns, oppRuns) {
  let activePitchers = state.players
    .filter((p) => p.rosterStatus === "ACTIVE" && p.type === "PIT" && p.health?.status !== "INJURED" && p.id !== starter?.id)
    .sort((a, b) => pitcherGameValue(b) - pitcherGameValue(a));
  const usage = {};
  const closeGame = Math.abs(myRuns - oppRuns) <= 3;
  if (starter) {
    const restPenalty = Math.max(0, Number(starter.restDays) || 0) * 17;
    const lowFormPenalty = Math.max(0, 55 - (Number(starter.form) || 65)) * 0.7;
    const base = rnd(78, 103) + Math.round(((starter.stamina || 76) - 76) * 0.25) - restPenalty - lowFormPenalty;
    usage[starter.id] = Math.max(34, Math.min(112, Math.round(base)));
  }
  if (!activePitchers.length) return usage;
  const starterPitches = starter ? usage[starter.id] : 0;
  const needRelievers = starterPitches < 70 || closeGame || oppRuns >= 5;
  if (closeGame) {
    const leverageRank = (p) => p.pitcherRole === "CL" ? 0 : p.pitcherRole === "SU" ? 1 : p.pitcherRole === "MR" ? 2 : 3;
    activePitchers = activePitchers.slice().sort((a, b) => leverageRank(a) - leverageRank(b) || pitcherGameValue(b) - pitcherGameValue(a));
  }
  const minSlots = Math.min(activePitchers.length, needRelievers ? 2 : 1);
  const maxSlots = Math.min(activePitchers.length, needRelievers ? 5 : 3);
  const relieverSlots = rnd(minSlots, maxSlots);
  activePitchers.slice(0, relieverSlots).forEach((p, index) => {
    const highLeverage = closeGame && ["CL", "SU"].includes(p.pitcherRole);
    const min = highLeverage ? 8 : 10;
    const max = p.pitcherRole === "CL" ? 22 : index === 0 && starterPitches < 62 ? 38 : 28;
    usage[p.id] = rnd(min, max);
  });
  return usage;
}

function isInternalNews(title, body, kind = "") {
  const text = `${title || ""} ${body || ""} ${kind || ""}`.toLowerCase();
  return (
    text.includes("선수 데이터 import") ||
    text.includes("player data import") ||
    text.includes("kbo_players.csv") ||
    text.includes("outputs/data/") ||
    text.includes("/data/source-url") ||
    text.includes("user-import")
  );
}

function cleanNewsList(news = []) {
  return news.filter((n) => !isInternalNews(n.title, n.body, n.kind));
}

function addNews(state, title, body, kind = "일반") {
  if (isInternalNews(title, body, kind)) return;
  state.news.unshift({ day: state.day, title, body, kind });
  state.news = state.news.slice(0, 50);
}

function clampTeamPulse(state) {
  state.morale = Math.max(20, Math.min(98, Math.round(state.morale)));
  state.fanInterest = Math.max(20, Math.min(98, Math.round(state.fanInterest)));
}

function playerIconLevel(p) {
  if (!p) return 0;
  const trait = String(p.trait || "");
  let level = 0;
  if (/프랜차이즈|프렌차이즈|주장|리더|상징|에이스|국대|MVP|스타/.test(trait)) level += 3;
  if (/유망주|차세대|코어|원석/.test(trait) && (p.pot || 0) >= 82) level += 1.5;
  if ((p.ovr || 0) >= 82) level += 3;
  else if ((p.ovr || 0) >= 78) level += 2;
  else if ((p.ovr || 0) >= 73) level += 1;
  if ((p.serviceYears || 0) >= 10) level += 1.5;
  else if ((p.serviceYears || 0) >= 7) level += 1;
  if ((p.contract?.annual || p.salary || 0) >= 10) level += 1;
  return level;
}

function playerStatusTags(p) {
  const tags = [];
  const icon = playerIconLevel(p);
  if (icon >= 6) tags.push("프랜차이즈 스타");
  else if (icon >= 4) tags.push("팬 선호 선수");
  if ((p.ovr || 0) >= 80) tags.push("핵심전력");
  if ((p.pot || 0) - (p.ovr || 0) >= 12) tags.push("대형 유망주");
  if ((p.serviceYears || 0) >= 10) tags.push("장기 근속");
  if ((p.contract?.annual || p.salary || 0) >= 10) tags.push("고연봉");
  return tags;
}

function transactionReaction(state, playersOut = [], playersIn = [], context = "트레이드") {
  const outIcon = playersOut.reduce((sum, p) => sum + playerIconLevel(p), 0);
  const inIcon = playersIn.reduce((sum, p) => sum + playerIconLevel(p), 0);
  const valueGap = sumTradeValue(playersIn) - sumTradeValue(playersOut);
  const fanDelta = Math.round(inIcon * 1.2 - outIcon * 1.6 + valueGap / 18);
  const moraleDelta = Math.round(inIcon * 0.7 - outIcon * 1.1 + valueGap / 24);
  state.fanInterest += fanDelta;
  state.morale += moraleDelta;
  clampTeamPulse(state);
  const outTags = playersOut.flatMap(playerStatusTags);
  const inTags = playersIn.flatMap(playerStatusTags);
  const outNames = playersOut.map((p) => p.name).join(", ") || "없음";
  const inNames = playersIn.map((p) => p.name).join(", ") || "없음";
  let tone = "팬 여론은 대체로 중립적이다.";
  if (fanDelta <= -8) tone = "팬 커뮤니티가 강하게 반발하고 있다.";
  else if (fanDelta <= -3) tone = "팬들 사이에서 아쉬움과 우려가 나온다.";
  else if (fanDelta >= 8) tone = "팬들이 전력 보강에 크게 환호하고 있다.";
  else if (fanDelta >= 3) tone = "팬 반응은 긍정적으로 기울었다.";
  addNews(state, `${context} 팬 반응`, `${outNames} 이탈 / ${inNames} 합류. ${tone} ${outTags.length ? `이탈 태그: ${[...new Set(outTags)].join(", ")}. ` : ""}${inTags.length ? `영입 태그: ${[...new Set(inTags)].join(", ")}. ` : ""}팬 관심도 ${fanDelta >= 0 ? "+" : ""}${fanDelta}, 팀 분위기 ${moraleDelta >= 0 ? "+" : ""}${moraleDelta}.`, "팬 반응");
}

function reducePlayerCondition(p, amount) {
  if (!p || p.health?.status === "INJURED") return 0;
  const before = Number(p.form) || 70;
  p.form = Math.max(25, Math.min(96, Math.round(before - amount)));
  if (amount >= 6) p.happy = Math.max(25, (Number(p.happy) || 70) - 1);
  return before - p.form;
}

function pitcherRestDaysForUsage(p, pitches) {
  const starterLike = p?.pitcherRole === "SP" || p?.pos === "SP";
  if (starterLike) {
    if (pitches >= 105) return 5;
    if (pitches >= 90) return 4;
    if (pitches >= 70) return 3;
    if (pitches >= 45) return 2;
    return 1;
  }
  if (pitches >= 35) return 3;
  if (pitches >= 22) return 2;
  if (pitches >= 8) return 1;
  return 0;
}

function recoverPitcherRest(state) {
  (state.players || []).forEach((p) => {
    if (p.type !== "PIT") return;
    p.restDays = Math.max(0, (Number(p.restDays) || 0) - 1);
    const starterLike = p.pitcherRole === "SP" || p.pos === "SP";
    const recovery = p.restDays > 0 ? (starterLike ? 2 : 3) : (starterLike ? 4 : 5);
    if (p.health?.status !== "INJURED") p.form = Math.min(96, (Number(p.form) || 70) + recovery);
  });
}

function applyPostGameFatigue(state, pitcherUsage = {}, lineupIds = [], lineupPositions = []) {
  const notes = [];
  for (const [id, rawPitches] of Object.entries(pitcherUsage || {})) {
    const pitches = Number(rawPitches) || 0;
    const p = state.players.find((x) => x.id === Number(id));
    if (!p || p.type !== "PIT" || pitches <= 0) continue;
    const starterLike = p.pitcherRole === "SP" || p.pos === "SP";
    const staminaLine = Number(p.stamina) || (starterLike ? 78 : 42);
    const base = starterLike ? Math.max(4, Math.ceil(pitches / 13)) : Math.max(1, Math.ceil(pitches / 8));
    const overload = Math.max(0, pitches - staminaLine);
    const amount = Math.min(28, base + Math.ceil(overload / (starterLike ? 5 : 4)));
    p.lastPitchedDay = state.day;
    p.lastPitchCount = pitches;
    p.restDays = Math.max(Number(p.restDays) || 0, pitcherRestDaysForUsage(p, pitches));
    const drop = reducePlayerCondition(p, amount);
    if (drop >= 4) notes.push(`${p.name} ${pitches}구 -${drop}, 휴식 ${p.restDays}일`);
  }

  (lineupIds || []).forEach((id, index) => {
    const p = state.players.find((x) => x.id === Number(id));
    if (!p || p.type !== "BAT" || p.health?.status === "INJURED") return;
    const pos = lineupPositions?.[index] || p.pos;
    const amount = pos === "C" ? rnd(2, 4) : pos === "DH" ? rnd(0, 1) : rnd(1, 3);
    reducePlayerCondition(p, amount);
  });

  if (notes.length) {
    addNews(state, "컨디션 리포트", `등판 부담 반영: ${notes.slice(0, 6).join(", ")}.`, "의료");
  }
}

function playerScoreForMvp(p) {
  if (p.type === "PIT") return (p.stats.win || 0) * 5 + (p.stats.so || 0) * 0.9 + Math.max(0, 6 - (p.stats.era || 4.5)) * 14 + p.ovr * 0.25;
  return (p.stats.hr || 0) * 4 + (p.stats.rbi || 0) * 1.2 + (p.stats.sb || 0) * 1.1 + (p.stats.avg || 0.25) * 180 + p.ovr * 0.2;
}

function topPlayer(players, scoreFn) {
  return players.slice().sort((a, b) => scoreFn(b) - scoreFn(a))[0] || null;
}

function goalMet(state) {
  const me = currentTeam(state);
  const rank = state.teams.findIndex((t) => t.id === state.selectedTeamId) + 1;
  if (state.seasonGoal?.level === "champion") return rank === 1;
  if (state.seasonGoal?.level === "top3") return rank <= 3;
  if (state.seasonGoal?.level === "rebuild") return state.players.filter((p) => p.age <= 25 && p.ovr > 70).length >= 5;
  return rank <= 5 || (me?.w || 0) >= 72;
}

function finalizeSeasonAwards(state) {
  if (state.seasonAwarded) return state;
  if (state.draftWindowOpen) {
    let guard = 0;
    while (currentDraftTeamId(state) && guard < DRAFT_ROUNDS * 10) {
      autoDraftForTeam(state, currentDraftTeamId(state));
      advanceDraftSlot(state);
      guard += 1;
    }
  }
  updateRanks(state);
  const recordPlayers = leagueRecordPlayers(state);
  const hitters = recordPlayers.filter((p) => p.type === "BAT");
  const pitchers = recordPlayers.filter((p) => p.type === "PIT");
  const qualifiedHitters = hitters.filter((p) => (p.stats?.pa || 0) >= Math.floor((state.seasonGames || 144) * 2.7));
  const qualifiedPitchers = pitchers.filter((p) => (p.stats?.ip || 0) >= Math.floor((state.seasonGames || 144) * 0.8));
  const decisionPitchers = pitchers.filter((p) => ((p.stats?.win || 0) + (p.stats?.loss || 0)) >= 8 || (p.stats?.win || 0) >= 8);
  const savePitchers = pitchers.filter((p) => (p.stats?.sv || 0) > 0);
  const holdPitchers = pitchers.filter((p) => (p.stats?.hold || 0) > 0);
  const mvp = topPlayer(recordPlayers, playerScoreForMvp);
  const rookie = topPlayer(recordPlayers.filter((p) => (p.age || 99) <= 24 && (p.serviceYears || 0) <= 2), playerScoreForMvp);
  const goldGloves = FIELD_POSITIONS
    .filter((pos) => pos !== "DH")
    .map((pos) => topPlayer(hitters.filter((p) => p.pos === pos || p.secondaryPositions?.includes(pos)), (p) => (p.def || 0) * 1.2 + (p.arm || 0) * 0.4 + (p.ovr || 0) * 0.35))
    .filter(Boolean);
  const pitcherGold = topPlayer(pitchers, (p) => (p.pit || 0) + (p.stats.so || 0) * 0.35 + Math.max(0, 6 - (p.stats.era || 4.5)) * 8);
  if (pitcherGold) goldGloves.unshift(pitcherGold);
  const awardDefs = [
    ["MVP", recordPlayers, playerScoreForMvp, (p) => `${p.pos} · 종합 기여도 ${Math.round(playerScoreForMvp(p))}`],
    ["신인상", rookie ? [rookie] : [], playerScoreForMvp, (p) => `${p.age}세 · 현재 ${p.ovr} · 잠재 ${p.pot}`],
    ["타격왕", hitters, (p) => p.stats.avg || 0, (p) => `타율 ${(p.stats.avg || 0).toFixed(3)}`],
    ["홈런왕", hitters, (p) => p.stats.hr || 0, (p) => `${p.stats.hr || 0}홈런`],
    ["타점왕", hitters, (p) => p.stats.rbi || 0, (p) => `${p.stats.rbi || 0}타점`],
    ["안타왕", hitters, (p) => p.stats.h || 0, (p) => `${p.stats.h || 0}안타`],
    ["득점왕", hitters, (p) => p.stats.r || 0, (p) => `${p.stats.r || 0}득점`],
    ["도루왕", hitters, (p) => p.stats.sb || 0, (p) => `${p.stats.sb || 0}도루`],
    ["출루율왕", hitters, (p) => p.stats.obp || 0, (p) => `출루율 ${(p.stats.obp || 0).toFixed(3)}`],
    ["장타율왕", hitters, (p) => p.stats.slg || 0, (p) => `장타율 ${(p.stats.slg || 0).toFixed(3)}`],
    ["평균자책점왕", pitchers, (p) => -(p.stats.era || 9), (p) => `ERA ${(p.stats.era || 0).toFixed(2)}`],
    ["다승왕", pitchers, (p) => p.stats.win || 0, (p) => `${p.stats.win || 0}승`],
    ["승률왕", pitchers.filter((p) => (p.stats.win || 0) + (p.stats.loss || 0) >= 8 || (p.stats.win || 0) >= 8), (p) => (p.stats.win || 0) / Math.max(1, (p.stats.win || 0) + (p.stats.loss || 0)), (p) => `${p.stats.win || 0}승 · 승률 ${((p.stats.win || 0) / Math.max(1, (p.stats.win || 0) + (p.stats.loss || 0))).toFixed(3)}`],
    ["탈삼진왕", pitchers, (p) => p.stats.so || 0, (p) => `${p.stats.so || 0}K`],
    ["세이브왕", pitchers, (p) => p.stats.sv || 0, (p) => `${p.stats.sv || 0}세이브`],
    ["홀드왕", pitchers, (p) => p.stats.hold || 0, (p) => `${p.stats.hold || 0}홀드`]
  ];
  state.awards = awardDefs
    .map(([title, pool, scoreFn, detailFn]) => {
      const winner = topPlayer(pool, scoreFn);
      return winner ? { title, name: winner.name, detail: detailFn(winner), playerId: winner.id } : null;
    })
    .filter(Boolean);
  state.awards.push(...goldGloves.map((p) => ({ title: `골든글러브 ${p.pos}`, name: p.name, detail: `수비 ${p.def} · 송구 ${p.arm}`, playerId: p.id })));
  const met = goalMet(state);
  state.morale = Math.max(20, Math.min(98, state.morale + (met ? state.seasonGoal.reward : -state.seasonGoal.penalty)));
  state.fanInterest = Math.max(20, Math.min(98, state.fanInterest + (met ? 6 : -5)));
  addNews(state, "시즌 종료 시상식", state.awards.slice(0, 10).map((a) => `${a.title}: ${a.name} (${a.detail})`).join(" / "), "시상");
  addNews(state, met ? "구단 목표 달성" : "구단 목표 미달", `${state.seasonGoal.label} 목표를 ${met ? "달성했다" : "달성하지 못했다"}.`, "구단");
  state.seasonAwarded = true;
  return state;
}

function isFaEligiblePlayer(p) {
  return p
    && p.rosterStatus !== "DEV"
    && !isForeignPlayer(p)
    && p.health?.status !== "INJURED"
    && (Number(p.serviceDays) || 0) >= faServiceRequiredDays(p)
    && (p.contract?.yearsLeft || 0) <= 1;
}

function pruneInvalidOffers(state) {
  if (!Array.isArray(state.offers)) state.offers = [];
  state.offers = state.offers.filter((offer) => {
    const p = state.players.find((x) => x.id === offer.playerId);
    return isFaEligiblePlayer(p);
  });
}

function updateRanks(state) {
  ensureTeamStats(state);
  const mine = currentTeam(state);
  if (mine) mine.power = teamPower(state);
  state.teams.sort((a, b) => {
    const ap = a.w / Math.max(1, a.w + a.l);
    const bp = b.w / Math.max(1, b.w + b.l);
    return bp - ap || b.power - a.power;
  });
}

function postseasonSeeds(state) {
  updateRanks(state);
  return state.teams.slice(0, 5).map((t, index) => ({ ...t, seed: index + 1 }));
}

function makePostseasonSeries(name, teams, targetWins, carryWins = {}) {
  return {
    name,
    teamIds: teams.map((t) => t.id),
    teamNames: teams.map((t) => `${t.city} ${t.name}`),
    seeds: teams.map((t) => t.seed || 0),
    wins: Object.fromEntries(teams.map((t) => [t.id, Number(carryWins[t.id]) || 0])),
    targetWins,
    games: [],
    winnerId: null
  };
}

function startPostseason(state) {
  if (state.postseason?.active || state.postseason?.completed) return state;
  const seeds = postseasonSeeds(state);
  if (seeds.length < 5) return state;
  const fourth = seeds[3];
  const fifth = seeds[4];
  state.postseason = {
    active: true,
    completed: false,
    seasonYear: Number(state.seasonYear) || 1,
    seeds: seeds.map((t) => ({ id: t.id, name: `${t.city} ${t.name}`, seed: t.seed })),
    roundIndex: 0,
    series: [makePostseasonSeries("와일드카드 결정전", [fourth, fifth], 2, { [fourth.id]: 1 })],
    championId: null
  };
  state.activeGame = null;
  addNews(state, "포스트시즌 개막", `정규시즌 종료. ${fourth.city} ${fourth.name}와 ${fifth.city} ${fifth.name}의 와일드카드 결정전부터 시작한다.`, "포스트시즌");
  return state;
}

function currentPostseasonSeries(state) {
  if (!state.postseason?.active) return null;
  return state.postseason.series[state.postseason.roundIndex || 0] || null;
}

function currentPostseasonOpponent(state) {
  const series = currentPostseasonSeries(state);
  if (!series) return null;
  if (!series.teamIds.includes(state.selectedTeamId)) return null;
  const opponentId = series.teamIds.find((id) => id !== state.selectedTeamId) || series.teamIds[0];
  return state.teams.find((t) => t.id === opponentId) || null;
}

function teamPlayoffPower(state, team) {
  if (!team) return 60;
  const base = team.id === state.selectedTeamId ? teamPower(state) : Number(team.power) || 66;
  const winRate = (Number(team.w) || 0) / Math.max(1, (Number(team.w) || 0) + (Number(team.l) || 0));
  const form = (winRate - 0.5) * 10;
  return base + form + rnd(-5, 5);
}

function simulatePostseasonScore(state, homeTeam, awayTeam) {
  const homePower = teamPlayoffPower(state, homeTeam) + 1.2;
  const awayPower = teamPlayoffPower(state, awayTeam);
  const homeRuns = Math.min(13, sampleRuns(clampNumber(4.1 + (homePower - awayPower) / 24, 1.2, 7.8)));
  const awayRuns = Math.min(13, sampleRuns(clampNumber(4.1 + (awayPower - homePower) / 24, 1.2, 7.8)));
  if (homeRuns === awayRuns) return Math.random() < 0.53 ? [homeRuns + 1, awayRuns] : [homeRuns, awayRuns + 1];
  return [homeRuns, awayRuns];
}

function seedTeam(state, seedNo) {
  const seed = state.postseason?.seeds?.find((s) => s.seed === seedNo);
  return seed ? state.teams.find((t) => t.id === seed.id) : null;
}

function appendNextPostseasonSeries(state, winnerId) {
  const winner = state.teams.find((t) => t.id === winnerId);
  if (!winner) return state;
  const count = state.postseason.series.length;
  if (count === 1) {
    const third = seedTeam(state, 3);
    state.postseason.series.push(makePostseasonSeries("준플레이오프", [third, winner].filter(Boolean), 3));
  } else if (count === 2) {
    const second = seedTeam(state, 2);
    state.postseason.series.push(makePostseasonSeries("플레이오프", [second, winner].filter(Boolean), 3));
  } else if (count === 3) {
    const first = seedTeam(state, 1);
    state.postseason.series.push(makePostseasonSeries("한국시리즈", [first, winner].filter(Boolean), 4));
  } else {
    state.postseason.active = false;
    state.postseason.completed = true;
    state.postseason.championId = winnerId;
    const championName = `${winner.city} ${winner.name}`;
    addNews(state, "한국시리즈 종료", `${championName}이 한국시리즈 우승을 차지했다. 이제 시즌 시상과 다음 시즌 준비를 진행할 수 있다.`, "포스트시즌");
  }
  if (state.postseason.active) {
    state.postseason.roundIndex = state.postseason.series.length - 1;
    const next = currentPostseasonSeries(state);
    addNews(state, `${next.name} 개막`, `${next.teamNames.join(" vs ")} 시리즈가 시작된다.`, "포스트시즌");
  }
  return state;
}

function registerPostseasonGame(state, winnerId, loserId, scoreText, manual = false) {
  const series = currentPostseasonSeries(state);
  if (!series || series.winnerId) return state;
  series.wins[winnerId] = (series.wins[winnerId] || 0) + 1;
  const winner = state.teams.find((t) => t.id === winnerId);
  const loser = state.teams.find((t) => t.id === loserId);
  const gameNo = series.games.length + 1;
  series.games.push({ gameNo, winnerId, loserId, score: scoreText });
  state.lastGame = {
    opp: loser?.id === state.selectedTeamId ? `${winner.city} ${winner.name}` : `${loser?.city || ""} ${loser?.name || ""}`.trim(),
    me: scoreText,
    them: series.name,
    won: winnerId === state.selectedTeamId,
    postseason: true
  };
  state.games.unshift({ day: state.day, text: `${series.name} ${gameNo}차전 · ${scoreText}` });
  state.games = state.games.slice(0, 12);
  addNews(state, `${series.name} ${gameNo}차전`, `${scoreText}. 시리즈 ${series.teamNames.map((name, i) => `${name} ${series.wins[series.teamIds[i]] || 0}승`).join(" / ")}.`, "포스트시즌");
  if ((series.wins[winnerId] || 0) >= series.targetWins) {
    series.winnerId = winnerId;
    addNews(state, `${series.name} 종료`, `${winner.city} ${winner.name}이 다음 라운드로 진출했다.`, "포스트시즌");
    appendNextPostseasonSeries(state, winnerId);
  }
  if (manual) state.activeGame = null;
  return state;
}

function advancePostseasonGame(state) {
  startPostseason(state);
  const series = currentPostseasonSeries(state);
  if (!series) return state;
  const a = state.teams.find((t) => t.id === series.teamIds[0]);
  const b = state.teams.find((t) => t.id === series.teamIds[1]);
  if (!a || !b) return state;
  const gameNo = series.games.length + 1;
  const higherSeedHosts = gameNo <= Math.ceil(series.targetWins / 2) + 1;
  const home = higherSeedHosts ? a : b;
  const away = home.id === a.id ? b : a;
  const [homeRuns, awayRuns] = simulatePostseasonScore(state, home, away);
  const winner = homeRuns > awayRuns ? home : away;
  const loser = winner.id === home.id ? away : home;
  const scoreText = `${winner.city} ${winner.name} ${Math.max(homeRuns, awayRuns)}-${Math.min(homeRuns, awayRuns)} ${loser.city} ${loser.name}`;
  registerPostseasonGame(state, winner.id, loser.id, scoreText);
  return state;
}

function startNextSeason(state) {
  if (!state.postseason?.completed) return state;
  const champion = state.teams.find((t) => t.id === state.postseason.championId);
  finalizeSeasonAwards(state);
  state.seasonYear = Number(state.seasonYear) || 1;
  promoteHighSchoolCohorts(state);
  state.day = 1;
  state.seasonAwarded = false;
  state.awards = [];
  state.postseason = { active: false, completed: false, seasonYear: state.seasonYear, series: [], roundIndex: 0, championId: null };
  state.lastGame = null;
  state.activeGame = null;
  state.schedule = buildSeasonSchedule(state.teams || teamTemplates, state.selectedTeamId, 144);
  state.teams.forEach((t) => {
    t.w = 0;
    t.l = 0;
    t.t = 0;
    t.teamStats = emptyTeamStats();
  });
  state.players.forEach((p) => {
    p.stats = p.type === "PIT" ? makePitcherStats() : makeBatterStats();
    p.form = clampNumber((Number(p.form) || 70) + rnd(-8, 8), 45, 96);
    if (p.contract?.yearsLeft) p.contract.yearsLeft = Math.max(0, Number(p.contract.yearsLeft) - 1);
  });
  addNews(state, "새 시즌 개막", `${champion ? `${champion.city} ${champion.name} 우승 시즌을 마치고 ` : ""}${state.seasonYear}시즌이 시작됐다. 정규시즌 144경기 뒤 포스트시즌이 열린다.`, "구단");
  return state;
}

function emptyTeamStats() {
  return { games: 0, runsFor: 0, runsAgainst: 0, errors: 0 };
}

function ensureTeamStats(state) {
  if (!Array.isArray(state?.teams)) return state;
  state.teams.forEach((team) => {
    if (!team.teamStats) team.teamStats = emptyTeamStats();
    ["games", "runsFor", "runsAgainst", "errors"].forEach((key) => {
      team.teamStats[key] = Math.max(0, Number(team.teamStats[key]) || 0);
    });
    const played = (team.w || 0) + (team.l || 0) + (team.t || 0);
    if (team.teamStats.games < played) {
      const missing = played - team.teamStats.games;
      const winRate = (team.w || 0) / Math.max(1, (team.w || 0) + (team.l || 0));
      const avgFor = 3.7 + (team.power || 65) / 55 + winRate * 0.8;
      const avgAgainst = 4.9 - (team.power || 65) / 70 + (1 - winRate) * 0.9;
      team.teamStats.runsFor += Math.round(missing * Math.max(2.6, avgFor));
      team.teamStats.runsAgainst += Math.round(missing * Math.max(2.5, avgAgainst));
      team.teamStats.errors += Math.round(missing * Math.max(0.35, 1.05 - (team.power || 65) / 120));
      team.teamStats.games = played;
    }
  });
  return state;
}

function estimateTeamErrors(team, runsAgainst = 0) {
  const base = 0.35 + Math.max(0, 72 - (team?.power || 65)) / 45 + Math.max(0, runsAgainst - 4) * 0.08;
  const variance = rnd(0, 100) < base * 45 ? 1 : 0;
  return Math.min(4, variance + (rnd(0, 100) < Math.max(2, base * 8) ? 1 : 0));
}

function recordTeamGame(team, runsFor, runsAgainst, errors) {
  if (!team) return;
  if (!team.teamStats) team.teamStats = emptyTeamStats();
  team.teamStats.games += 1;
  team.teamStats.runsFor += Math.max(0, Number(runsFor) || 0);
  team.teamStats.runsAgainst += Math.max(0, Number(runsAgainst) || 0);
  team.teamStats.errors += Math.max(0, Number(errors) || 0);
}

function simulateOtherTeams(state) {
  ensureLeaguePlayers(state);
  const gameOpponent = currentOpponent(state);
  const list = opponents(state).filter((team) => team.id !== gameOpponent?.id);
  for (let i = 0; i < list.length - 1; i += 2) {
    const a = list[i];
    const b = list[i + 1];
    simulateTeamResult(a, b);
    simulateTeamPlayerStats(state, a);
    simulateTeamPlayerStats(state, b);
  }
  state.leagueStatsBackfilledForDay = Math.max(state.leagueStatsBackfilledForDay || 0, state.day || 1);
}

function simulateTeamResult(a, b) {
  const chance = a.power / Math.max(1, a.power + b.power);
  const base = rnd(2, 6);
  let aRuns = Math.max(0, Math.min(13, Math.round(base + (a.power - 65) / 18 + rnd(-2, 3))));
  let bRuns = Math.max(0, Math.min(13, Math.round(base + (b.power - 65) / 18 + rnd(-2, 3))));
  const aWon = Math.random() < chance;
  if (aWon && aRuns <= bRuns) aRuns = bRuns + 1;
  if (!aWon && bRuns <= aRuns) bRuns = aRuns + 1;
  if (aWon) {
    a.w += 1;
    b.l += 1;
  } else {
    b.w += 1;
    a.l += 1;
  }
  recordTeamGame(a, aRuns, bRuns, estimateTeamErrors(a, bRuns));
  recordTeamGame(b, bRuns, aRuns, estimateTeamErrors(b, aRuns));
}

function backfillStandingsGames(state) {
  if (!Array.isArray(state?.teams)) return state;
  const targetGames = Math.max(0, Math.min((state.day || 1) - 1, state.seasonGames || 144));
  if (!targetGames) return state;
  let guard = 0;
  while (guard < 500) {
    const shortTeams = state.teams
      .filter((team) => (team.w || 0) + (team.l || 0) < targetGames)
      .sort((a, b) => ((a.w || 0) + (a.l || 0)) - ((b.w || 0) + (b.l || 0)));
    if (!shortTeams.length) break;
    if (shortTeams.length === 1) {
      const team = shortTeams[0];
      if (Math.random() < Math.max(0.32, Math.min(0.68, (team.power || 65) / 105))) team.w += 1;
      else team.l += 1;
    } else {
      simulateTeamResult(shortTeams[0], shortTeams[1]);
    }
    guard += 1;
  }
  state.teams.forEach((team) => {
    const games = (team.w || 0) + (team.l || 0);
    if (games === targetGames) return;
    const rate = games > 0 ? (team.w || 0) / games : Math.max(0.28, Math.min(0.72, (team.power || 65) / 120));
    team.w = Math.max(0, Math.min(targetGames, Math.round(rate * targetGames)));
    team.l = targetGames - team.w;
  });
  return state;
}

function simulateTeamPlayerStats(state, team) {
  const roster = (state.leaguePlayers || []).filter((p) => p.teamId === team.id);
  const hitters = roster.filter((p) => p.type === "BAT").sort((a, b) => b.ovr - a.ovr).slice(0, 9);
  const pitchers = roster.filter((p) => p.type === "PIT").sort((a, b) => {
    const roleDiff = (a.pitcherRole === "SP" ? 0 : 1) - (b.pitcherRole === "SP" ? 0 : 1);
    return roleDiff || b.ovr - a.ovr;
  });
  const rotation = pitchers.filter((p) => p.pitcherRole === "SP" || p.pos === "SP").slice(0, 5);
  const teamGames = Math.max(1, (Number(team.w) || 0) + (Number(team.l) || 0));
  const starter = rotation.length ? rotation[(teamGames - 1) % rotation.length] : pitchers[0];
  const closer = pitchers.find((p) => p.pitcherRole === "CL" || p.pos === "CL");
  for (const p of hitters) {
    const pa = rnd(3, 5);
    const contact = Math.max(0.16, Math.min(0.34, 0.16 + (p.hit || p.ovr || 62) / 820 + rnd(-2, 2) / 100));
    const hits = Math.max(0, Math.min(pa, Math.round(contact * pa + rnd(-1, 1))));
    const homers = Math.random() < Math.max(0.006, (p.pow || 60) / 2400) ? 1 : 0;
    p.stats.pa = (p.stats.pa || 0) + pa;
    p.stats.h = (p.stats.h || 0) + Math.max(hits, homers);
    p.stats.hr = (p.stats.hr || 0) + homers;
    p.stats.rbi = (p.stats.rbi || 0) + rnd(0, Math.max(1, Math.round((p.hit || 60) / 42)));
    p.stats.r = (p.stats.r || 0) + rnd(0, hits + ((p.spd || 55) > 72 ? 1 : 0));
    p.stats.sb = (p.stats.sb || 0) + (Math.random() < Math.max(0.005, (p.spd || 55) / 1600) ? 1 : 0);
    p.stats.bb = (p.stats.bb || 0) + (Math.random() < Math.max(0.04, (p.hit || 60) / 1700) ? 1 : 0);
    p.stats.so = (p.stats.so || 0) + Math.max(0, Math.round(pa * Math.max(0.12, 0.31 - (p.hit || 60) / 500)) + rnd(-1, 1));
    p.stats.ab = Math.max(p.stats.ab || 0, p.stats.pa - (p.stats.bb || 0));
    p.stats.tb = (p.stats.tb || 0) + Math.max(hits, homers) + homers * 3;
    updateRateStats(p);
  }
  if (starter) {
    const stats = ensurePitchingStats(starter);
    starter.stats.ip = (starter.stats.ip || 0) + rnd(45, 68) / 10;
    starter.stats.so = (starter.stats.so || 0) + Math.max(1, Math.round((starter.pit || 62) / 16) + rnd(-1, 2));
    starter.stats.era = Math.min(7.2, Math.max(1.6, (starter.stats.era || 3.9) + rnd(-8, 8) / 100));
    const winChance = Math.max(0.28, (team.power || 65) / 160);
    const lossChance = Math.max(0.18, (78 - (team.power || 65)) / 160);
    const decision = Math.random();
    if (decision < winChance) stats.win += 1;
    else if (decision < winChance + lossChance) stats.loss += 1;
  }
  const bullpen = pitchers.filter((p) => p.id !== starter?.id).slice(0, 3);
  bullpen.forEach((p) => {
    p.stats.ip = (p.stats.ip || 0) + rnd(6, 16) / 10;
    p.stats.so = (p.stats.so || 0) + Math.max(0, Math.round((p.pit || 58) / 28) + rnd(0, 1));
    p.stats.era = Math.min(7.5, Math.max(1.7, (p.stats.era || 3.8) + rnd(-10, 10) / 100));
    if (["MR", "SU"].includes(p.pitcherRole) && Math.random() < 0.34) p.stats.hold = (p.stats.hold || 0) + 1;
  });
  if (closer && Math.random() < Math.max(0.28, (team.power || 65) / 240)) closer.stats.sv = (closer.stats.sv || 0) + 1;
}

function ageAndDevelop(state) {
  const grown = [];
  for (const p of state.players) {
    const room = p.pot - p.ovr;
    const rosterBoost = p.rosterStatus === "FARM" ? 0.12 : p.rosterStatus === "ACTIVE" ? 0.04 : p.rosterStatus === "DEV" ? 0.08 : 0;
    const focusBoost = p.developmentFocus ? 0.05 : 0;
    if (room > 0 && p.age <= 27 && Math.random() < 0.33 + rosterBoost + focusBoost) {
      const focus = p.developmentFocus || (p.type === "PIT" ? "pit" : ["hit", "pow", "def", "arm"][rnd(0, 3)]);
      if (focus === "hit") p.hit = Math.min(99, (p.hit || 50) + 1);
      if (focus === "pow") p.pow = Math.min(99, (p.pow || 50) + 1);
      if (focus === "def") p.def = Math.min(99, (p.def || 50) + 1);
      if (focus === "arm") p.arm = Math.min(99, (p.arm || playerArmFallback(p)) + 1);
      if (focus === "pit") p.pit = Math.min(99, (p.pit || 50) + 1);
      p.ovr += 1;
      grown.push(`${p.name} +1`);
    }
    if (p.age >= 35 && Math.random() < 0.28) p.ovr = Math.max(45, p.ovr - 1);
  }
  if (grown.length) addNews(state, "월간 성장 업데이트", `${grown.join(", ")} 성장.`, "육성");
}

function generateOffer(state, forceLeague, playerId) {
  const requested = playerId ? state.players.find((p) => p.id === Number(playerId)) : null;
  if (requested) state.selectedId = requested.id;
  if (requested && !isFaEligiblePlayer(requested)) {
    addNews(state, "시장 반응 없음", `${requested.name}은 FA/계약만료/외국인/육성/부상 규칙 때문에 해외 구단이 공식 제안을 넣을 수 없다.`, "이적");
    return null;
  }
  const candidates = requested
    ? [requested].filter((p) => p.ovr >= 68 || p.pot >= 84)
    : state.players
      .filter((p) => isFaEligiblePlayer(p) && (p.ovr >= 68 || p.pot >= 84))
      .sort(() => Math.random() - 0.5);
  const p = candidates[0];
  if (!p) {
    addNews(state, "시장 반응 없음", requested ? `${requested.name}은 현재 능력/잠재력 기준에서 즉시 오퍼가 들어올 정도의 시장 반응은 없다.` : "FA 자격과 계약 만료 조건을 동시에 충족한 선수가 없어 해외 구단 제안이 들어오지 않았다.", "이적");
    return null;
  }
  const league = forceLeague || (Math.random() > 0.52 ? "North American Majors" : "Japan Premier Baseball");
  const club = league.includes("North")
    ? ["Seattle Mariners", "Texas Rangers", "San Diego Suns", "Toronto Royals"][rnd(0, 3)]
    : ["Tokyo Giants", "Osaka Buffaloes", "Fukuoka Hawks", "Yokohama Stars"][rnd(0, 3)];
  const comp = faCompensation({ grade: p.faGrade || "C", previousSalary: p.salary || p.contract?.annual || 1 }, false);
  const fee = Math.round((comp.cash + p.ovr * 0.12 + rnd(0, 8)) * 10) / 10;
  const salary = Math.round((p.salary * (league.includes("North") ? 1.8 : 1.35) + rnd(1, 9)) * 10) / 10;
  const offer = { id: Date.now() + Math.random(), playerId: p.id, league, club, fee, salary, years: rnd(2, 5), faGrade: p.faGrade || "C", serviceYears: p.serviceYears || 0 };
  state.offers.unshift(offer);
  state.offers = state.offers.slice(0, 6);
  addNews(state, "해외 구단 오퍼 도착", `${club}가 ${p.name}에게 ${offer.years}년 ${money(salary)} 규모의 관심을 보냈다. 포스팅 보상금은 ${money(fee)}로 예상된다.`, "이적");
  return offer;
}

function tradeDeadlineDay(state) {
  return Math.floor((state.seasonGames || 144) * 0.68);
}

function tradeValue(p) {
  return (p.ovr || 50) * 1.35 + (p.pot || p.ovr || 50) * 0.55 - Math.max(0, (p.age || 25) - 29) * 1.8 + (p.type === "PIT" ? 4 : 0);
}

function uniqueNumbers(value) {
  const list = Array.isArray(value) ? value : [value];
  return [...new Set(list.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
}

function sumTradeValue(players) {
  return players.reduce((sum, p) => sum + tradeValue(p), 0);
}

function tradePlayerLabel(p) {
  return `${p.name} ${p.pos} ${p.ovr}/${p.pot}`;
}

function tradeFailureReasons(outgoingPlayers, targetPlayers, cashOffer, outgoingValue, targetValue) {
  const reasons = [];
  const gap = outgoingValue - targetValue;
  const bestOutgoing = outgoingPlayers.slice().sort((a, b) => tradeValue(b) - tradeValue(a))[0];
  const bestTarget = targetPlayers.slice().sort((a, b) => tradeValue(b) - tradeValue(a))[0];
  const activeTargets = targetPlayers.filter((p) => p.rosterStatus === "ACTIVE").length;
  const farmOutgoing = outgoingPlayers.filter((p) => p.rosterStatus === "FARM").length;
  if (gap < -2) reasons.push(`가치 평가가 ${Math.abs(Math.round(gap))}점 부족`);
  if (bestTarget && bestOutgoing && tradeValue(bestTarget) - tradeValue(bestOutgoing) > 18) reasons.push(`${bestTarget.name}을 내주기엔 핵심 전력 손실이 큼`);
  if (activeTargets && farmOutgoing === outgoingPlayers.length) reasons.push("상대는 1군 전력을 내주는데 우리 제안은 2군 카드 중심");
  if (targetPlayers.some((p) => playerIconLevel(p) >= 2)) reasons.push("프랜차이즈/팬 선호 선수라 팬 반발 위험");
  if (cashOffer <= 0 && gap < -8) reasons.push("현금 보전이 없어 협상 유인이 낮음");
  if (!reasons.length) reasons.push("상대 내부 평가에서 포지션 보강 효과가 부족");
  return reasons;
}

function makeFictionalKoreanName(seed) {
  const surnames = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","전","홍","유","고","문"];
  const syllables = ["준","민","현","우","성","진","호","윤","원","서","율","재","겸","도","찬","태","영","수","혁","빈","하","건","시","온"];
  const h = hashText(seed);
  return `${surnames[h % surnames.length]}${syllables[Math.floor(h / 8) % syllables.length]}${syllables[Math.floor(h / 128) % syllables.length]}`;
}

function makeTradeTarget(team, baseValue, needType) {
  const type = needType || (Math.random() > 0.52 ? "BAT" : "PIT");
  const pos = type === "PIT" ? (Math.random() > 0.45 ? "SP" : "RP") : FIELD_POSITIONS[rnd(0, FIELD_POSITIONS.length - 1)];
  const ovr = Math.max(52, Math.min(86, Math.round(baseValue / 1.85 + rnd(-5, 6))));
  const pot = Math.max(ovr, Math.min(92, ovr + rnd(0, 12)));
  const age = rnd(20, 34);
  const name = makeFictionalKoreanName(`${team.id}-${pos}-${Date.now()}-${rnd(10, 99)}`);
  const p = makePlayer([name, pos, type, age, ovr, pot, `${team.short} 트레이드 카드`, rnd(0, 99)], rnd(1000, 9999));
  p.id = Date.now() + rnd(1, 99999);
  p.rosterStatus = "FARM";
  p.dataSource = "trade-market";
  p.teamId = team.id;
  p.teamName = `${team.city} ${team.name}`;
  p.foreignPlayer = false;
  return p;
}

function refreshTradeTargets(state, silent = false) {
  if (state.day > tradeDeadlineDay(state)) {
    state.tradeTargets = [];
    if (!silent) addNews(state, "트레이드 마감", "트레이드 마감일이 지나 상대팀 매물을 더 조회할 수 없다.", "트레이드");
    return state;
  }
  if (fs.existsSync(DATA_IMPORT_PATH)) {
    const rows = parseCsv(fs.readFileSync(DATA_IMPORT_PATH, "utf8"));
    const headers = rows[0]?.map((h) => h.trim()) || [];
    const idx = (name) => headers.indexOf(name);
    const teamIdIndex = idx("teamId");
    const nameIndex = idx("name");
    const posIndex = idx("pos");
    const typeIndex = idx("type");
    const cards = [];
    const idBase = Date.now() * 1000;
    const teamMap = new Map((state.teams || teamTemplates).map((team) => [team.id, team]));
    if (teamIdIndex >= 0 && nameIndex >= 0 && posIndex >= 0) {
      rows.slice(1).forEach((row) => {
        const rowTeamId = row[teamIdIndex];
        if (!rowTeamId || rowTeamId === state.selectedTeamId) return;
        const team = teamMap.get(rowTeamId);
        if (!team) return;
        const rawName = row[nameIndex];
        const rowSource = (idx("source") >= 0 && row[idx("source")]) || DATA_IMPORT_PATH;
        const jersey = idx("jerseyNumber") >= 0 ? row[idx("jerseyNumber")] : "";
        const shouldAlias = (String(rowSource).startsWith("공시") || String(rowSource).startsWith("KBO")) && !String(rowSource).includes("Public Alias");
        const name = shouldAlias ? publicAliasName(rawName, `${rowTeamId}-${jersey}`) : rawName;
        const pos = row[posIndex] || "CF";
        if (!name) return;
        const type = typeIndex >= 0 && row[typeIndex] ? row[typeIndex] : (["SP", "RP", "CL"].includes(pos) ? "PIT" : "BAT");
        const age = Number(row[idx("age")]) || 24;
        const ovr = Number(row[idx("ovr")]) || rnd(52, 76);
        const pot = Number(row[idx("pot")]) || Math.max(ovr, rnd(65, 88));
        const p = makePlayer([name, pos, type, age, ovr, pot, ""], cards.length);
        const handValue = idx("batsThrows") >= 0 ? row[idx("batsThrows")] : idx("hand") >= 0 ? row[idx("hand")] : "";
        applyBatsThrows(p, handValue);
        p.id = idBase + cards.length + 1;
        p.teamId = rowTeamId;
        p.teamName = `${team.city} ${team.name}`;
        p.rosterStatus = row[idx("rosterStatus")] || "FARM";
        p.pitcherRole = type === "PIT" ? (row[idx("pitcherRole")] || (pos === "SP" ? "SP" : pos === "CL" ? "CL" : "MR")) : null;
        const estimated = estimateContractForPlayer(p, cards.length);
        const importedYears = idx("yearsLeft") >= 0 ? Number(row[idx("yearsLeft")]) : null;
        const importedAnnual = idx("annualSalary") >= 0 ? Number(row[idx("annualSalary")]) : idx("salary") >= 0 ? Number(row[idx("salary")]) : null;
        p.contract = {
          yearsLeft: Number.isFinite(importedYears) && importedYears > 0 ? importedYears : estimated.yearsLeft,
          annual: Number.isFinite(importedAnnual) && importedAnnual > 0 ? importedAnnual : estimated.annual,
          kind: idx("contractKind") >= 0 && row[idx("contractKind")] ? row[idx("contractKind")] : estimated.kind,
          source: idx("contractSource") >= 0 && row[idx("contractSource")] ? row[idx("contractSource")] : ""
        };
        applyDetailedContractFromCsv(p, row, headers);
        p.controlYears = idx("controlYears") >= 0 && row[idx("controlYears")] !== "" ? Number(row[idx("controlYears")]) : Math.max(0, Math.ceil(((p.age <= 27 ? 9 : 8) * KBO_SERVICE_DAYS_PER_YEAR - (p.serviceDays || 0)) / KBO_SERVICE_DAYS_PER_YEAR));
        p.controlKind = idx("controlKind") >= 0 && row[idx("controlKind")] ? row[idx("controlKind")] : (p.controlYears <= 0 ? "FA 자격권" : "구단 보류권");
        p.jerseyNumber = Number(jersey) || p.jerseyNumber;
        ["hit","pow","spd","def","arm","pit","form","stamina","durability"].forEach((key) => {
          if (idx(key) >= 0 && row[idx(key)]) p[key] = Number(row[idx(key)]) || p[key];
        });
        p.salary = p.contract.annual;
        p.signingBonus = idx("signingBonus") >= 0 && Number(row[idx("signingBonus")]) ? Number(row[idx("signingBonus")]) : estimated.signingBonus;
        p.serviceYears = Number(row[idx("serviceYears")]) || p.serviceYears;
        p.serviceDays = idx("serviceDays") >= 0 && Number(row[idx("serviceDays")]) ? Number(row[idx("serviceDays")]) : p.serviceYears * KBO_SERVICE_DAYS_PER_YEAR + rnd(0, KBO_SERVICE_DAYS_PER_YEAR - 1);
        ensureServiceTime(p);
        p.faGrade = row[idx("faGrade")] || p.faGrade;
        p.development = false;
        p.foreignPlayer = idx("foreignPlayer") >= 0 ? ["Y","TRUE","1","외국인"].includes(String(row[idx("foreignPlayer")]).toUpperCase()) : isLikelyForeignName(name);
        p.dataSource = "trade-target-import";
        p.trait = `${p.rosterStatus === "ACTIVE" ? "1군" : "2군"} 등록 선수`;
        ensurePositionData(p);
        cards.push(p);
      });
    }
    if (cards.length) {
      state.tradeTargets = cards.sort((a, b) => a.teamId.localeCompare(b.teamId) || (a.rosterStatus === "ACTIVE" ? -1 : 1) || tradeValue(b) - tradeValue(a));
      if (!silent) addNews(state, "트레이드 로스터 갱신", "선택팀 선수단과 같은 CSV 기준으로 상대 9개 구단 1군/2군 명단을 다시 불러왔다.", "트레이드");
      return state;
    }
  }
  state.tradeTargets = [];
  if (!silent) addNews(state, "트레이드 로스터 없음", "상대팀 등록 선수 명단을 불러오지 못했다. 가상 매물은 생성하지 않는다.", "트레이드");
  return state;
}

function ensureTradeTargets(state) {
  if (!Array.isArray(state.tradeTargets)) state.tradeTargets = [];
  const ids = new Set(state.tradeTargets.map((p) => Number(p.id)));
  const usesImportedTargets = state.tradeTargets.length > 0 && state.tradeTargets.every((p) => p.dataSource === "trade-target-import");
  if (state.day <= tradeDeadlineDay(state) && (state.tradeTargets.length < 200 || ids.size !== state.tradeTargets.length || !usesImportedTargets)) refreshTradeTargets(state, true);
  if (state.day > tradeDeadlineDay(state)) state.tradeTargets = [];
  for (const p of state.tradeTargets) normalizeContractReality(p);
  return state;
}

function registeredTradeTargetPool(state, partnerId = null, needType = null) {
  ensureTradeTargets(state);
  return (state.tradeTargets || []).filter((p) => {
    if (!p || p.dataSource !== "trade-target-import") return false;
    if (String(p.teamId) === String(state.selectedTeamId)) return false;
    if (partnerId && String(p.teamId) !== String(partnerId)) return false;
    if (needType && p.type !== needType) return false;
    if (p.rosterStatus === "DEV" || isForeignPlayer(p) || p.health?.status === "INJURED") return false;
    return true;
  });
}

function cloneTradeCard(card) {
  return JSON.parse(JSON.stringify(card));
}

function proposeTrade(state, outgoingId, targetId, cash) {
  if (state.day > tradeDeadlineDay(state)) {
    addNews(state, "트레이드 마감", "트레이드 마감일이 지나 직접 제안을 넣을 수 없다.", "트레이드");
    return state;
  }
  ensureTradeTargets(state);
  const outgoingIds = uniqueNumbers(outgoingId);
  const targetIds = uniqueNumbers(targetId);
  const outgoingPlayers = outgoingIds.map((id) => state.players.find((p) => p.id === id)).filter(Boolean);
  const targetPlayers = targetIds.map((id) => state.tradeTargets.find((p) => p.id === id)).filter(Boolean);
  const cashOffer = Math.max(0, Math.round((Number(cash) || 0) * 10) / 10);
  if (!outgoingPlayers.length || outgoingPlayers.length !== outgoingIds.length || outgoingPlayers.some((p) => p.rosterStatus === "DEV" || isForeignPlayer(p) || p.health?.status === "INJURED")) {
    addNews(state, "트레이드 제안 실패", "외국인 선수, 육성선수, 부상자는 트레이드 카드로 쓸 수 없다.", "규칙");
    return state;
  }
  if (!targetPlayers.length || targetPlayers.length !== targetIds.length || targetPlayers.some(isForeignPlayer)) {
    addNews(state, "트레이드 제안 실패", "상대팀 매물을 다시 선택해야 한다.", "트레이드");
    return state;
  }
  const targetTeamId = targetPlayers[0].teamId;
  if (targetPlayers.some((p) => p.teamId !== targetTeamId)) {
    addNews(state, "트레이드 제안 실패", "한 번의 트레이드는 같은 상대팀 선수들끼리만 제안할 수 있다.", "트레이드");
    return state;
  }
  if (cashOffer > state.budget) {
    addNews(state, "트레이드 제안 보류", `현금 보전 ${money(cashOffer)}를 감당할 예산이 부족하다.`, "트레이드");
    return state;
  }

  const outgoingValue = sumTradeValue(outgoingPlayers) + cashOffer * 7.5;
  const targetValue = sumTradeValue(targetPlayers);
  const gap = outgoingValue - targetValue;
  const partnerName = targetPlayers[0].teamName;
  const myNames = outgoingPlayers.map(tradePlayerLabel).join(", ");
  const targetNames = targetPlayers.map(tradePlayerLabel).join(", ");
  const accepted = gap >= -2 || (gap >= -8 && Math.random() < 0.28);
  const need = Math.max(0, Math.round(((targetValue - outgoingValue) / 7.5) * 10) / 10);
  const reasons = tradeFailureReasons(outgoingPlayers, targetPlayers, cashOffer, outgoingValue, targetValue);
  if (!accepted && need > 35) {
    addNews(state, "트레이드 거절", `${partnerName}가 ${myNames} ↔ ${targetNames} 제안을 거절했다. 이유: ${reasons.join(" · ")}. 부족분이 커서 단순 현금 보전으로는 어렵다.`, "트레이드");
    state.morale -= 1;
    return state;
  }
  if (!accepted) {
    const already = new Set(outgoingPlayers.map((p) => p.id));
    const shortage = targetValue - outgoingValue;
    const extras = state.players
      .filter((p) => !already.has(p.id) && p.rosterStatus !== "DEV" && !isForeignPlayer(p) && p.health?.status !== "INJURED")
      .sort((a, b) => Math.abs(tradeValue(a) - shortage) - Math.abs(tradeValue(b) - shortage))
      .slice(0, shortage > 45 ? 2 : 1);
    const counterOutgoing = extras.length ? [...outgoingPlayers, ...extras] : outgoingPlayers;
    const requestedCash = Math.min(state.budget, Math.max(cashOffer, Math.ceil(need * 2) / 2));
    const counter = {
      id: Date.now() + Math.random(),
      fromTeamId: targetTeamId,
      fromTeam: partnerName,
      outgoingIds: counterOutgoing.map((p) => p.id),
      incoming: targetPlayers,
      cash: requestedCash,
      deadlineDay: tradeDeadlineDay(state),
      note: extras.length ? `거절 이유: ${reasons.join(" · ")}. ${extras.map((p) => p.name).join(", ")}까지 포함하면 검토 가능` : `거절 이유: ${reasons.join(" · ")}. 현금 보전 ${money(requestedCash)} 요구`,
      counter: true
    };
    state.tradeOffers.unshift(counter);
    state.tradeOffers = state.tradeOffers.slice(0, 6);
    addNews(state, "트레이드 역제안", `${partnerName}가 ${targetNames}을 내주는 조건으로 역제안했다. 이유: ${reasons.join(" · ")}. 요구 카드: ${counterOutgoing.map((p) => p.name).join(", ")} / 현금 ${money(requestedCash)}.`, "트레이드");
    return state;
  }

  state.players = state.players.filter((p) => !outgoingIds.includes(p.id));
  const nextId = Math.max(0, ...state.players.map((p) => Number(p.id) || 0)) + 1;
  targetPlayers.forEach((target, index) => {
    target.id = nextId + index;
    target.rosterStatus = rosterCounts(state).active < 28 ? "ACTIVE" : "FARM";
    target.trait = target.trait || `${target.teamName} 출신 트레이드 영입`;
    state.players.push(target);
  });
  state.tradeTargets = state.tradeTargets.filter((p) => !targetIds.includes(Number(p.id)));
  state.tradeOffers = state.tradeOffers.filter((o) => !(o.outgoingIds || [o.outgoingId]).some((id) => outgoingIds.includes(Number(id))));
  state.budget -= cashOffer;
  state.morale += gap >= 0 ? 2 : 1;
  transactionReaction(state, outgoingPlayers, targetPlayers, "트레이드");
  ensureRosterDepth(state);
  addNews(state, "트레이드 성사", `${partnerName}에 ${outgoingPlayers.map((p) => p.name).join(", ")}을 보내고 ${targetPlayers.map((p) => p.name).join(", ")}을 영입했다. 현금 보전 ${money(cashOffer)}.`, "트레이드");
  return state;
}

function generateTradeOffer(state, playerId, source = "manual") {
  if (state.day > tradeDeadlineDay(state)) {
    addNews(state, "트레이드 마감", "트레이드 마감일이 지나 더 이상 새 제안을 만들 수 없다.", "트레이드");
    return state;
  }
  const requested = playerId ? state.players.find((p) => p.id === Number(playerId)) : null;
  if (requested && (requested.rosterStatus === "DEV" || isForeignPlayer(requested) || requested.health?.status === "INJURED")) {
    addNews(state, "트레이드 불가", `${requested.name}은 외국인/육성/부상자 제한에 걸려 트레이드 카드로 쓸 수 없다.`, "규칙");
    return state;
  }
  const pool = state.players.filter((p) => p.rosterStatus !== "DEV" && !isForeignPlayer(p) && p.health?.status !== "INJURED").sort((a, b) => b.ovr - a.ovr);
  const outgoing = requested || pool[rnd(0, Math.max(0, Math.min(8, pool.length - 1)))];
  if (!outgoing) {
    addNews(state, "트레이드 불가", "외국인 선수, 육성선수, 부상자는 트레이드 카드로 사용할 수 없다.", "규칙");
    return state;
  }
  const needType = outgoing.type === "PIT" ? "BAT" : "PIT";
  let targetPool = registeredTradeTargetPool(state, null, needType);
  if (!targetPool.length) targetPool = registeredTradeTargetPool(state);
  const alreadyOfferedTargetIds = new Set((state.tradeOffers || []).flatMap((offer) => {
    const incoming = Array.isArray(offer.incoming) ? offer.incoming : [offer.incoming].filter(Boolean);
    return incoming.map((p) => Number(p.id)).filter(Number.isFinite);
  }));
  targetPool = targetPool.filter((p) => !alreadyOfferedTargetIds.has(Number(p.id)));
  if (!targetPool.length) {
    addNews(state, "트레이드 제안 없음", "상대팀 등록 선수 명단을 불러오지 못해 새 제안을 만들 수 없다.", "트레이드");
    return state;
  }
  const outgoingValue = tradeValue(outgoing);
  const incomingSource = targetPool
    .slice()
    .sort((a, b) => Math.abs(tradeValue(a) - outgoingValue) - Math.abs(tradeValue(b) - outgoingValue) || Math.random() - 0.5)[0];
  const partner = (state.teams || []).find((team) => String(team.id) === String(incomingSource.teamId)) || opponents(state).find((team) => String(team.id) === String(incomingSource.teamId));
  const incoming = cloneTradeCard(incomingSource);
  const gap = tradeValue(incoming) - tradeValue(outgoing);
  const cash = Math.max(0, Math.round(gap * 0.12 * 10) / 10);
  const offer = {
    id: Date.now() + Math.random(),
    fromTeamId: incomingSource.teamId,
    fromTeam: partner ? `${partner.city} ${partner.name}` : incomingSource.teamName,
    outgoingId: outgoing.id,
    outgoingIds: [outgoing.id],
    incoming,
    cash,
    deadlineDay: tradeDeadlineDay(state),
    note: Math.abs(gap) <= 8 ? "가치 균형" : gap > 8 ? "현금 보전 필요" : "상대가 즉전감을 원함"
  };
  state.tradeOffers.unshift(offer);
  state.tradeOffers = state.tradeOffers.slice(0, 5);
  addNews(state, source === "auto" ? "타 구단 트레이드 문의" : "트레이드 제안", `${offer.fromTeam}가 ${outgoing.name} ↔ ${incoming.name} 딜을 문의했다. ${offer.note}.`, "트레이드");
  return state;
}

function maybeAutomaticTradeInquiry(state, reason = "day") {
  if (!state || state.day > tradeDeadlineDay(state)) return state;
  if ((state.tradeOffers || []).length >= 5) return state;
  if (state.lastAutoTradeInquiryDay && state.day - state.lastAutoTradeInquiryDay < 3) return state;
  ensureTradeTargets(state);
  if (!registeredTradeTargetPool(state).length) return state;
  const deadlinePressure = state.day >= tradeDeadlineDay(state) - 18 ? 0.16 : 0;
  const chance = reason === "game" ? 0.18 + deadlinePressure : 0.10 + deadlinePressure;
  if (Math.random() > chance) return state;
  const lineupIds = new Set([
    ...((state.lastLineup && state.lastLineup.lineup) || []),
    ...((state.activeGame && state.activeGame.lineup) || [])
  ].map(Number));
  const existingOutgoingIds = new Set((state.tradeOffers || []).flatMap((offer) => uniqueNumbers(offer.outgoingIds || offer.outgoingId)));
  const candidates = state.players
    .filter((p) => p.rosterStatus !== "DEV" && !isForeignPlayer(p) && p.health?.status !== "INJURED" && !existingOutgoingIds.has(Number(p.id)))
    .filter((p) => !String(p.trait || "").includes("프랜차이즈"))
    .map((p) => {
      const benchBonus = p.rosterStatus === "FARM" ? 18 : lineupIds.has(Number(p.id)) ? -12 : 8;
      const unhappyBonus = Math.max(0, 68 - (p.happy || 68)) * 0.35;
      const upsideBonus = Math.max(0, (p.pot || p.ovr || 50) - (p.ovr || 50)) * 0.9;
      const ageFit = (p.age || 25) <= 25 ? 5 : (p.age || 25) >= 33 ? -6 : 0;
      return { p, score: tradeValue(p) + benchBonus + unhappyBonus + upsideBonus + ageFit + Math.random() * 12 };
    })
    .sort((a, b) => b.score - a.score);
  const selected = candidates[0]?.p;
  if (!selected) return state;
  state.lastAutoTradeInquiryDay = state.day;
  return generateTradeOffer(state, selected.id, "auto");
}

function acceptTradeOffer(state, id) {
  const offer = state.tradeOffers.find((o) => o.id === Number(id));
  if (!offer) return state;
  if (state.day > tradeDeadlineDay(state)) {
    state.tradeOffers = state.tradeOffers.filter((o) => o.id !== offer.id);
    addNews(state, "트레이드 무효", "마감일이 지나 제안을 진행할 수 없다.", "트레이드");
    return state;
  }
  const outgoingIds = uniqueNumbers(offer.outgoingIds || offer.outgoingId);
  const outgoingPlayers = outgoingIds.map((pid) => state.players.find((p) => p.id === pid)).filter(Boolean);
  const incomingPlayers = Array.isArray(offer.incoming) ? offer.incoming : [offer.incoming].filter(Boolean);
  const incomingTargetIds = incomingPlayers.map((p) => Number(p.id)).filter(Number.isFinite);
  if (!outgoingPlayers.length || outgoingPlayers.length !== outgoingIds.length || outgoingPlayers.some((p) => p.rosterStatus === "DEV" || isForeignPlayer(p) || p.health?.status === "INJURED")) {
    addNews(state, "트레이드 무효", "외국인 선수, 육성선수, 부상자는 트레이드할 수 없다.", "규칙");
    return state;
  }
  if (offer.cash > state.budget) {
    addNews(state, "트레이드 보류", `현금 보전 ${money(offer.cash)}를 감당할 예산이 부족하다.`, "트레이드");
    return state;
  }
  state.players = state.players.filter((p) => !outgoingIds.includes(p.id));
  const nextId = Math.max(0, ...state.players.map((p) => Number(p.id) || 0)) + 1;
  incomingPlayers.forEach((incoming, index) => {
    incoming.id = nextId + index;
    incoming.rosterStatus = rosterCounts(state).active < 28 ? "ACTIVE" : "FARM";
    state.players.push(incoming);
  });
  state.budget -= offer.cash;
  state.morale += sumTradeValue(incomingPlayers) >= sumTradeValue(outgoingPlayers) ? 2 : -3;
  transactionReaction(state, outgoingPlayers, incomingPlayers, offer.counter ? "역제안 수락" : "트레이드");
  state.tradeOffers = state.tradeOffers.filter((o) => o.id !== offer.id);
  state.tradeTargets = (state.tradeTargets || []).filter((p) => !incomingTargetIds.includes(Number(p.id)));
  ensureRosterDepth(state);
  addNews(state, "트레이드 성사", `${outgoingPlayers.map((p) => p.name).join(", ")}을 보내고 ${offer.fromTeam}에서 ${incomingPlayers.map((p) => p.name).join(", ")}을 영입했다.`, "트레이드");
  return state;
}

function rejectTradeOffer(state, id) {
  const offer = state.tradeOffers.find((o) => o.id === Number(id));
  if (offer) addNews(state, "트레이드 거절", `${offer.fromTeam}의 제안을 거절했다.`, "트레이드");
  state.tradeOffers = state.tradeOffers.filter((o) => o.id !== Number(id));
  return state;
}

function teamStatRows(state) {
  ensureTeamStats(state);
  const rows = new Map((state.teams || []).map((team) => [team.id, {
    teamId: team.id,
    runsFor: team.teamStats?.runsFor || 0,
    runsAgainst: team.teamStats?.runsAgainst || 0,
    errors: team.teamStats?.errors || 0,
    hr: 0,
    hits: 0,
    pa: 0,
    ip: 0,
    earnedRuns: 0
  }]));
  [...(state.players || []), ...(state.leaguePlayers || [])].forEach((p) => {
    const teamId = p.teamId || state.selectedTeamId;
    const row = rows.get(teamId);
    if (!row || !p.stats) return;
    if (p.type === "BAT") {
      row.hr += Number(p.stats.hr) || 0;
      row.hits += Number(p.stats.h) || 0;
      row.pa += Number(p.stats.pa) || 0;
    } else if (p.type === "PIT") {
      const ip = Number(p.stats.ip) || 0;
      row.ip += ip;
      row.earnedRuns += ((Number(p.stats.era) || 0) * ip) / 9;
    }
  });
  return [...rows.values()].map((row) => {
    const team = (state.teams || []).find((t) => t.id === row.teamId);
    const games = Math.max(0, team?.teamStats?.games || 0);
    if (games > 0 && row.pa <= 0) {
      const power = team?.power || 65;
      row.pa = games * 36;
      row.hits = Math.max(0, Math.round(games * (7.2 + power / 45 + (row.runsFor || 0) / Math.max(1, games * 8))));
      row.hr = Math.max(0, Math.round(games * Math.max(0.45, (power - 50) / 34)));
    }
    if (games > 0 && row.ip <= 0) {
      row.ip = games * 9;
      row.earnedRuns = Math.max(0, row.runsAgainst - Math.round((row.errors || 0) * 0.35));
    }
    return {
      ...row,
      avg: row.pa > 0 ? row.hits / row.pa : 0,
      era: row.ip > 0 ? (row.earnedRuns * 9) / row.ip : 0
    };
  });
}

function enrichHandsFromCsv(state) {
  if (!state || state.handDataVersion === HAND_DATA_VERSION || !fs.existsSync(DATA_IMPORT_PATH)) return state;
  const rows = parseCsv(fs.readFileSync(DATA_IMPORT_PATH, "utf8"));
  if (rows.length < 2) return state;
  const headers = rows[0].map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);
  const teamIdIndex = idx("teamId");
  const jerseyIndex = idx("jerseyNumber");
  const nameIndex = idx("name");
  const handIndex = idx("batsThrows") >= 0 ? idx("batsThrows") : idx("hand");
  if (teamIdIndex < 0 || handIndex < 0) return state;

  const byTeamJersey = new Map();
  const byTeamName = new Map();
  rows.slice(1).forEach((row) => {
    const teamId = row[teamIdIndex];
    const hand = row[handIndex];
    const jersey = jerseyIndex >= 0 ? Number(row[jerseyIndex]) : 0;
    const name = nameIndex >= 0 ? row[nameIndex] : "";
    if (!teamId || !hand) return;
    if (Number.isFinite(jersey) && jersey > 0) byTeamJersey.set(`${teamId}:${jersey}`, hand);
    if (name) byTeamName.set(`${teamId}:${name}`, hand);
  });

  let changed = false;
  const applyTo = (players = []) => {
    players.forEach((player) => {
      if (!player || player.batsThrows) return;
      const teamId = player.teamId || state.selectedTeamId;
      const jersey = Number(player.jerseyNumber);
      const hand = byTeamJersey.get(`${teamId}:${jersey}`) || byTeamName.get(`${teamId}:${player.name}`);
      if (!hand) return;
      applyBatsThrows(player, hand);
      changed = true;
    });
  };
  applyTo(state.players);
  applyTo(state.leaguePlayers);
  applyTo(state.tradeTargets);
  state.handDataVersion = HAND_DATA_VERSION;
  if (changed) saveState(state);
  return state;
}

function publicState(state) {
  enrichHandsFromCsv(state);
  ensureActiveGameDetails(state);
  ensureLeaguePlayers(state);
  backfillStandingsGames(state);
  normalizePitcherDecisionRecords(state);
  ensureTradeTargets(state);
  pruneInvalidOffers(state);
  updateComplaints(state);
  updateRanks(state);
  state.news = cleanNewsList(state.news || []);
  return {
    ...state,
    selectedTeam: currentTeam(state),
    opponent: currentOpponent(state),
    opponentProbablePitcher: state.activeGame?.opponentPitcher || ensureProbableOpponentPitcher(state),
    scheduleInfo: currentScheduleInfo(state),
    rank: state.teams.findIndex((t) => t.id === state.selectedTeamId) + 1,
    teamPower: teamPower(state),
    rosterCounts: rosterCounts(state),
    teamStatRows: teamStatRows(state),
    protectionRecommendations: protectionRecommendations(state)
  };
}

function playGame(state) {
  if (state.day > state.seasonGames) {
    if (state.postseason?.completed) return startNextSeason(state);
    return advancePostseasonGame(state);
  }
  const me = currentTeam(state);
  const opp = currentOpponent(state);
  const plan = state.activeGame || state.lastLineup || {};
  const plannedIds = Array.isArray(plan.lineup) && plan.lineup.length === 9 ? plan.lineup.map(Number) : defaultLineup(state);
  const healthyActiveBatters = state.players
    .filter((p) => p.rosterStatus === "ACTIVE" && p.type === "BAT" && p.health?.status !== "INJURED")
    .sort((a, b) => b.ovr - a.ovr);
  const cleanIds = [];
  for (const id of plannedIds) {
    const player = healthyActiveBatters.find((p) => p.id === Number(id));
    if (player && !cleanIds.includes(player.id)) cleanIds.push(player.id);
  }
  for (const player of healthyActiveBatters) {
    if (cleanIds.length >= 9) break;
    if (!cleanIds.includes(player.id)) cleanIds.push(player.id);
  }
  const lineupIds = cleanIds.slice(0, 9);
  const lineupPositions = normalizeLineupPositions(lineupIds, plan.lineupPositions, state);
  const lineupInfo = lineupBalance(state, lineupIds, lineupPositions);
  const starter = pickSkipStarter(state, plan.starterId || plan.pitcherId);
  const relieverPool = state.players
    .filter((p) => p.rosterStatus === "ACTIVE" && p.type === "PIT" && p.health?.status !== "INJURED" && p.id !== starter?.id)
    .sort((a, b) => pitcherGameValue(b) - pitcherGameValue(a));
  const bullpenValue = avg(relieverPool.slice(0, 5).map((p) => pitcherGameValue(p))) || 46;
  const starterValue = pitcherGameValue(starter);
  const myPitching = starterValue * 0.62 + bullpenValue * 0.38;
  const myManagementPenalty = lineupInfo.defensivePenalty + lineupInfo.missing * 7 + Math.max(0, Number(starter?.restDays) || 0) * 3.5;
  const myPower = lineupInfo.offense * 0.45 + myPitching * 0.55 - myManagementPenalty * 0.48 + rnd(-7, 7);
  const oppPower = (Number(opp.power) || 66) + rnd(-7, 7);
  const scoringEnvironment = rnd(1, 100);
  const weatherBoost = scoringEnvironment > 92 ? 1.15 : scoringEnvironment < 10 ? -0.75 : 0;
  const myExpectedRuns = clampNumber(4.35 + (myPower - oppPower) / 20 + weatherBoost, 1.4, 8.7);
  const oppExpectedRuns = clampNumber(4.35 + (oppPower - myPower) / 20 + weatherBoost + lineupInfo.defensivePenalty / 24, 1.4, 8.9);
  const myRuns = Math.min(16, sampleRuns(myExpectedRuns));
  const oppRuns = Math.min(16, sampleRuns(oppExpectedRuns));
  const finalMe = myRuns === oppRuns ? myRuns + (Math.random() > 0.52 ? 1 : 0) : myRuns;
  const finalOpp = myRuns === oppRuns && finalMe === myRuns ? oppRuns + 1 : oppRuns;
  const won = finalMe > finalOpp;

  if (won) {
    me.w += 1;
    opp.l += 1;
    state.morale += 3;
    state.fanInterest += 2;
    state.trainingPts += 2;
  } else {
    me.l += 1;
    opp.w += 1;
    state.morale -= 2;
    state.fanInterest -= 1;
    state.trainingPts += 1;
  }

  state.morale = Math.max(20, Math.min(95, state.morale));
  state.fanInterest = Math.max(25, Math.min(98, state.fanInterest));
  state.budget += won ? 0.4 : 0.1;
  recordTeamGame(me, finalMe, finalOpp, estimateTeamErrors(me, finalOpp));
  recordTeamGame(opp, finalOpp, finalMe, estimateTeamErrors(opp, finalMe));

  const activeBatters = lineupInfo.players;
  const pitcherUsage = buildSkipPitchingPlan(state, starter, finalMe, finalOpp);
  const lineupSet = new Set(activeBatters.map((p) => p.id));
  const usedPitcherIds = Object.keys(pitcherUsage).map(Number);
  const usedPitcherSet = new Set(usedPitcherIds);
  const reliefPitcherIds = usedPitcherIds.filter((id) => id !== starter?.id);
  const lastPitcherId = reliefPitcherIds[reliefPitcherIds.length - 1] || starter?.id;
  const setupPitcherIds = new Set(reliefPitcherIds.slice(0, -1));

  for (const p of state.players) {
    if (p.rosterStatus !== "ACTIVE") continue;
    const played = lineupSet.has(p.id) || usedPitcherSet.has(p.id);
    p.happy = Math.max(30, Math.min(96, p.happy + (won ? 1 : -1) + (played ? 0 : -0.2)));
    if (p.type === "BAT") {
      if (!lineupSet.has(p.id)) continue;
      const pa = rnd(3, 5);
      const contact = Math.max(0.16, Math.min(0.35, 0.165 + (p.hit || 60) / 850 + rnd(-2, 2) / 100));
      const hits = Math.max(0, Math.min(pa, Math.round(contact * pa + rnd(-1, 1))));
      const homers = Math.random() < Math.max(0.006, (p.pow || 60) / 2300) ? 1 : 0;
      const creditedHits = Math.max(hits, homers);
      const walks = Math.random() < Math.max(0.04, (p.hit || 60) / 1700) ? 1 : 0;
      p.stats.hr = (p.stats.hr || 0) + homers;
      p.stats.rbi = (p.stats.rbi || 0) + rnd(0, homers ? 3 : Math.max(1, Math.round((p.hit || 60) / 55)));
      p.stats.sb = (p.stats.sb || 0) + (Math.random() < (p.spd || 55) / 1550 ? 1 : 0);
      p.stats.pa = (p.stats.pa || 0) + pa;
      p.stats.h = (p.stats.h || 0) + creditedHits;
      p.stats.r = (p.stats.r || 0) + rnd(0, creditedHits + ((p.spd || 55) > 70 ? 1 : 0));
      p.stats.bb = (p.stats.bb || 0) + walks;
      p.stats.so = (p.stats.so || 0) + Math.max(0, Math.round(pa * Math.max(0.12, 0.31 - (p.hit || 60) / 500)) + rnd(-1, 1));
      p.stats.ab = Math.max(p.stats.ab || 0, p.stats.pa - (p.stats.bb || 0));
      p.stats.tb = (p.stats.tb || 0) + creditedHits + homers * 3;
      updateRateStats(p);
    } else {
      const pitches = pitcherUsage[p.id] || 0;
      if (!pitches) continue;
      p.stats.so += Math.max(0, Math.round((pitches * (p.pit || 60)) / 650) + rnd(0, 2));
      p.stats.ip = (p.stats.ip || 0) + Math.round((pitches / 15) * 10) / 10;
      p.stats.era = Math.min(7.5, Math.max(1.8, (p.stats.era || 3.8) + (Math.random() - 0.52) / 3));
      if (won && p.id === starter?.id) p.stats.win += 1;
      if (!won && p.id === starter?.id) p.stats.loss = (p.stats.loss || 0) + 1;
      const closeWin = won && Math.abs(finalMe - finalOpp) <= 3;
      const saveChance = closeWin && p.id === lastPitcherId && p.id !== starter?.id;
      const holdChance = won && setupPitcherIds.has(p.id) && (closeWin ? Math.random() < 0.75 : Math.random() < 0.25);
      if (saveChance || (p.pitcherRole === "CL" && won && Math.random() < 0.08)) p.stats.sv = (p.stats.sv || 0) + 1;
      if (holdChance || (["MR","SU"].includes(p.pitcherRole) && won && (closeWin ? Math.random() < 0.35 : Math.random() < 0.12))) p.stats.hold = (p.stats.hold || 0) + 1;
    }
  }
  applyPostGameFatigue(state, pitcherUsage, activeBatters.map((p) => p.id), lineupPositions);
  state.activeGame = null;

  state.lastGame = { opp: `${opp.city} ${opp.name}`, me: finalMe, them: finalOpp, won };
  state.games.unshift({ day: state.day, text: `${won ? "승" : "패"} · ${me.city} ${me.name} ${finalMe}-${finalOpp} ${opp.city} ${opp.name}` });
  state.games = state.games.slice(0, 12);
  addNews(state, won ? `${me.short}, 접전 끝 승리` : `${me.short}, 아쉬운 패배`, `${opp.city} ${opp.name}전 ${finalMe}-${finalOpp}. ${won ? "젊은 코어의 성장세가 눈에 띄었다." : "불펜 피로와 타선 기복이 다음 과제로 남았다."}`, "경기");

  const playedPlayers = state.players.filter((p) => lineupSet.has(p.id) || usedPitcherSet.has(p.id));
  maybeAutomaticInjury(state, playedPlayers, "game");
  if (state.day % 6 === 0 || Math.random() < 0.18) generateOffer(state);
  maybeAutomaticTradeInquiry(state, "game");
  if (state.day % 12 === 0) ageAndDevelop(state);
  progressPitchTraining(state);
  progressTrainingAssignments(state);
  accrueServiceDays(state);
  simulateOtherTeams(state);
  recoverOpponentBullpenFatigue(state);
  state.day += 1;
  progressScheduledInjuryReturns(state);
  progressInjuryRecovery(state);
  recoverPitcherRest(state);
  if (state.day > state.seasonGames) startPostseason(state);
  return state;
}

function trainPlayer(state, id, focus) {
  const p = state.players.find((x) => x.id === id);
  if (!p) {
    addNews(state, "훈련 실패", "선수를 다시 선택해야 한다.", "육성");
    return state;
  }
  ensurePositionData(p);
  const room = Math.max(0, p.pot - p.ovr);
  const gain = room > 16 ? rnd(2, 4) : rnd(1, 2);
  if (String(focus || "").startsWith("pos:") && p.type === "BAT") {
    const pos = String(focus).split(":")[1];
    if (FIELD_POSITIONS.includes(pos)) {
      p.positionTraining[pos] = Math.min(100, (p.positionTraining[pos] || (p.secondaryPositions.includes(pos) ? 70 : 0)) + rnd(12, 20));
      p.def = Math.min(99, p.def + 1);
      p.form = Math.max(35, Math.min(96, p.form + rnd(-1, 2)));
      p.happy = Math.max(25, Math.min(98, p.happy + (pos === p.pos ? 1 : -1)));
      if (p.positionTraining[pos] >= 60 && !p.secondaryPositions.includes(pos)) p.secondaryPositions.push(pos);
      if (p.positionTraining[pos] >= 85) p.pos = pos;
      p.ovr = recalcOvr(p);
      state.selectedId = id;
      addNews(state, "포지션 훈련", `${p.name}이 ${pos} 수비 훈련을 진행했다. 숙련도 ${p.positionTraining[pos]}%, 현재 포지션 ${p.pos}.`, "육성");
      return state;
    }
  }
  if (String(focus || "").startsWith("pitch:") && p.type === "PIT") {
    ensurePitchArsenal(p);
    const pitchType = String(focus).split(":")[1];
    const pitch = p.pitchArsenal.find((item) => item.type === pitchType);
    state.selectedId = id;
    if (!pitch) {
      addNews(state, "구종 훈련 실패", `${p.name}은 아직 ${pitchType}을 실전 구종으로 쓰지 않는다.`, "육성");
      return state;
    }
    p.pitchTraining = { mode: "refine", type: pitchType, progress: 0, days: 0 };
    p.happy = Math.min(98, p.happy + 1);
    addNews(state, "구종 훈련 지시", `${p.name}에게 ${pitchType} 집중 훈련을 지시했다. 경기 일정을 진행하면 숙련도가 오른다.`, "육성");
    return state;
  }
  if (String(focus || "").startsWith("pitchnew:") && p.type === "PIT") {
    ensurePitchArsenal(p);
    const pitchType = String(focus).split(":")[1];
    state.selectedId = id;
    if (!pitchCatalogByType(pitchType)) return state;
    if (p.pitchArsenal.some((item) => item.type === pitchType)) {
      addNews(state, "신구종 훈련 보류", `${p.name}은 이미 ${pitchType}을 던진다. 기존 구종 훈련으로 전환하세요.`, "육성");
      return state;
    }
    if ((p.pitchArsenal || []).length >= 6) {
      addNews(state, "신구종 훈련 보류", `${p.name}은 이미 구종이 많아 새 구종보다 기존 결정구 완성도가 우선이다.`, "육성");
      return state;
    }
    p.pitchTraining = { mode: "new", type: pitchType, progress: 0, days: 0 };
    p.happy = Math.max(25, p.happy - 1);
    addNews(state, "신구종 훈련 지시", `${p.name}이 ${pitchType} 습득 훈련을 시작했다. 며칠 일정이 지나 진행률 100%가 되면 실전 구종에 추가된다.`, "육성");
    return state;
  }
  if (state.trainingPts < 2) {
    state.selectedId = p.id;
    addNews(state, "훈련 포인트 부족", `${p.name} 집중 훈련에는 포인트 2가 필요하다. 포지션 훈련은 포인트 없이 지시할 수 있다.`, "육성");
    return state;
  }
  state.trainingPts -= 2;
  p.form = Math.min(96, p.form + rnd(2, 5));
  p.happy = Math.min(96, p.happy + 1);
  if (p.health?.status === "OK" && Math.random() < injuryRisk(p, "training")) randomInjury(state, p.id, "training");
  if (focus === "hit") p.hit = Math.min(99, p.hit + gain);
  if (focus === "pow") p.pow = Math.min(99, p.pow + gain);
  if (focus === "def") p.def = Math.min(99, p.def + gain);
  if (focus === "arm") p.arm = Math.min(99, (p.arm || playerArmFallback(p)) + gain);
  if (focus === "pit") p.pit = Math.min(99, p.pit + gain);
  p.ovr = recalcOvr(p);
  state.selectedId = id;
  addNews(state, "훈련 리포트", `${p.name}의 집중 훈련이 완료됐다. 현재 능력치가 ${p.ovr}까지 조정됐다.`, "육성");
  return state;
}

function trainingLabel(focus) {
  return {
    hit: "컨택 훈련",
    pow: "장타 훈련",
    def: "수비 훈련",
    arm: "송구 훈련",
    pit: "투구 밸런스"
  }[focus] || "개별 훈련";
}

function progressTrainingAssignments(state) {
  const reports = [];
  for (const p of state.players || []) {
    if (!p || p.health?.status === "INJURED") continue;
    ensurePositionData(p);

    if (p.trainingFocus?.focus) {
      const focus = p.trainingFocus.focus;
      const ceiling = Math.max(p.pot || p.ovr || 60, p.ovr || 60);
      const growth = rnd(7, 13) + Math.max(0, ceiling - (p.ovr || 60)) * 0.18 + ((p.form || 65) - 65) * 0.05;
      p.trainingFocus.days = (p.trainingFocus.days || 0) + 1;
      p.trainingFocus.progress = Math.min(100, Math.round((p.trainingFocus.progress || 0) + growth));
      p.form = Math.max(35, Math.min(96, (p.form || 65) + rnd(-1, 1)));
      if (p.health?.status === "OK" && Math.random() < injuryRisk(p, "training") * 0.45) randomInjury(state, p.id, "training");

      if (p.trainingFocus.progress >= 100) {
        p.developmentFocus = focus;
        reports.push(`${p.name} ${trainingLabel(focus)} 방향 설정`);
        p.trainingFocus = null;
      }
    }

    if (p.positionTrainingFocus?.pos && p.type === "BAT") {
      const pos = p.positionTrainingFocus.pos;
      const base = p.positionTraining[pos] || ((p.secondaryPositions || []).includes(pos) ? 70 : 0);
      const gain = rnd(6, 12) + Math.max(0, (p.def || 60) - 55) * 0.04;
      p.positionTrainingFocus.days = (p.positionTrainingFocus.days || 0) + 1;
      p.positionTrainingFocus.progress = Math.min(100, Math.round((p.positionTrainingFocus.progress || 0) + gain));
      p.positionTraining[pos] = Math.min(100, Math.round(base + gain));
      if (p.positionTraining[pos] >= 60 && !p.secondaryPositions.includes(pos)) {
        p.secondaryPositions.push(pos);
        reports.push(`${p.name} ${pos} 백업 출장 가능`);
      }
      if (p.positionTraining[pos] >= 85 && p.pos !== pos) {
        reports.push(`${p.name} ${pos} 포지션 적응 완료`);
      }
      if (p.positionTrainingFocus.progress >= 100) {
        if (p.positionTraining[pos] < 85) reports.push(`${p.name} ${pos} 포지션 적응도 ${p.positionTraining[pos]}%`);
        p.positionTrainingFocus = null;
      }
    }
  }
  if (reports.length) addNews(state, "훈련 리포트", reports.slice(0, 5).join(" · "), "육성");
}

function trainPlayer(state, id, focus) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p) {
    addNews(state, "훈련 지시 실패", "선수를 다시 선택해야 한다.", "육성");
    return state;
  }
  state.selectedId = p.id;
  ensurePositionData(p);
  const value = String(focus || "");

  if (value.startsWith("pos:") && p.type === "BAT") {
    const pos = value.split(":")[1];
    if (!FIELD_POSITIONS.includes(pos)) return state;
    p.positionTrainingFocus = { pos, progress: 0, days: 0 };
    p.happy = Math.max(25, Math.min(98, (p.happy || 65) + (pos === p.pos ? 1 : -1)));
    addNews(state, "포지션 훈련 지시", `${p.name}에게 ${pos} 수비 적응 훈련을 지시했다. 일정이 지나면 숙련도가 오른다.`, "육성");
    return state;
  }

  if (value.startsWith("pitch:") && p.type === "PIT") {
    ensurePitchArsenal(p);
    const pitchType = value.split(":")[1];
    const pitch = p.pitchArsenal.find((item) => item.type === pitchType);
    if (!pitch) {
      addNews(state, "구종 훈련 실패", `${p.name}은 아직 ${pitchType}을 실전 구종으로 쓰지 않는다.`, "육성");
      return state;
    }
    p.pitchTraining = { mode: "refine", type: pitchType, progress: 0, days: 0 };
    addNews(state, "구종 훈련 지시", `${p.name}에게 ${pitchType} 집중 훈련을 지시했다. 일정이 지나면 숙련도가 오른다.`, "육성");
    return state;
  }

  if (value.startsWith("pitchnew:") && p.type === "PIT") {
    ensurePitchArsenal(p);
    const pitchType = value.split(":")[1];
    if (!pitchCatalogByType(pitchType)) return state;
    if (p.pitchArsenal.some((item) => item.type === pitchType)) {
      addNews(state, "신구종 훈련 보류", `${p.name}은 이미 ${pitchType}을 던진다. 기존 구종 훈련으로 전환하세요.`, "육성");
      return state;
    }
    if ((p.pitchArsenal || []).length >= 6) {
      addNews(state, "신구종 훈련 보류", `${p.name}은 이미 구종이 많아 새 구종보다 기존 결정구 완성도가 우선이다.`, "육성");
      return state;
    }
    p.pitchTraining = { mode: "new", type: pitchType, progress: 0, days: 0 };
    p.happy = Math.max(25, (p.happy || 65) - 1);
    addNews(state, "신구종 훈련 지시", `${p.name}이 ${pitchType} 습득 훈련을 시작했다. 며칠 일정이 지나 진행률 100%가 되면 실전 구종에 추가된다.`, "육성");
    return state;
  }

  const valid = p.type === "PIT" ? ["pit", "def", "arm"] : ["hit", "pow", "def", "arm"];
  const selectedFocus = valid.includes(value) ? value : (p.type === "PIT" ? "pit" : "hit");
  p.trainingFocus = { focus: selectedFocus, progress: 0, days: 0 };
  p.happy = Math.max(25, Math.min(98, (p.happy || 65) + 1));
  addNews(state, "훈련 과제 지시", `${p.name}에게 ${trainingLabel(selectedFocus)}을 지시했다. 훈련은 성장 방향을 잡고, 실제 능력 상승은 2군/경기 경험을 거치며 반영된다.`, "육성");
  return state;
}

const HS_SCHOOLS = ["북일고", "덕수고", "장충고", "충암고", "경남고", "광주일고", "대구상원고", "서울고", "유신고", "인천고", "부산고", "전주고"];
const HS_LAST = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "문", "권", "류"];
const HS_MIDDLE = ["도", "민", "서", "지", "현", "준", "태", "하", "건", "유", "시", "찬", "우", "원", "재", "율"];
const HS_END = ["현", "우", "준", "민", "찬", "성", "율", "빈", "호", "겸", "윤", "혁", "진", "원", "재", "영"];

function makeHighSchoolName(seed) {
  return HS_LAST[seed % HS_LAST.length] + HS_MIDDLE[(seed * 3 + 5) % HS_MIDDLE.length] + HS_END[(seed * 7 + 2) % HS_END.length];
}

function makeHighSchoolStats(type, base, seed) {
  return [1, 2, 3].map((year) => {
    const age = 15 + year;
    const growth = (year - 1) * rnd(2, 5) + Math.max(0, base - 60) * 0.12;
    if (type === "PIT") {
      const ip = rnd(22 + year * 8, 42 + year * 14);
      const eraRaw = Math.max(0.7, 5.2 - (base + growth - 55) * 0.055 + rnd(-8, 9) / 10);
      return {
        year: `${year}학년`,
        age,
        g: rnd(8 + year, 13 + year * 2),
        ip,
        era: Math.round(eraRaw * 100) / 100,
        so: Math.round(ip * (0.78 + (base + growth - 55) * 0.018)),
        bb: Math.max(4, Math.round(ip * (0.36 - (base + growth - 60) * 0.004))),
        velo: Math.min(156, Math.round(134 + (base - 50) * 0.35 + year * rnd(1, 3) + seed % 4))
      };
    }
    const pa = rnd(42 + year * 12, 72 + year * 16);
    const avg = Math.max(0.210, Math.min(0.470, 0.245 + (base + growth - 55) * 0.006 + rnd(-25, 26) / 1000));
    const hr = Math.max(0, Math.round((base - 54) * 0.08 + year * 0.7 + rnd(-1, 2)));
    return {
      year: `${year}학년`,
      age,
      g: rnd(13 + year, 20 + year * 2),
      pa,
      avg: Math.round(avg * 1000) / 1000,
      hr,
      rbi: Math.max(3, Math.round(pa * avg * 0.42 + hr * 2 + rnd(0, 8))),
      sb: Math.max(0, Math.round((base - 50) * 0.09 + rnd(0, 7))),
      ops: Math.round(Math.min(1.250, avg + 0.310 + hr * 0.035 + rnd(-20, 31) / 1000) * 1000) / 1000
    };
  });
}

function draftReport(prospect) {
  if (prospect.type === "PIT") {
    const senior = prospect.hsStats[(prospect.hsStats || []).length - 1] || {};
    return `${senior.velo}km/h · ERA ${senior.era} · ${senior.so}K/${senior.bb}BB`;
  }
  const senior = prospect.hsStats[(prospect.hsStats || []).length - 1] || {};
  return `AVG ${Number(senior.avg || 0).toFixed(3)} · OPS ${Number(senior.ops || 0).toFixed(3)} · ${senior.hr || 0}HR · ${senior.sb || 0}SB`;
}

function makeDraftProspect(index, grade = 3, cohortSeed = 0) {
  const pos = ["SP", "SS", "CF", "C", "3B", "RF", "2B", "RP", "1B", "LF"][index % 10];
  const type = ["SP", "RP", "CL"].includes(pos) ? "PIT" : "BAT";
  const base = rnd(48, 78) + (index < 10 ? rnd(4, 10) : 0) - Math.max(0, 3 - grade) * 3;
  const pot = Math.max(58, Math.min(96, base + rnd(10, 24)));
  const ovr = Math.max(42, Math.min(74, base + rnd(-4, 5)));
  const hsStats = makeHighSchoolStats(type, base, index + cohortSeed).filter((s, statIndex) => statIndex < grade);
  const school = HS_SCHOOLS[index % HS_SCHOOLS.length];
  const prospect = {
    id: 900000 + (cohortSeed % 100000) * 100 + index,
    name: makeHighSchoolName(index + cohortSeed + rnd(0, 1000)),
    school,
    grade,
    pos,
    type,
    age: 15 + grade,
    batsThrows: type === "PIT" ? (rnd(1, 100) > 72 ? "좌투" : "우투") : (rnd(1, 100) > 70 ? "좌타" : "우타"),
    ovr,
    pot,
    hit: type === "BAT" ? Math.max(35, Math.min(82, ovr + rnd(-5, 7))) : 10,
    pow: type === "BAT" ? Math.max(30, Math.min(84, ovr + rnd(-8, 9))) : 10,
    spd: Math.max(35, Math.min(90, rnd(45, 78) + (["SS", "CF", "2B"].includes(pos) ? 8 : 0))),
    def: Math.max(35, Math.min(88, rnd(45, 76) + (["C", "SS", "CF"].includes(pos) ? 9 : 0))),
    arm: Math.max(42, Math.min(94, rnd(48, 82) + (type === "PIT" || ["C", "SS", "RF"].includes(pos) ? 8 : 0))),
    pit: type === "PIT" ? Math.max(38, Math.min(82, ovr + rnd(-6, 8))) : 10,
    stamina: type === "PIT" ? rnd(pos === "SP" ? 62 : 38, pos === "SP" ? 88 : 62) : rnd(48, 78),
    durability: rnd(45, 86),
    hsStats,
    report: "",
    signBonus: Math.round((0.4 + Math.max(0, pot - 60) * 0.09 + Math.max(0, ovr - 58) * 0.04) * 10) / 10,
    drafted: false
  };
  prospect.report = draftReport(prospect);
  prospect.rankScore = Math.round(prospect.pot * 1.55 + prospect.ovr * 0.9 + (prospect.age <= 18 ? 8 : 0) + rnd(-10, 10));
  return prospect;
}

function buildHighSchoolCohort(grade, seasonYear = 1) {
  const seed = seasonYear * 1000 + grade * 100;
  return Array.from({ length: HS_DRAFT_POOL_SIZE }, (_, index) => makeDraftProspect(index, grade, seed))
    .map((p, index) => ({ ...p, cohortYear: seasonYear, cohortId: `${seasonYear}-${grade}-${index}` }));
}

function ensureHighSchoolCohorts(state) {
  if (!state) return state;
  const seasonYear = Number(state.seasonYear) || 1;
  if (!Array.isArray(state.hsCohorts) || !state.hsCohorts.length) {
    state.hsCohorts = [1, 2, 3].map((grade) => ({ grade, seasonYear, players: buildHighSchoolCohort(grade, seasonYear) }));
  }
  for (const grade of [1, 2, 3]) {
    const cohort = state.hsCohorts.find((c) => Number(c.grade) === grade);
    if (!cohort || !Array.isArray(cohort.players) || !cohort.players.length) {
      state.hsCohorts = state.hsCohorts.filter((c) => Number(c.grade) !== grade);
      state.hsCohorts.push({ grade, seasonYear, players: buildHighSchoolCohort(grade, seasonYear) });
    }
  }
  state.hsCohorts.sort((a, b) => Number(a.grade) - Number(b.grade));
  return state;
}

function seniorHighSchoolPool(state) {
  ensureHighSchoolCohorts(state);
  const senior = state.hsCohorts.find((c) => Number(c.grade) === 3);
  return (senior?.players || []).filter((p) => !p.drafted);
}

function fillDraftClassToFullRounds(state) {
  if (!state || !Array.isArray(state.draftClass)) return state;
  const targetSize = DRAFT_ROUNDS * 10;
  const seasonYear = Number(state.seasonYear) || 1;
  while (state.draftClass.length < targetSize) {
    const index = state.draftClass.length;
    const extra = makeRandomDevelopmentProspect(index + seasonYear * 1000);
    state.draftClass.push({
      ...extra,
      grade: 3,
      rank: index + 1,
      projectedRound: Math.floor(index / 10) + 1,
      supplementalDraft: true
    });
  }
  return state;
}

function promoteHighSchoolCohorts(state) {
  ensureHighSchoolCohorts(state);
  const seasonYear = (Number(state.seasonYear) || 1) + 1;
  const grade2 = state.hsCohorts.find((c) => Number(c.grade) === 2)?.players || [];
  const grade1 = state.hsCohorts.find((c) => Number(c.grade) === 1)?.players || [];
  const promote = (players, grade) => players.map((p, index) => {
    const next = { ...p, grade, age: 15 + grade, drafted: false };
    next.hsStats = makeHighSchoolStats(next.type, Math.max(48, next.ovr || 55), index + seasonYear * 1000).filter((s, statIndex) => statIndex < grade);
    next.report = draftReport(next);
    next.rankScore = Math.round(next.pot * 1.55 + next.ovr * 0.9 + (grade === 3 ? 8 : 0) + rnd(-10, 10));
    return next;
  });
  state.seasonYear = seasonYear;
  state.hsCohorts = [
    { grade: 1, seasonYear, players: buildHighSchoolCohort(1, seasonYear) },
    { grade: 2, seasonYear, players: promote(grade1, 2) },
    { grade: 3, seasonYear, players: promote(grade2, 3) }
  ];
  return state;
}

function makeRandomDevelopmentProspect(index) {
  const pos = ["SP", "RP", "C", "SS", "CF", "2B", "3B", "RF", "1B", "LF"][rnd(0, 9)];
  const type = ["SP", "RP", "CL"].includes(pos) ? "PIT" : "BAT";
  const age = rnd(18, 23);
  const ovr = rnd(38, 62) + (index < 8 ? rnd(3, 8) : 0);
  const pot = Math.max(ovr + rnd(8, 24), rnd(58, 88));
  const name = makeHighSchoolName(index + rnd(1000, 9999));
  const source = ["독립리그 테스트", "지역 연습경기", "대학 중퇴", "군 전역 테스트", "트라이아웃", "퓨처스 추천"][rnd(0, 5)];
  const p = {
    id: 950000 + Date.now() % 100000 + index,
    name,
    school: source,
    pos,
    type,
    age,
    batsThrows: type === "PIT" ? (rnd(1, 100) > 75 ? "좌투" : "우투") : (rnd(1, 100) > 68 ? "좌타" : "우타"),
    ovr,
    pot,
    hit: type === "BAT" ? rnd(34, Math.min(75, ovr + 10)) : 10,
    pow: type === "BAT" ? rnd(30, Math.min(76, ovr + 10)) : 10,
    spd: rnd(38, 84),
    def: rnd(36, 78),
    arm: rnd(42, 88),
    pit: type === "PIT" ? rnd(36, Math.min(76, ovr + 12)) : 10,
    stamina: type === "PIT" ? rnd(pos === "SP" ? 55 : 35, pos === "SP" ? 82 : 60) : rnd(44, 76),
    durability: rnd(42, 82),
    hsStats: [],
    report: "",
    signBonus: Math.round((0.1 + Math.max(0, pot - 55) * 0.035 + Math.max(0, ovr - 50) * 0.025) * 10) / 10,
    drafted: false,
    developmentDraft: true
  };
  p.report = type === "PIT"
    ? `${source} · 최고 ${Math.min(154, 132 + p.pit * 0.25 + rnd(0, 7))}km/h · 제구/체력 검증 필요`
    : `${source} · ${p.pos} 테스트 · 툴 ${Math.max(p.hit, p.pow, p.spd, p.def, p.arm)} · 실전 검증 필요`;
  p.rankScore = Math.round(p.pot * 1.35 + p.ovr * 0.85 + rnd(-14, 12));
  return p;
}

function generateDraftClass(state) {
  ensureHighSchoolCohorts(state);
  const seasonYear = Number(state.seasonYear) || 1;
  if ((state.day || 1) < (state.draftDay || DRAFT_DAY)) {
    const currentDay = Number(state.day || 1);
    const draftDay = Number(state.draftDay || DRAFT_DAY);
    const remaining = Math.max(0, draftDay - currentDay);
    addNews(state, "드래프트 일정 전", `신인 드래프트는 Day ${draftDay}에 열린다. 현재 Day ${currentDay}라 ${remaining}경기 남았다. 지금은 고교 선수 스카우팅 기간이다.`, "드래프트");
    return state;
  }
  if (state.draftCompletedSeason === seasonYear) {
    addNews(state, "드래프트 종료", `${seasonYear}시즌 신인 드래프트는 이미 종료됐다.`, "드래프트");
    return state;
  }
  if (state.draftWindowOpen && Array.isArray(state.draftClass) && state.draftClass.length) return state;
  const draftTargetSize = DRAFT_ROUNDS * 10;
  const prospects = seniorHighSchoolPool(state).sort((a, b) => b.rankScore - a.rankScore);
  while (prospects.length < draftTargetSize) {
    const extra = makeRandomDevelopmentProspect(prospects.length + seasonYear * 1000);
    prospects.push({ ...extra, grade: 3, school: extra.school || "추가 테스트", supplementalDraft: true });
  }
  prospects.sort((a, b) => b.rankScore - a.rankScore);
  const rankedProspects = prospects.map((p, index) => ({ ...p, rank: index + 1, projectedRound: Math.floor(index / 10) + 1 }));
  state.draftClass = rankedProspects;
  state.draftCycle = seasonYear;
  state.draftSeason = seasonYear;
  state.draftWindowOpen = true;
  state.draftOrder = draftOrderForState(state);
  state.draftRound = 1;
  state.draftPick = 0;
  addNews(state, "신인 드래프트 개막", `${seasonYear}시즌 고교 3학년 지명 후보 ${rankedProspects.length}명이 공개됐다. 1~2학년은 다음 시즌 이후 드래프트로 넘어간다.`, "드래프트");
  advanceDraftToUser(state);
  return state;
}

function ensureDraftWindow(state) {
  if (!state) return state;
  ensureHighSchoolCohorts(state);
  const seasonYear = Number(state.seasonYear) || 1;
  if ((state.day || 1) >= (state.draftDay || DRAFT_DAY) && state.draftCompletedSeason !== seasonYear && !state.draftWindowOpen) {
    generateDraftClass(state);
  }
  return state;
}

function draftOrderForState(state) {
  return (state.teams || teamTemplates)
    .slice()
    .sort((a, b) => {
      const ar = (a.w || 0) / Math.max(1, (a.w || 0) + (a.l || 0));
      const br = (b.w || 0) / Math.max(1, (b.w || 0) + (b.l || 0));
      return ar - br || (a.w || 0) - (b.w || 0) || (b.l || 0) - (a.l || 0);
    })
    .map((t) => t.id);
}

function currentDraftTeamId(state) {
  if (!Array.isArray(state.draftOrder) || state.draftOrder.length !== 10) state.draftOrder = draftOrderForState(state);
  if ((state.draftRound || 1) > DRAFT_ROUNDS) return null;
  return state.draftOrder[state.draftPick % state.draftOrder.length];
}

function advanceDraftSlot(state) {
  state.draftPick = (state.draftPick || 0) + 1;
  if (state.draftPick >= 10) {
    state.draftPick = 0;
    state.draftRound = (state.draftRound || 1) + 1;
  }
  if ((state.draftRound || 1) > DRAFT_ROUNDS) completeDraftSeason(state);
}

function completeDraftSeason(state) {
  const seasonYear = Number(state.seasonYear) || 1;
  state.draftWindowOpen = false;
  state.draftCompletedSeason = seasonYear;
  state.draftClass = [];
  state.draftOrder = [];
  state.draftRound = 1;
  state.draftPick = 0;
  promoteHighSchoolCohorts(state);
  addNews(state, "신인 드래프트 종료", `${seasonYear}시즌 드래프트가 종료됐다. 고교 2학년은 다음 시즌 3학년 지명 후보로 올라간다.`, "드래프트");
  return state;
}

function autoDraftForTeam(state, teamId) {
  const prospect = (state.draftClass || []).filter((p) => !p.drafted).sort((a, b) => b.rankScore - a.rankScore)[0];
  if (!prospect) return null;
  prospect.drafted = true;
  prospect.draftedBy = teamId;
  prospect.draftedRound = state.draftRound;
  markCohortProspectDrafted(state, prospect, teamId);
  const team = (state.teams || teamTemplates).find((t) => t.id === teamId);
  state.draftHistory.unshift({ day: state.day, teamId, teamName: team ? `${team.city} ${team.name}` : teamId, name: prospect.name, school: prospect.school, rank: prospect.rank, round: state.draftRound });
  return prospect;
}

function markCohortProspectDrafted(state, prospect, teamId) {
  const senior = (state.hsCohorts || []).find((c) => Number(c.grade) === 3);
  const match = (senior?.players || []).find((p) => p.cohortId === prospect.cohortId || p.id === prospect.id);
  if (match) {
    match.drafted = true;
    match.draftedBy = teamId;
    match.draftedRound = state.draftRound;
  }
}

function advanceDraftToUser(state) {
  if (!Array.isArray(state.draftClass) || !state.draftClass.length) generateDraftClass(state);
  fillDraftClassToFullRounds(state);
  let picks = 0;
  while (currentDraftTeamId(state) && currentDraftTeamId(state) !== state.selectedTeamId && picks < 120) {
    const teamId = currentDraftTeamId(state);
    const picked = autoDraftForTeam(state, teamId);
    if (!picked) {
      completeDraftSeason(state);
      return state;
    }
    advanceDraftSlot(state);
    picks += 1;
  }
  if (state.draftWindowOpen && !(state.draftClass || []).some((p) => !p.drafted)) {
    completeDraftSeason(state);
    return state;
  }
  addNews(state, "드래프트 진행", currentDraftTeamId(state) === state.selectedTeamId ? `${state.draftRound}라운드 ${state.draftPick + 1}번째, 우리 구단 지명 차례다.` : "드래프트가 종료됐다.", "드래프트");
  return state;
}

function draftProspect(state, id) {
  if (!Array.isArray(state.draftClass) || !state.draftClass.length) generateDraftClass(state);
  fillDraftClassToFullRounds(state);
  if (currentDraftTeamId(state) !== state.selectedTeamId) {
    addNews(state, "지명 순번 대기", "아직 우리 구단 지명 차례가 아니다. 내 순번까지 진행을 눌러야 한다.", "드래프트");
    return state;
  }
  const prospect = state.draftClass.find((p) => p.id === Number(id) && !p.drafted);
  if (!prospect) return state;
  const counts = rosterCounts(state);
  const rosterStatus = counts.registered < 65 ? "FARM" : "DEV";
  const newId = Math.max(0, ...state.players.map((p) => p.id || 0)) + 1;
  const trait = prospect.developmentDraft ? `${prospect.school} 육성 후보 지명` : `${prospect.school} 3년 성적 지명`;
  const p = makePlayer([prospect.name, prospect.pos, prospect.type, prospect.age, prospect.ovr, prospect.pot, trait], newId - 1);
  Object.assign(p, {
    id: newId,
    hit: prospect.hit,
    pow: prospect.pow,
    spd: prospect.spd,
    def: prospect.def,
    arm: prospect.arm,
    pit: prospect.pit,
    stamina: prospect.stamina,
    durability: prospect.durability,
    rosterStatus,
    development: rosterStatus === "DEV",
    serviceYears: 0,
    serviceDays: 0,
    faRemainingDays: faServiceRequiredDays({ age: 18 }) || 9 * KBO_SERVICE_DAYS_PER_YEAR,
    contract: { yearsLeft: 1, annual: 0.3, kind: prospect.developmentDraft ? "육성 후보 연봉계약" : "신인지명 연봉계약", source: prospect.developmentDraft ? "랜덤 육성 후보 드래프트" : "가상 고교 3년 성적 드래프트" },
    salary: 0.3,
    signingBonus: prospect.signBonus,
    hsStats: prospect.hsStats,
    draftInfo: { rank: prospect.rank, round: prospect.projectedRound, school: prospect.school, report: prospect.report },
    dataSource: prospect.developmentDraft ? "fictional-dev-draft" : "fictional-hs-draft"
  });
  if (p.type === "PIT") ensurePitchArsenal(p);
  state.players.push(p);
  prospect.drafted = true;
  prospect.draftedBy = state.selectedTeamId;
  prospect.draftedRound = state.draftRound;
  markCohortProspectDrafted(state, prospect, state.selectedTeamId);
  state.draftHistory.unshift({ day: state.day, playerId: p.id, name: p.name, school: prospect.school, rank: prospect.rank, round: prospect.projectedRound });
  state.selectedId = p.id;
  addNews(state, "신인 지명 완료", `${state.draftRound}라운드 ${state.draftPick + 1}번째로 ${p.name}(${prospect.school}, ${p.pos})을 지명했다. 계약금 ${money(prospect.signBonus)}.`, "드래프트");
  advanceDraftSlot(state);
  if (state.draftWindowOpen && !(state.draftClass || []).some((candidate) => !candidate.drafted)) {
    completeDraftSeason(state);
  }
  return state;
}

function scout(state, league) {
  const names = league === "MLB"
    ? ["도미닉 헤일", "마테오 크루즈", "잭 밀러", "노아 벤튼"]
    : ["사토 렌", "나카무라 하루", "모리 켄타", "야마다 슌"];
  const pos = ["SP", "SS", "CF", "1B", "RP"][rnd(0, 4)];
  const ovr = rnd(58, 78);
  const player = {
    name: names[rnd(0, names.length - 1)],
    pos,
    age: rnd(19, 30),
    ovr,
    pot: rnd(Math.max(ovr, 70), 91),
    price: rnd(18, 54) / 10,
    league
  };
  state.scout.unshift(player);
  addNews(state, "스카우팅 보고서", `${league} 시장에서 ${player.name}(${player.pos}) 리포트가 도착했다. 추정 현재 ${player.ovr}, 잠재 ${player.pot}.`, "스카우트");
  return state;
}

function signScout(state, index) {
  const s = state.scout[index];
  if (!s || state.budget < s.price) return state;
  const id = Math.max(0, ...state.players.map((p) => p.id)) + 1;
  const isPitcher = ["SP", "RP", "CL"].includes(s.pos);
  state.budget -= s.price;
  state.players.push({
    id,
    name: s.name,
    pos: s.pos,
    type: isPitcher ? "PIT" : "BAT",
    age: s.age,
    ovr: s.ovr,
    pot: s.pot,
    hit: rnd(45, 75),
    pow: rnd(40, 78),
    spd: rnd(35, 82),
    def: rnd(42, 80),
    arm: isPitcher ? rnd(55, 88) : rnd(42, 86),
    pit: isPitcher ? s.ovr + rnd(-3, 7) : rnd(10, 25),
    form: rnd(58, 82),
    years: rnd(1, 4),
    salary: s.price,
    happy: rnd(62, 84),
    trait: `${s.league} 영입`,
    foreignPlayer: true,
    stats: isPitcher ? { era: 0, win: 0, loss: 0, so: 0, sv: 0, hold: 0, ip: 0 } : { hr: 0, rbi: 0, avg: 0, sb: 0, h: 0, r: 0, pa: 0, ab: 0, obp: 0, slg: 0, bb: 0, so: 0, tb: 0, hbp: 0, sf: 0 }
  });
  addNews(state, "신규 영입", `${s.name} 영입 완료. ${s.league} 스카우팅 라인이 첫 성과를 냈다.`, "이적");
  state.scout.splice(index, 1);
  state.selectedId = id;
  return state;
}

function rosterCounts(state) {
  return {
    active: state.players.filter((p) => p.rosterStatus === "ACTIVE").length,
    farm: state.players.filter((p) => p.rosterStatus === "FARM").length,
    development: state.players.filter((p) => p.rosterStatus === "DEV").length,
    registered: state.players.filter((p) => p.rosterStatus !== "DEV").length
  };
}

function setRosterStatus(state, id, status) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p) return state;
  state.selectedId = p.id;
  const counts = rosterCounts(state);
  if (status === "ACTIVE") {
    if (p.rosterStatus === "DEV") return state;
    if (p.options <= 0 && p.rosterStatus === "FARM") {
      addNews(state, "승격 보류", `${p.name}은 옵션이 없어 1군 등록 전 웨이버/등록 규칙 검토가 필요하다.`, "규칙");
      return state;
    }
    if (counts.active >= 28 && p.rosterStatus !== "ACTIVE") {
      const demotion = state.players
        .filter((x) => x.id !== p.id && x.rosterStatus === "ACTIVE" && x.rosterStatus !== "DEV")
        .sort((a, b) => {
          const sameType = (b.type === p.type ? 1 : 0) - (a.type === p.type ? 1 : 0);
          return sameType || a.ovr - b.ovr || a.form - b.form;
        })[0];
      if (!demotion) return state;
      demotion.rosterStatus = "FARM";
      demotion.options = Math.max(0, (demotion.options || 0) - 1);
      addNews(state, "엔트리 자동 말소", `1군 정원 28명 제한으로 ${demotion.name}을 2군 말소하고 ${p.name}을 콜업한다.`, "프런트");
    }
  }
  if (status === "FARM" && p.rosterStatus === "ACTIVE") p.options = Math.max(0, p.options - 1);
  if (status === "FARM" && p.rosterStatus === "DEV") return state;
  p.rosterStatus = status;
  addNews(state, "엔트리 변동", `${p.name}의 소속이 ${status === "ACTIVE" ? "1군" : status === "FARM" ? "2군" : "육성"}으로 변경됐다.`, "프런트");
  return state;
}

function createDevelopmentPlayer(state, body) {
  const id = Math.max(0, ...state.players.map((p) => p.id)) + 1;
  const pos = body.pos || ["SP", "C", "SS", "CF", "1B"][rnd(0, 4)];
  const name = String(body.name || ["한도겸", "류서안", "강이준", "백시온", "오태겸"][rnd(0, 4)]).trim().slice(0, 12);
  const isPitcher = ["SP", "RP", "CL"].includes(pos);
  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  };
  const ovr = clamp(body.ovr, 35, 95, rnd(44, 58));
  const pot = Math.max(ovr, clamp(body.pot, 45, 95, rnd(Math.max(62, ovr + 10), 86)));
  const age = clamp(body.age, 16, 45, rnd(18, 23));
  const p = makePlayer([name, pos, isPitcher ? "PIT" : "BAT", age, ovr, pot, "육성선수"], id - 1);
  applyBatsThrows(p, body.batsThrows || "우투우타");
  p.id = id;
  p.hit = clamp(body.hit, 20, 90, p.hit);
  p.pow = clamp(body.pow, 20, 90, p.pow);
  p.spd = clamp(body.spd, 20, 90, p.spd);
    p.def = clamp(body.def, 20, 90, p.def);
  p.arm = clamp(body.arm, 20, 95, p.arm);
  p.pit = clamp(body.pit, 20, 90, p.pit);
  p.stamina = clamp(body.stamina, 20, 95, p.stamina);
  p.durability = clamp(body.durability, 20, 95, p.durability);
  p.pot = pot;
  p.ovr = Math.max(ovr, recalcOvr(p));
  p.pot = Math.max(p.pot, p.ovr);
  p.rosterStatus = "DEV";
  p.development = true;
  p.contract = { yearsLeft: 1, annual: 0.3, kind: "육성계약" };
  p.salary = 0.3;
  p.serviceYears = 0;
  p.options = 0;
  state.players.push(p);
  state.budget = Math.max(0, state.budget - 0.3);
  addNews(state, "육성선수 등록", `${p.name}(${p.pos})을 육성선수로 등록했다. 정식 전환 전까지 1군 출전은 불가하다.`, "육성");
  return state;
}

function convertDevelopmentPlayer(state, id) {
  const p = state.players.find((x) => x.id === Number(id));
  const counts = rosterCounts(state);
  if (p) state.selectedId = p.id;
  if (!p || p.rosterStatus !== "DEV" || counts.registered >= 65 || state.budget < 0.8) return state;
  p.rosterStatus = "FARM";
  p.development = false;
  p.options = 3;
  p.contract = { yearsLeft: 1, annual: 0.8, kind: "최저연봉계약" };
  p.salary = 0.8;
  state.budget -= 0.8;
  addNews(state, "정식선수 전환", `${p.name}을 정식 선수로 전환했다. 2군 등록 후 콜업 가능하다.`, "육성");
  return state;
}

function generateFreeAgents(state) {
  const names = ["권도윤", "서재호", "민태준", "이강률", "정세완", "한주혁", "박태민"];
  state.freeAgents = Array.from({ length: 7 }, (_, i) => {
    const ovr = rnd(62, 84);
    const grade = ovr >= 78 ? "A" : ovr >= 70 ? "B" : "C";
    const annual = Math.round((ovr * 0.11 + rnd(0, 35) / 10) * 10) / 10;
    return {
      id: Date.now() + i,
      name: names[i],
      pos: ["SP", "SS", "CF", "1B", "RP", "C", "LF"][i],
      type: ["SP", "RP"].includes(["SP", "SS", "CF", "1B", "RP", "C", "LF"][i]) ? "PIT" : "BAT",
      age: rnd(28, 36),
      ovr,
      pot: Math.max(ovr, ovr + rnd(0, 4)),
      grade,
      previousSalary: annual,
      askYears: rnd(2, 5),
      askAnnual: Math.round(annual * (1.05 + Math.random() * 0.35) * 10) / 10
    };
  });
  addNews(state, "FA 시장 개장", "등급제 보상 규칙이 적용되는 FA 후보 명단이 업데이트됐다.", "FA");
  return state;
}

function faCompensation(fa, includePlayer) {
  if (fa.grade === "A") return includePlayer ? { cash: fa.previousSalary * 2, protected: 20 } : { cash: fa.previousSalary * 3, protected: 0 };
  if (fa.grade === "B") return includePlayer ? { cash: fa.previousSalary, protected: 25 } : { cash: fa.previousSalary * 2, protected: 0 };
  return { cash: fa.previousSalary * 1.5, protected: 0 };
}

function protectionScore(p) {
  if (!p || p.rosterStatus === "DEV" || isForeignPlayer(p)) return -999;
  let score = (p.ovr || 0) * 1.5 + (p.pot || 0) * 0.75;
  score += Math.max(0, 29 - (p.age || 29)) * 1.6;
  score += Math.max(0, Number(p.controlYears) || 0) * 4;
  if (String(p.contract?.kind || "").includes("실계약") && (p.contract?.yearsLeft || 0) >= 2) score += 6;
  if ((p.contract?.annual || p.salary || 0) >= 8) score += 3;
  if (p.type === "PIT" && (p.pitcherRole === "SP" || p.pos === "SP")) score += 7;
  if (["C", "SS", "CF"].includes(p.pos)) score += 5;
  if (playerIconLevel(p) >= 4) score += 10;
  if (p.health?.status === "INJURED") score -= 8;
  return Math.round(score);
}

function protectionRecommendations(state) {
  const candidates = (state.players || [])
    .filter((p) => p && p.rosterStatus !== "DEV" && !isForeignPlayer(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      pos: p.pos,
      age: p.age,
      ovr: p.ovr,
      pot: p.pot,
      controlYears: Number(p.controlYears) || 0,
      contract: p.contract,
      score: protectionScore(p),
      reason: [
        (p.ovr || 0) >= 78 ? "즉시전력" : null,
        (p.pot || 0) >= 82 ? "고잠재" : null,
        (Number(p.controlYears) || 0) >= 3 ? "보류권 길음" : null,
        ["C", "SS", "CF"].includes(p.pos) ? "센터라인" : null,
        p.type === "PIT" && (p.pitcherRole === "SP" || p.pos === "SP") ? "선발자원" : null
      ].filter(Boolean).join(" · ") || "전력가치"
    }))
    .sort((a, b) => b.score - a.score);
  return {
    gradeAProtected20: candidates.slice(0, 20),
    gradeBProtected25: candidates.slice(0, 25),
    exposedRiskA: candidates.slice(20, 28),
    exposedRiskB: candidates.slice(25, 33)
  };
}

function signFreeAgent(state, id, includePlayer) {
  const fa = state.freeAgents.find((x) => x.id === Number(id));
  if (!fa) return state;
  const comp = faCompensation(fa, includePlayer && fa.grade !== "C");
  const total = fa.askAnnual * fa.askYears + comp.cash;
  const counts = rosterCounts(state);
  if (counts.registered >= 65 || state.budget < total) return state;
  const newId = Math.max(0, ...state.players.map((p) => p.id)) + 1;
  const p = makePlayer([fa.name, fa.pos, fa.type, fa.age, fa.ovr, fa.pot, `FA ${fa.grade}등급`], newId - 1);
  p.id = newId;
  p.rosterStatus = counts.active < 28 ? "ACTIVE" : "FARM";
  p.contract = { yearsLeft: fa.askYears, annual: fa.askAnnual };
  p.salary = fa.askAnnual;
  p.serviceYears = 8;
  p.faGrade = fa.grade;
  p.foreignPlayer = false;
  state.players.push(p);
  state.budget -= total;
  if (includePlayer && fa.grade !== "C") {
    const protectCount = comp.protected;
    const protectedIds = state.players.slice().filter((x) => x.id !== p.id && x.rosterStatus !== "DEV").sort((a, b) => b.ovr - a.ovr).slice(0, protectCount).map((x) => x.id);
    const compensation = state.players.filter((x) => x.id !== p.id && x.rosterStatus !== "DEV" && !protectedIds.includes(x.id)).sort((a, b) => b.ovr - a.ovr)[0];
    if (compensation) {
      state.players = state.players.filter((x) => x.id !== compensation.id);
      addNews(state, "FA 보상선수 이탈", `${fa.name} 영입 보상으로 ${compensation.name}이 원소속 구단에 지명됐다.`, "FA");
      transactionReaction(state, [compensation], [p], "FA 보상 포함 계약");
    } else {
      transactionReaction(state, [], [p], "FA 계약");
    }
  } else {
    transactionReaction(state, [], [p], "FA 계약");
  }
  state.freeAgents = state.freeAgents.filter((x) => x.id !== fa.id);
  addNews(state, "FA 계약 완료", `${fa.name}과 ${fa.askYears}년 ${money(fa.askAnnual)} 계약. 보상금 ${money(comp.cash)}이 반영됐다.`, "FA");
  return state;
}

function setPitcherRole(state, id, role) {
  const p = state.players.find((x) => x.id === Number(id) && x.type === "PIT");
  if (!p) return state;
  state.selectedId = p.id;
  p.pitcherRole = role;
  if (role === "SP") p.pos = "SP";
  if (role === "CL") p.pos = "CL";
  if (role === "SU" || role === "MR" || role === "LR") p.pos = "RP";
  p.happy = Math.min(96, p.happy + (p.pos === "SP" && role !== "SP" ? -3 : 2));
  addNews(state, "투수 보직 변경", `${p.name}의 보직을 ${pitcherRoleLabel(role)}로 조정했다.`, "선수단");
  updateComplaints(state);
  return state;
}

function pitcherRoleLabel(role) {
  return { SP: "선발", LR: "롱릴리프", MR: "중간계투", SU: "셋업맨", CL: "마무리" }[role] || role;
}

function injuryRisk(p, context = "game") {
  if (!p || p.health?.status !== "OK") return 0;
  let risk = context === "training" ? 0.0016 : 0.0028;
  if (context === "manual-game") risk += 0.0012;
  if (p.type === "PIT") risk += 0.0011;
  if (p.pitcherRole === "SP") risk += 0.0008;
  const lastPitches = Number(p.lastPitchCount) || 0;
  if (p.type === "PIT" && lastPitches >= 105) risk += 0.006;
  else if (p.type === "PIT" && lastPitches >= 85) risk += 0.003;
  if ((Number(p.restDays) || 0) > 0) risk += 0.0025;
  if ((p.form || 70) < 45) risk += 0.007;
  else if ((p.form || 70) < 58) risk += 0.0035;
  if ((p.stamina || 70) < 52) risk += 0.0025;
  if ((p.age || 25) >= 37) risk += 0.0035;
  else if ((p.age || 25) >= 33) risk += 0.0015;
  const durability = Number(p.durability) || 65;
  risk += Math.max(-0.0015, Math.min(0.009, (68 - durability) / 4500));
  if (Number(p.reinjuryWatchDays) > 0) risk += 0.006;
  return Math.min(0.035, Math.max(0.0004, risk));
}

function maybeAutomaticInjury(state, candidates, context = "game") {
  const pool = [...new Set((candidates || []).filter(Boolean))]
    .filter((p) => p.health?.status === "OK" && p.rosterStatus !== "DEV")
    .sort(() => Math.random() - 0.5);
  for (const p of pool) {
    if (Math.random() < injuryRisk(p, context)) return randomInjury(state, p.id, context);
  }
  return state;
}

function randomInjury(state, id, context = "game") {
  const p = state.players.find((x) => x.id === Number(id)) || state.players.filter((x) => x.health?.status !== "INJURED").sort(() => Math.random() - 0.5)[0];
  if (!p) return state;
  const pitcherPool = [
    { name: "손가락 물집", min: 4, max: 9, weight: 20, rehab: 15 },
    { name: "등 근육 긴장", min: 8, max: 18, weight: 18, rehab: 20 },
    { name: "전완부 염좌", min: 14, max: 32, weight: 18, rehab: 30 },
    { name: "햄스트링 통증", min: 18, max: 38, weight: 10, rehab: 35 },
    { name: "어깨 충돌 증후군", min: 35, max: 80, weight: 9, rehab: 45 },
    { name: "팔꿈치 인대 손상", min: 80, max: 180, weight: 4, rehab: 55 },
    { name: "팔꿈치 수술 재활", min: 190, max: 260, weight: 1, rehab: 60, nextSeason: true }
  ];
  const hitterPool = [
    { name: "손목 염좌", min: 7, max: 18, weight: 17, rehab: 20 },
    { name: "발목 염좌", min: 10, max: 24, weight: 17, rehab: 25 },
    { name: "허벅지 근육통", min: 7, max: 15, weight: 18, rehab: 15 },
    { name: "햄스트링 부상", min: 21, max: 55, weight: 16, rehab: 35 },
    { name: "옆구리 통증", min: 18, max: 45, weight: 11, rehab: 30 },
    { name: "무릎 통증", min: 28, max: 70, weight: 8, rehab: 40 },
    { name: "손가락 골절", min: 45, max: 85, weight: 4, rehab: 45 },
    { name: "무릎 수술 재활", min: 160, max: 230, weight: 1, rehab: 55, nextSeason: true }
  ];
  const pool = p.type === "PIT" ? pitcherPool : hitterPool;
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let ticket = rnd(1, totalWeight);
  let picked = pool[0];
  for (const item of pool) {
    ticket -= item.weight;
    if (ticket <= 0) {
      picked = item;
      break;
    }
  }
  let days = rnd(picked.min, picked.max);
  if ((p.durability || 65) < 52) days += rnd(3, 12);
  if ((p.age || 25) >= 35) days += rnd(2, 10);
  const seasonGames = Number(state.seasonGames) || 144;
  const day = Number(state.day) || 1;
  const remaining = Math.max(0, seasonGames - day);
  const seasonYear = Number(state.seasonYear) || 1;
  const nextSeason = picked.nextSeason || days > remaining + 25;
  p.health = {
    status: "INJURED",
    injury: picked.name,
    days,
    totalDays: days,
    rehab: 0,
    rehabTarget: picked.rehab,
    returnSeasonYear: nextSeason ? seasonYear + 1 : seasonYear,
    returnDay: nextSeason ? rnd(8, 35) : Math.min(seasonGames, day + days),
    source: context === "training" ? "훈련 중 발생" : "경기 중 발생"
  };
  p.rosterStatus = "FARM";
  p.form = Math.max(25, (Number(p.form) || 65) - (days >= 80 ? 22 : days >= 30 ? 15 : 9));
  p.happy = Math.max(25, (Number(p.happy) || 70) - (days >= 60 ? 9 : 4));
  const prefix = context === "training" ? "훈련 중" : "경기 중";
  const schedule = nextSeason ? `다음 시즌 Day ${p.health.returnDay} 복귀 목표` : `예상 공백 ${p.health.days}일`;
  addNews(state, "부상 발생", `${p.name}이 ${prefix} ${picked.name}으로 이탈했다. ${schedule}.`, "의료");
  updateComplaints(state);
  return state;
}

function advanceRehab(state, id) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p || p.health?.status === "OK") return state;
  state.selectedId = p.id;
  const gain = p.health.status === "INJURED" ? rnd(3, 7) : rnd(6, 12);
  p.health.rehab = Math.min(100, (p.health.rehab || 0) + gain);
  p.health.days = Math.max(0, (p.health.days || 0) - rnd(2, 5));
  if (p.health.rehab >= 100 || p.health.days <= 0) {
    p.health = { ...p.health, status: "REHAB", days: 0, rehab: Math.max(70, p.health.rehab || 70) };
    p.form = Math.min(72, (Number(p.form) || 55) + 8);
    addNews(state, "재활 경기 가능", `${p.name}이 재활 경기 단계에 들어갔다. 2군에서 실전 감각을 확인할 수 있다.`, "의료");
  } else {
    addNews(state, "재활 리포트", `${p.name} 재활 진행률 ${p.health.rehab}%, 남은 치료 ${p.health.days}일.`, "의료");
  }
  updateComplaints(state);
  return state;
}

function clearRehab(state, id) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p || p.health?.status === "OK") return state;
  state.selectedId = p.id;
  const earlyReturn = (p.health.rehab || 0) < 80 || (p.health.days || 0) > 0;
  const rehabRate = Number(p.health.rehab) || 0;
  p.health = { status: "OK", injury: null, days: 0, rehab: 0 };
  p.form = earlyReturn
    ? Math.max(38, Math.min(68, Number(p.form) || 55))
    : Math.min(88, (Number(p.form) || 60) + 6);
  if (earlyReturn) {
    p.reinjuryWatchDays = Math.max(5, Math.ceil((80 - rehabRate) / 5));
    addNews(state, "치트 복귀", `${p.name}을 재활 ${rehabRate}%에서 즉시 복귀시켰다. 당분간 컨디션과 재발 위험을 조심해야 한다.`, "의료");
  } else {
    addNews(state, "부상 복귀", `${p.name}이 정상 훈련에 복귀했다.`, "의료");
  }
  updateComplaints(state);
  return state;
}

function talkToPlayer(state, id, tone) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p) {
    addNews(state, "면담 실패", "선수를 다시 선택해야 한다.", "면담");
    return state;
  }
  state.selectedId = p.id;
  const topic = complaintFor(p).topic;
  let delta = 0;
  let text = "";
  if (tone === "promise") {
    delta = topic === "안정" ? 1 : 8;
    text = `${p.name}에게 역할 개선을 약속했다. 단기간 내 지키지 못하면 불만이 다시 커질 수 있다.`;
  } else if (tone === "honest") {
    delta = topic === "안정" ? 2 : 4;
    text = `${p.name}과 현실적인 팀 계획을 공유했다.`;
  } else if (tone === "strict") {
    delta = topic === "안정" ? -1 : -6;
    text = `${p.name}에게 경쟁 원칙을 분명히 전달했다.`;
  } else {
    delta = 2;
    text = `${p.name}의 이야기를 들었다.`;
  }
  p.happy = Math.max(20, Math.min(98, p.happy + delta));
  p.complaint = complaintFor(p);
  addNews(state, "1:1 면담", text, "면담");
  return state;
}

function acceptOffer(state, id) {
  const offer = state.offers.find((o) => o.id === id);
  if (!offer) return state;
  const p = state.players.find((x) => x.id === offer.playerId);
  if (!p) return state;
  if (!isFaEligiblePlayer(p)) {
    state.offers = state.offers.filter((o) => o.id !== id);
    addNews(state, "해외 오퍼 무효", `${p.name}은 현재 FA/계약 만료 조건을 충족하지 않아 해외 이적 제안을 진행할 수 없다.`, "규칙");
    return state;
  }
  state.players = state.players.filter((x) => x.id !== offer.playerId);
  state.budget += offer.fee;
  state.morale -= p.ovr >= 76 ? 8 : 3;
  state.fanInterest += offer.league.includes("North") ? 4 : 2;
  transactionReaction(state, [p], [], "해외 진출");
  state.offers = state.offers.filter((o) => o.id !== id);
  state.selectedId = state.players[0]?.id || null;
  addNews(state, "해외 진출 확정", `${p.name}이 ${offer.club}로 향한다. 구단은 보상금 ${money(offer.fee)}를 확보했다.`, "이적");
  return state;
}

function adjustPlayerContract(state, id, mode) {
  const p = state.players.find((x) => x.id === Number(id));
  if (!p || p.rosterStatus === "DEV") return state;
  state.selectedId = p.id;
  if (!p.contract) p.contract = { yearsLeft: p.years || 1, annual: p.salary || 1 };
  const oldAnnual = Number(p.contract.annual || p.salary || 1);
  if (mode === "extend") {
    const newAnnual = Math.round(oldAnnual * (1.08 + Math.max(0, (p.ovr || 65) - 72) * 0.012) * 10) / 10;
    if (state.budget < Math.max(0, newAnnual - oldAnnual)) {
      addNews(state, "계약 협상 보류", `${p.name} 장기계약 인상분을 감당할 예산이 부족하다.`, "계약");
      return state;
    }
    p.contract = { yearsLeft: Math.max(2, Math.min(5, (p.contract.yearsLeft || 1) + 2)), annual: newAnnual, kind: "장기계약" };
    p.salary = newAnnual;
    p.happy = Math.min(98, (p.happy || 70) + 8);
    state.budget -= Math.max(0, newAnnual - oldAnnual);
    const fanBoost = playerIconLevel(p) >= 4 ? 5 : 2;
    state.fanInterest += fanBoost;
    state.morale += 3;
    clampTeamPulse(state);
    addNews(state, "연봉 조정 완료", `${p.name}과 ${p.contract.yearsLeft}년 ${money(newAnnual)} 조건으로 조정했다. ${playerStatusTags(p).includes("프랜차이즈 스타") ? "프랜차이즈 스타 잔류에 팬 반응이 뜨겁다." : "선수단은 구단이 핵심 전력 관리에 나섰다고 받아들인다."}`, "계약");
    return state;
  }
  if (mode === "cut") {
    const cutAnnual = Math.max(0.3, Math.round(oldAnnual * 0.88 * 10) / 10);
    p.contract.annual = cutAnnual;
    p.contract.kind = p.contract.kind || "연봉계약";
    p.salary = cutAnnual;
    p.happy = Math.max(20, (p.happy || 70) - (playerIconLevel(p) >= 4 ? 14 : 8));
    state.budget += Math.max(0, oldAnnual - cutAnnual);
    state.morale -= playerIconLevel(p) >= 4 ? 5 : 2;
    state.fanInterest -= playerIconLevel(p) >= 4 ? 4 : 1;
    clampTeamPulse(state);
    addNews(state, "연봉 삭감 반응", `${p.name}의 연봉을 ${money(oldAnnual)}에서 ${money(cutAnnual)}로 낮췄다. ${playerIconLevel(p) >= 4 ? "상징성 있는 선수라 팬과 선수단 반응이 좋지 않다." : "구단 재정 관리 차원의 조정으로 받아들여진다."}`, "계약");
    return state;
  }
  return state;
}

function rejectOffer(state, id) {
  const offer = state.offers.find((o) => o.id === id);
  if (!offer) return state;
  const p = state.players.find((x) => x.id === offer.playerId);
  if (p) {
    p.happy = Math.max(30, p.happy - 7);
    addNews(state, "오퍼 거절", `${p.name}의 ${offer.club}행 제안을 보류했다. 선수 측은 출전 시간과 비전을 요구하고 있다.`, "이적");
  }
  state.offers = state.offers.filter((o) => o.id !== id);
  return state;
}

function setSeasonGoal(state, level) {
  const goals = {
    rebuild: { level: "rebuild", label: "리빌딩과 유망주 성장", reward: 5, penalty: 2 },
    playoff: { level: "playoff", label: "포스트시즌 진출", reward: 8, penalty: 4 },
    top3: { level: "top3", label: "정규시즌 3위권", reward: 11, penalty: 6 },
    champion: { level: "champion", label: "정규시즌 우승", reward: 15, penalty: 9 }
  };
  state.seasonGoal = goals[level] || goals.playoff;
  addNews(state, "시즌 목표 설정", `구단 목표를 '${state.seasonGoal.label}'로 설정했다.`, "구단");
  return state;
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted && ch === '"' && next === '"') {
      cell += '"';
      i += 1;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (!quoted && ch === ",") {
      row.push(cell.trim());
      cell = "";
    } else if (!quoted && (ch === "\n" || ch === "\r")) {
      if (cell || row.length) {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      }
      if (ch === "\r" && next === "\n") i += 1;
    } else {
      cell += ch;
    }
  }
  if (cell || row.length) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

function importPlayersFromCsv(state, csv, source) {
  const rows = parseCsv(String(csv || ""));
  if (rows.length < 2) return state;
  const headers = rows[0].map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);
  const teamIdIndex = idx("teamId");
  const nameIndex = idx("name");
  const posIndex = idx("pos");
  const typeIndex = idx("type");
  if (nameIndex < 0 || posIndex < 0) return state;

  const targetTeamId = state.selectedTeamId;
  const imported = [];
  const importedLeague = [];
  let nextId = 1;
  let nextLeagueId = 100001;
  for (const row of rows.slice(1)) {
    const rowTeamId = teamIdIndex >= 0 ? row[teamIdIndex] : targetTeamId;
    const isTargetTeam = !rowTeamId || rowTeamId === targetTeamId;
    const rawName = row[nameIndex];
    const rowSource = (idx("source") >= 0 && row[idx("source")]) || source || "user-import";
    const shouldAlias = (String(rowSource).startsWith("공시") || String(rowSource).startsWith("KBO")) && !String(rowSource).includes("Public Alias");
    const name = shouldAlias ? publicAliasName(rawName, `${rowTeamId}-${idx("jerseyNumber") >= 0 ? row[idx("jerseyNumber")] : ""}`) : rawName;
    const pos = row[posIndex] || "CF";
    if (!name) continue;
    const type = typeIndex >= 0 && row[typeIndex] ? row[typeIndex] : (["SP", "RP", "CL"].includes(pos) ? "PIT" : "BAT");
    const age = Number(row[idx("age")]) || 24;
    const ovr = Number(row[idx("ovr")]) || rnd(52, 76);
    const pot = Number(row[idx("pot")]) || Math.max(ovr, rnd(65, 88));
    const seed = [name, pos, type, age, ovr, pot, row[idx("trait")] || ""];
    const p = makePlayer(seed, nextId - 1);
    const handValue = idx("batsThrows") >= 0 ? row[idx("batsThrows")] : idx("hand") >= 0 ? row[idx("hand")] : "";
    applyBatsThrows(p, handValue);
    p.id = isTargetTeam ? nextId++ : nextLeagueId++;
    p.teamId = rowTeamId || targetTeamId;
    const importedTeam = teamTemplates.find((t) => t.id === p.teamId);
    p.teamName = importedTeam ? `${importedTeam.city} ${importedTeam.name}` : "";
    p.rosterStatus = row[idx("rosterStatus")] || "FARM";
    p.pitcherRole = type === "PIT" ? (row[idx("pitcherRole")] || (pos === "SP" ? "SP" : pos === "CL" ? "CL" : "MR")) : null;
    const estimated = estimateContractForPlayer(p, imported.length + importedLeague.length);
    const importedYears = idx("yearsLeft") >= 0 ? Number(row[idx("yearsLeft")]) : null;
    const importedAnnual = idx("annualSalary") >= 0 ? Number(row[idx("annualSalary")]) : idx("salary") >= 0 ? Number(row[idx("salary")]) : null;
    p.contract = {
      yearsLeft: Number.isFinite(importedYears) && importedYears > 0 ? importedYears : estimated.yearsLeft,
      annual: Number.isFinite(importedAnnual) && importedAnnual > 0 ? importedAnnual : estimated.annual,
      kind: idx("contractKind") >= 0 && row[idx("contractKind")] ? row[idx("contractKind")] : estimated.kind,
      source: idx("contractSource") >= 0 && row[idx("contractSource")] ? row[idx("contractSource")] : ""
    };
    applyDetailedContractFromCsv(p, row, headers);
    p.controlYears = idx("controlYears") >= 0 && row[idx("controlYears")] !== "" ? Number(row[idx("controlYears")]) : Math.max(0, Math.ceil(((p.age <= 27 ? 9 : 8) * KBO_SERVICE_DAYS_PER_YEAR - (p.serviceDays || 0)) / KBO_SERVICE_DAYS_PER_YEAR));
    p.controlKind = idx("controlKind") >= 0 && row[idx("controlKind")] ? row[idx("controlKind")] : (p.controlYears <= 0 ? "FA 자격권" : "구단 보류권");
    p.jerseyNumber = Number(row[idx("jerseyNumber")]) || p.jerseyNumber;
    ["hit","pow","spd","def","arm","pit","form","stamina","durability"].forEach((key) => {
      if (idx(key) >= 0 && row[idx(key)]) p[key] = Number(row[idx(key)]) || p[key];
    });
    if (idx("arm") >= 0 && row[idx("arm")]) p.arm = Number(row[idx("arm")]) || p.arm;
    p.salary = p.contract.annual;
    p.signingBonus = idx("signingBonus") >= 0 && Number(row[idx("signingBonus")]) ? Number(row[idx("signingBonus")]) : estimated.signingBonus;
    p.serviceYears = Number(row[idx("serviceYears")]) || p.serviceYears;
    p.serviceDays = idx("serviceDays") >= 0 && Number(row[idx("serviceDays")]) ? Number(row[idx("serviceDays")]) : p.serviceYears * KBO_SERVICE_DAYS_PER_YEAR + rnd(0, KBO_SERVICE_DAYS_PER_YEAR - 1);
    ensureServiceTime(p);
    p.faGrade = row[idx("faGrade")] || p.faGrade;
    p.development = p.rosterStatus === "DEV";
    p.foreignPlayer = idx("foreignPlayer") >= 0 ? ["Y","TRUE","1","외국인"].includes(String(row[idx("foreignPlayer")]).toUpperCase()) : isLikelyForeignName(name);
    p.dataSource = rowSource;
    if (shouldRebuildPrivateContract(p)) {
      const yearsLeft = gameContractYears(p, p.contract.annual);
      p.contract.yearsLeft = yearsLeft;
      p.contract.kind = yearsLeft >= 3 ? "보류권 기반 다년관리" : "연봉계약+보류권";
      p.contract.source = p.contract.annual ? "공시 연봉 · 서비스타임 반영" : "추정 연봉 · 서비스타임 반영";
    }
    normalizeContractReality(p);
    applyDetailedHealthFromCsv(p, row, headers, state);
    if (isTargetTeam) imported.push(p);
    else importedLeague.push(p);
  }
  if (!imported.length) return state;

  const keepOtherTeamsOrDev = state.players
    .filter((p) => p.dataSource === "system-locked" || p.rosterStatus === "DEV")
    .map((p) => {
      p.teamId = p.teamId || targetTeamId;
      const team = teamTemplates.find((t) => t.id === p.teamId);
      p.teamName = p.teamName || (team ? `${team.city} ${team.name}` : "");
      if (p.controlYears === undefined) {
        p.controlYears = Math.max(0, Math.ceil(((p.age <= 27 ? 9 : 8) * KBO_SERVICE_DAYS_PER_YEAR - (p.serviceDays || 0)) / KBO_SERVICE_DAYS_PER_YEAR));
      }
      if (!p.controlKind) p.controlKind = p.controlYears <= 0 ? "FA 자격권" : "구단 보류권";
      return p;
    });
  state.players = [...keepOtherTeamsOrDev, ...imported];
  state.leaguePlayers = importedLeague;
  state.realDataMode = true;
  state.rosterInitialized = true;
  state.activeGame = null;
  state.selectedId = state.players[0]?.id || null;
  ensureRosterDepth(state);
  addNews(state, "선수 데이터 import", `${imported.length}명의 내 팀 선수와 ${importedLeague.length}명의 상대팀 선수를 반영했다. 출처: ${source || "user-import"}`, "데이터");
  return state;
}

function readDataSourceUrl() {
  try {
    const url = fs.readFileSync(DATA_SOURCE_URL_PATH, "utf8").trim();
    return url || null;
  } catch {
    return null;
  }
}

async function fetchText(url) {
  if (!/^https?:\/\//i.test(url)) throw new Error("Only http/https URLs are supported");
  const res = await fetch(url, { headers: { "User-Agent": "K-Baseball-Manager-Local-Importer" } });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.text();
}

async function syncExternalPlayerData(state) {
  if (fs.existsSync(DATA_IMPORT_PATH)) {
    const csv = fs.readFileSync(DATA_IMPORT_PATH, "utf8");
    return importPlayersFromCsv(state, csv, DATA_IMPORT_PATH);
  }
  const sourceUrl = readDataSourceUrl();
  if (sourceUrl) {
    const csv = await fetchText(sourceUrl);
    return importPlayersFromCsv(state, csv, sourceUrl);
  }
  addNews(state, "선수 데이터 동기화 대기", `데이터 파일이 없습니다. ${DATA_IMPORT_PATH} 파일을 넣거나 data/source-url.txt에 CSV URL을 저장하세요.`, "데이터");
  return state;
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === ".html" ? "text/html; charset=utf-8" : ext === ".js" ? "text/javascript; charset=utf-8" : "text/plain; charset=utf-8";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (!url.pathname.startsWith("/api/")) {
    serveStatic(req, res);
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/meta") {
    sendJson(res, 200, { teams: teamTemplates });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/auth/me") {
    const user = sessionUser(req);
    const onlineCount = touchVisitor(req, user);
    sendJson(res, 200, { authenticated: Boolean(user), user: user ? { id: user.id, username: user.username } : null, onlineCount });
    return;
  }

  if (req.method === "POST" && (url.pathname === "/api/auth/signup" || url.pathname === "/api/auth/login")) {
    const body = await parseBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!/^[A-Za-z0-9가-힣_-]{2,20}$/.test(username) || password.length < 4) {
      sendJson(res, 400, { error: "아이디는 2~20자, 비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    const users = readUsers();
    const id = safeUserId(username);
    let account = users.accounts.find((item) => item.id === id);
    if (url.pathname === "/api/auth/signup") {
      if (account) {
        sendJson(res, 409, { error: "이미 있는 아이디입니다." });
        return;
      }
      const isFirstAccount = users.accounts.length === 0;
      const passwordData = hashPassword(password);
      account = { id, username, passwordHash: passwordData.hash, salt: passwordData.salt, createdAt: new Date().toISOString() };
      users.accounts.push(account);
      if (isFirstAccount && !fs.existsSync(userSavePath(account)) && fs.existsSync(SAVE_PATH)) {
        fs.copyFileSync(SAVE_PATH, userSavePath(account));
      }
    } else if (!account || !verifyPassword(password, account)) {
      sendJson(res, 401, { error: "아이디나 비밀번호가 맞지 않습니다." });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    users.sessions[token] = account.id;
    writeUsers(users);
    setSessionCookie(res, token);
    const onlineCount = touchVisitor(req, account);
    sendJson(res, 200, { user: { id: account.id, username: account.username }, onlineCount });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(req).bm_session;
    const user = sessionUser(req);
    if (user?.id) activeVisitors.delete(`user:${user.id}`);
    if (token) {
      const users = readUsers();
      delete users.sessions[token];
      writeUsers(users);
    }
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
    return;
  }

  const user = sessionUser(req);
  if (!user) {
    sendJson(res, 401, { error: "로그인이 필요합니다.", authRequired: true, teams: teamTemplates });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/state") {
    const state = readState(user);
    const visibleState = state ? publicState(state) : null;
    if (state) saveState(state, user);
    const onlineCount = touchVisitor(req, user);
    sendJson(res, 200, { hasSave: Boolean(state), state: visibleState, teams: teamTemplates, user: { id: user.id, username: user.username }, onlineCount });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/board") {
    sendJson(res, 200, publicBoard());
    return;
  }

  const body = await parseBody(req);
  let state = readState(user);

  if (req.method === "POST" && url.pathname === "/api/board") {
    const result = createBoardPost(user, body);
    if (result.error) {
      sendJson(res, 400, { error: result.error });
      return;
    }
    sendJson(res, 200, publicBoard());
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/new-game") {
    state = createState(body.teamId);
    await syncExternalPlayerData(state);
    saveState(state, user);
    sendJson(res, 200, { ...publicState(state), onlineCount: touchVisitor(req, user) });
    return;
  }

  if (!state) state = createState(teamTemplates[0].id);

  const routes = {
    "/api/play": () => playGame(state),
    "/api/game/start": () => createActiveGame(state, body.lineup, body.starterId, body.lineupPositions),
    "/api/game/reset": () => resetActiveGame(state),
    "/api/game/next": () => advanceOnePlay(state),
    "/api/game/skip-half": () => skipCurrentHalfInning(state),
    "/api/game/skip-game": () => skipFullGame(state),
    "/api/game/tactic": () => setGameTactic(state, body.tactic || "swing"),
    "/api/game/runner-tactic": () => setRunnerTactic(state, body.tactic || "normal"),
    "/api/game/steal": () => commandSteal(state, body.steal),
    "/api/game/pickoff": () => commandPickoff(state, body.baseIndex),
    "/api/game/change-pitcher": () => changePitcher(state, body.inId),
    "/api/game/at-bat": () => resolveUserAtBat(state, body.tactic || "swing"),
    "/api/game/defense": () => resolveOpponentHalf(state),
    "/api/game/substitute": () => substituteBatter(state, body.outId, body.inId, body.position),
    "/api/game/pinch-run": () => pinchRun(state, body.baseIndex, body.inId),
    "/api/game/positions": () => changeDefensivePositions(state, body.positions),
    "/api/roster/status": () => setRosterStatus(state, body.id, body.status),
    "/api/player/create-dev": () => createDevelopmentPlayer(state, body),
    "/api/player/convert-dev": () => convertDevelopmentPlayer(state, body.id),
    "/api/player/pitcher-role": () => setPitcherRole(state, body.id, body.role),
    "/api/player/contract": () => adjustPlayerContract(state, body.id, body.mode),
    "/api/player/rehab": () => advanceRehab(state, body.id),
    "/api/player/clear-rehab": () => clearRehab(state, body.id),
    "/api/player/talk": () => talkToPlayer(state, body.id, body.tone),
    "/api/import/players": () => importPlayersFromCsv(state, body.csv, body.source),
    "/api/import/sync": () => syncExternalPlayerData(state),
    "/api/fa/generate": () => generateFreeAgents(state),
    "/api/fa/sign": () => signFreeAgent(state, body.id, body.includePlayer),
    "/api/offer": () => { generateOffer(state, body.league, body.id); return state; },
    "/api/train": () => trainPlayer(state, Number(body.id), body.focus),
    "/api/scout": () => scout(state, body.league || "MLB"),
    "/api/sign": () => signScout(state, Number(body.index)),
    "/api/draft/generate": () => generateDraftClass(state),
    "/api/draft/advance": () => advanceDraftToUser(state),
    "/api/draft/pick": () => draftProspect(state, body.id),
    "/api/accept-offer": () => acceptOffer(state, Number(body.id)),
    "/api/reject-offer": () => rejectOffer(state, Number(body.id)),
    "/api/season/goal": () => setSeasonGoal(state, body.level),
    "/api/trade/targets": () => refreshTradeTargets(state),
    "/api/trade/propose": () => proposeTrade(state, body.outgoingId, body.targetId, body.cash),
    "/api/trade/generate": () => generateTradeOffer(state, body.playerId),
    "/api/trade/accept": () => acceptTradeOffer(state, Number(body.id)),
    "/api/trade/reject": () => rejectTradeOffer(state, Number(body.id))
  };

  if (req.method === "POST" && routes[url.pathname]) {
    await routes[url.pathname]();
    saveState(state, user);
    sendJson(res, 200, { ...publicState(state), onlineCount: touchVisitor(req, user) });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Diamond Office Manager backend running on port ${PORT}`);
});
