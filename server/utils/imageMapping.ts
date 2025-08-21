/**
 * Image mapping utilities for converting external URLs to local cached images
 */

// Mapping of Chinese Pokemon names to their Pokedex IDs
const POKEMON_NAME_TO_ID: Record<string, number> = {
  // Generation 1 Pokemon (1-20)
  妙蛙种子: 1, 妙蛙草: 2, 妙蛙花: 3,
  小火龙: 4, 火恐龙: 5, 喷火龙: 6,
  杰尼龟: 7, 卡咪龟: 8, 水箭龟: 9,
  绿毛虫: 10, 铁甲蛹: 11, 巴大蝶: 12,
  独角虫: 13, 铁壳蛹: 14, 大针蜂: 15,
  波波: 16, 比比鸟: 17, 大比鸟: 18,
  小拉达: 19, 拉达: 20,
  
  // Pikachu line and others (25-35)
  皮卡丘: 25, 雷丘: 26,
  穿山鼠: 27, 穿山王: 28,
  尼多兰: 29, 尼多娜: 30, 尼多后: 31,
  尼多朗: 32, 尼多力诺: 33, 尼多王: 34,
  皮皮: 35,
  
  // Popular Pokemon
  喵喵: 52,
  耿鬼: 94,
  卡拉卡拉: 104,
  吉利蛋: 113,
  鲤鱼王: 129,
  百变怪: 132,
  伊布: 133,
  水伊布: 134,
  雷伊布: 135,
  火伊布: 136,
  
  // Legendary Pokemon we have images for
  超梦: 150, 梦幻: 151,
  
  // Generation 2 starters we have images for  
  菊草叶: 152, 月桂叶: 153, 大竺葵: 154, 火球鼠: 155,
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
  // Pokemon we have downloaded: 1-20, 25-35, plus individual popular ones
  const availableIds = [
    // Gen 1 basics: 1-20
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    // Pikachu line and others: 25-35
    25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
    // Popular individual Pokemon
    52, 94, 104, 113, 129, 132, 133, 134, 135, 136,
    // Legendaries and Gen 2 starters: 150-155
    150, 151, 152, 153, 154, 155
  ];
  return availableIds.includes(pokemonId);
}

/**
 * Check if a local item image exists (based on the images we've downloaded)
 */
export function hasLocalItemImage(filename: string): boolean {
  const availableFiles = [
    'poke-ball.png', 'potion.png', 'great-ball.png', 'ultra-ball.png', 
    'master-ball.png', 'antidote.png', 'super-potion.png', 'hyper-potion.png', 
    'max-potion.png', 'full-restore.png', 'revive.png', 'max-revive.png'
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