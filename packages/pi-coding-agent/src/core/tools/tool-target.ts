// GSD-2 - Shared target metadata for tool output rendering.

export type ToolTargetKind = "file" | "directory" | "search" | "command";

export type ToolTargetAction = "read" | "write" | "edit" | "list" | "find" | "grep" | "bash";

export interface ToolTargetRange {
	start: number;
	end?: number;
}

export interface ToolTargetMetadata {
	kind: ToolTargetKind;
	action: ToolTargetAction;
	inputPath?: string;
	resolvedPath?: string;
	pattern?: string;
	glob?: string;
	line?: number;
	range?: ToolTargetRange;
}

export function createToolTarget(target: ToolTargetMetadata): ToolTargetMetadata {
	return target;
}
