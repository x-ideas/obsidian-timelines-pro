import type {
	Editor,
	EditorPosition,
	EditorSuggestContext,
	EditorSuggestTriggerInfo,
	TFile,
} from 'obsidian';
import { EditorSuggest } from 'obsidian';
import { DistanceUnit } from 'src/data-value/distance-value';
import { TimeDurationUnit } from 'src/data-value/time-duration-value';

class SuggestInfo {
	tagName: string;
	context: EditorSuggestContext;

	constructor(tagName: string, context: EditorSuggestContext) {
		this.tagName = tagName;
		this.context = context;
	}
}

/**
 * 单位提示
 */
export class ValueUnitSuggesiton extends EditorSuggest<SuggestInfo> {
	onTrigger(
		cursor: EditorPosition,
		editor: Editor,
		file: TFile | null
	): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);

		const match = line.match(
			/\s((?:data-value)|(?:data-time-cost))=['"](.*?)['"]/
		);
		if (!match || match.index === undefined) {
			return null;
		}

		// 并且cursor前面是数字
		const strBeforeCursor = editor.getRange(
			{
				line: cursor.line,
				ch: 0,
			},
			cursor
		);

		console.log('strBeforeCursor', strBeforeCursor);
		if (!strBeforeCursor.match(/(-?\d+\.?\d*)$/)) {
			return null;
		}

		return {
			start: cursor,
			end: cursor,
			query: '',
		};
	}

	getSuggestions(
		context: EditorSuggestContext
	): SuggestInfo[] | Promise<SuggestInfo[]> {
		return [
			...Object.values(DistanceUnit),
			...Object.values(TimeDurationUnit),
		].map((unit) => {
			return new SuggestInfo(unit, context);
		});
	}

	renderSuggestion(value: SuggestInfo, el: HTMLElement): void {
		el.setText(value.tagName);
	}

	selectSuggestion(value: SuggestInfo, evt: MouseEvent | KeyboardEvent) {
		const linkResult = `${value.tagName}`;
		value.context.editor.replaceRange(
			linkResult,
			value.context.start,
			value.context.end
		);

		value.context.editor.setCursor({
			line: value.context.start.line,
			ch: value.context.start.ch + value.tagName.length,
		});
	}
}