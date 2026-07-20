'use strict';

class DisplayDriver {
	/**
	 * @param {ioBroker.AdapterConfig['hosts'][number]} host
	 * @param {boolean} enabled
	 * @returns {string}
	 */
	getCommand(host, enabled) {
		const displayBackend = host.displayBackend;

		if (displayBackend === 'custom') {
			const command = enabled ? host.displayOnCommand : host.displayOffCommand;

			if (!command) {
				throw new Error(`Missing custom display ${enabled ? 'on' : 'off'} command`);
			}

			return command;
		}

		if (displayBackend === 'x11') {
			if (!host.displayOutput) {
				throw new Error('Missing X11 display output');
			}

			return `DISPLAY=:0 xrandr --output ${host.displayOutput} --${enabled ? 'auto' : 'off'}`;
		}

		if (displayBackend === 'vcgencmd') {
			return `vcgencmd display_power ${enabled ? '1' : '0'}`;
		}

		if (displayBackend === 'ddcutil') {
			return `ddcutil setvcp D6 ${enabled ? '1' : '5'}`;
		}

		throw new Error(`Unsupported display backend: ${displayBackend}`);
	}
}

module.exports = {
	DisplayDriver,
};
