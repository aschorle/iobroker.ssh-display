'use strict';

const fs = require('fs/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');

const DEFAULT_SSH_KEY_PATH = '/home/iobroker/.ssh/id_ed25519';

/**
 * @typedef {object} SSHKeyFileSystem
 * @property {(path: string) => Promise<void>} access
 * @property {(path: string, options: { recursive: true, mode: number }) => Promise<string | undefined>} mkdir
 * @property {(path: string, encoding: 'utf8') => Promise<string>} readFile
 */

class SSHKeyManager {
	/**
	 * @param {object} [options]
	 * @param {string} [options.keyPath]
	 * @param {SSHKeyFileSystem} [options.fs]
	 * @param {(file: string, args: string[]) => Promise<unknown>} [options.execFile]
	 */
	constructor(options = {}) {
		this.keyPath = options.keyPath || DEFAULT_SSH_KEY_PATH;
		this.fs = options.fs || fs;
		this.execFile = options.execFile || promisify(execFile);
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	async exists() {
		try {
			await this.fs.access(this.keyPath);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * @returns {Promise<{ created: boolean, exists: true }>}
	 */
	async generate() {
		if (await this.exists()) {
			return { created: false, exists: true };
		}

		const sshDirectory = this.keyPath.slice(0, this.keyPath.lastIndexOf('/'));
		await this.fs.mkdir(sshDirectory, { recursive: true, mode: 0o700 });
		await this.execFile('ssh-keygen', ['-t', 'ed25519', '-f', this.keyPath, '-N', '']);
		return { created: true, exists: true };
	}

	/**
	 * @returns {Promise<string>}
	 */
	async getPublicKey() {
		return (await this.fs.readFile(`${this.keyPath}.pub`, 'utf8')).trim();
	}
}

module.exports = { DEFAULT_SSH_KEY_PATH, SSHKeyManager };
