'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { normalizeAndPersistHostConfig, normalizeHostConfig } = require('./hostConfig');

/**
 * @param {string} privateKeyPath - Private key path
 * @returns {ioBroker.AdapterConfig['hosts'][number]} Host configuration
 */
function createHost(privateKeyPath) {
	return {
		id: 'host',
		name: 'Host',
		host: '192.0.2.1',
		port: 22,
		username: 'user',
		privateKeyPath,
		displayBackend: 'x11',
		displayOutput: 'HDMI-1',
	};
}

describe('normalizeHostConfig', () => {
	it('adds the default key path when it is missing or empty', () => {
		/** @type {Omit<ioBroker.AdapterConfig['hosts'][number], 'id' | 'privateKeyPath'>} */
		const host = {
			name: 'Test',
			host: '192.0.2.1',
			port: 22,
			username: 'user',
			displayBackend: 'x11',
		};
		const result = normalizeHostConfig([
			{ ...host, id: 'missing' },
			{ ...host, id: 'empty', privateKeyPath: '' },
			{ ...host, id: 'blank', privateKeyPath: '   ' },
		]);

		expect(result.changed).to.equal(true);
		expect(result.hosts.map(host => host.privateKeyPath)).to.deep.equal([
			'/home/iobroker/.ssh/id_ed25519',
			'/home/iobroker/.ssh/id_ed25519',
			'/home/iobroker/.ssh/id_ed25519',
		]);
	});

	it('adds the default display output when it is missing, empty, or blank', () => {
		const host = createHost('/custom/id_ed25519');
		const result = normalizeHostConfig([
			{ ...host, id: 'missing', displayOutput: undefined },
			{ ...host, id: 'empty', displayOutput: '' },
			{ ...host, id: 'blank', displayOutput: '   ' },
		]);

		expect(result.changed).to.equal(true);
		expect(result.hosts.map(host => host.displayOutput)).to.deep.equal(['HDMI-1', 'HDMI-1', 'HDMI-1']);
	});

	it('preserves a custom key path', () => {
		/** @type {ioBroker.AdapterConfig['hosts']} */
		const hosts = [
			{
				id: 'custom',
				name: 'Custom',
				host: '192.0.2.2',
				port: 22,
				username: 'user',
				privateKeyPath: '/custom/id_ed25519',
				displayBackend: 'x11',
				displayOutput: 'DP-1',
			},
		];
		const result = normalizeHostConfig(hosts);

		expect(result).to.deep.equal({ hosts, changed: false });
	});

	it('does not persist an unchanged configuration', async () => {
		const extendForeignObjectAsync = sinon.stub().resolves();
		const adapter = {
			config: /** @type {ioBroker.AdapterConfig} */ ({ hosts: [createHost('/custom/id_ed25519')] }),
			namespace: 'ssh-display.0',
			extendForeignObjectAsync,
		};

		expect(await normalizeAndPersistHostConfig(adapter)).to.equal(false);
		expect(extendForeignObjectAsync).not.to.have.been.called;
	});

	it('persists a normalized configuration exactly once', async () => {
		const extendForeignObjectAsync = sinon.stub().resolves();
		const adapter = {
			config: /** @type {ioBroker.AdapterConfig} */ ({ hosts: [createHost('')] }),
			namespace: 'ssh-display.0',
			extendForeignObjectAsync,
		};

		expect(await normalizeAndPersistHostConfig(adapter)).to.equal(true);
		expect(extendForeignObjectAsync).to.have.been.calledOnceWith('system.adapter.ssh-display.0', {
			native: { hosts: [createHost('/home/iobroker/.ssh/id_ed25519')] },
		});
		expect(await normalizeAndPersistHostConfig(adapter)).to.equal(false);
		expect(extendForeignObjectAsync).to.have.been.calledOnce;
	});
});
