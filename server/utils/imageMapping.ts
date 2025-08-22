/**
 * Image mapping utilities for converting external URLs to local cached images
 */

// Mapping of Chinese Pokemon names to their Pokedex IDs
const POKEMON_NAME_TO_ID: Record<string, number> = {
  // Generation 1 Pokemon (1-151)
  妙蛙种子: 1,
  妙蛙草: 2,
  妙蛙花: 3,
  小火龙: 4,
  火恐龙: 5,
  喷火龙: 6,
  杰尼龟: 7,
  卡咪龟: 8,
  水箭龟: 9,
  绿毛虫: 10,
  铁甲蛹: 11,
  巴大蝶: 12,
  独角虫: 13,
  铁壳蛹: 14,
  大针蜂: 15,
  波波: 16,
  比比鸟: 17,
  大比鸟: 18,
  小拉达: 19,
  拉达: 20,
  烈雀: 21,
  大嘴雀: 22,
  阿柏蛇: 23,
  阿柏怪: 24,
  皮卡丘: 25,
  雷丘: 26,
  穿山鼠: 27,
  穿山王: 28,
  尼多兰: 29,
  尼多娜: 30,
  尼多后: 31,
  尼多朗: 32,
  尼多力诺: 33,
  尼多王: 34,
  皮皮: 35,
  皮可西: 36,
  六尾: 37,
  九尾: 38,
  胖丁: 39,
  胖可丁: 40,
  超音蝠: 41,
  大嘴蝠: 42,
  走路草: 43,
  臭臭花: 44,
  霸王花: 45,
  派拉斯: 46,
  派拉斯特: 47,
  毛球: 48,
  摩鲁蛾: 49,
  地鼠: 50,
  三地鼠: 51,
  喵喵: 52,
  猫老大: 53,
  可达鸭: 54,
  哥达鸭: 55,
  猴怪: 56,
  火爆猴: 57,
  卡蒂狗: 58,
  风速狗: 59,
  蚊香蝌蚪: 60,
  蚊香蛙: 61,
  蚊香泳士: 62,
  凯西: 63,
  勇吉拉: 64,
  胡地: 65,
  腕力: 66,
  豪力: 67,
  怪力: 68,
  喇叭芽: 69,
  口呆花: 70,
  大食花: 71,
  玛瑙水母: 72,
  毒刺水母: 73,
  小拳石: 74,
  隆隆石: 75,
  隆隆岩: 76,
  小火马: 77,
  烈焰马: 78,
  呆呆兽: 79,
  呆河马: 80,
  小磁怪: 81,
  三合一磁怪: 82,
  大葱鸭: 83,
  嘟嘟: 84,
  嘟嘟利: 85,
  小海狮: 86,
  白海狮: 87,
  臭泥: 88,
  臭臭泥: 89,
  大舌贝: 90,
  铁甲贝: 91,
  鬼斯: 92,
  鬼斯通: 93,
  耿鬼: 94,
  大岩蛇: 95,
  素利普: 96,
  素利拍: 97,
  大钳蟹: 98,
  巨钳蟹: 99,
  霹雳电球: 100,
  顽皮雷弹: 101,
  蛋蛋: 102,
  椰蛋树: 103,
  卡拉卡拉: 104,
  嘎啦嘎啦: 105,
  飞腿郎: 106,
  快拳郎: 107,
  大舌头: 108,
  瓦斯弹: 109,
  双弹瓦斯: 110,
  独角犀牛: 111,
  钻角犀兽: 112,
  吉利蛋: 113,
  蔓藤怪: 114,
  袋兽: 115,
  墨海马: 116,
  海刺龙: 117,
  角金鱼: 118,
  金鱼王: 119,
  海星星: 120,
  宝石海星: 121,
  魔墙人偶: 122,
  飞天螳螂: 123,
  迷唇姐: 124,
  电击兽: 125,
  鸭嘴火兽: 126,
  凯罗斯: 127,
  肯泰罗: 128,
  鲤鱼王: 129,
  暴鲤龙: 130,
  拉普拉斯: 131,
  百变怪: 132,
  伊布: 133,
  水伊布: 134,
  雷伊布: 135,
  火伊布: 136,
  多边兽: 137,
  菊石兽: 138,
  多刺菊石兽: 139,
  化石盔: 140,
  镰刀盔: 141,
  化石翼龙: 142,
  卡比兽: 143,
  急冻鸟: 144,
  闪电鸟: 145,
  火焰鸟: 146,
  迷你龙: 147,
  哈克龙: 148,
  快龙: 149,
  超梦: 150,
  梦幻: 151,

  // Generation 2 Pokemon (152-251)
  菊草叶: 152,
  月桂叶: 153,
  大竺葵: 154,
  火球鼠: 155,
  火岩鼠: 156,
  火爆兽: 157,
  小锯鳄: 158,
  蓝鳄: 159,
  大力鳄: 160,
  尾立: 161,
  大尾立: 162,
  咕咕: 163,
  猫头夜鹰: 164,
  芭瓢虫: 165,
  安瓢虫: 166,
  圆丝蛛: 167,
  阿利多斯: 168,
  叉字蝠: 169,
  灯笼鱼: 170,
  电灯怪: 171,
  皮丘: 172,
  皮宝宝: 173,
  宝宝丁: 174,
  波克比: 175,
  波克基古: 176,
  天然雀: 177,
  天然鸟: 178,
  咩利羊: 179,
  茸茸羊: 180,
  电龙: 181,
  美丽花: 182,
  玛力露: 183,
  玛力露丽: 184,
  树才怪: 185,
  蚊香蛙皇: 186,
  毽子草: 187,
  毽子花: 188,
  毽子棉: 189,
  长尾怪手: 190,
  向日种子: 191,
  向日花怪: 192,
  蜻蜻蜓: 193,
  乌波: 194,
  沼王: 195,
  太阳伊布: 196,
  月亮伊布: 197,
  黑暗鸦: 198,
  呆呆王: 199,
  迷雾幽灵: 200,
  未知图腾: 201,
  果然翁: 202,
  麒麟奇: 203,
  榛果球: 204,
  佛烈托斯: 205,
  土龙弟弟: 206,
  天蝎: 207,
  大钢蛇: 208,
  布鲁: 209,
  布鲁皇: 210,
  千针鱼: 211,
  巨钳螳螂: 212,
  壶壶: 213,
  赫拉克罗斯: 214,
  狃拉: 215,
  熊宝宝: 216,
  圈圈熊: 217,
  熔岩虫: 218,
  熔岩蜗牛: 219,
  小山猪: 220,
  长毛猪: 221,
  太阳珊瑚: 222,
  铁炮鱼: 223,
  章鱼桶: 224,
  信使鸟: 225,
  巨翅飞鱼: 226,
  盔甲鸟: 227,
  戴鲁比: 228,
  黑鲁加: 229,
  刺龙王: 230,
  小小象: 231,
  顿甲: 232,
  多边兽2: 233,
  惊角鹿: 234,
  图图犬: 235,
  无畏小子: 236,
  战舞郎: 237,
  迷唇娃: 238,
  电击怪: 239,
  鸭嘴宝宝: 240,
  大奶罐: 241,
  幸福蛋: 242,
  雷公: 243,
  炎帝: 244,
  水君: 245,
  幼基拉斯: 246,
  沙基拉斯: 247,
  班基拉斯: 248,
  洛奇亚: 249,
  凤王: 250,
  时拉比: 251,

  // Add more generations as needed...
  // Popular Pokemon from later generations
  木守宫: 252,
  森林蜥蜴: 253,
  蜥蜴王: 254,
  火稚鸡: 255,
  力壮鸡: 256,
  火焰鸡: 257,
  水跃鱼: 258,
  沼跃鱼: 259,
  巨沼怪: 260,

  // Some popular modern Pokemon (examples)
  路卡利欧: 448,
  索罗亚: 570,
  索罗亚克: 571,
};

