'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { DDCUtilBackend, DISPLAY_STATE } = require('./ddcUtilBackend');

describe('DDCUtilBackend', () => {
	it('detects a monitor only when power mode D6 is supported', async () => {
		const exec = sinon.stub();
		exec.onFirstCall().resolves({ stdout: 'Display 1\n', stderr: '', exitCode: 0 });
		exec.onSecondCall().resolves({ stdout: 'Feature: D6 (Power mode)\n', stderr: '', exitCode: 0 });

		expect(await new DDCUtilBackend({ exec }).detect()).to.equal(true);
		expect(exec.getCalls().map(call => call.args[0])).to.deep.equal(['ddcutil detect', 'ddcutil capabilities']);
	});

	it('is unavailable when no monitor is found or D6 is missing', async () => {
		const noMonitorExec = sinon.stub().resolves({ stdout: 'No displays found\n', stderr: '', exitCode: 0 });
		expect(await new DDCUtilBackend({ exec: noMonitorExec }).detect()).to.equal(false);

		const noD6Exec = sinon.stub();
		noD6Exec.onFirstCall().resolves({ stdout: 'Display 1\n', stderr: '', exitCode: 0 });
		noD6Exec.onSecondCall().resolves({ stdout: 'Feature: 10 (Brightness)\n', stderr: '', exitCode: 0 });
		expect(await new DDCUtilBackend({ exec: noD6Exec }).detect()).to.equal(false);
	});

	it('uses the specified VCP commands to turn the monitor on and off', async () => {
		const exec = sinon.stub().resolves({ stdout: '', stderr: '', exitCode: 0 });
		const backend = new DDCUtilBackend({ exec });

		expect(await backend.turnOn()).to.equal(true);
		expect(await backend.turnOff()).to.equal(true);
		expect(exec.getCalls().map(call => call.args[0])).to.deep.equal(['ddcutil setvcp D6 1', 'ddcutil setvcp D6 5']);
	});

	it('maps VCP power values and treats other values as unknown', async () => {
		for (const [value, expected] of [
			['0x01', DISPLAY_STATE.ON],
			['0x04', DISPLAY_STATE.OFF],
			['0x05', DISPLAY_STATE.UNKNOWN],
		]) {
			const exec = sinon.stub().resolves({
				stdout: `VCP code D6 (Power mode): DPM: On, current value = ${value}, max value = 0x05`,
				stderr: '',
				exitCode: 0,
			});
			expect(await new DDCUtilBackend({ exec }).getState()).to.equal(expected);
		}
	});

	it('contains command failures and exceptions', async () => {
		const failed = new DDCUtilBackend({
			exec: sinon.stub().resolves({ stdout: '', stderr: 'failed', exitCode: 1 }),
		});
		expect(await failed.turnOff()).to.equal(false);
		expect(await failed.getState()).to.equal(DISPLAY_STATE.UNKNOWN);

		const throwing = new DDCUtilBackend({ exec: sinon.stub().rejects(new Error('not installed')) });
		expect(await throwing.detect()).to.equal(false);
		expect(await throwing.turnOn()).to.equal(false);
		expect(await throwing.getState()).to.equal(DISPLAY_STATE.UNKNOWN);
	});
});
