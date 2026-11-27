// Cửu Châu Ẩn Kiếm — Unity 6 2.5D UI Kit & 1920x1080 Master Arena Builder
// Follows figma-use Critical Rules 1–21: top-level await/return, 0..1 RGB, verified fonts, explicit variable scopes, SVG vector imports, zero <15px text.

const page = figma.currentPage;
await figma.setCurrentPageAsync(page);
page.name = "U1 — Wuxia 2.5D UI Kit & 1080p Arena";

const createdNodeIds = [];
const mutatedNodeIds = [page.id];

// 1. Idempotent cleanup of prior run roots by exact deterministic name
for (const oldName of ["Wuxia_Component_Source_Library", "Figma_Master_Board_Showcase"]) {
  const existing = page.children.filter(n => n.name === oldName);
  for (const node of existing) node.remove();
}

// 2. Discover & load exact verified fonts (Noto Serif + Be Vietnam Pro + JetBrains Mono, with safe fallbacks)
const allFonts = await figma.listAvailableFontsAsync();
function pickFont(candidates) {
  for (const [family, styles] of candidates) {
    for (const style of styles) {
      const hit = allFonts.find(f => f.fontName.family === family && f.fontName.style === style);
      if (hit) return hit.fontName;
    }
  }
  return allFonts.find(f => f.fontName.family === "Inter" && f.fontName.style === "Bold")?.fontName || allFonts[0].fontName;
}

const fontSerifBold = pickFont([["Noto Serif", ["Bold", "SemiBold"]], ["Playfair Display", ["Bold"]], ["Merriweather", ["Bold"]], ["Inter", ["Bold"]]]);
const fontSansBold  = pickFont([["Be Vietnam Pro", ["Bold"]], ["Plus Jakarta Sans", ["Bold"]], ["Inter", ["Bold"]]]);
const fontSansSemi  = pickFont([["Be Vietnam Pro", ["SemiBold", "Semi Bold", "Medium"]], ["Inter", ["Semi Bold", "Medium", "Bold"]]]);
const fontSansReg   = pickFont([["Be Vietnam Pro", ["Regular"]], ["Inter", ["Regular"]]]);
const fontMonoBold  = pickFont([["JetBrains Mono", ["Bold"]], ["Roboto Mono", ["Bold"]], ["Inter", ["Bold"]]]);

await Promise.all([
  figma.loadFontAsync(fontSerifBold),
  figma.loadFontAsync(fontSansBold),
  figma.loadFontAsync(fontSansSemi),
  figma.loadFontAsync(fontSansReg),
  figma.loadFontAsync(fontMonoBold),
]);

// 3. Color helpers (0..1 range, no alpha in SOLID color)
function rgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  };
}
function solid(hex, opacity = 1) {
  return opacity < 1 ? { type: "SOLID", color: rgb(hex), opacity } : { type: "SOLID", color: rgb(hex) };
}

// 4. Create / reuse local Design Tokens Collection with explicit scopes & WEB syntax
const existingCols = await figma.variables.getLocalVariableCollectionsAsync();
let tokenCol = existingCols.find(c => c.name === "Cửu Châu 2.5D Tokens");
if (!tokenCol) {
  tokenCol = figma.variables.createVariableCollection("Cửu Châu 2.5D Tokens");
  tokenCol.renameMode(tokenCol.modes[0].modeId, "Obsidian Camp");
}
const modeId = tokenCol.modes[0].modeId;
const localVars = await figma.variables.getLocalVariablesAsync();

function ensureColorVar(name, hex, scopes, cssVar) {
  let v = localVars.find(x => x.name === name && x.variableCollectionId === tokenCol.id);
  if (!v) v = figma.variables.createVariable(name, tokenCol, "COLOR");
  v.setValueForMode(modeId, rgb(hex));
  v.scopes = scopes;
  v.setVariableCodeSyntax("WEB", `var(${cssVar})`);
  return v;
}

ensureColorVar("color/bg/obsidian", "#090807", ["FRAME_FILL", "SHAPE_FILL"], "--cc-bg-obsidian");
ensureColorVar("color/bg/ebony", "#181B20", ["FRAME_FILL", "SHAPE_FILL"], "--cc-bg-ebony");
ensureColorVar("color/card/silk", "#DEC79C", ["FRAME_FILL", "SHAPE_FILL"], "--cc-card-silk");
ensureColorVar("color/text/jade-white", "#EFE6D5", ["TEXT_FILL"], "--cc-text-jade");
ensureColorVar("color/text/ink", "#1D150D", ["TEXT_FILL", "SHAPE_FILL"], "--cc-text-ink");
ensureColorVar("color/accent/cinnabar", "#C83E37", ["FRAME_FILL", "SHAPE_FILL"], "--cc-accent-cinnabar");
ensureColorVar("color/accent/bronze-gold", "#C89B4B", ["STROKE_COLOR", "SHAPE_FILL", "TEXT_FILL"], "--cc-accent-gold");
ensureColorVar("color/faction/thien-kiem", "#3B82F6", ["SHAPE_FILL"], "--cc-faction-thien-kiem");
ensureColorVar("color/faction/huyen-thiet", "#C83E37", ["SHAPE_FILL"], "--cc-faction-huyen-thiet");
ensureColorVar("color/faction/giang-nam", "#10B981", ["SHAPE_FILL"], "--cc-faction-giang-nam");
ensureColorVar("color/faction/an-sat", "#94A3B8", ["SHAPE_FILL"], "--cc-faction-an-sat");

// 5. Place top-level frames clear of any existing content
let startX = 100;
for (const child of page.children) {
  const right = child.x + child.width;
  if (right + 200 > startX) startX = right + 200;
}

