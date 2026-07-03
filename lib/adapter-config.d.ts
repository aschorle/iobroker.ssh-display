type DisplayMethod = 'xrandr-hdmi-1' | 'xrandr-hdmi-a-1' | 'vcgencmd' | 'custom';

interface DisplayHostConfig {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	privateKeyPath: string;
	displayMethod: DisplayMethod;
	displayOnCommand?: string;
	displayOffCommand?: string;
}

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			hosts: DisplayHostConfig[];
			option1: boolean;
			option2: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
