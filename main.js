'use strict';

/*
 * Created with @iobroker/create-adapter v3.1.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const { HostManager } = require('./lib/hostManager');

// Load your modules here, e.g.:
// const fs = require('fs');

class SshDisplay extends utils.Adapter {
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	constructor(options) {
		super({
			...options,
			name: 'ssh-display',
		});
		this.hostManager = null;
		this.on('ready', this.onReady.bind(this));
		this.on('stateChange', this.onStateChange.bind(this));
		// this.on('objectChange', this.onObjectChange.bind(this));
		this.on('message', this.onMessage.bind(this));
		this.on('unload', this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		this.hostManager = new HostManager(this);
		await this.hostManager.start();
	}

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param {() => void} callback - Callback function
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${error.message}`);
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param {string} id - State ID
	 * @param {ioBroker.State | null | undefined} state - State object
	 */
	async onStateChange(id, state) {
		await this.hostManager?.onStateChange(id, state);
	}
	/**
	 * @param {ioBroker.Message} obj
	 */
	async onMessage(obj) {
		if (!obj || typeof obj !== 'object' || !obj.callback) {
			return;
		}

		let response;

		if (!this.hostManager) {
			response = { success: false, error: 'Host manager is not ready' };
		} else if (obj.command === 'testConnection') {
			response = await this.hostManager.testConnection(obj.message?.host);
		} else if (obj.command === 'detectDisplays') {
			response = await this.hostManager.detectDisplays(obj.message?.host);
		} else {
			response = { success: false, error: `Unsupported command: ${obj.command}` };
		}

		this.sendTo(obj.from, obj.command, response, obj.callback);
	}
}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options] - Adapter options
	 */
	module.exports = options => new SshDisplay(options);
} else {
	// otherwise start the instance directly
	new SshDisplay();
}