// 6. Create 11 Reusable Wuxia Vector Components (kept in dedicated Component Source Frame outside Showcase)
const SVGS = {
  "suit_spade": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"sp_body\" x1=\"22\" y1=\"14\" x2=\"104\" y2=\"114\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#38291B\"/><stop offset=\"0.48\" stop-color=\"#1D150D\"/><stop offset=\"1\" stop-color=\"#0C0805\"/></linearGradient><linearGradient id=\"sp_left_facet\" x1=\"20\" y1=\"12\" x2=\"64\" y2=\"92\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#523D2A\" stop-opacity=\"0.72\"/><stop offset=\"1\" stop-color=\"#1D150D\" stop-opacity=\"0.04\"/></linearGradient><linearGradient id=\"sp_gold\" x1=\"18\" y1=\"10\" x2=\"110\" y2=\"118\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.52\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#7C561B\"/></linearGradient></defs><path d=\"M56 82 L72 82 L75 102 L88 114 L64 118 L40 114 L53 102 Z\" fill=\"url(#sp_body)\" stroke=\"url(#sp_gold)\" stroke-width=\"3\" stroke-linejoin=\"miter\"/><path d=\"M64 10 C76 28 112 52 112 75 C112 91 98 101 83 98 C74 96 68 90 64 83 C60 90 54 96 45 98 C30 101 16 91 16 75 C16 52 52 28 64 10 Z\" fill=\"url(#sp_body)\" stroke=\"url(#sp_gold)\" stroke-width=\"3.2\" stroke-linejoin=\"round\"/><path d=\"M64 14 C53 31 21 53 21 75 C21 87 32 95 44 93 C53 91 59 85 64 77 Z\" fill=\"url(#sp_left_facet)\"/><path d=\"M64 20 L69 66 L64 78 L59 66 Z\" fill=\"#2B1F14\" stroke=\"url(#sp_gold)\" stroke-width=\"1.8\"/><path d=\"M64 20 L64 80\" stroke=\"#F6DE9C\" stroke-width=\"1.6\" stroke-opacity=\"0.8\"/><path d=\"M48 103 L64 97 L80 103\" stroke=\"url(#sp_gold)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/><polygon points=\"64,74 71,82 64,90 57,82\" fill=\"url(#sp_gold)\" stroke=\"#140E09\" stroke-width=\"1.5\"/>\n</svg>",
  "suit_club": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"cl_body\" x1=\"20\" y1=\"14\" x2=\"108\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#38291B\"/><stop offset=\"0.5\" stop-color=\"#1D150D\"/><stop offset=\"1\" stop-color=\"#0C0805\"/></linearGradient><linearGradient id=\"cl_facet\" x1=\"22\" y1=\"14\" x2=\"72\" y2=\"82\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#523D2A\" stop-opacity=\"0.72\"/><stop offset=\"1\" stop-color=\"#1D150D\" stop-opacity=\"0\"/></linearGradient><linearGradient id=\"cl_gold\" x1=\"16\" y1=\"10\" x2=\"112\" y2=\"118\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.5\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#7C561B\"/></linearGradient></defs><path d=\"M56 80 L72 80 L75 103 L88 114 L64 118 L40 114 L53 103 Z\" fill=\"url(#cl_body)\" stroke=\"url(#cl_gold)\" stroke-width=\"3\" stroke-linejoin=\"miter\"/><path d=\"M64 12 C79 12 90 23 90 38 C90 44 88 49 84 53 C91 51 98 52 104 56 C113 63 116 76 110 86 C104 96 90 100 79 94 C73 91 68 86 66 80 L62 80 C60 86 55 91 49 94 C38 100 24 96 18 86 C12 76 15 63 24 56 C30 52 37 51 44 53 C40 49 38 44 38 38 C38 23 49 12 64 12 Z\" fill=\"url(#cl_body)\" stroke=\"url(#cl_gold)\" stroke-width=\"3.2\" stroke-linejoin=\"round\"/><path d=\"M44 37 C44 26 53 18 64 18 C67 18 70 19 73 20 C62 20 51 28 49 40 Z\" fill=\"url(#cl_facet)\"/><path d=\"M22 76 C20 67 26 59 35 58 C38 58 41 59 43 60 C33 61 26 68 26 78 Z\" fill=\"url(#cl_facet)\"/><path d=\"M64 42 C68 50 68 57 64 62 C60 57 60 50 64 42 Z\" fill=\"url(#cl_gold)\"/><path d=\"M44 74 C50 68 57 65 62 65 C59 70 53 74 44 74 Z\" fill=\"url(#cl_gold)\"/><path d=\"M84 74 C75 74 69 70 66 65 C71 65 78 68 84 74 Z\" fill=\"url(#cl_gold)\"/><circle cx=\"64\" cy=\"64\" r=\"7.5\" fill=\"url(#cl_gold)\" stroke=\"#140E09\" stroke-width=\"2\"/><circle cx=\"64\" cy=\"64\" r=\"2.8\" fill=\"#1D150D\"/><path d=\"M49 104 L64 98 L79 104\" stroke=\"url(#cl_gold)\" stroke-width=\"2.2\" stroke-linecap=\"round\"/>\n</svg>",
  "suit_heart": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"ht_body\" x1=\"20\" y1=\"16\" x2=\"106\" y2=\"114\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#DC4A40\"/><stop offset=\"0.46\" stop-color=\"#B8322A\"/><stop offset=\"1\" stop-color=\"#6E1612\"/></linearGradient><linearGradient id=\"ht_facet\" x1=\"18\" y1=\"16\" x2=\"64\" y2=\"86\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F78279\" stop-opacity=\"0.52\"/><stop offset=\"1\" stop-color=\"#B8322A\" stop-opacity=\"0\"/></linearGradient><linearGradient id=\"ht_gold\" x1=\"14\" y1=\"14\" x2=\"114\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.5\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#7D551A\"/></linearGradient></defs><path d=\"M64 31 C56 18 39 14 26 22 C12 31 10 51 21 68 C33 86 52 100 64 116 C76 100 95 86 107 68 C118 51 116 31 102 22 C89 14 72 18 64 31 Z\" fill=\"url(#ht_body)\" stroke=\"url(#ht_gold)\" stroke-width=\"4\" stroke-linejoin=\"round\"/><path d=\"M64 34 C56 22 40 19 29 26 C18 33 17 50 27 65 C37 80 53 93 64 108 Z\" fill=\"url(#ht_facet)\"/><path d=\"M64 41 C57 30 43 26 33 33 C24 39 23 52 31 65 C40 78 54 89 64 102 C74 89 88 78 97 65 C105 52 104 39 95 33 C85 26 71 30 64 41 Z\" stroke=\"url(#ht_gold)\" stroke-width=\"1.8\" stroke-opacity=\"0.72\"/><polygon points=\"64,23 70,32 64,41 58,32\" fill=\"url(#ht_gold)\" stroke=\"#59120E\" stroke-width=\"1.4\"/><polygon points=\"64,104 69,112 64,118 59,112\" fill=\"url(#ht_gold)\"/>\n</svg>",
  "suit_diamond": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"dm_gold\" x1=\"16\" y1=\"10\" x2=\"112\" y2=\"118\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.5\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#7D551A\"/></linearGradient><linearGradient id=\"dm_table\" x1=\"42\" y1=\"36\" x2=\"86\" y2=\"92\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#E4574E\"/><stop offset=\"0.5\" stop-color=\"#C83E37\"/><stop offset=\"1\" stop-color=\"#8F221C\"/></linearGradient></defs><path d=\"M64 10 Q84 42 114 64 Q84 86 64 118 Q44 86 14 64 Q44 42 64 10 Z\" fill=\"#C83E37\"/><path d=\"M64 10 Q44 42 14 64 L64 64 Z\" fill=\"#EA6259\"/><path d=\"M64 10 Q84 42 114 64 L64 64 Z\" fill=\"#C83E37\"/><path d=\"M14 64 Q44 86 64 118 L64 64 Z\" fill=\"#A92C26\"/><path d=\"M114 64 Q84 86 64 118 L64 64 Z\" fill=\"#781A15\"/><polygon points=\"64,34 90,64 64,94 38,64\" fill=\"url(#dm_table)\" stroke=\"url(#dm_gold)\" stroke-width=\"2.2\"/><path d=\"M64 10 Q84 42 114 64 Q84 86 64 118 Q44 86 14 64 Q44 42 64 10 Z\" stroke=\"url(#dm_gold)\" stroke-width=\"4\" stroke-linejoin=\"miter\"/><polygon points=\"64,6 69,15 64,20 59,15\" fill=\"url(#dm_gold)\"/><polygon points=\"64,122 69,113 64,108 59,113\" fill=\"url(#dm_gold)\"/><polygon points=\"10,64 19,59 24,64 19,69\" fill=\"url(#dm_gold)\"/><polygon points=\"118,64 109,59 104,64 109,69\" fill=\"url(#dm_gold)\"/>\n</svg>",
  "faction_thien_kiem": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"tk_bronze\" x1=\"12\" y1=\"12\" x2=\"116\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.48\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#6C4917\"/></linearGradient><radialGradient id=\"tk_jade\" cx=\"46\" cy=\"42\" r=\"68\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#60A5FA\"/><stop offset=\"0.52\" stop-color=\"#3B82F6\"/><stop offset=\"1\" stop-color=\"#172E6E\"/></radialGradient><linearGradient id=\"tk_relief\" x1=\"34\" y1=\"20\" x2=\"94\" y2=\"104\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF2C6\"/><stop offset=\"0.5\" stop-color=\"#DFB45E\"/><stop offset=\"1\" stop-color=\"#8C6120\"/></linearGradient></defs><polygon points=\"34,10 94,10 118,34 118,94 94,118 34,118 10,94 10,34\" fill=\"url(#tk_bronze)\" stroke=\"#3A260B\" stroke-width=\"2.5\"/><polygon points=\"38,18 90,18 110,38 110,90 90,110 38,110 18,90 18,38\" fill=\"url(#tk_jade)\" stroke=\"#F4D58C\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"14\" r=\"2.2\" fill=\"#FFF0C2\"/><circle cx=\"92\" cy=\"14\" r=\"2.2\" fill=\"#E6BE6C\"/><circle cx=\"36\" cy=\"114\" r=\"2.2\" fill=\"#9E7127\"/><circle cx=\"92\" cy=\"114\" r=\"2.2\" fill=\"#8C6120\"/><polygon points=\"23,90 41,50 41,90\" fill=\"#FFF0C2\"/><polygon points=\"41,50 56,82 41,90\" fill=\"#B68635\"/><polygon points=\"23,90 41,50 56,82\" stroke=\"#0F1F4D\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><polygon points=\"72,82 87,50 87,90\" fill=\"#F6DE9C\"/><polygon points=\"87,50 105,90 87,90\" fill=\"#9E7027\"/><polygon points=\"72,82 87,50 105,90\" stroke=\"#0F1F4D\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M26 95 Q45 87 64 95 Q83 87 102 95\" stroke=\"#FFF0C2\" stroke-width=\"3.2\" stroke-linecap=\"round\"/><polygon points=\"64,20 56,37 58,72 64,72\" fill=\"#FFF5D1\"/><polygon points=\"64,20 72,37 70,72 64,72\" fill=\"#C89B4B\"/><polygon points=\"64,20 72,37 70,72 58,72 56,37\" stroke=\"#0F1F4D\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M43 69 L64 76 L85 69 L79 79 L64 83 L49 79 Z\" fill=\"url(#tk_relief)\" stroke=\"#0F1F4D\" stroke-width=\"1.8\"/><rect x=\"61\" y=\"82\" width=\"6\" height=\"13\" rx=\"1\" fill=\"#C89B4B\" stroke=\"#0F1F4D\" stroke-width=\"1.5\"/><polygon points=\"64,93 70,99 64,105 58,99\" fill=\"#FFF0C2\" stroke=\"#0F1F4D\" stroke-width=\"1.6\"/>\n</svg>",
  "faction_huyen_thiet": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"htf_bronze\" x1=\"12\" y1=\"12\" x2=\"116\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.48\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#6C4917\"/></linearGradient><radialGradient id=\"htf_cinnabar\" cx=\"46\" cy=\"42\" r=\"68\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#E85B53\"/><stop offset=\"0.52\" stop-color=\"#C83E37\"/><stop offset=\"1\" stop-color=\"#5E130F\"/></radialGradient><linearGradient id=\"htf_relief\" x1=\"28\" y1=\"22\" x2=\"98\" y2=\"104\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF2C6\"/><stop offset=\"0.5\" stop-color=\"#DFB45E\"/><stop offset=\"1\" stop-color=\"#8A5E1E\"/></linearGradient></defs><polygon points=\"34,10 94,10 118,34 118,94 94,118 34,118 10,94 10,34\" fill=\"url(#htf_bronze)\" stroke=\"#3A260B\" stroke-width=\"2.5\"/><polygon points=\"38,18 90,18 110,38 110,90 90,110 38,110 18,90 18,38\" fill=\"url(#htf_cinnabar)\" stroke=\"#F4D58C\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"14\" r=\"2.2\" fill=\"#FFF0C2\"/><circle cx=\"92\" cy=\"14\" r=\"2.2\" fill=\"#E6BE6C\"/><circle cx=\"36\" cy=\"114\" r=\"2.2\" fill=\"#9E7127\"/><circle cx=\"92\" cy=\"114\" r=\"2.2\" fill=\"#8C6120\"/><line x1=\"30\" y1=\"26\" x2=\"96\" y2=\"98\" stroke=\"url(#htf_relief)\" stroke-width=\"4.4\" stroke-linecap=\"round\"/><line x1=\"98\" y1=\"26\" x2=\"32\" y2=\"98\" stroke=\"url(#htf_relief)\" stroke-width=\"4.4\" stroke-linecap=\"round\"/><polygon points=\"24,20 38,27 30,35\" fill=\"#FFF2C6\" stroke=\"#470D0A\" stroke-width=\"1.5\"/><polygon points=\"104,20 98,35 90,27\" fill=\"#FFF2C6\" stroke=\"#470D0A\" stroke-width=\"1.5\"/><path d=\"M25 36 C16 46 18 61 30 68 L37 56 C30 52 29 43 34 37 Z\" fill=\"url(#htf_relief)\" stroke=\"#470D0A\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M103 36 C112 46 110 61 98 68 L91 56 C98 52 99 43 94 37 Z\" fill=\"url(#htf_relief)\" stroke=\"#470D0A\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M43 42 L64 34 L85 42 L83 74 C81 86 73 95 64 102 C55 95 47 86 45 74 Z\" fill=\"url(#htf_relief)\" stroke=\"#470D0A\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><path d=\"M50 47 L64 41 L78 47 L76 72 C75 81 70 88 64 93 C58 88 53 81 52 72 Z\" fill=\"#8B201B\" stroke=\"#F6DE9C\" stroke-width=\"1.8\"/><polygon points=\"64,53 73,65 64,77 55,65\" fill=\"url(#htf_relief)\" stroke=\"#470D0A\" stroke-width=\"1.8\"/><circle cx=\"64\" cy=\"65\" r=\"3.2\" fill=\"#FFF7DC\"/>\n</svg>",
  "faction_giang_nam": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"gn_bronze\" x1=\"12\" y1=\"12\" x2=\"116\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.48\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#6C4917\"/></linearGradient><radialGradient id=\"gn_jade\" cx=\"46\" cy=\"42\" r=\"68\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#34D399\"/><stop offset=\"0.52\" stop-color=\"#10B981\"/><stop offset=\"1\" stop-color=\"#064E3B\"/></radialGradient><linearGradient id=\"gn_relief\" x1=\"30\" y1=\"24\" x2=\"96\" y2=\"100\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF2C6\"/><stop offset=\"0.5\" stop-color=\"#E2B862\"/><stop offset=\"1\" stop-color=\"#8C6120\"/></linearGradient></defs><polygon points=\"34,10 94,10 118,34 118,94 94,118 34,118 10,94 10,34\" fill=\"url(#gn_bronze)\" stroke=\"#3A260B\" stroke-width=\"2.5\"/><polygon points=\"38,18 90,18 110,38 110,90 90,110 38,110 18,90 18,38\" fill=\"url(#gn_jade)\" stroke=\"#F4D58C\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"14\" r=\"2.2\" fill=\"#FFF0C2\"/><circle cx=\"92\" cy=\"14\" r=\"2.2\" fill=\"#E6BE6C\"/><circle cx=\"36\" cy=\"114\" r=\"2.2\" fill=\"#9E7127\"/><circle cx=\"92\" cy=\"114\" r=\"2.2\" fill=\"#8C6120\"/><path d=\"M56 76 C36 75 24 63 25 49 C38 50 49 58 56 76 Z\" fill=\"url(#gn_relief)\" stroke=\"#05392B\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M72 76 C92 75 104 63 103 49 C90 50 79 58 72 76 Z\" fill=\"url(#gn_relief)\" stroke=\"#05392B\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M60 76 C44 68 38 50 43 35 C55 42 61 56 60 76 Z\" fill=\"url(#gn_relief)\" stroke=\"#05392B\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M68 76 C84 68 90 50 85 35 C73 42 67 56 68 76 Z\" fill=\"url(#gn_relief)\" stroke=\"#05392B\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><path d=\"M64 25 C75 39 76 59 64 77 C52 59 53 39 64 25 Z\" fill=\"url(#gn_relief)\" stroke=\"#05392B\" stroke-width=\"2\" stroke-linejoin=\"round\"/><line x1=\"64\" y1=\"33\" x2=\"64\" y2=\"70\" stroke=\"#FFF8DE\" stroke-width=\"1.6\"/><path d=\"M26 86 Q45 78 64 86 Q83 94 102 86\" stroke=\"#FFF0C2\" stroke-width=\"3.6\" stroke-linecap=\"round\"/><path d=\"M34 96 Q50 90 64 96 Q78 102 94 96\" stroke=\"#E2B862\" stroke-width=\"3\" stroke-linecap=\"round\"/>\n</svg>",
  "faction_an_sat": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"as_bronze\" x1=\"12\" y1=\"12\" x2=\"116\" y2=\"116\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.48\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#6C4917\"/></linearGradient><radialGradient id=\"as_slate\" cx=\"46\" cy=\"42\" r=\"68\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#CBD5E1\"/><stop offset=\"0.46\" stop-color=\"#94A3B8\"/><stop offset=\"1\" stop-color=\"#252D3D\"/></radialGradient><linearGradient id=\"as_relief\" x1=\"30\" y1=\"24\" x2=\"96\" y2=\"100\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF2C6\"/><stop offset=\"0.52\" stop-color=\"#DFB45E\"/><stop offset=\"1\" stop-color=\"#875D1D\"/></linearGradient></defs><polygon points=\"34,10 94,10 118,34 118,94 94,118 34,118 10,94 10,34\" fill=\"url(#as_bronze)\" stroke=\"#3A260B\" stroke-width=\"2.5\"/><polygon points=\"38,18 90,18 110,38 110,90 90,110 38,110 18,90 18,38\" fill=\"url(#as_slate)\" stroke=\"#F4D58C\" stroke-width=\"2\"/><circle cx=\"36\" cy=\"14\" r=\"2.2\" fill=\"#FFF0C2\"/><circle cx=\"92\" cy=\"14\" r=\"2.2\" fill=\"#E6BE6C\"/><circle cx=\"36\" cy=\"114\" r=\"2.2\" fill=\"#9E7127\"/><circle cx=\"92\" cy=\"114\" r=\"2.2\" fill=\"#8C6120\"/><path d=\"M76 24 C47 23 26 45 29 73 C32 95 53 106 80 99 C58 97 44 82 45 63 C46 44 60 31 76 24 Z\" fill=\"url(#as_relief)\" stroke=\"#1B2230\" stroke-width=\"2.2\" stroke-linejoin=\"round\"/><polygon points=\"99,27 81,59 71,49\" fill=\"#FFF6D8\"/><polygon points=\"99,27 71,49 69,43\" fill=\"#C89B4B\"/><polygon points=\"99,27 81,59 69,47\" stroke=\"#1B2230\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><polygon points=\"65,42 86,63 80,66 62,48\" fill=\"url(#as_relief)\" stroke=\"#1B2230\" stroke-width=\"1.6\"/><line x1=\"72\" y1=\"56\" x2=\"61\" y2=\"67\" stroke=\"url(#as_relief)\" stroke-width=\"4\" stroke-linecap=\"round\"/><circle cx=\"56\" cy=\"72\" r=\"5.5\" fill=\"#252D3D\" stroke=\"url(#as_relief)\" stroke-width=\"2.6\"/><polygon points=\"85,72 88,79 95,82 88,85 85,92 82,85 75,82 82,79\" fill=\"#FFF2C6\" stroke=\"#1B2230\" stroke-width=\"1.3\"/>\n</svg>",
  "target_reticle_ring": "<svg width=\"256\" height=\"256\" viewBox=\"0 0 256 256\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><radialGradient id=\"tr_aura\" cx=\"128\" cy=\"128\" r=\"124\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#D99B26\" stop-opacity=\"0\"/><stop offset=\"0.60\" stop-color=\"#D99B26\" stop-opacity=\"0\"/><stop offset=\"0.76\" stop-color=\"#F2C86B\" stop-opacity=\"0.46\"/><stop offset=\"0.90\" stop-color=\"#D99B26\" stop-opacity=\"0.18\"/><stop offset=\"1\" stop-color=\"#D99B26\" stop-opacity=\"0\"/></radialGradient><linearGradient id=\"tr_gold\" x1=\"28\" y1=\"24\" x2=\"228\" y2=\"232\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF2C2\"/><stop offset=\"0.48\" stop-color=\"#DFB35B\"/><stop offset=\"1\" stop-color=\"#8F6320\"/></linearGradient></defs><circle cx=\"128\" cy=\"128\" r=\"124\" fill=\"url(#tr_aura)\"/><circle cx=\"128\" cy=\"128\" r=\"98\" stroke=\"url(#tr_gold)\" stroke-width=\"5.5\"/><circle cx=\"128\" cy=\"128\" r=\"85\" stroke=\"#F6DE9C\" stroke-width=\"2.2\" stroke-opacity=\"0.82\"/><line x1=\"74\" y1=\"46\" x2=\"80\" y2=\"55\" stroke=\"#F6DE9C\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"182\" y1=\"46\" x2=\"176\" y2=\"55\" stroke=\"#F6DE9C\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"210\" y1=\"74\" x2=\"201\" y2=\"80\" stroke=\"#E6BE6C\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"210\" y1=\"182\" x2=\"201\" y2=\"176\" stroke=\"#C89B4B\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"182\" y1=\"210\" x2=\"176\" y2=\"201\" stroke=\"#C89B4B\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"74\" y1=\"210\" x2=\"80\" y2=\"201\" stroke=\"#DFB35B\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"46\" y1=\"182\" x2=\"55\" y2=\"176\" stroke=\"#E6BE6C\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><line x1=\"46\" y1=\"74\" x2=\"55\" y2=\"80\" stroke=\"#FFF2C2\" stroke-width=\"2.5\" stroke-linecap=\"round\"/><polygon points=\"59,51 67,59 59,67 51,59\" fill=\"url(#tr_gold)\" stroke=\"#2A1C08\" stroke-width=\"1.6\"/><polygon points=\"197,51 205,59 197,67 189,59\" fill=\"url(#tr_gold)\" stroke=\"#2A1C08\" stroke-width=\"1.6\"/><polygon points=\"197,189 205,197 197,205 189,197\" fill=\"url(#tr_gold)\" stroke=\"#2A1C08\" stroke-width=\"1.6\"/><polygon points=\"59,189 67,197 59,205 51,197\" fill=\"url(#tr_gold)\" stroke=\"#2A1C08\" stroke-width=\"1.6\"/><polygon points=\"128,52 116,16 128,24\" fill=\"#FFF4CC\"/><polygon points=\"128,52 140,16 128,24\" fill=\"#B58330\"/><polygon points=\"128,52 140,16 128,24 116,16\" stroke=\"#2A1C08\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><polygon points=\"128,204 116,240 128,232\" fill=\"#E6BE6C\"/><polygon points=\"128,204 140,240 128,232\" fill=\"#8C601E\"/><polygon points=\"128,204 140,240 128,232 116,240\" stroke=\"#2A1C08\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><polygon points=\"52,128 16,116 24,128\" fill=\"#FFF4CC\"/><polygon points=\"52,128 16,140 24,128\" fill=\"#B58330\"/><polygon points=\"52,128 16,140 24,128 16,116\" stroke=\"#2A1C08\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/><polygon points=\"204,128 240,116 232,128\" fill=\"#E6BE6C\"/><polygon points=\"204,128 240,140 232,128\" fill=\"#8C601E\"/><polygon points=\"204,128 240,140 232,128 240,116\" stroke=\"#2A1C08\" stroke-width=\"1.8\" stroke-linejoin=\"round\"/>\n</svg>",
  "arrow_head_silk": "<svg width=\"128\" height=\"128\" viewBox=\"0 0 128 128\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"ah_left\" x1=\"36\" y1=\"8\" x2=\"64\" y2=\"96\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF5CF\"/><stop offset=\"0.55\" stop-color=\"#E5BB66\"/><stop offset=\"1\" stop-color=\"#A8782B\"/></linearGradient><linearGradient id=\"ah_right\" x1=\"64\" y1=\"8\" x2=\"92\" y2=\"96\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#E5BB66\"/><stop offset=\"0.55\" stop-color=\"#B58332\"/><stop offset=\"1\" stop-color=\"#6B4815\"/></linearGradient><linearGradient id=\"ah_wing\" x1=\"18\" y1=\"62\" x2=\"110\" y2=\"96\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.5\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#7A5318\"/></linearGradient></defs><path d=\"M64 66 L18 88 L34 68 L52 58 Z\" fill=\"url(#ah_wing)\" stroke=\"#261807\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M64 66 L110 88 L94 68 L76 58 Z\" fill=\"url(#ah_wing)\" stroke=\"#261807\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M48 92 L80 92 L85 114 L64 120 L43 114 Z\" fill=\"url(#ah_wing)\" stroke=\"#261807\" stroke-width=\"2.2\" stroke-linejoin=\"miter\"/><rect x=\"52\" y=\"102\" width=\"24\" height=\"6\" rx=\"2\" fill=\"#1D150D\" stroke=\"#F6DE9C\" stroke-width=\"1.4\"/><polygon points=\"64,8 41,72 64,96\" fill=\"url(#ah_left)\"/><polygon points=\"64,8 87,72 64,96\" fill=\"url(#ah_right)\"/><polygon points=\"64,8 87,72 64,96 41,72\" stroke=\"#261807\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><line x1=\"64\" y1=\"10\" x2=\"64\" y2=\"94\" stroke=\"#FFF8DE\" stroke-width=\"1.8\"/><polygon points=\"64,54 72,68 64,82 56,68\" fill=\"#C83E37\" stroke=\"#FFF0C2\" stroke-width=\"1.8\"/>\n</svg>",
  "action_button_primary_9slice": "<svg width=\"360\" height=\"96\" viewBox=\"0 0 360 96\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><defs><linearGradient id=\"ab_bronze_v\" x1=\"180\" y1=\"2\" x2=\"180\" y2=\"94\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#F6DE9C\"/><stop offset=\"0.18\" stop-color=\"#D4A653\"/><stop offset=\"0.82\" stop-color=\"#9E7027\"/><stop offset=\"1\" stop-color=\"#6B4815\"/></linearGradient><linearGradient id=\"ab_lacquer_v\" x1=\"180\" y1=\"10\" x2=\"180\" y2=\"86\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#CC4038\"/><stop offset=\"0.18\" stop-color=\"#B02E28\"/><stop offset=\"0.82\" stop-color=\"#8A1E19\"/><stop offset=\"1\" stop-color=\"#661410\"/></linearGradient><linearGradient id=\"ab_corner_tl\" x1=\"2\" y1=\"2\" x2=\"32\" y2=\"32\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#FFF4CC\"/><stop offset=\"1\" stop-color=\"#C89B4B\"/></linearGradient><linearGradient id=\"ab_corner_br\" x1=\"328\" y1=\"64\" x2=\"358\" y2=\"94\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#C89B4B\"/><stop offset=\"1\" stop-color=\"#6E4A16\"/></linearGradient></defs><polygon points=\"18,2 342,2 358,18 358,78 342,94 18,94 2,78 2,18\" fill=\"url(#ab_bronze_v)\" stroke=\"#241607\" stroke-width=\"2\"/><polygon points=\"22,9 338,9 351,22 351,74 338,87 22,87 9,74 9,22\" fill=\"url(#ab_lacquer_v)\" stroke=\"#4E0F0B\" stroke-width=\"1.6\"/><line x1=\"25\" y1=\"12\" x2=\"335\" y2=\"12\" stroke=\"#F79B94\" stroke-width=\"1.2\" stroke-opacity=\"0.45\"/><polygon points=\"25,14 335,14 347,26 347,70 335,82 25,82 13,70 13,26\" stroke=\"#E8C274\" stroke-width=\"1.2\" stroke-opacity=\"0.68\"/><path d=\"M2,18 L18,2 L30,2 L30,8 L20,8 L8,20 L8,30 L2,30 Z\" fill=\"url(#ab_corner_tl)\"/><polygon points=\"14,14 27,14 27,18 18,18 18,27 14,27\" fill=\"#FFF0C2\"/><circle cx=\"24\" cy=\"24\" r=\"2.4\" fill=\"#FFF4CC\" stroke=\"#4D120E\" stroke-width=\"1\"/>\n <path d=\"M358,18 L342,2 L330,2 L330,8 L340,8 L352,20 L352,30 L358,30 Z\" fill=\"#E6BE6C\"/><polygon points=\"346,14 333,14 333,18 342,18 342,27 346,27\" fill=\"#E6BE6C\"/><circle cx=\"336\" cy=\"24\" r=\"2.4\" fill=\"#F5DA96\" stroke=\"#4D120E\" stroke-width=\"1\"/>\n <path d=\"M2,78 L18,94 L30,94 L30,88 L20,88 L8,76 L8,66 L2,66 Z\" fill=\"#B98836\"/><polygon points=\"14,82 27,82 27,78 18,78 18,69 14,69\" fill=\"#D4A653\"/><circle cx=\"24\" cy=\"72\" r=\"2.4\" fill=\"#DFB35B\" stroke=\"#4D120E\" stroke-width=\"1\"/>\n <path d=\"M358,78 L342,94 L330,94 L330,88 L340,88 L352,76 L352,66 L358,66 Z\" fill=\"url(#ab_corner_br)\"/><polygon points=\"346,82 333,82 333,78 342,78 342,69 346,69\" fill=\"#B98836\"/><circle cx=\"336\" cy=\"72\" r=\"2.4\" fill=\"#C89B4B\" stroke=\"#4D120E\" stroke-width=\"1\"/>\n</svg>"
};

