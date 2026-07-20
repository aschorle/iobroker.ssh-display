'use strict';

const DISPLAY_STATE = Object.freeze({
	ON: 'ON',
	OFF: 'OFF',
	UNKNOWN: 'UNKNOWN',
});

class DDCUtilBackend {
	/**
	 * @param {{ exec: (command: string) => Promise<{ stdout: string, stderr: string, exitCode: number | null }> }} sshClient
	 * @param {{ debug?: (message: string) => void, warn?: (message: string) => void }} [log]
	 */
	constructor(sshClient, log = {}) {
		this.sshClient = sshClient;
		this.log = log;
	}

	/**
	 * Detects a monitor and verifies that it supports the VCP power-mode feature.
	 *
	 * @returns {Promise<boolean>}
	 */
	async detect() {
		try {
			const detected = await this.sshClient.exec('ddcutil detect');

			if (detected.exitCode !== 0) {
				this.logExecutionFailure('detect displays', detected);
				return false;
			}

			if (!/^\s*Display\s+\d+/im.test(detected.stdout)) {
				this.log.warn?.('No compatible DDC/CI display was detected.');
				return false;
			}

			const capabilities = await this.sshClient.exec('ddcutil capabilities');

			if (capabilities.exitCode !== 0) {
				this.logExecutionFailure('read display capabilities', capabilities);
				return false;
			}

			if (!/^\s*Feature:\s*D6\b/im.test(capabilities.stdout)) {
				this.log.warn?.('The monitor does not appear to support VCP feature D6.');
				return false;
			}

			return true;
		} catch (error) {
			this.logException('detect displays', error);
			return false;
		}
	}

	/** @returns {Promise<boolean>} */
	async turnOn() {
		return this.setPowerMode(1);
	}

	/** @returns {Promise<boolean>} */
	async turnOff() {
		return this.setPowerMode(5);
	}

	/**
	 * @returns {Promise<'ON' | 'OFF' | 'UNKNOWN'>}
	 */
	async getState() {
		try {
			const result = await this.sshClient.exec('ddcutil getvcp D6');

			if (result.exitCode !== 0) {
				this.logExecutionFailure('read display state', result);
				return DISPLAY_STATE.UNKNOWN;
			}

			const match = result.stdout.match(/current\s+value\s*=\s*(0x[0-9a-f]+)/i);
			const value = match?.[1].toLowerCase();

			if (value === '0x01') {
				return DISPLAY_STATE.ON;
			}

			if (value === '0x04') {
				return DISPLAY_STATE.OFF;
			}

			return DISPLAY_STATE.UNKNOWN;
		} catch (error) {
			this.logException('read display state', error);
			return DISPLAY_STATE.UNKNOWN;
		}
	}

	/**
	 * @param {1 | 5} mode
	 * @returns {Promise<boolean>}
	 */
	async setPowerMode(mode) {
		try {
			const result = await this.sshClient.exec(`ddcutil setvcp D6 ${mode}`);

			if (result.exitCode !== 0) {
				this.logExecutionFailure('set display power mode', result);
				return false;
			}

			return true;
		} catch (error) {
			this.logException('set display power mode', error);
			return false;
		}
	}

	/**
	 * @param {string} action
	 * @param {unknown} error
	 */
	logException(action, error) {
		const message = error instanceof Error ? error.message : String(error);

		if (/(?:command not found|ddcutil:\s*not found|not recognized)/i.test(message)) {
			this.log.warn?.('ddcutil is not installed on the remote host.');
			return;
		}

		if (/(?:\/dev\/i2c-|EACCES\s*\(?13\)?|permission denied)/i.test(message)) {
			this.log.warn?.(
				'The SSH user cannot access /dev/i2c-*; run ddcutil as the configured SSH user to verify permissions.',
			);
			return;
		}

		if (/timed out|timeout/i.test(message)) {
			this.log.warn?.(`The SSH command timed out while attempting to ${action} with ddcutil.`);
			return;
		}

		this.log.warn?.(`ddcutil failed to ${action}.`);
	}

	/**
	 * @param {string} action - Attempted ddcutil operation
	 * @param {{ stdout: string, stderr: string, exitCode: number | null }} result - SSH command result
	 */
	logExecutionFailure(action, result) {
		const output = `${result.stdout}\n${result.stderr}`;

		if (result.exitCode === 127 || /(?:command not found|ddcutil:\s*not found|not recognized)/i.test(output)) {
			this.log.warn?.('ddcutil is not installed on the remote host.');
			return;
		}

		if (/(?:\/dev\/i2c-|EACCES\s*\(?13\)?|permission denied)/i.test(output)) {
			this.log.warn?.(
				'The SSH user cannot access /dev/i2c-*; run ddcutil as the configured SSH user to verify permissions.',
			);
			return;
		}

		if (/no displays? found|no monitor detected|no compatible display/i.test(output)) {
			this.log.warn?.('No compatible DDC/CI display was detected.');
			return;
		}

		this.log.warn?.(`ddcutil failed to ${action} (exit code ${result.exitCode ?? 'unknown'}).`);
	}
}

module.exports = { DDCUtilBackend, DISPLAY_STATE };
