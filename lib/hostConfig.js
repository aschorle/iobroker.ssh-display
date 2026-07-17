'use strict';

const { DEFAULT_SSH_KEY_PATH } = require('./sshKeyManager');
const DEFAULT_DISPLAY_OUTPUT = 'HDMI-1';

/**
 * @param {Array<Omit<ioBroker.AdapterConfig['hosts'][number], 'privateKeyPath'> & { privateKeyPath?: string }> | undefined} hosts - Configured hosts
 * @returns {{ hosts: ioBroker.AdapterConfig['hosts'], changed: boolean }} Normalized hosts and change flag
 */
function normalizeHostConfig(hosts) {
	let changed = false;
	const normalizedHosts = (hosts || []).map(host => {
		let normalizedHost = host;

		if (!(typeof host.privateKeyPath === 'string' && host.privateKeyPath.trim())) {
			changed = true;
			normalizedHost = { ...normalizedHost, privateKeyPath: DEFAULT_SSH_KEY_PATH };
		}

		if (!(typeof host.displayOutput === 'string' && host.displayOutput.trim())) {
			changed = true;
			normalizedHost = { ...normalizedHost, displayOutput: DEFAULT_DISPLAY_OUTPUT };
		}

		return normalizedHost;
	});

	return { hosts: /** @type {ioBroker.AdapterConfig['hosts']} */ (normalizedHosts), changed };
}

/**
 * @param {{
 *   config: ioBroker.AdapterConfig,
 *   namespace: string,
 *   extendForeignObjectAsync: (id: string, obj: { native: { hosts: ioBroker.AdapterConfig['hosts'] } }) => Promise<unknown>
 * }} adapter - Adapter instance
 * @returns {Promise<boolean>} Whether the persisted configuration was changed
 */
async function normalizeAndPersistHostConfig(adapter) {
	const normalized = normalizeHostConfig(adapter.config.hosts);
	adapter.config.hosts = normalized.hosts;

	if (normalized.changed) {
		await adapter.extendForeignObjectAsync(`system.adapter.${adapter.namespace}`, {
			native: { hosts: normalized.hosts },
		});
	}

	return normalized.changed;
}

module.exports = { DEFAULT_DISPLAY_OUTPUT, normalizeAndPersistHostConfig, normalizeHostConfig };