const SPECS = [
  { key: "suit_spade", w: 128, h: 128, desc: "Chất Bích Mặc Kiếm (#1D150D viền kim mảnh) — 128x128 transparent PNG" },
  { key: "suit_club", w: 128, h: 128, desc: "Chất Chuồn Thiết Mai (#1D150D viền kim mảnh) — 128x128 transparent PNG" },
  { key: "suit_heart", w: 128, h: 128, desc: "Chất Cơ Chu Sa (#B8322A viền vàng đồng) — 128x128 transparent PNG" },
  { key: "suit_diamond", w: 128, h: 128, desc: "Chất Rô Ngọc Chu Sa (#C83E37 viền vàng đồng) — 128x128 transparent PNG" },
  { key: "faction_thien_kiem", w: 128, h: 128, desc: "Ấn Triện Thiên Kiếm Các (Lam ngọc #3B82F6 + kiếm phong vàng đồng, 0 chữ)" },
  { key: "faction_huyen_thiet", w: 128, h: 128, desc: "Ấn Triện Huyền Thiết Doanh (Chu sa #C83E37 + thuẫn kích vàng đồng, 0 chữ)" },
  { key: "faction_giang_nam", w: 128, h: 128, desc: "Ấn Triện Giang Nam Liên Minh (Lục bích #10B981 + liên hoa thủy ba vàng đồng, 0 chữ)" },
  { key: "faction_an_sat", w: 128, h: 128, desc: "Ấn Triện Ẩn Sát Đường (Bạc tím trầm #94A3B8 + nguyệt nhận phi đao vàng đồng, 0 chữ)" },
  { key: "target_reticle_ring", w: 256, h: 256, desc: "Vòng La Bàn Kiếm Khí Vàng Đồng Phát Sáng — 256x256 transparent PNG" },
  { key: "arrow_head_silk", w: 128, h: 128, desc: "Mũi Kiếm Vàng Đồng Gắn Đầu Dải Lụa Nhắm Mục Tiêu — 128x128 transparent PNG" },
  { key: "action_button_primary_9slice", w: 360, h: 96, desc: "Lệnh Bài Sơn Mài Chu Sa Bát Giác Nẹp Đồng 9-Slice [32,32,32,32] — 360x96 transparent PNG (0 chữ)" },
];

