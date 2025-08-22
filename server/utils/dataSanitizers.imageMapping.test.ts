import { describe, it, expect } from 'vitest';
import { sanitizePokemonData, sanitizeItemData } from './dataSanitizers';

describe('dataSanitizers with image caching', () => {
  describe('sanitizePokemonData with local image mapping', () => {
    it('should use local image for known Pokemon like Pikachu', () => {
      const inputPokemon = {
        name: '皮卡丘',
        level: 25,
        maxHp: 100,
        currentHp: 100,
        types: ['电'],
        // No imageUrl provided - should use local mapping
      };

      const result = sanitizePokemonData(inputPokemon);

      expect(result.name).toBe('皮卡丘');
      expect(result.imageUrl).toBe('/images/pokemon/25.png');
    });

    it('should convert external PokeAPI URL to local URL for cached Pokemon', () => {
      const inputPokemon = {
        name: '妙蛙种子',
        level: 5,
        maxHp: 50,
        currentHp: 50,
        types: ['草'],
        imageUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
      };

      const result = sanitizePokemonData(inputPokemon);

      expect(result.name).toBe('妙蛙种子');
      expect(result.imageUrl).toBe('/images/pokemon/1.png');
    });

    it('should fallback to external URL for uncached Pokemon', () => {
      const inputPokemon = {
        name: '未知宝可梦',
        level: 10,
        maxHp: 60,
        currentHp: 60,
        types: ['普通'],
        imageUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2000.png',
      };

      const result = sanitizePokemonData(inputPokemon);

      expect(result.name).toBe('未知宝可梦');
      expect(result.imageUrl).toBe(
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/2000.png'
      );
    });

    it('should fallback to placeholder for Pokemon without external URL', () => {
      const inputPokemon = {
        name: '神秘宝可梦',
        level: 10,
        maxHp: 60,
        currentHp: 60,
        types: ['普通'],
        // No imageUrl provided and no local mapping
      };

      const result = sanitizePokemonData(inputPokemon);

      expect(result.name).toBe('神秘宝可梦');
      expect(result.imageUrl).toMatch(/placehold\.co/);
    });
  });

  describe('sanitizeItemData with local image mapping', () => {
    it('should use local image for known items like Poke Ball', () => {
      const inputItem = {
        name: '精灵球',
        quantity: 5,
        description: '用于捕捉宝可梦的球',
        // No imageUrl provided - should use local mapping
      };

      const result = sanitizeItemData(inputItem);

      expect(result.name).toBe('精灵球');
      expect(result.imageUrl).toBe('/images/items/poke-ball.png');
    });

    it('should convert external PokeAPI URL to local URL for cached items', () => {
      const inputItem = {
        name: '伤药',
        quantity: 3,
        description: '恢复HP的药物',
        imageUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
      };

      const result = sanitizeItemData(inputItem);

      expect(result.name).toBe('伤药');
      expect(result.imageUrl).toBe('/images/items/potion.png');
    });

    it('should fallback to external URL for uncached items', () => {
      const inputItem = {
        name: '神秘道具',
        quantity: 1,
        description: '未知效果的道具',
        imageUrl:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystery-item.png',
      };

      const result = sanitizeItemData(inputItem);

      expect(result.name).toBe('神秘道具');
      expect(result.imageUrl).toBe(
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/mystery-item.png'
      );
    });

    it('should fallback to placeholder for items without external URL', () => {
      const inputItem = {
        name: '特殊道具',
        quantity: 1,
        description: '特殊效果的道具',
        // No imageUrl provided and no local mapping
      };

      const result = sanitizeItemData(inputItem);

      expect(result.name).toBe('特殊道具');
      expect(result.imageUrl).toMatch(/placehold\.co/);
    });
  });
});
