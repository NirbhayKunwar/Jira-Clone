// frontend/src/utils/lexoRank.js

/**
 * Fractional Indexing (LexoRank) for O(1) list re-ordering
 * Prevents list re-indexing reflows across distributed clients.
 */
export class LexoRank {
  static between(prevRank = '', nextRank = '') {
    if (!prevRank && !nextRank) return 'm';
    if (!prevRank) return this.shift(nextRank, -1);
    if (!nextRank) return this.shift(prevRank, 1);

    let result = '';
    let i = 0;

    while (true) {
      const prevChar = prevRank.charCodeAt(i) || 96; // 'a' - 1
      const nextChar = nextRank.charCodeAt(i) || 123; // 'z' + 1

      if (prevChar === nextChar) {
        result += String.fromCharCode(prevChar);
        i++;
        continue;
      }

      const midChar = Math.floor((prevChar + nextChar) / 2);
      if (midChar > prevChar) {
        result += String.fromCharCode(midChar);
        break;
      }

      result += String.fromCharCode(prevChar);
      i++;
    }

    return result;
  }

  static shift(rank, dir) {
    if (!rank) return dir > 0 ? 'm' : 'f';
    const charCode = rank.charCodeAt(rank.length - 1) + dir;
    const safeChar = Math.min(Math.max(97, charCode), 122); // Clamp between 'a' and 'z'
    return rank.slice(0, -1) + String.fromCharCode(safeChar);
  }
}
