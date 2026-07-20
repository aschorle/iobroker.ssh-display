'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const SSHClient = require('./sshClient');

describe('SSHClient security options', () => {
	it('uses a private key and does not introduce password authentication', async () => {
		const sshClient = new SSHClient({ host: '192.0.2.1', username: 'display', privateKey: 'private-key' });
		const connect = sinon.stub(sshClient.client, 'connect').callsFake(() => {
			sshClient.client.emit('ready');
			return sshClient.client;
		});

		await sshClient.connect();
		const options = connect.firstCall.args[0];
		expect(options.privateKey).to.equal('private-key');
		expect(options).not.to.have.property('password');
		expect(options).not.to.have.property('tryKeyboard');
	});
});
