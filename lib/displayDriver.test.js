'use strict';

const { expect } = require('chai');
const { DisplayDriver } = require('./displayDriver');

describe('DisplayDriver', () => {
	it('returns the ddcutil power-mode commands', () => {
		const driver = new DisplayDriver();
		/** @type {ioBroker.AdapterConfig['hosts'][number]} */
		const host = {
			id: 'display',
			name: 'Display',
			host: '192.0.2.1',
			port: 22,
			username: 'user',
			privateKeyPath: '/home/iobroker/.ssh/id_ed25519',
			displayBackend: 'ddcutil',
		};

		expect(driver.getCommand(host, true)).to.equal('ddcutil setvcp D6 1');
		expect(driver.getCommand(host, false)).to.equal('ddcutil setvcp D6 5');
	});
});
