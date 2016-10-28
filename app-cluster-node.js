/*!
 * Game node engine
 * Copyright(c) 2016 Wisdman <wisdman@ajaw.it>
 */

'use strict';
const REBUILD_CLUSTER_TIMEOUT = 10 * 1000

const os = require('os')
const fs = require('fs')
const Netmask = require('netmask').Netmask
const uuid = require('uuid')

const ifaces = os.networkInterfaces()
const myIPAddresses = []
const netBlocks = []

module.exports = class AppClusterNode {
	constructor() {
		this.id = uuid.v1()

		this.myIPAddresses = []
		this.neighborIPAddresses = []

		this.settings = JSON.parse(fs.readFileSync('settings.json', 'utf8') || '{}')
		this.questions = JSON.parse(fs.readFileSync('questions.json', 'utf8') || '[]')
		this.scoreboard = JSON.parse(fs.readFileSync('scoreboard.json', 'utf8') || '[]')

		this.rebuildClusterLoop()
	}

	get firstIP() {
		return this.myIPAddresses[0] || '0.0.0.0'
	}

	rebuildClusterLoop() {
		let myIPAddresses = []
		let netBlocks = []

		for (let ifaceName in ifaces) {
			for (let iface of ifaces[ifaceName])
				if (iface.family === 'IPv4' && !iface.internal) {
					myIPAddresses.push(iface.address)
					netBlocks.push(new Netmask(iface.address, iface.netmask))
				}
		}

		let neighborIPAddresses = []

		netBlocks.forEach(netBlock =>
			netBlock.forEach(ip => {
				if (!myIPAddresses.includes(ip))
					neighborIPAddresses.push(ip)
			})
		)

		this.myIPAddresses = myIPAddresses.slice();
		this.neighborIPAddresses = neighborIPAddresses.slice();

		new Promise( resolve => {

			if (this.onUpdate instanceof Function)
				this.onUpdate.call(this)

			setTimeout(() => resolve(), REBUILD_CLUSTER_TIMEOUT)

		}).catch( error => console.error(error) )
		.then( () => this.rebuildClusterLoop() )
	}

	get record() {
		return this.scoreboard.reduce( (prev, item) => Math.max(prev, item.value), 0 )
	}

	addRecord(id, name, value, photo) {
		this.scoreboard.push({
			id: id,
			name: name,
			value: value
		})
		fs.writeFileSync('scoreboard.json', JSON.stringify(this.scoreboard, null, '\t'), 'utf8')

	}
}
