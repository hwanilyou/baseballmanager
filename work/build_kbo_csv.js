const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "outputs", "data", "kbo_players.csv");
const SOURCE_DATE = "2026-06-23";
const ACTIVE_URL = "https://www.koreabaseball.com/Player/Register.aspx";
const FUTURES_URL = "https://www.koreabaseball.com/Futures/Player/Register.aspx";

const teams = [
  ["LG", "seoul-twin-stars"],
  ["KT", "suwon-wizpark"],
  ["SS", "daegu-blue-lions"],
  ["HT", "gwangju-tiger-kings"],
  ["HH", "daejeon-orange-eagles"],
  ["OB", "jamsil-bears"],
  ["NC", "changwon-dino-force"],
  ["LT", "busan-giant-waves"],
  ["SK", "incheon-landing"],
  ["WO", "gocheok-heroes"]
];

const KNOWN_CONTRACTS = {
  "daejeon-orange-eagles::류현진": { yearsLeft: 6, kind: "실계약 8년 170억", total: 170, source: "2024 FA 복귀 계약" },
  "daejeon-orange-eagles::채은성": { yearsLeft: 3, kind: "실계약 6년 90억", total: 90, source: "2023 FA 계약" },
  "daejeon-orange-eagles::안치홍": { yearsLeft: 4, kind: "실계약 4+2년 72억", total: 72, source: "2024 FA 계약" },
  "daejeon-orange-eagles::엄상백": { yearsLeft: 3, kind: "실계약 4년 78억", total: 78, source: "2025 FA 계약" },
  "daejeon-orange-eagles::심우준": { yearsLeft: 3, kind: "실계약 4년 50억", total: 50, source: "2025 FA 계약" },
  "daejeon-orange-eagles::노시환": { yearsLeft: 1, kind: "연봉계약", source: "공개 다년계약 미확인" },

  "seoul-twin-stars::오지환": { yearsLeft: 4, kind: "실계약 6년 124억", total: 124, source: "2024 비FA 다년계약" },
  "seoul-twin-stars::김현수": { yearsLeft: 2, kind: "실계약 4+2년 115억", total: 115, source: "2022 FA 계약" },
  "seoul-twin-stars::박동원": { yearsLeft: 1, kind: "실계약 4년 65억", total: 65, source: "2023 FA 계약" },
  "seoul-twin-stars::임찬규": { yearsLeft: 2, kind: "실계약 4년 50억", total: 50, source: "2024 FA 계약" },
  "seoul-twin-stars::함덕주": { yearsLeft: 2, kind: "실계약 4년 38억", total: 38, source: "2024 FA 계약" },

  "suwon-wizpark::고영표": { yearsLeft: 3, kind: "실계약 5년 107억", total: 107, source: "2024 비FA 다년계약" },
  "suwon-wizpark::허경민": { yearsLeft: 5, kind: "실계약 4+3년 85억", total: 85, source: "2025 FA 계약" },
  "suwon-wizpark::김상수": { yearsLeft: 1, kind: "실계약 4년 29억", total: 29, source: "2023 FA 계약" },
  "suwon-wizpark::장성우": { yearsLeft: 1, kind: "실계약 4년 42억", total: 42, source: "2022 FA 계약" },

  "daegu-blue-lions::구자욱": { yearsLeft: 1, kind: "실계약 5년 120억", total: 120, source: "2022 비FA 다년계약" },
  "daegu-blue-lions::김재윤": { yearsLeft: 2, kind: "실계약 4년 58억", total: 58, source: "2024 FA 계약" },
  "daegu-blue-lions::최원태": { yearsLeft: 4, kind: "실계약 4년 70억", total: 70, source: "2026 FA 계약" },

  "gwangju-tiger-kings::나성범": { yearsLeft: 2, kind: "실계약 6년 150억", total: 150, source: "2022 FA 계약" },
  "gwangju-tiger-kings::김선빈": { yearsLeft: 1, kind: "실계약 3년 30억", total: 30, source: "2024 FA 계약" },
  "gwangju-tiger-kings::김태군": { yearsLeft: 1, kind: "실계약 3년 25억", total: 25, source: "2024 비FA 다년계약" },

  "jamsil-bears::양의지": { yearsLeft: 3, kind: "실계약 4+2년 152억", total: 152, source: "2023 FA 계약" },
  "jamsil-bears::정수빈": { yearsLeft: 1, kind: "실계약 6년 56억", total: 56, source: "2021 FA 계약" },
  "jamsil-bears::김재환": { yearsLeft: 1, kind: "실계약 4년 115억", total: 115, source: "2022 FA 계약" },
  "jamsil-bears::허경민": { yearsLeft: 1, kind: "실계약 4+3년 85억", total: 85, source: "2021 FA 계약" },

  "changwon-dino-force::박민우": { yearsLeft: 5, kind: "실계약 5+3년 140억", total: 140, source: "2023 FA 계약" },
  "changwon-dino-force::박건우": { yearsLeft: 2, kind: "실계약 6년 100억", total: 100, source: "2022 FA 계약" },
  "changwon-dino-force::손아섭": { yearsLeft: 1, kind: "실계약 4년 64억", total: 64, source: "2022 FA 계약" },
  "changwon-dino-force::박세혁": { yearsLeft: 1, kind: "실계약 4년 46억", total: 46, source: "2023 FA 계약" },

  "busan-giant-waves::박세웅": { yearsLeft: 2, kind: "실계약 5년 90억", total: 90, source: "2023 비FA 다년계약" },
  "busan-giant-waves::전준우": { yearsLeft: 2, kind: "실계약 4년 47억", total: 47, source: "2024 FA 계약" },
  "busan-giant-waves::유강남": { yearsLeft: 1, kind: "실계약 4년 80억", total: 80, source: "2023 FA 계약" },
  "busan-giant-waves::노진혁": { yearsLeft: 1, kind: "실계약 4년 50억", total: 50, source: "2023 FA 계약" },
  "busan-giant-waves::정철원": { yearsLeft: 1, kind: "연봉계약", source: "트레이드/연봉계약 추정" },

  "incheon-landing::한유섬": { yearsLeft: 1, kind: "실계약 5년 60억", total: 60, source: "2022 비FA 다년계약" },
  "incheon-landing::최정": { yearsLeft: 4, kind: "실계약 4년 110억", total: 110, source: "2025 FA 계약" },
  "incheon-landing::김광현": { yearsLeft: 1, kind: "실계약 4년 151억", total: 151, source: "2022 복귀 계약" },
  "incheon-landing::박성한": { yearsLeft: 1, kind: "연봉계약", source: "공개 다년계약 미확인" },

  "gocheok-heroes::송성문": { yearsLeft: 5, kind: "실계약 6년 120억", total: 120, source: "비FA 다년계약 보도 반영" },
  "gocheok-heroes::원종현": { yearsLeft: 1, kind: "실계약 4년 25억", total: 25, source: "2023 FA 계약" },
  "gocheok-heroes::최주환": { yearsLeft: 1, kind: "실계약 4년 42억", total: 42, source: "2021 FA 계약" }
};

