/*!
 * Game node engine
 * Copyright(c) 2016 Wisdman <wisdman@ajaw.it>
 */

module.exports = class App {
	constructor(node) {
		if (!node)
			throw new TypeError('Node is not set')

		if (!(node instanceof Node))
			throw new TypeError(`Node "${value}" is not instance of class Node`)

		this.node = node

		this.UI = Array.prototype.reduce.call(node.querySelectorAll('[app-ui]'), (prev, node) => {
			let name = node.getAttribute('app-ui')
			prev[name] = node
			window.requestAnimationFrame(() => prev[name].setAttribute('hidden', ''))
			return prev
		}, {})

		this.node.$app = this

		this.events = { }
		this.bindEvents()

		this.bind = {}
		this.style = {}
		this.data = new Proxy({}, {
			set: (target, name, value) => {
				target[name] = value
				this.refreshBind(name)
				return target[name]
			},
			get: (target, name) => name in target ? target[name] : null
		})
		this.bindValues()
		this.bindStyles()

		this.nodes = Array.prototype.reduce.call(node.querySelectorAll('[app-node]'), (prev, node) => {
			let name = node.getAttribute('app-node')
			if (!name)
				return prev

			prev[name] = node
			return prev
		}, {})
	}

	setUI(modules = [], className = '') {
		window.requestAnimationFrame(() => {
			for (let module in this.UI)
				if (modules.includes(module))
					this.UI[module].removeAttribute('hidden')
				else
					this.UI[module].setAttribute('hidden', '')
			this.node.className = className || ''
		})
	}

	callEvent(name, event) {
		if (!this.events[name])
			return
		this.events[name].forEach( fn => fn.call(this, event) )
	}

	refreshBind(name) {
		if (!this.bind[name])
			return
		this.bind[name].forEach( fn => fn.call(this, this.data[name]))
	}

	on(name,  fn) {
		if (!this.events[name])
			this.events[name] = []

		this.events[name].push(fn)
	}

	bindEvents(node = this.node) {
		Array.prototype.forEach.call(node.querySelectorAll('[app-event]'), node => {
			let data = node.getAttribute('app-event')
			if (!data)
				return

			let [type, name] = data.split(/\s*,\s*/).map(value => value.trim()).filter(value => !!value)

			if (!type || !name)
				return

			node.addEventListener(type, event => this.callEvent(name, event))
		})
	}

	bindValues(node = this.node) {
		Array.prototype.forEach.call(node.querySelectorAll('[app-bind]'), node => {
			if (!(node instanceof HTMLElement))
				return

			let name = node.getAttribute('app-bind')
			if (!name)
				return

			if (!this.bind[name])
				this.bind[name] = []

			this.bind[name].push(value => {
				if (node instanceof HTMLInputElement)
					node.value = String(value || '').trim()
				else
					node.innerHTML = String(value || '').trim()
			})

			if (node instanceof HTMLInputElement) {
				node.addEventListener('change', () => this.data[name] = node.value)
			}
		})
	}

	bindStyles(node = this.node) {
		Array.prototype.forEach.call(node.querySelectorAll('[app-style]'), node => {
			let data = node.getAttribute('app-style')
			if (!data)
				return

			let [style, name] = data.split(/\s*,\s*/).map(value => value.trim()).filter(value => !!value)

			if (!style || !name)
				return

			if (!this.bind[name])
				this.bind[name] = []

			this.bind[name].push(value => node.style[style] = value)
		})
	}
}
