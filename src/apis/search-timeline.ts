import type { MetadataCache, TFile, Vault } from 'obsidian';
import {
	getTimelineEventInFile,
	type ITimelineEventItemExtend,
} from 'src/type/timeline-event';
import {
	filterFileByTags,
	filterTimelineEvents,
	type ITimelineFilterParams,
} from 'src/filter';
import { parseTimelineDate } from 'src/type/time';
import { isNil } from 'lodash-es';

export interface ITimelineSearchParams extends ITimelineFilterParams {
	/**
	 * tag列表，用于文件过滤，支持逻辑运算，例如：
	 * @example
	 * tag1 && (tag2 || tag3)
	 */
	tags?: string;
}

interface ISearchTimelineEventsParams {
	/** obsidian相关的信息 */
	vaultFiles: TFile[];
	fileCache: MetadataCache;
	appVault: Vault;
	/**
	 * 搜索和绘制参数
	 * 目前绘制参数，在timeline-vis-pro下才生效
	 */
	params: ITimelineSearchParams;
}

/**
 * 获取所有有效的的events对象
 * 1. 通过tags对文件过滤
 * 2. 通过event-tags对event过滤
 */
export async function searchTimelineEvents(
	opt: ISearchTimelineEventsParams
): Promise<ITimelineEventItemExtend[]> {
	if (process.env.NODE_ENV !== 'production') {
		console.log('[timeline] 文件过滤前', opt.vaultFiles);
	}
	// 使用tags过滤文件
	const fileList = opt.vaultFiles.filter((file) =>
		filterFileByTags(file, opt.fileCache, opt.params.tags)
	);
	if (process.env.NODE_ENV !== 'production') {
		console.log('[timeline] 文件过滤后', fileList);
	}
	if (!fileList) {
		// if no files valid for timeline
		return [];
	}

	const res: ITimelineEventItemExtend[] = [];
	const timelineEvents = await getTimelineEventInFile(fileList, opt.appVault);

	// 过滤
	const eventWhiteTags = new Set(opt.params['eventTags']);

	// 判断查询时间是否有效
	const start = parseTimelineDate(opt.params.dateStart);
	const end = parseTimelineDate(opt.params.dateEnd);
	if (!isNil(start) && !isNil(end) && start > end) {
		console.error(
			'[timeline] 时间查询条件不正确',
			'start',
			opt.params.dateStart,
			'end',
			opt.params.dateEnd
		);
		return [];
	}

	// 过滤
	for (const timeline of timelineEvents.values()) {
		// for (const event of timeline) {
		// 	if (eventWhiteTags.size > 0) {
		// 		// 指定要选择的event tag
		// 		if (event.eventTags?.some((tag) => eventWhiteTags.has(tag))) {
		// 			res.push(event);
		// 		}

		// 		if (eventWhiteTags.has('none') && !event.eventTags) {
		// 			// 特殊情况（指定选中没有event tag的timeline)
		// 			res.push(event);
		// 		}
		// 	} else {
		// 		res.push(event);
		// 	}
		// }
		res.push(
			...filterTimelineEvents(timeline, {
				eventTags: opt.params.eventTags,
				dateStart: opt.params.dateStart,
				dateEnd: opt.params.dateEnd,
			})
		);
	}

	return res;
}
