/*!
 * Electron App Main
 */

'use strict';
process.env.TZ = 'UTC'

const path = require('path')
const electron = require('electron')

const BrowserWindow = electron.BrowserWindow
const app = electron.app

const debug = /--debug/.test(process.argv.join())
const fullscreen = /--fullscreen/.test(process.argv.join())

if (process.mas)
	app.setName('Turing test game')

app.on('ready', () => {
	let electronScreen = electron.screen;
	let size = electronScreen.getPrimaryDisplay().workAreaSize

	let options = Object.assign({
		title: app.getName(),
		width: size.width,
		height: size.height,
		frame: false,
		show: true,
		resizable: false,
		movable: false,
		minimizable: false,
		maximizable: false
	}, fullscreen && {
		fullscreen: true,
		kiosk: true,
		closable: false,
		alwaysOnTop: true,
		titleBarStyle: 'hidden'
	} || {})

	let mainWindow = new BrowserWindow(options)

	mainWindow.loadURL(path.join('file://', process.cwd(), '/game/game.html'))

	if (debug)
		mainWindow.webContents.openDevTools()

	mainWindow.on('closed', () => mainWindow = null )
})

app.on('window-all-closed', () => app.quit() )
