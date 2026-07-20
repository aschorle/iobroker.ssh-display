'use strict';

const { DDCUtilBackend } = require('./ddcUtilBackend');

class DisplayBackendSelector {
	/**
	 * @param {{ exec: (command: string) => Promise<{ stdout: string, stderr: string, exitCode: number | null }> }} sshClient - Connected SSH client
	 * @param {{ debug?: (message: string) => void }} [log] - Adapter logger
	 */
	constructor(sshClient, log = {}) {
		this.sshClient = sshClient;
		this.log = log;
	}

	/**
	 * Detects the first available backend in priority order. Each detector is
	 * invoked at most once and lower-priority backends are not probed needlessly.
	 *
	 * @param {ioBroker.AdapterConfig['hosts'][number]} host - Host configuration used for the custom fallback
	 * @returns {Promise<'vcgencmd' | 'ddcutil' | 'x11' | 'custom' | undefined>} Selected runtime backend
	 */
	async select(host) {
		if (await this.commandExists('vcgencmd')) {
			return 'vcgencmd';
		}

		const ddcutil = new DDCUtilBackend(this.sshClient, this.log);

		if (await ddcutil.detect()) {
			return 'ddcutil';
		}

		// Keep the established xrandr control path while detecting the requested xset backend.
		if (await this.xsetAvailable()) {
			return 'x11';
		}

		if (host.displayOnCommand && host.displayOffCommand) {
			return 'custom';
		}

		return undefined;
	}

	/**
	 * @param {string} command - Executable to look up
	 * @returns {Promise<boolean>} Whether the executable is available
	 */
	async commandExists(command) {
		try {
			const result = await this.sshClient.exec(`command -v ${command}`);
			return result.exitCode === 0;
		} catch (error) {
			this.logFailure(command, error);
			return false;
		}
	}

	/** @returns {Promise<boolean>} Whether the established X11 backend can be used */
	async xsetAvailable() {
		try {
			const result = await this.sshClient.exec('command -v xset && command -v xrandr');
			return result.exitCode === 0;
		} catch (error) {
			this.logFailure('xset', error);
			return false;
		}
	}

	/**
	 * @param {string} backend - Backend whose detection failed
	 * @param {unknown} error - Detection error
	 */
	logFailure(backend, error) {
		const message = error instanceof Error ? error.message : String(error);
		this.log.debug?.(`Could not detect ${backend} display backend: ${message}`);
	}
}

module.exports = { DisplayBackendSelector };
