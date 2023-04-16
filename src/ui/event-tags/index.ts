import type { Plugin } from 'obsidian';
import { Notice, type TFile, type WorkspaceLeaf } from 'obsidian';
import { Menu } from 'obsidian';
import { ItemView } from 'obsidian';
import { getTimelineEventInFile } from '../../utils';

import Component from './event-tags-manage.svelte';
import type { IEventDrawArgs } from 'src/types';
import { RenameModal } from '../rename-modal';
import { includes } from 'lodash-es';

export const EVENT_TAGS_VIEW = 'timeline-event-tag-view';

/** 搜索全文用的 */
function getSearchTagRegExp(tag: string) {
	return new RegExp(`data-event-tags\\W*=\\W*['"](.*)${tag}(.*)['"]`, 'g');
}
/** 给搜索组件用的 */
function getSearchTagRegExp2(tag: string) {
	return `/data-event-tags\\W*=\\W*['"](.*)${tag}(.*)['"]/`;
}

export class EventTagsView extends ItemView {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	component: Component;

	eventTagsMap: Map<string, IEventDrawArgs>;

	changeEventRef?: ReturnType<typeof this.app.metadataCache.on>;

	constructor(leaf: WorkspaceLeaf) {
		console.log('[timeine] EventTagsView constructor');
		super(leaf);

		this.eventTagsMap = new Map();

		this.changeEventRef = this.app.metadataCache.on(
			'changed',
			async (file, fileContent, cache) => {
				this.onFileUpdated(file);
			}
		);

		// 注册菜单
		document.on('contextmenu', '.timeline-event-tag-wrapper', this.onMenu, {
			capture: true,
		});
		this.register(() => {
			document.off('contextmenu', '.timeline-event-tag-wrapper', this.onMenu, {
				capture: true,
			});
		});
	}

	onMenu = (uiEvent: MouseEvent, deleteTarget: HTMLElement) => {
		console.log('[timeline] onMenu', uiEvent, deleteTarget);

		const menu = new Menu();
		const eventTag = deleteTarget.innerText;

		menu.addItem((item) => {
			item.setTitle(`重命名: "${eventTag}"`);
			item.setIcon('rename');
			item.onClick(() => {
				new RenameModal(this.app, eventTag, (newName) => {
					// 修改文件
					this.rename(eventTag, newName);
				}).open();
			});
		});

		menu.addItem((item) => {
			// 搜索
			item.setTitle(`搜索: "${eventTag}"`);
			item.setIcon('search');
			item.onClick(() => {
				this.search(eventTag);
			});
		});

		this.app.workspace.trigger(
			'timeline-event-tag-wrapper:contextmenu',
			menu,
			eventTag
		);
		setTimeout(() => {
			menu.showAtMouseEvent(uiEvent);
		}, 0);
	};

	getViewType() {
		return EVENT_TAGS_VIEW;
	}

	getDisplayText() {
		return 'timeline事件标签';
	}

	/** 初始化event tags */
	async initEventTags() {
		const files = this.app.vault.getMarkdownFiles();
		const timelineEvents = await getTimelineEventInFile(files, this.app.vault);
		this.eventTagsMap = timelineEvents;
		console.log('[timeline] initEventTags', timelineEvents);
	}

	/** 刷新view */
	private refreshUI() {
		const eventTagSet = new Set<string>();
		for (const event of this.eventTagsMap.values()) {
			event.eventTags?.forEach((tag) => eventTagSet.add(tag));
		}

		const tagArray = Array.from(eventTagSet);
		this.component.$set({ tags: tagArray });
	}

	/** 重命名 */
	private async rename(oldTag: string, newTag: string) {
		if (oldTag === newTag) {
			return new Notice('新标签与旧标签相同');
		}

		// 找到需要修改的文件
		const files: TFile[] = [];
		for (const event of this.eventTagsMap.values()) {
			if (includes(event.eventTags, oldTag)) {
				if (event.path) {
					files.push(event.file);
				}
			}
		}

		// 正则规则: eventTags: 'a;b'
		const reg = getSearchTagRegExp(oldTag);

		// 修改文件
		for (const file of files) {
			const fileContent = await this.app.vault.read(file);
			const newFileContent = fileContent.replace(
				reg,
				(match, p1, p2, offset, origin, groups) => {
					return `data-event-tags='${p1 ? p1 : ''}${newTag}${p2 ? p2 : ''}'`;
				}
			);

			this.app.vault.modify(file, newFileContent);
		}
	}

	/** 搜索 */
	private search(tag: string) {
		const searchPlugin: Plugin =
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			this.app.internalPlugins.getPluginById('global-search');
		console.log('[timeline] search', this.app);
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		if (searchPlugin && searchPlugin.instance) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			searchPlugin.instance.openGlobalSearch(getSearchTagRegExp2(tag));
		}
	}

	/**
	 * 交由外界调用更新event tags
	 */
	async onFileUpdated(file: TFile) {
		const timelineEvents = await getTimelineEventInFile([file], this.app.vault);

		for (const [path, events] of timelineEvents) {
			// 覆盖
			this.eventTagsMap.set(path, events);
		}

		this.refreshUI();
	}

	/** 生命周期 */
	async onOpen() {
		this.component = new Component({
			target: this.contentEl,
			props: {
				tags: [],
				onClick: (tag: string) => {
					this.search(tag);
				},
			},
		});
		await this.initEventTags();

		this.refreshUI();
	}

	/** 生命周期 */
	async onClose() {
		this.component.$destroy();

		if (this.changeEventRef) {
			this.app.metadataCache.offref(this.changeEventRef);
		}
	}
}
