'use strict';

const { createHostStates } = require('./states');
const SSHClient = require('./sshClient');

class HostManager {
	/**
	 * @param {ioBroker.Adapter} adapter
	 */
	constructor(adapter) {
		this.adapter = adapter;
	}

	async start() {
		for (const host of this.adapter.config.hosts || []) {
			if (!host.id) {
				continue;
			}

			await createHostStates(this.adapter, host.id);
			await this.testHost(host);
		}
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
}

module.exports = {
	HostManager,
};