const libFrame = figma.createAutoLayout("HORIZONTAL", { name: "Wuxia_Component_Source_Library", itemSpacing: 32 });
libFrame.paddingLeft = 32; libFrame.paddingRight = 32; libFrame.paddingTop = 32; libFrame.paddingBottom = 32;
libFrame.fills = [solid("#0E1014")];
libFrame.strokes = [solid("#C89B4B", 0.35)];
libFrame.strokeWeight = 1;
page.appendChild(libFrame);
libFrame.x = startX;
libFrame.y = 100;
createdNodeIds.push(libFrame.id);

const components = {};
const exportTargets = [];

for (const spec of SPECS) {
  const comp = figma.createComponent();
  comp.name = spec.key;
  comp.description = spec.desc;
  comp.resize(spec.w, spec.h);
  comp.fills = [];
  comp.clipsContent = true;

  const svgFrame = figma.createNodeFromSvg(SVGS[spec.key]);
  svgFrame.name = spec.key + "_vector";
  svgFrame.fills = [];
  svgFrame.resize(spec.w, spec.h);
  svgFrame.x = 0;
  svgFrame.y = 0;
  comp.appendChild(svgFrame);

  comp.exportSettings = [{
    format: "PNG",
    contentsOnly: true,
    useAbsoluteBounds: true,
    constraint: { type: "SCALE", value: 1 },
  }];

  libFrame.appendChild(comp);
  components[spec.key] = comp;
  createdNodeIds.push(comp.id, svgFrame.id);
  exportTargets.push({
    fileName: spec.key + ".png",
    nodeId: comp.id,
    width: spec.w,
    height: spec.h,
  });
}

