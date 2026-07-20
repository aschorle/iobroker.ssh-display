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

			if (detected.exitCode !== 0 || !/^\s*Display\s+\d+/im.test(detected.stdout)) {
				return false;
			}

			const capabilities = await this.sshClient.exec('ddcutil capabilities');
			return capabilities.exitCode === 0 && /^\s*Feature:\s*D6\b/im.test(capabilities.stdout);
		} catch (error) {
			this.logFailure('detect display', error);
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
			this.logFailure('read display state', error);
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
			return result.exitCode === 0;
		} catch (error) {
			this.logFailure('set display power mode', error);
			return false;
		}
	}

	/**
	 * @param {string} action
	 * @param {unknown} error
	 */
	logFailure(action, error) {
		const message = error instanceof Error ? error.message : String(error);
		this.log.debug?.(`Could not ${action} with ddcutil: ${message}`);
	}
}

module.exports = { DDCUtilBackend, DISPLAY_STATE };