function knownContractFor(teamId, name) {
  return KNOWN_CONTRACTS[`${teamId}::${name}`] || null;
}

const roleByKind = {
  "투수": { pos: "RP", type: "PIT" },
  "포수": { pos: "C", type: "BAT" },
  "내야수": { pos: "SS", type: "BAT" },
  "외야수": { pos: "CF", type: "BAT" }
};

const knownPosition = {
  "daejeon-orange-eagles": {
    "최재훈": "C", "허인서": "C",
    "이도윤": "SS", "심우준": "SS", "노시환": "3B", "강백호": "1B", "박정현": "2B", "황영묵": "2B", "하주석": "SS", "채은성": "1B", "김태연": "1B",
    "이진영": "RF", "권광민": "RF", "김태연": "LF", "페라자": "RF", "이원석": "CF", "문현빈": "CF", "유로결": "CF"
  },
  "seoul-twin-stars": {
    "박동원": "C", "오스틴": "1B", "문보경": "3B", "신민재": "2B", "오지환": "SS", "김현수": "LF", "박해민": "CF", "홍창기": "RF"
  },
  "busan-giant-waves": {
    "유강남": "C", "나승엽": "1B", "고승민": "2B", "손호영": "3B", "박승욱": "SS", "전준우": "LF", "황성빈": "CF", "윤동희": "RF"
  },
  "daegu-blue-lions": {
    "강민호": "C", "디아즈": "1B", "김지찬": "2B", "김영웅": "3B", "이재현": "SS", "구자욱": "RF", "김성윤": "CF", "이성규": "LF"
  },
  "gwangju-tiger-kings": {
    "김태군": "C", "변우혁": "1B", "김선빈": "2B", "김도영": "3B", "박찬호": "SS", "최형우": "LF", "소크라테스": "CF", "나성범": "RF"
  },
  "jamsil-bears": {
    "양의지": "C", "양석환": "1B", "강승호": "2B", "허경민": "3B", "박준영": "SS", "정수빈": "CF", "김재환": "LF", "조수행": "RF"
  },
  "changwon-dino-force": {
    "박세혁": "C", "데이비슨": "1B", "박민우": "2B", "서호철": "3B", "김주원": "SS", "권희동": "LF", "박건우": "RF", "최정원": "CF"
  },
  "suwon-wizpark": {
    "장성우": "C", "박병호": "1B", "천성호": "2B", "황재균": "3B", "김상수": "SS", "로하스": "LF", "배정대": "CF", "강백호": "RF"
  },
  "incheon-landing": {
    "이지영": "C", "오태곤": "1B", "김성현": "2B", "최정": "3B", "박성한": "SS", "에레디아": "LF", "최지훈": "CF", "한유섬": "RF"
  },
  "gocheok-heroes": {
    "김재현": "C", "최주환": "1B", "김혜성": "2B", "송성문": "3B", "김휘집": "SS", "이주형": "CF", "도슨": "LF", "변상권": "RF"
  }
};