// Helper for crisp text nodes (strictly >= 15px everywhere!)
function makeText(str, sizePx, font, hexColor, opts = {}) {
  const t = figma.createText();
  t.fontName = font;
  t.fontSize = Math.max(15, sizePx);
  t.characters = str;
  t.fills = [solid(hexColor, opts.opacity ?? 1)];
  if (opts.lineHeightPx) t.lineHeight = { unit: "PIXELS", value: opts.lineHeightPx };
  if (opts.letterSpacingPx) t.letterSpacing = { unit: "PIXELS", value: opts.letterSpacingPx };
  if (opts.align) t.textAlignHorizontal = opts.align;
  if (opts.width) {
    t.resize(opts.width, t.height);
    t.textAutoResize = "HEIGHT";
  }
  createdNodeIds.push(t.id);
  return t;
}

// Helper for Wuxia chamfered / double-bordered frame (zero SaaS pills!)
function makeLacquerPlaque(name, x, y, w, h, bgHex, borderHex, strokeW = 2, radius = 4) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.x = x;
  f.y = y;
  f.cornerRadius = radius;
  f.fills = [solid(bgHex)];
  f.strokes = [solid(borderHex)];
  f.strokeWeight = strokeW;
  f.strokeAlign = "INSIDE";
  f.effects = [{
    type: "DROP_SHADOW",
    color: { r: 0, g: 0, b: 0, a: 0.55 },
    offset: { x: 3, y: 5 },
    radius: 12,
    spread: 0,
    visible: true,
    blendMode: "NORMAL",
  }];
  createdNodeIds.push(f.id);
  return f;
}

// ============================================================================
// 7. SHOWCASE BOARD (Combines 11-Icon Kit Instances + 1920x1080 Master Layout)
// ============================================================================
const showcase = figma.createAutoLayout("VERTICAL", { name: "Figma_Master_Board_Showcase", itemSpacing: 28 });
showcase.paddingLeft = 40; showcase.paddingRight = 40; showcase.paddingTop = 36; showcase.paddingBottom = 40;
showcase.fills = [solid("#07080A")];
showcase.strokes = [solid("#C89B4B", 0.5)];
showcase.strokeWeight = 2;
page.appendChild(showcase);
showcase.x = startX;
showcase.y = 480;
createdNodeIds.push(showcase.id);

// 7A. Header & 11-Component Instance Kit Strip
const kitHeader = figma.createAutoLayout("VERTICAL", { name: "UI_Kit_Showcase_Section", itemSpacing: 16 });
kitHeader.fills = [solid("#111318")];
kitHeader.strokes = [solid("#C89B4B", 0.45)];
kitHeader.strokeWeight = 1.5;
kitHeader.paddingLeft = 28; kitHeader.paddingRight = 28; kitHeader.paddingTop = 20; kitHeader.paddingBottom = 24;
showcase.appendChild(kitHeader);
kitHeader.resize(1920, 100);
kitHeader.layoutSizingHorizontal = "FIXED";
kitHeader.layoutSizingVertical = "HUG";
createdNodeIds.push(kitHeader.id);

const kitTitleRow = figma.createAutoLayout("HORIZONTAL", { name: "Kit_Title_Row", itemSpacing: 24 });
kitTitleRow.fills = [];
kitTitleRow.counterAxisAlignItems = "CENTER";
kitTitleRow.appendChild(makeText("CỬU CHÂU ẨN KIẾM — BỘ VECTOR KIẾM HIỆP CỔ PHONG & SƠ ĐỒ BÀN ĐẤU 2.5D (1920×1080)", 22, fontSerifBold, "#EFE6D5"));
kitTitleRow.appendChild(makeText("Unity 6 uGUI · ScreenSpace-Camera · 9-Slice · Sàn chữ >= 15px · Ánh sáng 35° Trái-Trên", 16, fontSansSemi, "#C89B4B"));
kitHeader.appendChild(kitTitleRow);
createdNodeIds.push(kitTitleRow.id);

const kitRow = figma.createAutoLayout("HORIZONTAL", { name: "Kit_Instances_Row", itemSpacing: 18 });
kitRow.fills = [];
kitRow.counterAxisAlignItems = "CENTER";
kitHeader.appendChild(kitRow);
createdNodeIds.push(kitRow.id);

const KIT_LABELS = [
  ["suit_spade", "Bích Mặc", "#DEC79C", "#1D150D", 76, 76],
  ["suit_club", "Chuồn Mai", "#DEC79C", "#1D150D", 76, 76],
  ["suit_heart", "Cơ Chu Sa", "#DEC79C", "#1D150D", 76, 76],
  ["suit_diamond", "Rô Ngọc", "#DEC79C", "#1D150D", 76, 76],
  ["faction_thien_kiem", "Thiên Kiếm", "#181B20", "#EFE6D5", 80, 80],
  ["faction_huyen_thiet", "Huyền Thiết", "#181B20", "#EFE6D5", 80, 80],
  ["faction_giang_nam", "Giang Nam", "#181B20", "#EFE6D5", 80, 80],
  ["faction_an_sat", "Ẩn Sát", "#181B20", "#EFE6D5", 80, 80],
  ["target_reticle_ring", "La Bàn Nhắm", "#181B20", "#EFE6D5", 92, 92],
  ["arrow_head_silk", "Mũi Kiếm Lụa", "#181B20", "#EFE6D5", 80, 80],
  ["action_button_primary_9slice", "Lệnh Bài 9-Slice [32px]", "#181B20", "#EFE6D5", 280, 75],
];

for (const [key, label, tileBg, textHex, iw, ih] of KIT_LABELS) {
  const cell = figma.createAutoLayout("VERTICAL", { name: "Cell_" + key, itemSpacing: 8 });
  cell.counterAxisAlignItems = "CENTER";
  cell.paddingLeft = 10; cell.paddingRight = 10; cell.paddingTop = 10; cell.paddingBottom = 10;
  cell.fills = [solid(tileBg)];
  cell.strokes = [solid("#C89B4B", 0.55)];
  cell.strokeWeight = 1.2;
  cell.cornerRadius = 4;

  const inst = components[key].createInstance();
  inst.resize(iw, ih);
  cell.appendChild(inst);
  cell.appendChild(makeText(label, 15, fontSansBold, textHex));
  kitRow.appendChild(cell);
  createdNodeIds.push(cell.id, inst.id);
}

// ============================================================================
// 7B. MASTER ARENA FRAME — EXACT 1920x1080 UNITY 6 2.5D TABLE LAYOUT
// ============================================================================
const arena = figma.createFrame();
arena.name = "Master_Arena_1920x1080";
arena.resize(1920, 1080);
arena.clipsContent = true;
arena.fills = [solid("#090807")];
arena.strokes = [solid("#C89B4B", 0.8)];
arena.strokeWeight = 2;
showcase.appendChild(arena);
createdNodeIds.push(arena.id);

