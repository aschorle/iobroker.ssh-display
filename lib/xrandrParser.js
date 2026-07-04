'use strict';

/**
 * Parses xrandr output and returns connected display output names.
 *
 * @param {string} output
 * @returns {string[]}
 */
function parseConnectedDisplays(output) {
	if (typeof output !== 'string') {
		return [];
	}

	return output
		.split(/\r?\n/)
		.map(line => line.trim())
		.filter(line => line && /\bconnected\b/.test(line) && !/\bdisconnected\b/.test(line))
		.map(line => line.split(/\s+/)[0]);
}

module.exports = {
	parseConnectedDisplays,
};