Object.entries({
  "seoul-twin-stars": {
    "구본혁": "SS", "이영빈": "1B", "천성호": "2B", "문정빈": "3B",
    "문성주": "LF", "송찬의": "RF"
  },
  "suwon-wizpark": {
    "강백호": "RF", "문상철": "1B", "오재일": "1B", "오윤석": "2B", "김상수": "SS", "황재균": "3B", "천성호": "2B", "신본기": "SS",
    "로하스": "LF", "배정대": "CF", "김민혁": "LF", "정준영": "CF", "안치영": "RF", "송민섭": "RF"
  },
  "daegu-blue-lions": {
    "디아즈": "1B", "전병우": "3B", "류지혁": "2B", "안주형": "SS", "김헌곤": "LF", "윤정빈": "RF", "김현준": "CF"
  },
  "gwangju-tiger-kings": {
    "한승택": "C", "서건창": "2B", "변우혁": "1B", "김규성": "2B", "홍종표": "SS", "최원준": "CF", "이창진": "LF", "박정우": "CF"
  },
  "daejeon-orange-eagles": {
    "장진혁": "CF", "이원석": "CF", "유로결": "LF", "임종찬": "RF", "최인호": "LF", "권광민": "RF", "이진영": "RF", "페라자": "RF",
    "하주석": "SS", "이도윤": "SS", "심우준": "SS", "문현빈": "2B", "김인환": "1B"
  },
  "jamsil-bears": {
    "장승현": "C", "김기연": "C", "이유찬": "SS", "전민재": "2B", "박계범": "SS", "여동건": "2B", "라모스": "RF", "제러드": "LF", "조수행": "RF"
  },
  "changwon-dino-force": {
    "김형준": "C", "도태훈": "1B", "김한별": "2B", "최정원": "CF", "김성욱": "CF", "한석현": "LF", "천재환": "RF", "박영빈": "CF"
  },
  "busan-giant-waves": {
    "정보근": "C", "손성빈": "C", "노진혁": "SS", "정훈": "1B", "이학주": "SS", "한동희": "3B", "레이예스": "RF", "김민석": "CF", "장두성": "LF"
  },
  "incheon-landing": {
    "조형우": "C", "고명준": "1B", "안상현": "2B", "전의산": "1B", "최준우": "2B", "하재훈": "RF", "추신수": "RF", "오태곤": "1B"
  },
  "gocheok-heroes": {
    "김건희": "C", "김동헌": "C", "이원석": "1B", "김태진": "2B", "송성문": "3B", "김휘집": "SS", "임병욱": "CF", "변상권": "RF", "박수종": "CF"
  }
}).forEach(([teamId, map]) => {
  Object.assign(knownPosition[teamId] ||= {}, map);
});

function fallbackFieldPosition(basePos, teamId, name, jerseyNumber, rosterStatus) {
  const mapped = knownPosition[teamId]?.[name];
  if (mapped) return mapped;
  const h = rating(`${teamId}-${name}-${jerseyNumber}-${rosterStatus}-pos`, 0, 99);
  if (basePos === "SS") return ["1B", "2B", "3B", "SS"][h % 4];
  if (basePos === "CF") return ["LF", "CF", "RF"][h % 3];
  return basePos;
}

