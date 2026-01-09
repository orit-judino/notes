import { App, Modal, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings as OritPluginSettings } from "./settings";
import { OritAPI, Calcs, ObsHelper, OritWorkflow } from 'core/types';
import { create_calcs } from './functions/calc'
import { wf } from 'logic/operations';
import { create_oh } from 'functions/helper';
import { create_utils } from 'utils/utilites';



export default class OritPlugin extends Plugin {
	settings: OritPluginSettings = {} as OritPluginSettings;
	api: OritAPI = {} as OritAPI;

	createAPI = (app: App): OritAPI => ({
		calcs: create_calcs(app),
		oh: create_oh(app),
		utils: create_utils(app)
	})

	async onload() {
		await this.loadSettings();

		this.api = this.createAPI(this.app);
		console.warn("The main Orit API is loaded...", this.api);

		// 	// Команда создающая карточку пациента
		// 	this.addCommand({
		// 		id: 'new-Patient-Card',
		// 		name: 'Create new patient card',
		// 		callback: async () => {
		// 			await this.api.wf.runPatientCardWorkflow(this.app);
		// 		}
		// 	});
		// 	// Команда создающая карточку эпикриза
		// 	this.addCommand({
		// 		id: 'new-Epicris-Card',
		// 		name: 'Create new epicris card',
		// 		callback: async () => {
		// 			void this.api.wf.addNewEpicrisWorkflow(this.app);
		// 		}
		// 	});
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<OritPluginSettings>);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class OritModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		let { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
