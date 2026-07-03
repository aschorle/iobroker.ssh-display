'use strict';

const DISPLAY_COMMANDS = {
	'xrandr-hdmi1': {
		on: 'DISPLAY=:0 xrandr --output HDMI-1 --auto',
		off: 'DISPLAY=:0 xrandr --output HDMI-1 --off',
	},
	'xrandr-hdmi-1': {
		on: 'DISPLAY=:0 xrandr --output HDMI-1 --auto',
		off: 'DISPLAY=:0 xrandr --output HDMI-1 --off',
	},
	'xrandr-hdmia1': {
		on: 'DISPLAY=:0 xrandr --output HDMI-A-1 --auto',
		off: 'DISPLAY=:0 xrandr --output HDMI-A-1 --off',
	},
	'xrandr-hdmi-a-1': {
		on: 'DISPLAY=:0 xrandr --output HDMI-A-1 --auto',
		off: 'DISPLAY=:0 xrandr --output HDMI-A-1 --off',
	},
	vcgencmd: {
		on: 'vcgencmd display_power 1',
		off: 'vcgencmd display_power 0',
	},
};

class DisplayDriver {
	/**
	 * @param {ioBroker.AdapterConfig['hosts'][number]} host
	 * @param {boolean} enabled
	 * @returns {string}
	 */
	getCommand(host, enabled) {
		const displayType = host.displayType || host.displayMethod;

		if (displayType === 'custom') {
			const command = enabled ? host.displayOnCommand : host.displayOffCommand;

			if (!command) {
				throw new Error(`Missing custom display ${enabled ? 'on' : 'off'} command`);
			}

			return command;
		}

		const commands = DISPLAY_COMMANDS[displayType];

		if (!commands) {
			throw new Error(`Unsupported display type: ${displayType}`);
		}

		return enabled ? commands.on : commands.off;
	}
}

module.exports = {
	DisplayDriver,
};
