'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { DisplayBackendSelector } = require('./displayBackendSelector');

/** @returns {ioBroker.AdapterConfig['hosts'][number]} Test host configuration */
function createHost() {
	return {
		id: 'display',
		name: 'Display',
		host: '192.0.2.1',
		port: 22,
		username: 'user',
		privateKeyPath: '/home/iobroker/.ssh/id_ed25519',
		displayBackend: 'auto',
		displayOnCommand: 'display-on',
		displayOffCommand: 'display-off',
	};
}

describe('DisplayBackendSelector', () => {
	it('selects vcgencmd first without probing lower-priority backends', async () => {
		const exec = sinon.stub().resolves({ stdout: '/usr/bin/vcgencmd\n', stderr: '', exitCode: 0 });
		const backend = await new DisplayBackendSelector({ exec }).select(createHost());

		expect(backend).to.equal('vcgencmd');
		expect(exec).to.have.been.calledOnceWith('command -v vcgencmd');
	});

	it('selects ddcutil after one unsuccessful vcgencmd detection', async () => {
		const exec = sinon.stub();
		exec.onCall(0).resolves({ stdout: '', stderr: '', exitCode: 1 });
		exec.onCall(1).resolves({ stdout: 'Display 1\n', stderr: '', exitCode: 0 });
		exec.onCall(2).resolves({ stdout: 'Feature: D6 (Power mode)\n', stderr: '', exitCode: 0 });

		expect(await new DisplayBackendSelector({ exec }).select(createHost())).to.equal('ddcutil');
		expect(exec.getCalls().map(call => call.args[0])).to.deep.equal([
			'command -v vcgencmd',
			'ddcutil detect',
			'ddcutil capabilities',
		]);
	});

	it('selects xset after ddcutil is unavailable', async () => {
		const exec = sinon.stub();
		exec.onCall(0).resolves({ stdout: '', stderr: '', exitCode: 1 });
		exec.onCall(1).resolves({ stdout: 'No displays found\n', stderr: '', exitCode: 0 });
		exec.onCall(2).resolves({ stdout: '/usr/bin/xset\n/usr/bin/xrandr\n', stderr: '', exitCode: 0 });

		expect(await new DisplayBackendSelector({ exec }).select(createHost())).to.equal('x11');
		expect(exec).to.have.been.calledThrice;
		expect(exec.lastCall).to.have.been.calledWith('command -v xset && command -v xrandr');
	});

	it('uses custom as fallback and otherwise reports no backend', async () => {
		const exec = sinon.stub().resolves({ stdout: '', stderr: '', exitCode: 1 });
		const selector = new DisplayBackendSelector({ exec });

		expect(await selector.select(createHost())).to.equal('custom');
		expect(await selector.select({ ...createHost(), displayOnCommand: undefined })).to.equal(undefined);
	});

	it('does not fall back when explicitly selected ddcutil is unavailable', async () => {
		const exec = sinon.stub().resolves({ stdout: 'No displays found\n', stderr: '', exitCode: 0 });
		/** @type {ioBroker.AdapterConfig['hosts'][number]} */
		const host = { ...createHost(), displayBackend: 'ddcutil' };

		expect(await new DisplayBackendSelector({ exec }).select(host)).to.equal(undefined);
		expect(exec).to.have.been.calledOnceWith('ddcutil detect');
	});
});
