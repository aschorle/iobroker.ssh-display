'use strict';

/**
 * @param {ioBroker.Adapter} adapter
 * @param {string} hostId
 */
async function createHostStates(adapter, hostId) {
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
