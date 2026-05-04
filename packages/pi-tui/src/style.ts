// GSD2 - Terminal style primitives for framed TUI surfaces

import { truncateToWidth, visibleWidth } from "./utils.js";

export type TerminalBorderStyle = "none" | "rule" | "single" | "rounded" | "heavy";

export interface TerminalStyleSpec {
	width?: number;
	paddingX?: number;
	paddingY?: number;
	border?: TerminalBorderStyle;
	borderColor?: (text: string) => string;
	foreground?: (text: string) => string;
	title?: string;
	titleRight?: string;
	titleColor?: (text: string) => string;
	titleRightColor?: (text: string) => string;
}

type BorderChars = {
	topLeft: string;
	topRight: string;
	bottomLeft: string;
	bottomRight: string;
	horizontal: string;
	vertical: string;
};

const BORDER_CHARS: Record<Exclude<TerminalBorderStyle, "none" | "rule">, BorderChars> = {
	single: {
		topLeft: "┌",
		topRight: "┐",
		bottomLeft: "└",
		bottomRight: "┘",
		horizontal: "─",
		vertical: "│",
	},
	rounded: {
		topLeft: "╭",
		topRight: "╮",
		bottomLeft: "╰",
		bottomRight: "╯",
		horizontal: "─",
		vertical: "│",
	},
	heavy: {
		topLeft: "┏",
		topRight: "┓",
		bottomLeft: "┗",
		bottomRight: "┛",
		horizontal: "━",
		vertical: "┃",
	},
};

function padVisible(line: string, width: number): string {
	return line + " ".repeat(Math.max(0, width - visibleWidth(line)));
}

function color(fn: ((text: string) => string) | undefined, text: string): string {
	return fn ? fn(text) : text;
}

function normalizeWidth(spec: TerminalStyleSpec, width?: number): number {
	return Math.max(1, Math.floor(width ?? spec.width ?? 80));
}

export class TerminalStyle {
	private readonly spec: TerminalStyleSpec;

	constructor(spec: TerminalStyleSpec = {}) {
		this.spec = { ...spec };
	}

	width(width: number): TerminalStyle {
		return new TerminalStyle({ ...this.spec, width });
	}

	padding(x: number, y = x): TerminalStyle {
		return new TerminalStyle({ ...this.spec, paddingX: x, paddingY: y });
	}

	paddingX(paddingX: number): TerminalStyle {
		return new TerminalStyle({ ...this.spec, paddingX });
	}

	paddingY(paddingY: number): TerminalStyle {
		return new TerminalStyle({ ...this.spec, paddingY });
	}

	border(border: TerminalBorderStyle): TerminalStyle {
		return new TerminalStyle({ ...this.spec, border });
	}

	borderColor(borderColor: (text: string) => string): TerminalStyle {
		return new TerminalStyle({ ...this.spec, borderColor });
	}

	foreground(foreground: (text: string) => string): TerminalStyle {
		return new TerminalStyle({ ...this.spec, foreground });
	}

	title(title: string, titleColor?: (text: string) => string): TerminalStyle {
		return new TerminalStyle({ ...this.spec, title, titleColor });
	}

	titleRight(titleRight: string, titleRightColor?: (text: string) => string): TerminalStyle {
		return new TerminalStyle({ ...this.spec, titleRight, titleRightColor });
	}

	render(contentLines: string[], width?: number): string[] {
		const outerWidth = normalizeWidth(this.spec, width);
		const border = this.spec.border ?? "none";
		const paddingX = Math.max(0, Math.floor(this.spec.paddingX ?? 0));
		const paddingY = Math.max(0, Math.floor(this.spec.paddingY ?? 0));
		const innerWidth = Math.max(1, outerWidth - (border === "none" ? 0 : 2) - paddingX * 2);
		const emptyPaddedLine = " ".repeat(paddingX * 2 + innerWidth);
		const sourceLines = contentLines.length > 0 ? contentLines : [""];
		const paddedBody = [
			...Array.from({ length: paddingY }, () => emptyPaddedLine),
			...sourceLines.map((line) => {
				const clipped = truncateToWidth(line, innerWidth, "");
				const styled = color(this.spec.foreground, clipped);
				return `${" ".repeat(paddingX)}${padVisible(styled, innerWidth)}${" ".repeat(paddingX)}`;
			}),
			...Array.from({ length: paddingY }, () => emptyPaddedLine),
		];

		if (border === "none") {
			return paddedBody.map((line) => padVisible(line, outerWidth));
		}

		if (border === "rule") {
			return [
				color(this.spec.borderColor, "─".repeat(outerWidth)),
				...this.renderTitleRows(outerWidth),
				...paddedBody.map((line) => `${color(this.spec.borderColor, "│ ")}${truncateToWidth(line, Math.max(1, outerWidth - 2), "")}`),
			];
		}

		const chars = BORDER_CHARS[border];
		const horizontalWidth = Math.max(0, outerWidth - 2);
		const top = color(
			this.spec.borderColor,
			`${chars.topLeft}${chars.horizontal.repeat(horizontalWidth)}${chars.topRight}`,
		);
		const bottom = color(
			this.spec.borderColor,
			`${chars.bottomLeft}${chars.horizontal.repeat(horizontalWidth)}${chars.bottomRight}`,
		);
		const contentWidth = Math.max(1, outerWidth - 2);
		return [
			top,
			...this.renderTitleRows(contentWidth).map((line) =>
				`${color(this.spec.borderColor, chars.vertical)}${padVisible(line, contentWidth)}${color(this.spec.borderColor, chars.vertical)}`,
			),
			...paddedBody.map((line) =>
				`${color(this.spec.borderColor, chars.vertical)}${padVisible(line, contentWidth)}${color(this.spec.borderColor, chars.vertical)}`,
			),
			bottom,
		];
	}

	private renderTitleRows(width: number): string[] {
		const leftRaw = this.spec.title ?? "";
		const rightRaw = this.spec.titleRight ?? "";
		if (!leftRaw && !rightRaw) return [];

		const leftBudget = rightRaw ? Math.max(1, width - visibleWidth(rightRaw) - 1) : width;
		const left = color(this.spec.titleColor, truncateToWidth(leftRaw, leftBudget, ""));
		const right = color(this.spec.titleRightColor, rightRaw);
		const gap = rightRaw
			? Math.max(1, width - visibleWidth(left) - visibleWidth(right))
			: Math.max(0, width - visibleWidth(left));
		return [`${left}${" ".repeat(gap)}${right}`];
	}
}

export function style(spec: TerminalStyleSpec = {}): TerminalStyle {
	return new TerminalStyle(spec);
}