// Recessed 2.5D Ebony & Basalt Strategy Table + Carved Bronze Dragon Compass Ring
const tableSurface = figma.createFrame();
tableSurface.name = "Table_Board_25D_Surface";
tableSurface.resize(1872, 1032);
tableSurface.x = 24;
tableSurface.y = 24;
tableSurface.cornerRadius = 8;
tableSurface.fills = [{
  type: "GRADIENT_RADIAL",
  gradientStops: [
    { color: { r: 0.09, g: 0.11, b: 0.15, a: 1 }, position: 0 },
    { color: { r: 0.06, g: 0.07, b: 0.09, a: 1 }, position: 0.72 },
    { color: { r: 0.04, g: 0.03, b: 0.03, a: 1 }, position: 1 },
  ],
  gradientTransform: [[0.65, 0, 0.18], [0, 0.75, 0.12]],
}];
tableSurface.strokes = [solid("#7C5828", 0.65)];
tableSurface.strokeWeight = 3;
arena.appendChild(tableSurface);
createdNodeIds.push(tableSurface.id);

// Corner Warm Brazier Firelight Cues (35-deg warm ambiance)
for (const [bx, by] of [[-120, -120], [1640, -120], [-120, 780], [1640, 780]]) {
  const glow = figma.createEllipse();
  glow.name = "Brazier_Warm_Rim";
  glow.resize(400, 400);
  glow.x = bx;
  glow.y = by;
  glow.fills = [{
    type: "GRADIENT_RADIAL",
    gradientStops: [
      { color: { r: 0.85, g: 0.45, b: 0.15, a: 0.18 }, position: 0 },
      { color: { r: 0.85, g: 0.45, b: 0.15, a: 0 }, position: 1 },
    ],
    gradientTransform: [[0.5, 0, 0.25], [0, 0.5, 0.25]],
  }];
  tableSurface.appendChild(glow);
  createdNodeIds.push(glow.id);
}

// Central Engraved Bronze Dragon-Cloud Ring (~36% height radius = 388px -> 776x620 perspective oval)
const dragonRingOuter = figma.createEllipse();
dragonRingOuter.name = "Carved_Bronze_Dragon_Compass";
dragonRingOuter.resize(780, 560);
dragonRingOuter.x = 570;
dragonRingOuter.y = 190;
dragonRingOuter.fills = [];
dragonRingOuter.strokes = [solid("#C89B4B", 0.22)];
dragonRingOuter.strokeWeight = 4;
arena.appendChild(dragonRingOuter);

const dragonRingInner = figma.createEllipse();
dragonRingInner.name = "Carved_Bronze_Inner_Ring";
dragonRingInner.resize(660, 468);
dragonRingInner.x = 630;
dragonRingInner.y = 236;
dragonRingInner.fills = [];
dragonRingInner.strokes = [solid("#C89B4B", 0.12)];
dragonRingInner.strokeWeight = 2;
arena.appendChild(dragonRingInner);
createdNodeIds.push(dragonRingOuter.id, dragonRingInner.id);

// Top-Left Compact Match Plaque (Zero SaaS Header Bar)
const topLeftPlaque = makeLacquerPlaque("TopLeft_Match_Plaque", 32, 24, 448, 52, "#16120F", "#C89B4B", 2, 4);
topLeftPlaque.layoutMode = "HORIZONTAL";
topLeftPlaque.counterAxisAlignItems = "CENTER";
topLeftPlaque.itemSpacing = 14;
topLeftPlaque.paddingLeft = 18; topLeftPlaque.paddingRight = 18;
topLeftPlaque.appendChild(makeText("BÀN #K9M2P4", 18, fontSerifBold, "#EFE6D5"));
topLeftPlaque.appendChild(makeText("· VÒNG 3 ·", 16, fontSansSemi, "#C89B4B"));
topLeftPlaque.appendChild(makeText("RÚT: 54", 22, fontMonoBold, "#F6DE9C"));
arena.appendChild(topLeftPlaque);

// Top-Right HUD — STRICTLY 2 Bronze Octagonal Seals >= 48x48px (64x64px each!)
function makeBronzeHudSeal(name, x, y, titleStr, glyphSvg) {
  const wrap = figma.createAutoLayout("VERTICAL", { name, itemSpacing: 4 });
  wrap.counterAxisAlignItems = "CENTER";
  wrap.fills = [];
  const sealBtn = figma.createFrame();
  sealBtn.name = name + "_Hitbox_64x64";
  sealBtn.resize(64, 64);
  sealBtn.cornerRadius = 10;
  sealBtn.fills = [solid("#1B140E")];
  sealBtn.strokes = [solid("#DFB45E")];
  sealBtn.strokeWeight = 2.5;
  const g = figma.createNodeFromSvg(glyphSvg);
  g.fills = [];
  g.resize(40, 40);
  g.x = 12; g.y = 12;
  sealBtn.appendChild(g);
  wrap.appendChild(sealBtn);
  wrap.appendChild(makeText(titleStr, 15, fontSansBold, "#EFE6D5"));
  arena.appendChild(wrap);
  wrap.x = x;
  wrap.y = y;
  createdNodeIds.push(wrap.id, sealBtn.id, g.id);
}

makeBronzeHudSeal(
  "HUD_Seal_BattleLog",
  1718,
  20,
  "Chiến Báo (N)",
  '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="6" width="24" height="28" rx="2" fill="#2A1E12" stroke="#F6DE9C" stroke-width="2.5"/><line x1="13" y1="14" x2="27" y2="14" stroke="#F6DE9C" stroke-width="2.4"/><line x1="13" y1="20" x2="27" y2="20" stroke="#DFB45E" stroke-width="2.4"/><line x1="13" y1="26" x2="22" y2="26" stroke="#C89B4B" stroke-width="2.4"/></svg>'
);
makeBronzeHudSeal(
  "HUD_Seal_SettingsEsc",
  1812,
  20,
  "Thiết Lập (Esc)",
  '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="9" fill="#2A1E12" stroke="#F6DE9C" stroke-width="2.8"/><circle cx="20" cy="20" r="3.5" fill="#F6DE9C"/><line x1="20" y1="5" x2="20" y2="10" stroke="#F6DE9C" stroke-width="3"/><line x1="20" y1="30" x2="20" y2="35" stroke="#F6DE9C" stroke-width="3"/><line x1="5" y1="20" x2="10" y2="20" stroke="#F6DE9C" stroke-width="3"/><line x1="30" y1="20" x2="35" y2="20" stroke="#F6DE9C" stroke-width="3"/></svg>'
);

// Helper: Opponent Diegetic Ebony Command Plaque (Seats #2..#8, Zero Box-in-Box!)
const OPPONENT_SEATS = [
  { seat: 2, x: 40, y: 508, hero: "Lãnh Nguyệt Hàn", faction: "faction_an_sat", hp: 3, maxHp: 3, hand: 3, dist: "KC 1", valid: false, role: "Ẩn Danh" },
  { seat: 3, x: 40, y: 264, hero: "Thiết Chấn Sơn", faction: "faction_huyen_thiet", hp: 4, maxHp: 4, hand: 4, dist: "KC 2", valid: false, role: "Ẩn Danh" },
  { seat: 4, x: 356, y: 48, hero: "Tô Nhược Thủy", faction: "faction_giang_nam", hp: 2, maxHp: 3, hand: 2, dist: "KC 3", valid: false, role: "Ẩn Danh" },
  { seat: 5, x: 846, y: 36, hero: "Độc Cô Liệt", faction: "faction_huyen_thiet", hp: 3, maxHp: 4, hand: 2, dist: "KC 1 · TẦM TRẢM", valid: true, role: "Mục Tiêu Hợp Lệ" },
  { seat: 6, x: 1336, y: 48, hero: "Bạch Vân Phi", faction: "faction_thien_kiem", hp: 4, maxHp: 4, hand: 5, dist: "KC 3", valid: false, role: "Ẩn Danh" },
  { seat: 7, x: 1652, y: 264, hero: "Thẩm Thanh Ca", faction: "faction_giang_nam", hp: 3, maxHp: 3, hand: 3, dist: "KC 2", valid: false, role: "Ẩn Danh" },
  { seat: 8, x: 1652, y: 508, hero: "Dạ Vô Ngân", faction: "faction_an_sat", hp: 1, maxHp: 3, hand: 1, dist: "KC 1", valid: false, role: "Ẩn Danh" },
];

