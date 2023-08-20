/** 解析出父子tag可能的所有组合
 * 例如: #hello/i/am
 * 会解析成: #hello/i/am, #hello/i, #hello
 * @param {string} tag tag
 * @param {string[]} tagList 解析结果
 */
export function parseTag(tag: string, tagList: string[]) {
	tag = tag.trim();

	// Skip empty tags
	if (tag.length === 0) {
		return;
	}

	// Parse all subtags out of the given tag.
	// I.e., #hello/i/am would yield [#hello/i/am, #hello/i, #hello]. */
	tagList.push(tag);
	while (tag.contains('/')) {
		tag = tag.substring(0, tag.lastIndexOf('/'));
		tagList.push(tag);
	}
}