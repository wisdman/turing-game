/*!
 * Game engine
 * Copyright(c) 2016 Wisdman <wisdman@ajaw.it>
 */

'use strict';
const MODE_HEAD = 1
const MODE_DISKLEIMER = 2
const MODE_GAME = 3
const MODE_RESULT = 4
const MODE_SCOREBOARD = 5

const AppClusterNode = require('../app-cluster-node.js')
const appClusterNode = new AppClusterNode()

const App = require('./app.js')

if (!appClusterNode.settings.gameTime)
	throw TypeError('gameTime setting not set')

Array.prototype.shuffle = function() {
	for (let i = this.length; i; i--) {
		let j = Math.floor(Math.random() * i);
		[this[i - 1], this[j]] = [this[j], this[i - 1]];
	}
	return this
}

const buildScoreboard = (parentNode) => {
	if (!parentNode)
		throw TypeError('parentNode not set')

	parentNode.innerHTML = '<div class="scoreboard_card empty current"></div><div class="scoreboard_card empty"></div>'

	appClusterNode.scoreboard
	.sort((a, b) => a.value < b.value ? 1 : -1 )
	.forEach( item => {
		let node = document.createElement('div')
		node.className = 'scoreboard_card'
		node.innerHTML = `<div class="scoreboard_card_image"></div><span class="scoreboard_card_name">${item.name}</span><span class="scoreboard_card_score source">${item.value}</span>`
		parentNode.appendChild(node)
	})
}

const buildQuestions = (parentNode) => {
	if (!parentNode)
		throw TypeError('parentNode not set')

	parentNode.innerHTML = ''

	let maxHeight = 0

	let arr = appClusterNode.questions
	.reduce( (prev, item) => {
		let node = document.createElement('div')
		node.className = 'question_card'
		node.$type = ['human', 'ai'][ Math.round(Math.random())]
		node.innerHTML = `<p class="question_card_text">${item.question}</p><p class="question_card_answer">${item[node.$type]}</p>`
		prev.push(node)
		return prev
	}, [])
	.shuffle()

	arr.forEach(node => {
		parentNode.appendChild(node)
		maxHeight = Math.max(maxHeight, node.getBoundingClientRect().height)
	})

	maxHeight = Math.ceil(maxHeight)

	arr.forEach(node => {
		node.style.minHeight = `${maxHeight}px`
		node.style.height = `${maxHeight}px`
	})
	parentNode.style.maxHeight = `${maxHeight}px`
	parentNode.style.height = `${maxHeight}px`
}

const ledZero = n => String(n).length > 1 ? n : (+n > 0) ? "0" + n : n;

const timeToStr = time => {
	let ms = time % 1000
	let mm = Math.floor(time / 1000)
	let ss = mm % 60
	mm = Math.floor(mm / 60)
	return `${ledZero(mm)}:${ledZero(ss)}.${ms}`
}

window.addEventListener('DOMContentLoaded', () => {

	const game = new App(document.body)
	let questionNode = game.nodes.question
	let currentQuestion = null

	let gameMode = MODE_HEAD
	let score = 0
	let time = 0
	let record = 0

	let stime = 0
	const gameLoop = () => {
		if (gameMode !== MODE_GAME)
			return

		let etime = +new Date()
		let diff = etime - stime
		stime = +new Date()
		time -= diff

		if (time < 0) {
			game.data.title = 'Время истекло!'
			setMode(MODE_RESULT)
		}

		let progress = record > 0 ? (score / record * 100) : 100
		if (progress > 100)
			progress = 100

		let recordOpacity = (100 - progress)/13
		if (recordOpacity > 1)
			recordOpacity = 1

		window.requestAnimationFrame(() => {
			game.data.record = String(record)
			game.data.progress = `${progress}%`
			game.data.recordOpacity = `${recordOpacity}`
			game.data.score = String(score)
			game.data.time = timeToStr(time)
			setTimeout(gameLoop, 0)
		})
	}

	const setMode = (mode) => {
		gameMode = mode
		switch(mode) {
			case MODE_HEAD:
				game.setUI()
			break
			case MODE_DISKLEIMER:
				game.setUI(['diskleimer', 'sysinfo', 'scoreboard-btn'], 'dark')
			break
			case MODE_GAME:
				game.data.title = 'Оприделите кто отвечает'
				game.data.close = 'Завершить игру'
				score = 0
				time = appClusterNode.settings.gameTime * 1000
				record = appClusterNode.record

				buildQuestions(questionNode)
				currentQuestion = questionNode.firstChild
				currentQuestion.classList.add('current')

				game.setUI(['question', 'title', 'sysinfo', 'scoreline', 'close'])
				stime = +new Date()
				gameLoop()
			break
			case MODE_RESULT:
				document.body.$app.setUI(['result', 'title', 'sysinfo', 'scoreline', 'close', 'scoreboard-btn'])
			break
			case MODE_SCOREBOARD:
				game.data.title = 'Лучшие результаты'
				game.data.close = 'Закрыть таблицу'
				buildScoreboard(game.nodes.scoreboard)
				game.setUI(['scoreboard', 'title', 'sysinfo', 'close'], 'dark')
			break
			default:
				throw new TypeError(`"${mode}" is unknown game mode`)
		}
	}

	window.addEventListener('mousemove', event => {
		if (gameMode === MODE_HEAD)
			setMode(MODE_DISKLEIMER)
	})

	game.on('scoreboard', event => setMode(MODE_SCOREBOARD))
	game.on('end', event => setMode(MODE_DISKLEIMER))
	game.on('start', event => setMode(MODE_GAME))


	const nextQuestion = type => {
		if (currentQuestion.$type === type)
			score += 1

		if (!currentQuestion.nextElementSibling) {
			game.data.title = 'Ваш результат'
			setMode(MODE_RESULT)
			return
		}

		window.requestAnimationFrame(() => {
			currentQuestion.classList.remove('current')
			currentQuestion = currentQuestion.nextElementSibling
			currentQuestion.classList.add('current')
		})
	}

	game.on('ai', event => nextQuestion('ai'))
	game.on('human', event => nextQuestion('human'))

	game.on('submit', event => {
		if (!game.data.name)
			return

		let name = String(game.data.name).trim()
		if (!name)
			return

		game.data.name = ' '

		appClusterNode.addRecord(name, score, null)
		setMode(MODE_SCOREBOARD)
	})

	let blockScroll = false

	window.addEventListener('mousewheel', event => {
		if (gameMode !== MODE_SCOREBOARD)
			return

		if (blockScroll)
			return

		if (event.deltaY === 0)
			return

		blockScroll = true

		let current = game.nodes.scoreboard.querySelector('.scoreboard_card.current')

		if (event.deltaY > 0 &&
			current.nextElementSibling &&
			current.nextElementSibling.nextElementSibling &&
			current.nextElementSibling.nextElementSibling.nextElementSibling

		)
			window.requestAnimationFrame(() => {
				current.classList.remove('current')
				current = current.nextElementSibling
				current.classList.add('current')
			})
		else if (event.deltaY < 0 && current.previousElementSibling)
			window.requestAnimationFrame(() => {
				current.classList.remove('current')
				current = current.previousElementSibling
				current.classList.add('current')
			})
		setTimeout(() => blockScroll = false, 100)
	})
})
