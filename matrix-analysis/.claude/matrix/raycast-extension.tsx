// Tier-1380 OMEGA: Raycast Extension for matrix:cols
// Copy to Raycast extensions directory

import { Action, ActionPanel, Detail, Icon, List, useNavigation } from "@raycast/api";
import { execSync } from "child_process";
import { useEffect, useState } from "react";

const CLI_PATH = "~/path/to/matrix/column-standards-all.ts";

interface Column {
	index: number;
	name: string;
	type: string;
	owner: string;
	zone: string;
	color: string;
	description?: string;
	required: boolean;
}

function runCommand(args: string): string {
	try {
		return execSync(`bun ${CLI_PATH} ${args}`, { encoding: "utf-8" });
	} catch (e) {
		return String(e);
	}
}

function getColumns(): Column[] {
	const output = runCommand("pipe tsv");
	const lines = output.trim().split("\n").slice(1); // Skip header

	return lines.map((line) => {
		const [index, name, type, owner, zone, required] = line.split("\t");
		return {
			index: parseInt(index),
			name,
			type,
			owner,
			zone,
			color: getColorForZone(zone),
			required: required === "true",
		};
	});
}

function getColorForZone(zone: string): string {
	const colors: Record<string, string> = {
		default: "⚪",
		core: "🔵",
		security: "🔴",
		cloudflare: "🟣",
		tension: "🟠",
		infra: "🟢",
		validation: "🟡",
		extensibility: "⚪",
		skills: "📝",
		chrome: "🔷",
	};
	return colors[zone] || "⚪";
}

function getZoneIcon(zone: string): Icon {
	switch (zone) {
		case "tension":
			return Icon.Bolt;
		case "cloudflare":
			return Icon.Cloud;
		case "chrome":
			return Icon.AppWindow;
		case "core":
			return Icon.Cpu;
		case "security":
			return Icon.Lock;
		default:
			return Icon.Circle;
	}
}

export default function Command() {
	const [columns, setColumns] = useState<Column[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchText, setSearchText] = useState("");
	const { push } = useNavigation();

	useEffect(() => {
		setColumns(getColumns());
		setIsLoading(false);
	}, []);

	const filteredColumns = columns.filter(
		(col) =>
			col.name.toLowerCase().includes(searchText.toLowerCase()) ||
			col.zone.toLowerCase().includes(searchText.toLowerCase()) ||
			col.type.toLowerCase().includes(searchText.toLowerCase()),
	);

	return (
		<List
			isLoading={isLoading}
			onSearchTextChange={setSearchText}
			searchBarPlaceholder="Search columns by name, zone, or type..."
			filtering={false}
		>
			{filteredColumns.map((col) => (
				<List.Item
					key={col.index}
					icon={getZoneIcon(col.zone)}
					title={`${col.color} ${col.index}: ${col.name}`}
					subtitle={`${col.zone} • ${col.type}${col.required ? " • required" : ""}`}
					accessories={[{ text: col.owner }]}
					actions={
						<ActionPanel>
							<Action
								title="View Details"
								icon={Icon.Eye}
								onAction={() => push(<ColumnDetail column={col} />)}
							/>
							<Action
								title="Copy Name"
								icon={Icon.Clipboard}
								onAction={() => {
									// Copy to clipboard
								}}
							/>
							<Action
								title="Open in Terminal"
								icon={Icon.Terminal}
								onAction={() => {
									execSync(`open -a Terminal "bun ${CLI_PATH} get ${col.index}"`);
								}}
							/>
						</ActionPanel>
					}
				/>
			))}
		</List>
	);
}

function ColumnDetail({ column }: { column: Column }) {
	const [detail, setDetail] = useState("");
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const output = runCommand(`get ${column.index} --no-color`);
		setDetail(output);
		setIsLoading(false);
	}, [column.index]);

	return (
		<Detail
			markdown={detail}
			navigationTitle={`Column ${column.index}`}
			isLoading={isLoading}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard content={column.name} />
					<Action.OpenInBrowser
						title="Open Documentation"
						url={`file://${CLI_PATH}/../COLUMN-CLI-README.md`}
					/>
				</ActionPanel>
			}
		/>
	);
}

// Zone commands
export function TensionCommand() {
	return <ZoneView zone="tension" icon={Icon.Bolt} />;
}

export function CloudflareCommand() {
	return <ZoneView zone="cloudflare" icon={Icon.Cloud} />;
}

export function ChromeCommand() {
	return <ZoneView zone="chrome" icon={Icon.AppWindow} />;
}

function ZoneView({ zone, icon }: { zone: string; icon: Icon }) {
	const [columns, setColumns] = useState<Column[]>([]);

	useEffect(() => {
		const all = getColumns();
		setColumns(all.filter((c) => c.zone === zone));
	}, [zone]);

	return (
		<List navigationTitle={`${zone} Zone`}>
			{columns.map((col) => (
				<List.Item
					key={col.index}
					icon={icon}
					title={`${col.index}: ${col.name}`}
					subtitle={col.type}
				/>
			))}
		</List>
	);
}
