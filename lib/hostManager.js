'use strict';

const { createHostStates } = require('./states');

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
		}
	}
}

module.exports = {
	HostManager,
};
