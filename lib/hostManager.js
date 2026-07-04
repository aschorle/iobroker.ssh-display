'use strict';

const { createHostStates } = require('./states');
const SSHClient = require('./sshClient');
const { DisplayDriver } = require('./displayDriver');
const { parseConnectedDisplays } = require('./xrandrParser');

class HostManager {
	/**
	 * @param {ioBroker.Adapter} adapter
	 */
	constructor(adapter) {
		this.adapter = adapter;
		this.displayDriver = new DisplayDriver();
	}

	async start() {
		for (const host of this.adapter.config.hosts || []) {
			if (!host.id) {
				continue;
			}

			await createHostStates(this.adapter, host.id);
			await this.testHost(host);
		}

		this.adapter.subscribeStates('hosts.*.display.state');
	}

	/**
	 * @param {ioBroker.AdapterConfig['hosts'][number]} host
	 */
	async testHost(host) {
		const sshClient = new SSHClient({
			host: host.host,
			port: host.port,
			username: host.username,
			privateKeyPath: host.privateKeyPath,
		});

		try {
			await sshClient.connect();
			const result = await sshClient.exec('hostname');

			if (result.exitCode !== 0) {
				throw new Error(`hostname failed with exit code ${result.exitCode}`);
			}

			await this.adapter.setStateAsync(`hosts.${host.id}.info.online`, { val: true, ack: true });
			await this.adapter.setStateAsync(`hosts.${host.id}.info.hostname`, { val: result.stdout.trim(), ack: true });
			await this.adapter.setStateAsync(`hosts.${host.id}.info.lastSeen`, { val: new Date().toISOString(), ack: true });
		} catch (error) {
			this.adapter.log.warn(`Host ${host.id} is not reachable: ${error.message}`);
			await this.adapter.setStateAsync(`hosts.${host.id}.info.online`, { val: false, ack: true });
		} finally {
			sshClient.disconnect();
		}
	}

	/**
	 * @param {string} hostId
	 * @returns {Promise<{ success: true, hostname: string, online: true } | { success: false, error: string }>}
	 */
	async testConnection(hostId) {
		const host = (this.adapter.config.hosts || []).find(configuredHost => configuredHost.id === hostId);

		if (!host) {
			return { success: false, error: `Unknown host: ${hostId}` };
		}

		const sshClient = new SSHClient({
			host: host.host,
			port: host.port,
			username: host.username,
			privateKeyPath: host.privateKeyPath,
		});

		try {
			await sshClient.connect();
			const result = await sshClient.exec('hostname');

			if (result.exitCode !== 0) {
				throw new Error(result.stderr.trim() || `hostname failed with exit code ${result.exitCode}`);
			}

			return {
				success: true,
				hostname: result.stdout.trim(),
				online: true,
			};
		} catch (error) {
			return { success: false, error: error.message };
		} finally {
			sshClient.disconnect();
		}
	}

	/**
	 * @param {string} hostId
	 * @returns {Promise<{ success: true, displays: string[] } | { success: false, error: string }>}
	 */
	async detectDisplays(hostId) {
		const host = (this.adapter.config.hosts || []).find(configuredHost => configuredHost.id === hostId);

		if (!host) {
			return { success: false, error: `Unknown host: ${hostId}` };
		}

		const sshClient = new SSHClient({
			host: host.host,
			port: host.port,
			username: host.username,
			privateKeyPath: host.privateKeyPath,
		});

		try {
			await sshClient.connect();
			const result = await sshClient.exec('DISPLAY=:0 xrandr --query');

			if (result.exitCode !== 0) {
				throw new Error(result.stderr.trim() || `xrandr query failed with exit code ${result.exitCode}`);
			}

			return {
				success: true,
				displays: parseConnectedDisplays(result.stdout),
			};
		} catch (error) {
			return { success: false, error: error.message };
		} finally {
			sshClient.disconnect();
		}
	}

	/**
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		if (!state || state.ack !== false || typeof state.val !== 'boolean') {
			return;
		}

		const namespacePrefix = `${this.adapter.namespace}.`;
		const stateId = id.startsWith(namespacePrefix) ? id.slice(namespacePrefix.length) : id;
		const match = stateId.match(/^hosts\.([^.]+)\.display\.state$/);

		if (!match) {
			return;
		}

		const host = (this.adapter.config.hosts || []).find(configuredHost => configuredHost.id === match[1]);

		if (!host) {
			this.adapter.log.warn(`Received display state for unknown host ${match[1]}`);
			return;
		}

		await this.setDisplayState(host, state.val);
	}

	/**
	 * @param {ioBroker.AdapterConfig['hosts'][number]} host
	 * @param {boolean} enabled
	 */
	async setDisplayState(host, enabled) {
		const sshClient = new SSHClient({
			host: host.host,
			port: host.port,
			username: host.username,
			privateKeyPath: host.privateKeyPath,
		});

		try {
			const command = this.displayDriver.getCommand(host, enabled);

			await sshClient.connect();
			const result = await sshClient.exec(command);

			if (result.exitCode !== 0) {
				throw new Error(`display command failed with exit code ${result.exitCode}`);
			}

			await this.adapter.setStateAsync(`hosts.${host.id}.display.state`, { val: enabled, ack: true });
		} catch (error) {
			this.adapter.log.warn(`Could not set display state for host ${host.id}: ${error.message}`);
		} finally {
			sshClient.disconnect();
		}
	}
}

module.exports = {
	HostManager,
};
