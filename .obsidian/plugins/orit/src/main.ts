import { App, Editor, MarkdownView, Modal, Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, MyPluginSettings as OritPluginSettings, SampleSettingTab } from "./settings";
import { Calcs, OritWorkflow } from 'core/types';
import { calcs } from '../functions/calc'
import { wf } from 'infrastructure/obsidian-io';

interface OritAPI {
	calcs: Calcs
	wf: OritWorkflow
}

export default class OritPlugin extends Plugin {
	settings: OritPluginSettings = {} as OritPluginSettings;
	api: OritAPI = {} as OritAPI;

	async onload() {
		await this.loadSettings();
		this.api = {
			calcs,
			wf: wf,
		}
		console.warn("The main Orit API is loaded...");
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