function clean(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function csv(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function ageFromBirth(birth) {
  const year = Number(String(birth).slice(0, 4));
  return Number.isFinite(year) ? Math.max(17, 2026 - year) : 24;
}

function rating(seed, min, max) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return min + (h % (max - min + 1));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function num(value) {
  const n = Number(String(value || "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function innings(value) {
  const s = String(value || "0");
  const [whole, frac] = s.split(/\s+/);
  const base = Number(whole) || 0;
  if (!frac) return base;
  const outs = frac.startsWith("1/3") ? 1 : frac.startsWith("2/3") ? 2 : 0;
  return base + outs / 3;
}

const statTeamToId = {
  "LG": "seoul-twin-stars",
  "KT": "suwon-wizpark",
  "삼성": "daegu-blue-lions",
  "KIA": "gwangju-tiger-kings",
  "한화": "daejeon-orange-eagles",
  "두산": "jamsil-bears",
  "NC": "changwon-dino-force",
  "롯데": "busan-giant-waves",
  "SSG": "incheon-landing",
  "키움": "gocheok-heroes"
};

function statKey(teamId, name) {
  return `${teamId}::${name}`;
}

function parseStatRows(html) {
  const rows = [];
  for (const tableMatch of String(html || "").matchAll(/<table[^>]*class="[^"]*(?:tData|tNData|tbl)[^"]*"[\s\S]*?<\/table>/gi)) {
    const table = tableMatch[0];
    for (const rowMatch of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => clean(m[1]));
      if (cells.length >= 8 && /^\d+$/.test(cells[0])) rows.push(cells);
    }
  }
  return rows;
}

async function fetchOfficialStats() {
  const out = { hitters: new Map(), pitchers: new Map() };
  const hitterHtml = await (await fetch("https://www.koreabaseball.com/Record/Player/HitterBasic/Basic1.aspx", { headers: { "User-Agent": "KBO ratings importer" } })).text();
  const pitcherHtml = await (await fetch("https://www.koreabaseball.com/Record/Player/PitcherBasic/Basic1.aspx", { headers: { "User-Agent": "KBO ratings importer" } })).text();
  for (const cells of parseStatRows(hitterHtml)) {
    const teamId = statTeamToId[cells[2]];
    if (!teamId) continue;
    out.hitters.set(statKey(teamId, cells[1]), {
      avg: num(cells[3]), g: num(cells[4]), pa: num(cells[5]), ab: num(cells[6]), r: num(cells[7]),
      h: num(cells[8]), doubles: num(cells[9]), triples: num(cells[10]), hr: num(cells[11]),
      tb: num(cells[12]), rbi: num(cells[13])
    });
  }
  for (const cells of parseStatRows(pitcherHtml)) {
    const teamId = statTeamToId[cells[2]];
    if (!teamId) continue;
    out.pitchers.set(statKey(teamId, cells[1]), {
      era: num(cells[3]), g: num(cells[4]), w: num(cells[5]), l: num(cells[6]), sv: num(cells[7]), hld: num(cells[8]),
      ip: innings(cells[10]), h: num(cells[11]), hr: num(cells[12]), bb: num(cells[13]), so: num(cells[15]), whip: num(cells[18])
    });
  }
  console.log(`official stat matches loaded: hitters ${out.hitters.size}, pitchers ${out.pitchers.size}`);
  return out;
}

function fallbackRatings(base, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer) {
  const active = rosterStatus === "ACTIVE";
  const top = active ? 73 : 63;
  const bottom = active ? 56 : 44;
  const ovr = rating(`${teamId}-${name}-${jerseyNumber}-real-fallback`, bottom, top + (foreignPlayer ? 5 : 0));
  const youth = age <= 22 ? 10 : age <= 25 ? 7 : age <= 28 ? 4 : age >= 35 ? 0 : 2;
  const pot = Math.max(ovr, Math.min(92, ovr + youth + rating(`${name}-ceiling`, 0, active ? 7 : 12)));
  if (base.type === "PIT") {
    const pit = clamp(ovr + rating(`${name}-pit`, -5, 7), 42, 92);
    return { ovr, pot, hit: 10, pow: 10, spd: rating(`${name}-spd`, 30, 55), def: clamp(ovr + rating(`${name}-def`, -12, 8), 40, 88), arm: clamp(pit + rating(`${name}-arm`, -3, 8), 45, 96), pit, form: rating(`${name}-form`, 58, 84), stamina: base.pos === "SP" ? rating(`${name}-stamina`, 68, 92) : rating(`${name}-stamina`, 38, 66) };
  }
  return { ovr, pot, hit: clamp(ovr + rating(`${name}-hit`, -8, 8), 35, 90), pow: clamp(ovr + rating(`${name}-pow`, -12, 10), 30, 90), spd: rating(`${name}-spd`, 35, 88), def: clamp(ovr + rating(`${name}-def`, -10, 10), 35, 92), arm: clamp(ovr + rating(`${name}-arm`, -10, 12), 35, 94), pit: rating(`${name}-batpit`, 8, 24), form: rating(`${name}-form`, 58, 84), stamina: rating(`${name}-stamina`, 45, 85) };
}

function hitterRatings(stat, base, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer) {
  if (!stat) return fallbackRatings(base, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer);
  const avg = stat.avg || 0;
  const iso = stat.ab ? Math.max(0, (stat.tb - stat.h) / stat.ab) : 0;
  const rRate = stat.pa ? stat.r / stat.pa : 0;
  const obpBoost = stat.obp ? (stat.obp - 0.33) * 105 : 0;
  const slgBoost = stat.slg ? (stat.slg - 0.39) * 85 : 0;
  const contact = clamp(39 + avg * 138 + obpBoost + Math.min(16, stat.h / 6) - Math.max(0, (stat.so || 0) - (stat.bb || 0)) * 0.04, 42, 97);
  const power = clamp(40 + iso * 155 + slgBoost + stat.hr * 1.45 + stat.rbi * 0.15, 35, 98);
  const speed = clamp(46 + rRate * 125 + (stat.sb || 0) * 1.2 - (stat.cs || 0) * 0.7 + stat.triples * 4 + (base.pos === "CF" ? 8 : ["LF","RF","SS","2B"].includes(base.pos) ? 4 : -2), 32, 96);
  const defense = clamp(58 + (["C","SS","CF","2B"].includes(base.pos) ? 10 : ["3B","RF"].includes(base.pos) ? 6 : 1) + rating(`${name}-def-real`, -5, 6), 45, 94);
  const arm = clamp(defense + (["C","RF","3B","SS"].includes(base.pos) ? 7 : 0) + rating(`${name}-arm-real`, -5, 5), 40, 96);
  const ovr = clamp(contact * 0.33 + power * 0.28 + speed * 0.12 + defense * 0.18 + arm * 0.09, 48, 94);
  const youth = age <= 22 ? 8 : age <= 25 ? 5 : age <= 28 ? 3 : 0;
  const pot = Math.max(ovr, Math.min(96, ovr + youth + rating(`${name}-pot-real`, 0, 5)));
  return { ovr, pot, hit: contact, pow: power, spd: speed, def: defense, arm, pit: rating(`${name}-pit-bat`, 8, 24), form: clamp(62 + (avg - 0.25) * 120 + stat.hr * 0.35, 50, 96), stamina: rating(`${name}-stamina`, 52, 88) };
}

function pitcherRatings(stat, base, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer) {
  if (!stat) return fallbackRatings(base, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer);
  const k9 = stat.ip ? stat.so * 9 / stat.ip : 6;
  const bb9 = stat.ip ? stat.bb * 9 / stat.ip : 4;
  const hr9 = stat.ip ? stat.hr * 9 / stat.ip : 1;
  const runPrevent = clamp(96 - stat.era * 7 - (stat.whip - 1.1) * 18, 45, 96);
  const stuff = clamp(50 + k9 * 4.8 + stat.sv * 1.2 + stat.hld * 0.7 - hr9 * 1.4, 43, 98);
  const command = clamp(81 - bb9 * 5.7 - Math.max(0, stat.whip - 1.15) * 24 - Math.max(0, hr9 - 1) * 2.5, 36, 95);
  const roleBoost = base.pos === "SP" ? Math.min(8, stat.ip / 12) : Math.min(7, stat.sv * 0.8 + stat.hld * 0.3);
  const pit = clamp(stuff * 0.45 + runPrevent * 0.35 + command * 0.2 + roleBoost, 45, 97);
  const ovr = clamp(pit * 0.7 + runPrevent * 0.2 + command * 0.1, 48, 95);
  const youth = age <= 23 ? 8 : age <= 26 ? 5 : age <= 29 ? 2 : 0;
  const pot = Math.max(ovr, Math.min(96, ovr + youth + rating(`${name}-pot-pit`, 0, 4)));
  return { ovr, pot, hit: 10, pow: 10, spd: rating(`${name}-spd-pit`, 30, 55), def: clamp(ovr + rating(`${name}-def-pit`, -8, 8), 42, 90), arm: clamp(stuff + rating(`${name}-arm-pit`, -3, 6), 48, 98), pit, form: clamp(88 - stat.era * 5 + k9 * 1.2, 45, 96), stamina: base.pos === "SP" ? clamp(66 + stat.ip / 2.2, 62, 96) : rating(`${name}-stamina-rp`, 38, 66) };
}

function playerTrait(base, stat, ratings, age, foreignPlayer, rosterStatus) {
  const tags = [];
  if (foreignPlayer) tags.push("외국인");
  if (rosterStatus === "FARM") tags.push("퓨처스");
  if (ratings.ovr >= 84) tags.push(base.type === "PIT" ? "에이스" : "프랜차이즈급");
  else if (ratings.ovr >= 78) tags.push("핵심전력");
  else if (ratings.pot >= 84 && age <= 25) tags.push("상위 유망주");
  else if (ratings.pot >= 78 && age <= 24) tags.push("성장형");
  if (base.type === "PIT") {
    const ip = stat?.ip || 0;
    const k9 = ip ? (stat.so || 0) * 9 / ip : 0;
    const bb9 = ip ? (stat.bb || 0) * 9 / ip : 0;
    if (base.pos === "SP" && ratings.stamina >= 86) tags.push("이닝이터");
    if (k9 >= 8.5 || ratings.pit >= 82) tags.push("탈삼진형");
    if (bb9 && bb9 <= 2.4) tags.push("제구형");
    if ((stat?.hld || 0) >= 5) tags.push("필승조");
    if ((stat?.sv || 0) >= 5) tags.push("마무리형");
  } else {
    const iso = stat?.ab ? Math.max(0, ((stat.tb || 0) - (stat.h || 0)) / stat.ab) : 0;
    if (ratings.hit >= 82 || (stat?.avg || 0) >= 0.3) tags.push("교타자");
    if (ratings.pow >= 82 || iso >= 0.18 || (stat?.hr || 0) >= 10) tags.push("장타형");
    if (ratings.spd >= 82 || (stat?.sb || 0) >= 10) tags.push("주루형");
    if (["C","SS","CF"].includes(base.pos) && ratings.def >= 78) tags.push("수비핵심");
    if ((stat?.bb || 0) > (stat?.so || 0) * 0.65 && (stat?.pa || 0) >= 40) tags.push("선구안");
  }
  if (age >= 34 && ratings.ovr >= 68) tags.push("베테랑");
  return [...new Set(tags)].slice(0, 4).join(" · ") || (rosterStatus === "ACTIVE" ? "1군 등록 선수" : "2군 등록 선수");
}

function durabilityFromReality(base, stat, ratings, age, rosterStatus) {
  let value = 66;
  if (base.type === "PIT") {
    const ip = stat?.ip || 0;
    value += base.pos === "SP" ? Math.min(18, ip / 5) : Math.min(12, (stat?.g || 0) * 0.45);
    value += (ratings.stamina - 65) * 0.18;
  } else {
    value += Math.min(18, (stat?.g || 0) * 0.35);
    value += Math.min(10, (stat?.pa || 0) / 35);
  }
  if (rosterStatus === "FARM") value -= 4;
  if (age >= 35) value -= 9;
  else if (age >= 32) value -= 4;
  if (ratings.form >= 80) value += 3;
  return clamp(value + rating(`${base.type}-${age}-${ratings.ovr}-durability`, -6, 6), 35, 94);
}

const detailCache = new Map();

function playerIdFromRow(rowHtml) {
  const href = String(rowHtml || "").match(/playerId=(\d+)/i)?.[1];
  return href || "";
}

function moneyManwonToEok(value) {
  const n = num(value);
  return n > 0 ? Math.round((n / 10000) * 10) / 10 : 0;
}

function parseDetail(html, type) {
  const text = clean(html);
  const salaryManwon = text.match(/연봉:\s*([0-9,]+)만원/)?.[1] || "";
  const bonusManwon = text.match(/입단 계약금:\s*([0-9,]+)만원/)?.[1] || "";
  const debutToken = text.match(/입단년도:\s*([0-9]{2,4})/)?.[1] || "";
  const seasonService = text.match(/시즌합계\s*([0-9]+)(?:\s|$)/)?.[1] || "";
  const detail = {
    annualSalary: moneyManwonToEok(salaryManwon),
    signingBonus: moneyManwonToEok(bonusManwon),
    debutYear: debutToken ? Number(debutToken.length === 2 ? `20${debutToken}` : debutToken) : 0,
    currentSeasonServiceDays: Number(seasonService) || 0
  };
  if (type === "PIT") {
    const first = text.match(/팀명 ERA G CG SHO W L SV HLD WPCT TBF NP IP H 2B 3B HR\s+\S+\s+([\d.]+)\s+(\d+)\s+\d+\s+\d+\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+[\d.]+\s+\d+\s+\d+\s+(\d+(?:\s+[12]\/3)?)\s+(\d+)\s+\d+\s+\d+\s+(\d+)/);
    const second = text.match(/SAC SF BB IBB SO WP BK R ER BSV WHIP AVG QS\s+\d+\s+\d+\s+(\d+)\s+\d+\s+(\d+)\s+(\d+)\s+\d+\s+\d+\s+\d+\s+\d+\s+([\d.]+)/);
    if (first) {
      detail.stat = {
        era: num(first[1]), g: num(first[2]), w: num(first[3]), l: num(first[4]), sv: num(first[5]), hld: num(first[6]),
        ip: innings(first[7]), h: num(first[8]), hr: num(first[9]),
        bb: second ? num(second[1]) : 0, so: second ? num(second[2]) : 0, wp: second ? num(second[3]) : 0, whip: second ? num(second[4]) : 1.35
      };
    }
  } else {
    const first = text.match(/팀명 AVG G PA AB R H 2B 3B HR TB RBI SB CS SAC SF\s+\S+\s+([\d.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    const second = text.match(/BB IBB HBP SO GDP SLG OBP E SB% MH OPS RISP PH-BA\s+(\d+)\s+\d+\s+\d+\s+(\d+)\s+(\d+)\s+([\d.]+)\s+([\d.]+)/);
    if (first) {
      detail.stat = {
        avg: num(first[1]), g: num(first[2]), pa: num(first[3]), ab: num(first[4]), r: num(first[5]),
        h: num(first[6]), doubles: num(first[7]), triples: num(first[8]), hr: num(first[9]), tb: num(first[10]),
        rbi: num(first[11]), sb: num(first[12]), cs: num(first[13]), bb: second ? num(second[1]) : 0,
        so: second ? num(second[2]) : 0, gdp: second ? num(second[3]) : 0, slg: second ? num(second[4]) : 0, obp: second ? num(second[5]) : 0
      };
    }
  }
  return detail;
}

async function fetchPlayerDetail(type, playerId) {
  if (!playerId) return {};
  const key = `${type}:${playerId}`;
  if (detailCache.has(key)) return detailCache.get(key);
  const kind = type === "PIT" ? "Pitcher" : "Hitter";
  const url = `https://www.koreabaseball.com/Record/Player/${kind}Detail/Basic.aspx?playerId=${playerId}`;
  try {
    const html = await (await fetch(url, { headers: { "User-Agent": "KBO contract importer" } })).text();
    const detail = parseDetail(html, type);
    detailCache.set(key, detail);
    await new Promise((resolve) => setTimeout(resolve, 35));
    return detail;
  } catch {
    const detail = {};
    detailCache.set(key, detail);
    return detail;
  }
}

function serviceYearsFromDetail(detail, age, type, rosterStatus) {
  if (detail?.debutYear) {
    const years = 2026 - detail.debutYear + 1;
    const youthPenalty = detail.debutYear >= 2023 ? 1 : detail.debutYear >= 2020 ? 0.5 : 0;
    return clamp(years - youthPenalty, 0, 12);
  }
  return Math.max(0, Math.min(12, age - (type === "PIT" ? 22 : 21) - (rosterStatus === "FARM" ? 1 : 0)));
}

function privateContractYears(row, ratings, age, annual, serviceYears, rosterStatus) {
  if (rosterStatus === "DEV") return 1;
  const totalServiceDays = Math.max(0, Math.round(serviceYears * 145));
  const faRequiredDays = (age <= 27 ? 9 : 8) * 145;
  const controlYears = Math.max(0, Math.ceil((faRequiredDays - totalServiceDays) / 145));
  if (controlYears <= 0) {
    if (ratings.ovr >= 80 || annual >= 7) return 3;
    if (ratings.ovr >= 73 || annual >= 3) return 2;
    return 1;
  }
  const det = rating(`${row.teamId || ""}-${row.name || ""}-${age}-${annual}-private-contract`, 0, 99);
  if (ratings.ovr >= 82 && age <= 31) return Math.min(5, Math.max(2, controlYears));
  if (ratings.ovr >= 76 && age <= 30) return Math.min(det > 45 ? 4 : 3, Math.max(2, controlYears));
  if (ratings.ovr >= 70 && rosterStatus === "ACTIVE") return Math.min(det > 60 ? 3 : 2, Math.max(1, controlYears));
  if (ratings.pot >= 82 && age <= 24) return Math.min(4, Math.max(2, controlYears));
  if (annual >= 2.5 && rosterStatus === "ACTIVE") return 2;
  return 1;
}

function contractShape(row, detail, ratings, age, foreignPlayer, rosterStatus) {
  const serviceYears = serviceYearsFromDetail(detail, age, row.type, rosterStatus);
  const realAnnual = Number(detail?.annualSalary) || 0;
  let annual = realAnnual;
  if (!annual) {
    const floor = rosterStatus === "ACTIVE" ? 0.35 : 0.3;
    const star = ratings.ovr >= 84 ? 12.0 : ratings.ovr >= 80 ? 8.0 : ratings.ovr >= 74 ? 4.5 : ratings.ovr >= 68 ? 1.8 : 0.8;
    annual = foreignPlayer ? Math.max(6.0, star) : Math.max(floor, star);
  }
  annual = Math.round(annual * 10) / 10;

  let yearsLeft = 1;
  let kind = foreignPlayer ? "외국인 단년계약" : "연봉계약";
  let contractSource = realAnnual ? "공시 연봉 · 서비스타임 반영" : "추정 연봉 · 서비스타임 반영";
  if (foreignPlayer) {
    contractSource = realAnnual ? "공시 연봉 · 외국인 단년계약" : "외국인 단년계약 추정";
  } else {
    const known = knownContractFor(row.teamId, row.name);
    if (known) {
      yearsLeft = known.yearsLeft;
      kind = known.kind;
      contractSource = known.source || "공개 계약 보도 반영";
    } else {
      yearsLeft = 1;
      kind = rosterStatus === "FARM" && annual < 1 ? "퓨처스/최저연봉권" : "연봉계약";
      contractSource = realAnnual ? "공시 연봉 · 서비스타임 반영" : "추정 연봉 · 서비스타임 반영";
    }
  }
  if (rosterStatus === "FARM" && annual < 1 && kind === "연봉계약") kind = "퓨처스/최저연봉권";

  const totalServiceDays = Math.max(0, Math.round(serviceYears * 145 + (Number(detail?.currentSeasonServiceDays) || 0)));
  const faRequiredDays = (age <= 27 ? 9 : 8) * 145;
  const controlYears = foreignPlayer ? 0 : Math.max(0, Math.ceil((faRequiredDays - totalServiceDays) / 145));
  const controlKind = foreignPlayer ? "외국인 보류 제외" : controlYears <= 0 ? "FA 자격권" : controlYears <= 1 ? "FA 임박" : "구단 보류권";
  return {
    annualSalary: annual,
    signingBonus: Number(detail?.signingBonus) || 0,
    serviceYears,
    serviceDays: totalServiceDays,
    yearsLeft,
    contractKind: kind,
    contractSource,
    controlYears,
    controlKind
  };
}

const aliasSyllables = ["준","민","훈","윤","현","율","성","진","우","원","호","빈","재","겸","서","안","도","혁","형","찬","수","욱","태","영"];
const koreanSurnames = new Set([... "김이박최정강조윤장임한오서신권황안송전홍유고문양손배조백허남심노하곽성차주우구민류나진지엄채원천방공현함변염여추도소석선설마길연위표명기반라왕금옥육인맹제모탁국"]);

function aliasName(name, salt = "") {
  const chars = [...String(name || "").trim()];
  if (!chars.length) return name;
  const seed = `${name}-${salt}`;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const replaceAt = (index, offset) => {
    let next = aliasSyllables[(h + offset) % aliasSyllables.length];
    if (next === chars[index]) next = aliasSyllables[(h + offset + 1) % aliasSyllables.length];
    chars[index] = next;
  };
  replaceAt(chars.length - 1, 0);
  return chars.join("");
}

function isLikelyForeignName(name) {
  const chars = [...String(name || "").trim().replace(/\s+/g, "")];
  if (!chars.length) return false;
  if (chars.length >= 4) return true;
  return !koreanSurnames.has(chars[0]);
}

function attrs(html) {
  const out = {};
  for (const m of html.matchAll(/<input[^>]+>/gi)) {
    const tag = m[0];
    const name = tag.match(/\bname="([^"]*)"/i)?.[1];
    const value = tag.match(/\bvalue="([^"]*)"/i)?.[1] || "";
    if (name) out[name] = value;
  }
  return out;
}

async function fetchTeam(url, code) {
  const first = await fetch(url, { headers: { "User-Agent": "KBO roster importer" } });
  const firstHtml = await first.text();
  const fields = attrs(firstHtml);
  const teamField = Object.keys(fields).find((name) => name.endsWith("$hfSearchTeam"));
  const dateField = Object.keys(fields).find((name) => name.endsWith("$hfSearchDate"));
  const buttonField = Object.keys(fields).find((name) => name.endsWith("$btnCalendarSelect"));
  if (teamField) fields[teamField] = code;
  if (dateField) fields[dateField] = "20260623";
  fields.__EVENTTARGET = buttonField || "";
  fields.__EVENTARGUMENT = "";
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "KBO roster importer",
      "Referer": url
    },
    body
  });
  return res.text();
}

async function parsePlayers(html, rosterStatus, teamId, sourceLabel, officialStats) {
  const main = html.split(/등\/말소 현황|등록\/말소 현황/)[0];
  const players = [];
  for (const tableMatch of main.matchAll(/<table[^>]*class="(?:tNData|tbl)"[\s\S]*?<\/table>/gi)) {
    const table = tableMatch[0];
    const headers = [...table.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map((m) => clean(m[1]));
    const kind = headers[1];
    if (!roleByKind[kind]) continue;
    const base = roleByKind[kind];
    for (const rowMatch of table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => clean(m[1]));
      if (cells.length < 5 || !/^\d+$/.test(cells[0])) continue;
      const [jerseyNumber, name, hand, birth] = cells;
      if (!name || name.includes("없습니다")) continue;
      const playerId = playerIdFromRow(rowMatch[1]);
      const publicName = aliasName(name, `${teamId}-${jerseyNumber}`);
      const foreignPlayer = isLikelyForeignName(name);
      const age = ageFromBirth(birth);
      const detail = await fetchPlayerDetail(base.type, playerId);
      const stat = detail.stat || (base.type === "PIT" ? officialStats?.pitchers?.get(statKey(teamId, name)) : officialStats?.hitters?.get(statKey(teamId, name)));
      const isStarter = base.type === "PIT" && players.filter((p) => p.type === "PIT").length < (rosterStatus === "ACTIVE" ? 5 : 4);
      const pos = base.type === "PIT" ? (stat?.ip >= 40 ? "SP" : isStarter ? "SP" : "RP") : fallbackFieldPosition(base.pos, teamId, name, jerseyNumber, rosterStatus);
      const pitcherRole = base.type === "PIT" ? (isStarter ? "SP" : "MR") : "";
      const finalPitcherRole = base.type === "PIT" ? (pos === "SP" ? "SP" : pitcherRole) : "";
      const ratings = base.type === "PIT"
        ? pitcherRatings(stat, { ...base, pos }, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer)
        : hitterRatings(stat, { ...base, pos }, teamId, name, jerseyNumber, rosterStatus, age, foreignPlayer);
      const contract = contractShape({ type: base.type, teamId, name }, detail, ratings, age, foreignPlayer, rosterStatus);
      const trait = playerTrait({ ...base, pos }, stat, ratings, age, foreignPlayer, rosterStatus);
      const durability = durabilityFromReality({ ...base, pos }, stat, ratings, age, rosterStatus);
      players.push({
        teamId,
        name: publicName,
        jerseyNumber,
        pos,
        type: base.type,
        age,
        rosterStatus,
        annualSalary: contract.annualSalary,
        signingBonus: contract.signingBonus,
        serviceYears: contract.serviceYears,
        serviceDays: contract.serviceDays,
        yearsLeft: contract.yearsLeft,
        contractKind: contract.contractKind,
        contractSource: contract.contractSource,
        controlYears: contract.controlYears,
        controlKind: contract.controlKind,
        faGrade: ratings.ovr >= 78 ? "A" : ratings.ovr >= 70 ? "B" : "C",
        pitcherRole: finalPitcherRole,
        ...ratings,
        durability,
        trait,
        foreignPlayer: foreignPlayer ? "Y" : "",
        source: `${sourceLabel} 공시 연봉/기록 기반 ${SOURCE_DATE}`
      });
    }
  }
  return players;
}

(async () => {
  const rows = [];
  const officialStats = await fetchOfficialStats();
  for (const [code, teamId] of teams) {
    const activeHtml = await fetchTeam(ACTIVE_URL, code);
    const futuresHtml = await fetchTeam(FUTURES_URL, code);
    const active = await parsePlayers(activeHtml, "ACTIVE", teamId, "공시 1군 등록", officialStats);
    const farm = (await parsePlayers(futuresHtml, "FARM", teamId, "공시 퓨처스 등록", officialStats))
      .filter((p) => !active.some((a) => a.name === p.name && a.jerseyNumber === p.jerseyNumber))
      .slice(0, 28);
    rows.push(...active, ...farm);
    console.log(`${code} ${teamId}: active ${active.length}, farm ${farm.length}`);
  }
  const header = ["teamId","name","jerseyNumber","pos","type","age","rosterStatus","annualSalary","signingBonus","serviceYears","serviceDays","yearsLeft","contractKind","contractSource","controlYears","controlKind","faGrade","pitcherRole","ovr","pot","hit","pow","spd","def","arm","pit","form","stamina","durability","trait","foreignPlayer","source"];
  const text = [header.join(","), ...rows.map((row) => header.map((key) => csv(row[key])).join(","))].join("\n") + "\n";
  fs.writeFileSync(OUT, text, "utf8");
  console.log(`wrote ${rows.length} players to ${OUT}`);
})();