// Mapping of Chinese item names to their sprite filenames
const ITEM_NAME_TO_FILE: Record<string, string> = {
  精灵球: 'poke-ball.png',
  伤药: 'potion.png',
  超级球: 'great-ball.png',
  高级球: 'ultra-ball.png',
  大师球: 'master-ball.png',
  解毒剂: 'antidote.png',
  烧伤药: 'burn-heal.png',
  解冻剂: 'ice-heal.png',
  觉醒药: 'awakening.png',
  麻痹药: 'paralyze-heal.png',
  全恢复药: 'full-restore.png',
  超级药: 'super-potion.png',
  厉害药: 'hyper-potion.png',
  全满药: 'max-potion.png',
  复活草: 'revive.png',
  满血复活草: 'max-revive.png',
  // Add more as needed
};

/**
 * Get the local Pokemon image URL from Pokemon ID
 */
export function getPokemonImageUrl(pokemonId: number): string {
  return `/images/pokemon/${pokemonId}.png`;
}

/**
 * Get the local Pokemon image URL from Chinese Pokemon name
 */
export function getPokemonImageUrlByName(chineseName: string): string | null {
  const pokemonId = POKEMON_NAME_TO_ID[chineseName];
  if (pokemonId) {
    return getPokemonImageUrl(pokemonId);
  }
  return null;
}

