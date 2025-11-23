'use strict';
/**
 * Get character length (1 or 2 bytes for multi-byte characters)
 * @param {String} char - Single character to measure
 * @returns {Number} 1 for single-byte, 2 for multi-byte characters
 */
function charLength(char) {
    const code = char.charCodeAt(0);
    return code > 0x7f && code <= 0xffff ? 2 : 1; // More than 2bytes count as 2
}
/**
 * Calculate parity bit for a string (used in barcode generation)
 * @param {String} str - String to calculate parity for
 * @returns {String} Parity bit as string
 */
exports.getParityBit = function (str) {
    var parity = 0, reversedCode = str.split('').reverse().join('');
    for (var counter = 0; counter < reversedCode.length; counter += 1) {
        parity += parseInt(reversedCode.charAt(counter), 10) * Math.pow(3, ((counter + 1) % 2));
    }
    return String((10 - (parity % 10)) % 10);
};

/**
 * Get code length as hex string
 * @param {String} str - String to get length for
 * @returns {String} Length as hex string
 */
exports.codeLength = function (str) {
    let buff = Buffer.from((str.length).toString(16), 'hex');
    return buff.toString();
}

/**
 * Get text length accounting for multi-byte characters
 * @param {String} str - String to measure
 * @returns {Number} Text length (multi-byte characters count as 2)
 */
exports.textLength = function (str) {
    return str.split('').reduce((accLen, char) => {
        return accLen + charLength(char);
    }, 0)
}

/**
 * Get text substring accounting for multi-byte characters
 * @param {String} str - String to extract from
 * @param {Number} start - Start position (in character units, not bytes)
 * @param {Number} [end] - End position (in character units, not bytes)
 * @returns {String} Resulting substring
 */
exports.textSubstring = function (str, start, end) {
    let accLen = 0;
    return str.split('').reduce((accStr, char) => {
        accLen = accLen + charLength(char);
        return accStr + (accLen > start && (!end || accLen <= end) ? char : '');
    }, '')
}