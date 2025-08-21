import { describe, it, expect } from 'vitest';
import {
  getPokemonImageUrl,
  getPokemonImageUrlByName,
  getItemImageUrlByName,
  extractPokemonIdFromUrl,
  extractItemFilenameFromUrl,
  convertPokemonUrlToLocal,
  convertItemUrlToLocal,
  getBestPokemonImageUrl,
  getBestItemImageUrl,
} from './imageMapping';

describe('imageMapping', () => {
  describe('getPokemonImageUrl', () => {
    it('should return correct local URL for Pokemon ID', () => {
      expect(getPokemonImageUrl(25)).toBe('/images/pokemon/25.png');
      expect(getPokemonImageUrl(1)).toBe('/images/pokemon/1.png');
    });
  });

  describe('getPokemonImageUrlByName', () => {
    it('should return correct local URL for known Pokemon names', () => {
      expect(getPokemonImageUrlByName('皮卡丘')).toBe('/images/pokemon/25.png');
      expect(getPokemonImageUrlByName('妙蛙种子')).toBe('/images/pokemon/1.png');
    });

    it('should return null for unknown Pokemon names', () => {
      expect(getPokemonImageUrlByName('未知宝可梦')).toBeNull();
    });
  });

  describe('getItemImageUrlByName', () => {
    it('should return correct local URL for known item names', () => {
      expect(getItemImageUrlByName('精灵球')).toBe('/images/items/poke-ball.png');
      expect(getItemImageUrlByName('伤药')).toBe('/images/items/potion.png');
    });

    it('should return null for unknown item names', () => {
      expect(getItemImageUrlByName('未知道具')).toBeNull();
    });
  });

  describe('extractPokemonIdFromUrl', () => {
    it('should extract Pokemon ID from PokeAPI URL', () => {
      const url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
      expect(extractPokemonIdFromUrl(url)).toBe(25);
    });

    it('should return null for invalid URLs', () => {
      expect(extractPokemonIdFromUrl('invalid-url')).toBeNull();
    });
  });

  describe('extractItemFilenameFromUrl', () => {
    it('should extract item filename from PokeAPI URL', () => {
      const url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
      expect(extractItemFilenameFromUrl(url)).toBe('poke-ball.png');
    });

    it('should return null for invalid URLs', () => {
      expect(extractItemFilenameFromUrl('invalid-url')).toBeNull();
    });
  });

  describe('convertPokemonUrlToLocal', () => {
    it('should convert external URL to local URL for available Pokemon', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png';
      expect(convertPokemonUrlToLocal(externalUrl)).toBe('/images/pokemon/25.png');
    });

    it('should return original URL for unavailable Pokemon', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/500.png';
      expect(convertPokemonUrlToLocal(externalUrl)).toBe(externalUrl);
    });
  });

  describe('convertItemUrlToLocal', () => {
    it('should convert external URL to local URL for available items', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
      expect(convertItemUrlToLocal(externalUrl)).toBe('/images/items/poke-ball.png');
    });

    it('should return original URL for unavailable items', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/unknown-item.png';
      expect(convertItemUrlToLocal(externalUrl)).toBe(externalUrl);
    });
  });

  describe('getBestPokemonImageUrl', () => {
    it('should prefer local image for known Pokemon', () => {
      const result = getBestPokemonImageUrl('皮卡丘');
      expect(result).toBe('/images/pokemon/25.png');
    });

    it('should use external URL for unknown Pokemon with external URL provided', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/500.png';
      const result = getBestPokemonImageUrl('未知宝可梦', externalUrl);
      expect(result).toBe(externalUrl);
    });

    it('should fallback to placeholder for unknown Pokemon without external URL', () => {
      const result = getBestPokemonImageUrl('未知宝可梦');
      expect(result).toMatch(/placehold\.co/);
    });
  });

  describe('getBestItemImageUrl', () => {
    it('should prefer local image for known items', () => {
      const result = getBestItemImageUrl('精灵球');
      expect(result).toBe('/images/items/poke-ball.png');
    });

    it('should use external URL for unknown items with external URL provided', () => {
      const externalUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/unknown-item.png';
      const result = getBestItemImageUrl('未知道具', externalUrl);
      expect(result).toBe(externalUrl);
    });

    it('should fallback to placeholder for unknown items without external URL', () => {
      const result = getBestItemImageUrl('未知道具');
      expect(result).toMatch(/placehold\.co/);
    });
  });
});