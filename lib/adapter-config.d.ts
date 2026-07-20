type DisplayBackend = 'auto' | 'x11' | 'vcgencmd' | 'ddcutil' | 'custom';

interface DisplayHostConfig {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	privateKeyPath: string;
	displayBackend: DisplayBackend;
	displayOutput?: string;
	displayOnCommand?: string;
	displayOffCommand?: string;
}

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {
			hosts: DisplayHostConfig[];
			displayBackend: DisplayBackend;
			displayOutput: string;
			option1: boolean;
			option2: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};
