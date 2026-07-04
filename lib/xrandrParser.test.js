'use strict';

const { expect } = require('chai');
const { parseConnectedDisplays } = require('./xrandrParser');

describe('xrandrParser', () => {
	it('returns only connected display outputs', () => {
		const output = [
			'HDMI-1 connected primary 1920x1080+0+0',
			'DP-1 disconnected',
			'eDP-1 connected',
		].join('\n');

		expect(parseConnectedDisplays(output)).to.deep.equal(['HDMI-1', 'eDP-1']);
	});

	it('ignores disconnected outputs and blank lines', () => {
		const output = [
			'',
			'DP-1 disconnected',
			'HDMI-A-1 connected 1280x720+0+0',
			'Virtual-1 disconnected',
			'',
		].join('\r\n');

		expect(parseConnectedDisplays(output)).to.deep.equal(['HDMI-A-1']);
	});
});
