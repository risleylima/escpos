function charLength(char: string): number {
  if (!char) return 0;
  const code = char.codePointAt(0) ?? 0;
  // Common rule for CJK and Emoji: if it's beyond the basic Latin range,
  // it usually takes 2 columns in thermal printers.
  return code > 0x7f ? 2 : 1;
}

export function getParityBit(str: string): string {
  let parity = 0;
  const reversedCode = str.split('').reverse().join('');
  for (let counter = 0; counter < reversedCode.length; counter += 1) {
    parity +=
      parseInt(reversedCode.charAt(counter), 10) * Math.pow(3, (counter + 1) % 2);
  }
  return String((10 - (parity % 10)) % 10);
}

/**
 * Returns the length of the string as a Buffer (1 byte).
 * @param str The string to measure
 */
export function codeLength(str: string): Buffer {
  const len = str.length;
  if (len > 255) {
    throw new Error('codeLength: string length must be <= 255 for barcode');
  }
  return Buffer.from([len]);
}

export function textLength(str: string): number {
  // We use Array.from to correctly iterate over Unicode code points (including Emojis)
  return Array.from(str).reduce((accLen, char) => accLen + charLength(char), 0);
}

/**
 * Returns a substring of str by column range (e.g. for thermal printer line width).
 * Columns are 1 for ASCII, 2 for CJK/wide/emoji. Interval is [start, end) in column indices:
 * a character is included when its column span overlaps that range.
 *
 * @param str - Source string (code-point safe)
 * @param start - Start column (inclusive)
 * @param end - End column (exclusive); omitted = to end of string
 */
export function textSubstring(str: string, start: number, end?: number): string {
  let accLen = 0;
  let result = '';
  for (const char of Array.from(str)) {
    const len = charLength(char);
    if (accLen + len > start && (end === undefined || accLen + len <= end)) {
      result += char;
    }
    accLen += len;
    if (end !== undefined && accLen >= end) break;
  }
  return result;
}
