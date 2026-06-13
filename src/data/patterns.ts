import type { Pattern } from "@/types";

const R = "c_dmc_666";
const P = "c_dmc_815";
const LP = "c_dmc_760";
const Y = "c_dmc_947";
const O = "c_dmc_973";
const G = "c_dmc_906";
const DG = "c_dmc_699";
const B = "c_dmc_3843";
const DB = "c_dmc_797";
const PU = "c_dmc_820";
const BR = "c_dmc_891";
const K = "c_dmc_310";
const W = "c_dmc_blanc";
const _ = null;

function g(rows: (string | null)[][]): (string | null)[][] {
  return rows;
}

export const PATTERNS: Pattern[] = [
  {
    id: "heart_small",
    name: "小心心",
    category: "心形",
    cells: g([
      [_, R, _, R, _],
      [R, R, R, R, R],
      [R, R, R, R, R],
      [_, R, R, R, _],
      [_, _, R, _, _],
    ]),
  },
  {
    id: "heart_medium",
    name: "大爱心",
    category: "心形",
    cells: g([
      [_, _, R, R, _, _, R, R, _, _],
      [_, R, R, R, R, R, R, R, R, _],
      [R, R, R, R, R, R, R, R, R, R],
      [R, R, R, R, R, R, R, R, R, R],
      [R, R, R, R, R, R, R, R, R, R],
      [_, R, R, R, R, R, R, R, R, _],
      [_, _, R, R, R, R, R, R, _, _],
      [_, _, _, R, R, R, R, _, _, _],
      [_, _, _, _, R, R, _, _, _, _],
      [_, _, _, _, _, _, _, _, _, _],
    ]),
  },
  {
    id: "heart_pink",
    name: "粉嫩心",
    category: "心形",
    cells: g([
      [_, P, _, P, _],
      [P, LP, P, LP, P],
      [P, P, P, P, P],
      [_, P, P, P, _],
      [_, _, P, _, _],
    ]),
  },
  {
    id: "flower_daisy",
    name: "小雏菊",
    category: "花朵",
    cells: g([
      [_, _, W, _, _],
      [_, W, Y, W, _],
      [W, Y, Y, Y, W],
      [_, W, Y, W, _],
      [_, _, W, _, _],
    ]),
  },
  {
    id: "flower_rose",
    name: "玫瑰花",
    category: "花朵",
    cells: g([
      [_, _, _, G, _, _, _],
      [_, _, G, DG, G, _, _],
      [_, R, P, R, P, R, _],
      [R, P, R, R, R, P, R],
      [_, R, P, R, P, R, _],
      [_, _, G, DG, G, _, _],
      [_, _, _, G, _, _, _],
    ]),
  },
  {
    id: "flower_sun",
    name: "太阳花",
    category: "花朵",
    cells: g([
      [_, _, Y, _, _],
      [_, Y, O, Y, _],
      [Y, O, Y, O, Y],
      [_, Y, O, Y, _],
      [_, _, Y, _, _],
    ]),
  },
  {
    id: "flower_tulip",
    name: "郁金香",
    category: "花朵",
    cells: g([
      [_, R, R, R, _],
      [R, R, P, R, R],
      [R, P, R, P, R],
      [_, R, R, R, _],
      [_, _, G, _, _],
      [_, _, G, _, _],
      [_, G, G, G, _],
    ]),
  },
  {
    id: "flower_5petal",
    name: "五瓣花",
    category: "花朵",
    cells: g([
      [_, P, _, P, _],
      [P, P, P, P, P],
      [_, P, Y, P, _],
      [P, P, P, P, P],
      [_, P, _, P, _],
    ]),
  },
  {
    id: "border_corner",
    name: "角落装饰",
    category: "边框",
    cells: g([
      [Y, O, Y, _, _, _, _, _],
      [O, Y, _, _, _, _, _, _],
      [Y, _, G, G, G, _, _, _],
      [_, _, G, DG, G, _, _, _],
      [_, _, G, G, G, Y, O, Y],
      [_, _, _, _, _, O, Y, O],
      [_, _, _, _, _, Y, O, Y],
      [_, _, _, _, _, _, _, _],
    ]),
  },
  {
    id: "border_wave",
    name: "波浪边",
    category: "边框",
    cells: g([
      [_, B, _, _, _, B, _, _, _, B, _],
      [B, DB, B, _, B, DB, B, _, B, DB, B],
      [_, B, DB, B, DB, B, DB, B, DB, B, _],
      [_, _, B, DB, B, _, B, DB, B, _, _],
    ]),
  },
  {
    id: "border_flower_row",
    name: "花串",
    category: "边框",
    cells: g([
      [_, _, _, _, _, _, _, _, _, _, _],
      [_, Y, _, _, Y, _, _, Y, _, _, _],
      [Y, O, Y, G, Y, O, Y, G, Y, O, Y],
      [_, Y, _, _, _, Y, _, _, _, Y, _],
      [_, _, _, _, _, _, _, _, _, _, _],
    ]),
  },
  {
    id: "star_4",
    name: "四角星",
    category: "几何",
    cells: g([
      [_, _, Y, _, _],
      [_, _, Y, _, _],
      [Y, Y, Y, Y, Y],
      [_, _, Y, _, _],
      [_, _, Y, _, _],
    ]),
  },
  {
    id: "star_5",
    name: "五角星",
    category: "几何",
    cells: g([
      [_, _, Y, _, _],
      [_, Y, Y, Y, _],
      [Y, Y, Y, Y, Y],
      [_, Y, _, Y, _],
      [Y, _, _, _, Y],
    ]),
  },
  {
    id: "diamond",
    name: "菱形",
    category: "几何",
    cells: g([
      [_, _, B, _, _],
      [_, B, DB, B, _],
      [B, DB, B, DB, B],
      [_, B, DB, B, _],
      [_, _, B, _, _],
    ]),
  },
  {
    id: "leaf_small",
    name: "小叶子",
    category: "植物",
    cells: g([
      [_, _, G, G, _],
      [_, G, DG, G, _],
      [G, DG, G, _, _],
      [G, G, _, _, _],
    ]),
  },
  {
    id: "butterfly",
    name: "小蝴蝶",
    category: "动物",
    cells: g([
      [PU, _, _, _, PU],
      [PU, PU, _, PU, PU],
      [PU, PU, B, PU, PU],
      [PU, PU, _, PU, PU],
      [PU, _, _, _, PU],
    ]),
  },
  {
    id: "cross",
    name: "十字",
    category: "几何",
    cells: g([
      [_, _, BR, _, _],
      [_, _, BR, _, _],
      [BR, BR, BR, BR, BR],
      [_, _, BR, _, _],
      [_, _, BR, _, _],
    ]),
  },
  {
    id: "dot_cluster",
    name: "点阵装饰",
    category: "几何",
    cells: g([
      [K, _, K, _, K],
      [_, _, _, _, _],
      [K, _, K, _, K],
      [_, _, _, _, _],
      [K, _, K, _, K],
    ]),
  },
];

export const PATTERN_CATEGORIES = [
  "全部",
  "心形",
  "花朵",
  "边框",
  "几何",
  "植物",
  "动物",
];