/**
 * Get the local item image URL from Chinese item name
 */
export function getItemImageUrlByName(chineseName: string): string | null {
  const filename = ITEM_NAME_TO_FILE[chineseName];
  if (filename) {
    return `/images/items/${filename}`;
  }
  return null;
}

/**
 * Extract Pokemon ID from PokeAPI URL
 * E.g., "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png" -> 25
 */
export function extractPokemonIdFromUrl(url: string): number | null {
  const match = url.match(/\/pokemon\/(\d+)\.png/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extract item filename from PokeAPI URL
 * E.g., "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png" -> "poke-ball.png"
 */
export function extractItemFilenameFromUrl(url: string): string | null {
  const match = url.match(/\/items\/([^/]+\.png)/);
  return match ? match[1] : null;
}

/**
 * Check if a local Pokemon image exists (based on the images we've downloaded)
 */
export function hasLocalPokemonImage(pokemonId: number): boolean {
  // We now have ALL Pokemon sprites from ID 1 to 1025
  return pokemonId >= 1 && pokemonId <= 1025;
}

/**
 * Check if a local item image exists (based on the images we've downloaded)
 */
export function hasLocalItemImage(filename: string): boolean {
  const availableFiles = [
    'poke-ball.png',
    'potion.png',
    'great-ball.png',
    'ultra-ball.png',
    'master-ball.png',
    'antidote.png',
    'super-potion.png',
    'hyper-potion.png',
    'max-potion.png',
    'full-restore.png',
    'revive.png',
    'max-revive.png',
  ];
  return availableFiles.includes(filename);
}

/**
 * Convert external PokeAPI Pokemon URL to local URL if available, otherwise return original
 */
export function convertPokemonUrlToLocal(externalUrl: string): string {
  const pokemonId = extractPokemonIdFromUrl(externalUrl);
  if (pokemonId && hasLocalPokemonImage(pokemonId)) {
    return getPokemonImageUrl(pokemonId);
  }
  return externalUrl; // Fallback to external URL
}

/**
 * Convert external PokeAPI item URL to local URL if available, otherwise return original
 */
export function convertItemUrlToLocal(externalUrl: string): string {
  const filename = extractItemFilenameFromUrl(externalUrl);
  if (filename && hasLocalItemImage(filename)) {
    return `/images/items/${filename}`;
  }
  return externalUrl; // Fallback to external URL
}

/**
 * Get the best available image URL for a Pokemon (prefer local, fallback to external)
 */
export function getBestPokemonImageUrl(
  chineseName: string,
  externalUrl?: string
): string {
  // First try to get local image by name
  const localUrl = getPokemonImageUrlByName(chineseName);
  if (localUrl) {
    const pokemonId = POKEMON_NAME_TO_ID[chineseName];
    if (pokemonId && hasLocalPokemonImage(pokemonId)) {
      return localUrl;
    }
  }

  // If external URL is provided, try to convert it to local
  if (externalUrl) {
    return convertPokemonUrlToLocal(externalUrl);
  }

  // Fallback to placeholder
  return `https://placehold.co/96x96/322D41/E0D8F0?text=${encodeURIComponent(chineseName.substring(0, 1))}`;
}

/**
 * Get the best available image URL for an item (prefer local, fallback to external)
 */
export function getBestItemImageUrl(
  chineseName: string,
  externalUrl?: string
): string {
  // First try to get local image by name
  const localUrl = getItemImageUrlByName(chineseName);
  if (localUrl) {
    const filename = ITEM_NAME_TO_FILE[chineseName];
    if (filename && hasLocalItemImage(filename)) {
      return localUrl;
    }
  }

  // If external URL is provided, try to convert it to local
  if (externalUrl) {
    return convertItemUrlToLocal(externalUrl);
  }

  // Fallback to placeholder
  return `https://placehold.co/48x48/E0D8F0/4A3F66?text=${encodeURIComponent(chineseName.substring(0, 1))}`;
}
