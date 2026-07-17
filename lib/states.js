'use strict';

/**
 * @param {ioBroker.Adapter} adapter
 * @param {ioBroker.AdapterConfig['hosts'][number]} host
 */
async function createHostStates(adapter, host) {
	const hostId = host.id;
	await adapter.setObjectNotExistsAsync(`hosts.${hostId}`, {
		type: 'device',
		common: {
			name: hostId,
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.info`, {
		type: 'channel',
		common: {
			name: 'Info',
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.info.online`, {
		type: 'state',
		common: {
			name: 'Online',
			type: 'boolean',
			role: 'indicator.connected',
			read: true,
			write: false,
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.info.hostname`, {
		type: 'state',
		common: {
			name: 'Hostname',
			type: 'string',
			role: 'info.name',
			read: true,
			write: false,
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.info.lastSeen`, {
		type: 'state',
		common: {
			name: 'Last seen',
			type: 'string',
			role: 'date',
			read: true,
			write: false,
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.info.displayOutput`, {
		type: 'state',
		common: {
			name: 'Display output',
			type: 'string',
			role: 'text',
			read: true,
			write: false,
		},
		native: {},
	});

	await adapter.setStateAsync(`hosts.${hostId}.info.displayOutput`, {
		val: host.displayOutput || 'HDMI-1',
		ack: true,
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.display`, {
		type: 'channel',
		common: {
			name: 'Display',
		},
		native: {},
	});

	await adapter.setObjectNotExistsAsync(`hosts.${hostId}.display.state`, {
		type: 'state',
		common: {
			name: 'State',
			type: 'boolean',
			role: 'switch',
			read: true,
			write: true,
		},
		native: {},
	});
}

module.exports = {
	createHostStates,
};
