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

	it('diagnoses a missing ddcutil command', async () => {
		const warn = sinon.spy();
		const exec = sinon.stub().resolves({ stdout: '', stderr: 'ddcutil: command not found', exitCode: 127 });

		expect(await new DDCUtilBackend({ exec }, { warn }).detect()).to.equal(false);
		expect(warn).to.have.been.calledOnceWith('ddcutil is not installed on the remote host.');
	});

	it('diagnoses missing I2C device permissions', async () => {
		const warn = sinon.spy();
		const exec = sinon.stub().resolves({
			stdout: '',
			stderr: 'Device /dev/i2c-1 is not readable and writable: EACCES(13): Permission denied',
			exitCode: 1,
		});

		expect(await new DDCUtilBackend({ exec }, { warn }).detect()).to.equal(false);
		expect(warn).to.have.been.calledOnceWith(
			'The SSH user cannot access /dev/i2c-*; run ddcutil as the configured SSH user to verify permissions.',
		);
	});

	it('diagnoses no display and unsupported D6 separately', async () => {
		const noDisplayWarn = sinon.spy();
		const noDisplayExec = sinon.stub().resolves({ stdout: 'No displays found\n', stderr: '', exitCode: 0 });
		expect(await new DDCUtilBackend({ exec: noDisplayExec }, { warn: noDisplayWarn }).detect()).to.equal(false);
		expect(noDisplayWarn).to.have.been.calledOnceWith('No compatible DDC/CI display was detected.');

		const noD6Warn = sinon.spy();
		const noD6Exec = sinon.stub();
		noD6Exec.onFirstCall().resolves({ stdout: 'Display 1\n', stderr: '', exitCode: 0 });
		noD6Exec.onSecondCall().resolves({ stdout: 'Feature: 10 (Brightness)\n', stderr: '', exitCode: 0 });
		expect(await new DDCUtilBackend({ exec: noD6Exec }, { warn: noD6Warn }).detect()).to.equal(false);
		expect(noD6Warn).to.have.been.calledOnceWith('The monitor does not appear to support VCP feature D6.');
	});

	it('diagnoses SSH command timeouts without exposing exception details', async () => {
		const warn = sinon.spy();
		const exec = sinon.stub().rejects(new Error('SSH command timed out after 10000 ms; secret output'));

		expect(await new DDCUtilBackend({ exec }, { warn }).detect()).to.equal(false);
		expect(warn).to.have.been.calledOnceWith(
			'The SSH command timed out while attempting to detect displays with ddcutil.',
		);
		expect(warn.firstCall.args[0]).not.to.include('secret output');
	});

	it('generates only fixed ddcutil commands without sudo', async () => {
		const exec = sinon.stub().resolves({ stdout: '', stderr: '', exitCode: 0 });
		const backend = new DDCUtilBackend({ exec });

		await backend.turnOff();
		await backend.turnOn();
		const commands = exec.getCalls().map(call => call.args[0]);
		expect(commands).to.deep.equal(['ddcutil setvcp D6 5', 'ddcutil setvcp D6 1']);
		expect(commands.every(command => !/\bsudo\b/.test(command))).to.equal(true);
	});
});
