'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { SSHKeyManager } = require('./sshKeyManager');

describe('SSHKeyManager', () => {
	it('does not overwrite an existing private key', async () => {
		const fakeFs = {
			access: sinon.stub().resolves(),
			mkdir: sinon.stub().resolves(),
			readFile: sinon.stub(),
		};
		const execFile = sinon.stub().resolves();
		const manager = new SSHKeyManager({ fs: fakeFs, execFile });

		const result = await manager.generate();

		expect(result).to.deep.equal({ created: false, exists: true });
		expect(fakeFs.mkdir).not.to.have.been.called;
		expect(execFile).not.to.have.been.called;
	});

	it('creates the directory and an ed25519 key when no key exists', async () => {
		const notFound = Object.assign(new Error('not found'), { code: 'ENOENT' });
		const fakeFs = {
			access: sinon.stub().rejects(notFound),
			mkdir: sinon.stub().resolves(),
			readFile: sinon.stub(),
		};
		const execFile = sinon.stub().resolves();
		const manager = new SSHKeyManager({ fs: fakeFs, execFile });

		const result = await manager.generate();

		expect(result).to.deep.equal({ created: true, exists: true });
		expect(fakeFs.mkdir).to.have.been.calledOnceWith('/home/iobroker/.ssh', {
			recursive: true,
			mode: 0o700,
		});
		expect(execFile).to.have.been.calledOnceWith('ssh-keygen', [
			'-t',
			'ed25519',
			'-f',
			'/home/iobroker/.ssh/id_ed25519',
			'-N',
			'',
		]);
	});

	it('does not treat access errors as a missing key', async () => {
		const denied = Object.assign(new Error('permission denied'), { code: 'EACCES' });
		const fakeFs = {
			access: sinon.stub().rejects(denied),
			mkdir: sinon.stub(),
			readFile: sinon.stub(),
		};
		const manager = new SSHKeyManager({ fs: fakeFs });

		await expect(manager.exists()).to.be.rejectedWith('permission denied');
	});

	it('returns the trimmed public key', async () => {
		const fakeFs = {
			access: sinon.stub(),
			mkdir: sinon.stub(),
			readFile: sinon.stub().resolves('ssh-ed25519 AAAA test@host\n'),
		};
		const manager = new SSHKeyManager({ fs: fakeFs });

		expect(await manager.getPublicKey()).to.equal('ssh-ed25519 AAAA test@host');
		expect(fakeFs.readFile).to.have.been.calledOnceWith('/home/iobroker/.ssh/id_ed25519.pub', 'utf8');
	});
});
