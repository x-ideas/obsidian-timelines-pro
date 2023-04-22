import { isNil } from 'lodash-es';
import {
	hasTimeRangeIntersection,
	type TimelineDateRange,
} from 'src/type/time';
import {
	getTimelineEventEndTime,
	getTimelineEventStartTime,
	type ITimelineEventItemExtend,
} from 'src/type/timeline-event';

export interface ITimelineFilterParams {
	/**
	 * tag列表，用于event过滤，支持逻辑运算，例如：
	 * @example
	 * tag1 && (tag2 || tag3)
	 */
	eventTags?: string;

	/** 搜索条件: 开始时间, 应用timeline event中的date字段 */
	dateStart?: string;
	/** 搜索条件: 结束时间 */
	dateEnd?: string;
}

/**
 * 过滤timeline事件
 */
export function filterTimelineEvents(
	events: ITimelineEventItemExtend[],
	params?: ITimelineFilterParams
): ITimelineEventItemExtend[] {
	// const result = [...events];
	if (!params) {
		return events;
	}

	let result = events;
	if (params.eventTags) {
		result = filterByEventTag(result, params);
	}

	if (params.dateStart || params.dateEnd) {
		result = filterByTime(result, params);
	}

	return result;
}

/**
 * 根据标签过滤
 */
function filterByEventTag(
	events: ITimelineEventItemExtend[],
	params?: ITimelineFilterParams
): ITimelineEventItemExtend[] {
	if (!params || !params.eventTags) {
		return events;
	}

	// 解析tags
	const tags = params.eventTags.split(';').filter((item) => !!item);
	if (tags.length === 0) {
		return events;
	}
	// 过滤
	const eventWhiteTags = new Set(tags);
	return events.filter((item) => {
		// 指定要选择的event tag
		if (item.eventTags?.some((tag) => eventWhiteTags.has(tag))) {
			return true;
		}

		if (eventWhiteTags.has('none') && !item.eventTags) {
			// 特殊情况（指定选中没有event tag的timeline)
			return true;
		}

		return false;
	});
}

function filterByTime(
	events: ITimelineEventItemExtend[],
	params?: ITimelineFilterParams
): ITimelineEventItemExtend[] {
	if (!params) {
		return events;
	}

	const queryTimeRange: TimelineDateRange = [params.dateStart, params.dateEnd];

	return events.filter((item) => {
		const eventTimeRange: TimelineDateRange = [
			getTimelineEventStartTime(item),
			getTimelineEventEndTime(item),
		];

		// 判断是否有交集
		return hasTimeRangeIntersection(eventTimeRange, queryTimeRange);
	});
}