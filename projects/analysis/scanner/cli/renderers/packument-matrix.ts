import type {NpmPackument, NpmPerson} from '../../scan';

export function formatBytes(bytes: number | undefined): string {
	if (bytes === undefined) return '-';
	if (bytes === 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return i === 0 ? `${value} ${units[i]}` : `${value.toFixed(1)} ${units[i]}`;
}

export function formatPerson(person: NpmPerson | undefined): string {
	if (person === undefined) return '-';
	if (typeof person === 'string') return person;
	const parts: string[] = [];
	if (person.name) parts.push(person.name);
	if (person.email) parts.push(`<${person.email}>`);
	if (person.url) parts.push(`(${person.url})`);
	return parts.length > 0 ? parts.join(' ') : '-';
}

function truncate(s: string, maxLen: number): string {
	if (s.length <= maxLen) return s;
	return s.slice(0, maxLen - 1) + '…';
}

function depCount(deps: Record<string, string> | undefined): string {
	if (!deps) return '0';
	const n = Object.keys(deps).length;
	return String(n);
}

function formatMaintainers(maintainers: NpmPerson[] | undefined): string {
	if (!maintainers || maintainers.length === 0) return '-';
	if (maintainers.length <= 3) {
		return maintainers.map(m => (typeof m === 'string' ? m : (m.name ?? m.email ?? '-'))).join(', ');
	}
	return `${maintainers.length} maintainers`;
}

interface FieldPair {
	label: string;
	value: string;
}

export class PackumentMatrixRenderer {
	render(packument: NpmPackument): void {
		const pairs = this.extractFields(packument);

		// Pad to even count so every row has 4 columns
		if (pairs.length % 2 !== 0) {
			pairs.push({label: '', value: ''});
		}

		const rows: Record<string, string>[] = [];
		for (let i = 0; i < pairs.length; i += 2) {
			const left = pairs[i];
			const right = pairs[i + 1];
			rows.push({
				'Field': left.label,
				'Value': left.value,
				'Field ': right.label,
				'Value ': right.value,
			});
		}

		// @ts-expect-error Bun.inspect.table accepts options as third arg
		console.log(Bun.inspect.table(rows, ['Field', 'Value', 'Field ', 'Value '], {colors: true}));
	}

	private extractFields(p: NpmPackument): FieldPair[] {
		const pairs: FieldPair[] = [];

		// ── Identity ──
		pairs.push({label: 'Name', value: p.name ?? '-'});
		pairs.push({label: 'Version', value: p.version ?? '-'});
		pairs.push({label: 'License', value: p.license ?? '-'});
		pairs.push({label: 'Type', value: p.type ?? '-'});

		// ── Distribution ──
		pairs.push({label: 'Unpacked Size', value: formatBytes(p.dist?.unpackedSize)});
		pairs.push({label: 'File Count', value: p.dist?.fileCount !== undefined ? String(p.dist.fileCount) : '-'});
		pairs.push({label: 'Integrity', value: p.dist?.integrity ? truncate(p.dist.integrity, 32) : '-'});
		pairs.push({label: 'Shasum', value: p.dist?.shasum ? truncate(p.dist.shasum, 32) : '-'});

		// ── People ──
		pairs.push({label: 'Author', value: formatPerson(p.author)});
		pairs.push({label: 'Maintainers', value: formatMaintainers(p.maintainers)});

		// ── Dependencies ──
		pairs.push({label: 'Dependencies', value: depCount(p.dependencies)});
		pairs.push({label: 'DevDependencies', value: depCount(p.devDependencies)});
		pairs.push({label: 'PeerDependencies', value: depCount(p.peerDependencies)});
		pairs.push({label: 'OptionalDeps', value: depCount(p.optionalDependencies)});

		// ── Security ──
		pairs.push({label: 'Signatures', value: p.dist?.signatures ? String(p.dist.signatures.length) : '-'});
		pairs.push({label: 'Attestations', value: p.dist?.attestations ? 'Yes' : '-'});

		// ── Links ──
		pairs.push({label: 'Tarball', value: p.dist?.tarball ? truncate(p.dist.tarball, 48) : '-'});
		pairs.push({label: 'Homepage', value: p.homepage ?? '-'});

		return pairs;
	}
}