for (const s of OPPONENT_SEATS) {
  if (s.valid) {
    // Valid Target Reticle Ring (256x256 instance) glowing behind/around Seat #5
    const reticle = components.target_reticle_ring.createInstance();
    reticle.name = "ValidTarget_Reticle_Seat5";
    reticle.resize(256, 256);
    reticle.x = s.x + 114 - 128;
    reticle.y = s.y + 71 - 128;
    arena.appendChild(reticle);
    createdNodeIds.push(reticle.id);
  }

  const plaque = makeLacquerPlaque(
    `Seat_${s.seat}_${s.hero}`,
    s.x,
    s.y,
    228,
    142,
    "#16120F",
    s.valid ? "#F6DE9C" : "#C89B4B",
    s.valid ? 3 : 1.8,
    6
  );
  arena.appendChild(plaque);

  // Subtle right-side portrait silhouette gradient block
  const portraitTint = figma.createRectangle();
  portraitTint.name = "Portrait_Bleed_Slot";
  portraitTint.resize(96, 134);
  portraitTint.x = 128;
  portraitTint.y = 4;
  portraitTint.cornerRadius = 4;
  portraitTint.fills = [solid(s.valid ? "#3A1714" : "#222733")];
  plaque.appendChild(portraitTint);
  createdNodeIds.push(portraitTint.id);

  // Faction Seal Instance (36x36)
  const fInst = components[s.faction].createInstance();
  fInst.resize(36, 36);
  fInst.x = 10;
  fInst.y = 10;
  plaque.appendChild(fInst);
  createdNodeIds.push(fInst.id);

  // Hero Name (18px Bold) + Distance/Role (15px SemiBold)
  const nameTxt = makeText(s.hero, 18, fontSerifBold, "#EFE6D5");
  nameTxt.x = 52; nameTxt.y = 10;
  plaque.appendChild(nameTxt);

  const distTxt = makeText(s.dist, 15, fontSansBold, s.valid ? "#F6DE9C" : "#C89B4B");
  distTxt.x = 52; distTxt.y = 33;
  plaque.appendChild(distTxt);

  // HP Jade Orbs + Numeric Readout (24px Mono Bold)
  for (let i = 0; i < s.maxHp; i++) {
    const orb = figma.createEllipse();
    orb.resize(16, 16);
    orb.x = 14 + i * 21;
    orb.y = 66;
    const hpColor = i < s.hp ? (s.hp === 1 ? "#C83E37" : "#10B981") : "#2A241E";
    orb.fills = [solid(hpColor)];
    orb.strokes = [solid("#C89B4B")];
    orb.strokeWeight = 1.5;
    plaque.appendChild(orb);
    createdNodeIds.push(orb.id);
  }
  const hpNum = makeText(`${s.hp}/${s.maxHp}`, 24, fontMonoBold, "#EFE6D5");
  hpNum.x = 104; hpNum.y = 58;
  plaque.appendChild(hpNum);

  // Bottom Row: Hand Card Count (24px) + Circular Equipment Medallions (28x28, zero 8px text strips!)
  const handTxt = makeText(`Bài: ${s.hand}`, 18, fontSansBold, "#DEC79C");
  handTxt.x = 14; handTxt.y = 104;
  plaque.appendChild(handTxt);

  for (let m = 0; m < 2; m++) {
    const med = figma.createEllipse();
    med.name = "Equip_Medallion";
    med.resize(28, 28);
    med.x = 154 + m * 32;
    med.y = 102;
    med.fills = [solid("#1E1812")];
    med.strokes = [solid("#DFB45E")];
    med.strokeWeight = 1.6;
    plaque.appendChild(med);
    createdNodeIds.push(med.id);
  }
}

// ============================================================================
// 7C. SEAT #1 — LOCAL HERO CLUSTER (Bottom-Left Corner: 32, 740, 368x308)
// ============================================================================
const localHero = makeLacquerPlaque("Seat_1_LocalHero_TrieuThienHanh", 32, 740, 368, 308, "#16120F", "#DFB45E", 2.5, 6);
arena.appendChild(localHero);

const heroArtSlot = figma.createFrame();
heroArtSlot.name = "Hero_25D_Layered_Portrait_Slot_800x1040";
heroArtSlot.resize(192, 250);
heroArtSlot.x = 14;
heroArtSlot.y = 44;
heroArtSlot.cornerRadius = 4;
heroArtSlot.fills = [{
  type: "GRADIENT_LINEAR",
  gradientStops: [
    { color: { r: 0.14, g: 0.22, b: 0.36, a: 1 }, position: 0 },
    { color: { r: 0.07, g: 0.09, b: 0.14, a: 1 }, position: 1 },
  ],
  gradientTransform: [[0, 1, 0], [-1, 0, 1]],
}];
heroArtSlot.strokes = [solid("#C89B4B", 0.7)];
heroArtSlot.strokeWeight = 1.8;
localHero.appendChild(heroArtSlot);
createdNodeIds.push(heroArtSlot.id);

const heroPoseNote = makeText("Chân dung 2.5D\nTriệu Thiên Hành\n(Góc 3/4 · Tách BG/FG)", 16, fontSansSemi, "#EFE6D5", { align: "CENTER", width: 172, lineHeightPx: 22 });
heroPoseNote.x = 10; heroPoseNote.y = 92;
heroArtSlot.appendChild(heroPoseNote);

const selfFaction = components.faction_thien_kiem.createInstance();
selfFaction.resize(48, 48);
selfFaction.x = 10;
selfFaction.y = 8;
localHero.appendChild(selfFaction);
createdNodeIds.push(selfFaction.id);

const selfName = makeText("Triệu Thiên Hành", 20, fontSerifBold, "#EFE6D5");
selfName.x = 66; selfName.y = 10;
localHero.appendChild(selfName);

const selfRole = makeText("CHỦ TỌA · 4/4 SINH LỰC", 15, fontSansBold, "#F6DE9C");
selfRole.x = 216; selfRole.y = 46;
localHero.appendChild(selfRole);

// 4 Jade HP Orbs + 28px Numeric Readout
for (let i = 0; i < 4; i++) {
  const orb = figma.createEllipse();
  orb.resize(24, 24);
  orb.x = 218 + i * 32;
  orb.y = 74;
  orb.fills = [solid("#10B981")];
  orb.strokes = [solid("#F6DE9C")];
  orb.strokeWeight = 2;
  localHero.appendChild(orb);
  createdNodeIds.push(orb.id);
}

// 2x2 Open Equipment Medallion Slots (Weapon / Armor / +1 / -1)
const EQUIP_SLOTS = [
  [" Thanh Sương", 218, 118],
  [" Hộ Tâm Giáp", 288, 118],
  [" Tuyệt Ảnh +1", 218, 198],
  [" Truy Phong -1", 288, 198],
];
for (const [eqLabel, ex, ey] of EQUIP_SLOTS) {
  const slot = makeLacquerPlaque("EquipSlot_" + eqLabel.trim(), ex, ey, 64, 68, "#1E1915", "#C89B4B", 1.5, 4);
  const st = makeText(eqLabel.trim(), 15, fontSansSemi, "#DEC79C", { align: "CENTER", width: 60, lineHeightPx: 18 });
  st.x = 2; st.y = 16;
  slot.appendChild(st);
  localHero.appendChild(slot);
}

// ============================================================================
// 7D. CENTER TABLE ZONE + SILK TARGETING CURVE & ARROWHEAD TO SEAT #5
// ============================================================================
const turnBanner = makeLacquerPlaque("Center_Turn_Phase_Plaque", 696, 254, 528, 56, "#18130F", "#DFB45E", 2, 6);
turnBanner.layoutMode = "HORIZONTAL";
turnBanner.primaryAxisAlignItems = "CENTER";
turnBanner.counterAxisAlignItems = "CENTER";
turnBanner.itemSpacing = 16;
turnBanner.appendChild(makeText("LƯỢT CỦA BẠN — PHA XUẤT CHIÊU", 19, fontSerifBold, "#EFE6D5"));
turnBanner.appendChild(makeText("25s", 28, fontMonoBold, "#F6DE9C"));
arena.appendChild(turnBanner);

// Draw Pile & Recently Played Card
const drawStack = makeLacquerPlaque("Center_Draw_Pile", 736, 352, 124, 172, "#132238", "#C89B4B", 2, 6);
const drawLabel = makeText("Cửu Châu\nChồng Rút\n54", 18, fontSerifBold, "#F6DE9C", { align: "CENTER", width: 108, lineHeightPx: 24 });
drawLabel.x = 8; drawLabel.y = 48;
drawStack.appendChild(drawLabel);
arena.appendChild(drawStack);

const playedCard = makeLacquerPlaque("Center_Last_Played_Card", 896, 344, 136, 190, "#DEC79C", "#C89B4B", 2.2, 6);
const pcSuit = components.suit_heart.createInstance();
pcSuit.resize(28, 28); pcSuit.x = 10; pcSuit.y = 34;
playedCard.appendChild(pcSuit);
const pcRank = makeText("Q", 24, fontMonoBold, "#B8322A");
pcRank.x = 12; pcRank.y = 6;
playedCard.appendChild(pcRank);
const pcArt = figma.createRectangle();
pcArt.resize(116, 102); pcArt.x = 10; pcArt.y = 46; pcArt.cornerRadius = 3;
pcArt.fills = [solid("#2A1B17")];
playedCard.appendChild(pcArt);
const pcName = makeText("Linh Đan", 18, fontSerifBold, "#1D150D", { align: "CENTER", width: 120 });
pcName.x = 8; pcName.y = 156;
playedCard.appendChild(pcName);
arena.appendChild(playedCard);
createdNodeIds.push(pcSuit.id, pcArt.id);

// Crimson-Gold Silk Targeting Curve from Hovered Card (882, 676) up to Valid Target Seat #5 (960, 178)
const silkCurveSvg = figma.createNodeFromSvg(
  '<svg width="220" height="520" viewBox="0 0 220 520" fill="none" xmlns="http://www.w3.org/2000/svg">' +
  '<path d="M52 504 C38 350 96 220 130 48" stroke="#C83E37" stroke-width="10" stroke-opacity="0.45" stroke-linecap="round"/>' +
  '<path d="M52 504 C38 350 96 220 130 48" stroke="#F6DE9C" stroke-width="4" stroke-linecap="round"/>' +
  '</svg>'
);
silkCurveSvg.name = "Silk_Targeting_Ribbon_Bezier";
silkCurveSvg.fills = [];
silkCurveSvg.x = 830;
silkCurveSvg.y = 178;
arena.appendChild(silkCurveSvg);

const arrowHead = components.arrow_head_silk.createInstance();
arrowHead.name = "Silk_Targeting_ArrowHead_Instance";
arrowHead.resize(84, 84);
arrowHead.x = 918;
arrowHead.y = 148;
arena.appendChild(arrowHead);
createdNodeIds.push(silkCurveSvg.id, arrowHead.id);

// ============================================================================
// 7E. BOTTOM CURVED HAND ARC (130x185 Resting Cards) + 1.75x HOVER ZOOM + SILK SCROLL
// ============================================================================
function buildRestingHandCard(idx, x, y, rotDeg, rankStr, suitKey, rankHex, titleStr) {
  const card = makeLacquerPlaque(`HandCard_${idx}_${titleStr}`, x, y, 130, 185, "#DEC79C", "#7C5828", 2.2, 6);
  card.rotation = rotDeg;

  const artRect = figma.createRectangle();
  artRect.resize(112, 108);
  artRect.x = 9;
  artRect.y = 36;
  artRect.cornerRadius = 3;
  artRect.fills = [solid("#1E1814")];
  card.appendChild(artRect);

  const rankBadge = figma.createFrame();
  rankBadge.resize(34, 62);
  rankBadge.x = 6;
  rankBadge.y = 6;
  rankBadge.cornerRadius = 3;
  rankBadge.fills = [solid("#F3E5C8", 0.92)];
  card.appendChild(rankBadge);

  const rTxt = makeText(rankStr, 22, fontMonoBold, rankHex);
  rTxt.x = 8; rTxt.y = 2;
  rankBadge.appendChild(rTxt);

  const sInst = components[suitKey].createInstance();
  sInst.resize(26, 26);
  sInst.x = 4; sInst.y = 32;
  rankBadge.appendChild(sInst);

  // Strictly ONLY Rank+Suit + Bleed Art + Large 18px Title on resting cards (0 paragraph text!)
  const cTitle = makeText(titleStr, 18, fontSerifBold, "#1D150D", { align: "CENTER", width: 118 });
  cTitle.x = 6;
  cTitle.y = 151;
  card.appendChild(cTitle);

  arena.appendChild(card);
  createdNodeIds.push(artRect.id, rankBadge.id, sInst.id);
}

buildRestingHandCard(1, 444, 888, 9, "K", "suit_diamond", "#C83E37", "Thân Pháp");
buildRestingHandCard(2, 548, 872, 5, "9", "suit_club", "#1D150D", "Phá Giáp");
buildRestingHandCard(3, 654, 862, 2, "A", "suit_heart", "#B8322A", "Linh Đan");
buildRestingHandCard(5, 996, 868, -4, "J", "suit_spade", "#1D150D", "Hộ Tâm");
buildRestingHandCard(6, 1104, 884, -8, "10", "suit_diamond", "#C83E37", "Hỏa Tiễn");

// Hovered / Selected Card #4 — 1.75x Zoom (228 x 324px) Lifted cleanly above the arc!
const hoverCard = makeLacquerPlaque("Hovered_Card_1_75x_Zoom_228x324", 768, 676, 228, 324, "#DEC79C", "#F6DE9C", 3.5, 8);
arena.appendChild(hoverCard);

const hvArt = figma.createFrame();
hvArt.name = "Hovered_Card_Art_Slot_640x520";
hvArt.resize(200, 198);
hvArt.x = 14;
hvArt.y = 56;
hvArt.cornerRadius = 4;
hvArt.fills = [{
  type: "GRADIENT_LINEAR",
  gradientStops: [
    { color: { r: 0.42, g: 0.11, b: 0.09, a: 1 }, position: 0 },
    { color: { r: 0.09, g: 0.07, b: 0.07, a: 1 }, position: 1 },
  ],
  gradientTransform: [[0, 1, 0], [-1, 0, 1]],
}];
hvArt.strokes = [solid("#7C5828")];
hvArt.strokeWeight = 1.5;
const hvArtNote = makeText("Tranh Thủy Mặc\ncard_sat.png\n(Kiếm Khí Chu Sa)", 16, fontSansSemi, "#F6DE9C", { align: "CENTER", width: 180, lineHeightPx: 22 });
hvArtNote.x = 10; hvArtNote.y = 66;
hvArt.appendChild(hvArtNote);
hoverCard.appendChild(hvArt);

const hvRankBox = figma.createFrame();
hvRankBox.resize(52, 96);
hvRankBox.x = 10;
hvRankBox.y = 10;
hvRankBox.cornerRadius = 4;
hvRankBox.fills = [solid("#F5EBD6", 0.96)];
hvRankBox.strokes = [solid("#C89B4B")];
hvRankBox.strokeWeight = 1.5;
const hvRankTxt = makeText("7", 32, fontMonoBold, "#1D150D");
hvRankTxt.x = 15; hvRankTxt.y = 4;
hvRankBox.appendChild(hvRankTxt);
const hvSuitInst = components.suit_spade.createInstance();
hvSuitInst.resize(40, 40);
hvSuitInst.x = 6; hvSuitInst.y = 48;
hvRankBox.appendChild(hvSuitInst);
hoverCard.appendChild(hvRankBox);

const hvTitle = makeText("TRẢM (SÁT)", 22, fontSerifBold, "#1D150D", { align: "CENTER", width: 204 });
hvTitle.x = 12; hvTitle.y = 266;
hoverCard.appendChild(hvTitle);

const hvTag = makeText("Chiêu Cơ Bản · Tầm 1 · 1.75× Zoom", 15, fontSansBold, "#6E1612", { align: "CENTER", width: 208 });
hvTag.x = 10; hvTag.y = 296;
hoverCard.appendChild(hvTag);
createdNodeIds.push(hvArt.id, hvRankBox.id, hvSuitInst.id);

// Right-Side Silk Scroll Explanation Panel (432 x 256px, paired beside 1.75x Hovered Card)
const silkScroll = makeLacquerPlaque("Hovered_Silk_Scroll_Tooltip_9Slice", 1016, 696, 432, 256, "#14100D", "#DFB45E", 2.5, 6);
silkScroll.layoutMode = "VERTICAL";
silkScroll.itemSpacing = 12;
silkScroll.paddingLeft = 24; silkScroll.paddingRight = 24; silkScroll.paddingTop = 22; silkScroll.paddingBottom = 22;
silkScroll.appendChild(makeText("TRẢM — CHIÊU THỨC CÔNG KÍCH", 20, fontSerifBold, "#F6DE9C"));
silkScroll.appendChild(makeText("Phạm vi: Tầm vũ khí (1) · Mục tiêu: Độc Cô Liệt (Ghế 5)", 16, fontSansSemi, "#C89B4B"));
silkScroll.appendChild(makeText("Trong pha Xuất Chiêu, chọn 1 hiệp khách trong tầm đánh để tung đòn Trảm. Nếu mục tiêu không xuất chiêu Thân Pháp (Thiểm) hóa giải, mục tiêu mất 1 điểm Sinh Lực.", 16, fontSansReg, "#EFE6D5", { width: 384, lineHeightPx: 24 }));
silkScroll.appendChild(makeText("Thả lá bài vào vòng la bàn vàng hoặc bấm Lệnh Bài bên phải", 15, fontSansBold, "#34D399", { width: 384 }));
arena.appendChild(silkScroll);

// ============================================================================
// 7F. BOTTOM-RIGHT COMMAND CLUSTER (9-Slice Cinnabar Octagonal Plaque CTA)
// ============================================================================
const secondaryBtn = makeLacquerPlaque("Secondary_EndTurn_Button", 1624, 876, 264, 60, "#1A1613", "#C89B4B", 2, 4);
secondaryBtn.layoutMode = "HORIZONTAL";
secondaryBtn.primaryAxisAlignItems = "CENTER";
secondaryBtn.counterAxisAlignItems = "CENTER";
secondaryBtn.appendChild(makeText("Kết Thúc Lượt (E)", 18, fontSansBold, "#DEC79C"));
arena.appendChild(secondaryBtn);

const ctaContainer = figma.createFrame();
ctaContainer.name = "Primary_Action_Command_360x96";
ctaContainer.resize(360, 96);
ctaContainer.x = 1528;
ctaContainer.y = 952;
ctaContainer.fills = [];
const ctaBgInst = components.action_button_primary_9slice.createInstance();
ctaBgInst.resize(360, 96);
ctaBgInst.x = 0; ctaBgInst.y = 0;
ctaContainer.appendChild(ctaBgInst);

const ctaLabel = makeText("Xuất Trảm → Độc Cô Liệt", 20, fontSerifBold, "#FFF6DE", { align: "CENTER", width: 320 });
ctaLabel.x = 20; ctaLabel.y = 35;
ctaContainer.appendChild(ctaLabel);
arena.appendChild(ctaContainer);
createdNodeIds.push(ctaContainer.id, ctaBgInst.id);

// Verify font-size floor across the entire showcase
const allTexts = showcase.findAllWithCriteria({ types: ["TEXT"] });
let minFontSizePx = 999;
for (const tn of allTexts) {
  if (typeof tn.fontSize === "number" && tn.fontSize < minFontSizePx) minFontSizePx = tn.fontSize;
}

figma.viewport.scrollAndZoomIntoView([showcase]);

return {
  success: true,
  pageId: page.id,
  showcaseNodeId: showcase.id,
  masterArenaNodeId: arena.id,
  componentLibraryFrameId: libFrame.id,
  exportTargets,
  fontsUsed: {
    serifBold: fontSerifBold,
    sansBold: fontSansBold,
    sansSemi: fontSansSemi,
    sansReg: fontSansReg,
    monoBold: fontMonoBold,
  },
  textNodeCount: allTexts.length,
  minFontSizePx,
  createdNodeCount: createdNodeIds.length,
  createdNodeIds,
  mutatedNodeIds,
};
