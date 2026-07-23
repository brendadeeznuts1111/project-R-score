// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Generate bun-token-locus-table.canvas.tsx with STATUS colors via Bun.color HSL.
 * @see https://bun.com/docs/runtime/color
 */
import {
  buildPageAnchorIndex,
  classifyLocusStatus,
  findParentWithFragment,
  suggestAnchorsForToken,
} from '../lib/docs/locus-resolve.ts';

const cat = await Bun.file('tools/bun-docs-catalog.json').json();
const idx = await Bun.file('tools/bun-docs-index.json').json();

const pageAnchors = buildPageAnchorIndex(idx.entries);
const types = new Set([
  'api',
  'cli-flag',
  'config-key',
  'env-var',
  'package-json-key',
  'cli-command',
]);
type CatEntry = {
  name: string;
  type: string;
  canonicalPage: string;
  anchor?: string;
  locusUnresolved?: boolean;
  locusStatus?: string;
};

const byName = new Map<string, CatEntry>(
  (cat.entries as CatEntry[]).map(e => [e.name, e])
);

/** HSL sources — converted with Bun.color for the STATUS column */
const STATUS_HSL = {
  fragment: 'hsl(145 65% 42%)',
  page: 'hsl(210 70% 52%)',
  inherited: 'hsl(190 60% 45%)',
  dump: 'hsl(8 75% 52%)',
  reference: 'hsl(280 45% 55%)',
  unresolved: 'hsl(35 85% 48%)',
  coincidence: 'hsl(0 70% 50%)',
} as const;

const STATUS_COLORS = Object.fromEntries(
  Object.entries(STATUS_HSL).map(([k, hsl]) => [
    k,
    {
      hsl,
      hex: Bun.color(hsl, 'hex') as string,
      css: Bun.color(hsl, 'css') as string,
    },
  ])
);

const rows: Array<{
  token: string;
  type: string;
  status: string;
  page: string;
  fragment: string;
  suggestion: string;
  score: string | number | null;
  inheritFrom: string;
}> = [];

for (const e of cat.entries as CatEntry[]) {
  if (!types.has(e.type)) continue;
  const parentFragment = findParentWithFragment(e.name, byName);
  // Prefer catalog-baked STATUS (includes inherited after build)
  const status =
    e.locusStatus ??
    classifyLocusStatus({
      name: e.name,
      canonicalPage: e.canonicalPage,
      anchor: e.anchor,
      locusUnresolved: e.locusUnresolved,
      pageAnchors,
      parentFragment,
    });
  const page = e.canonicalPage
    .replace(/^https:\/\/bun\.com\/docs\//, '')
    .replace(/^https:\/\/bun\.com\//, '');
  let suggestion = '';
  let score: string | number | null = null;
  if (status === 'inherited' && parentFragment) {
    suggestion = `${parentFragment.page.replace('https://bun.com/docs/', '')}#${parentFragment.fragment}`;
    score = 'inherit';
  } else if (status === 'dump' || status === 'unresolved' || status === 'coincidence') {
    const sug = suggestAnchorsForToken(e.name, pageAnchors, { limit: 1 })[0];
    if (sug) {
      suggestion = sug.url.replace('https://bun.com/docs/', '');
      score = sug.score;
    }
  }
  rows.push({
    token: e.name,
    type: e.type,
    status,
    page,
    fragment: e.anchor || '',
    suggestion,
    score,
    inheritFrom: parentFragment?.name || '',
  });
}
rows.sort((a, b) => a.status.localeCompare(b.status) || a.token.localeCompare(b.token));
const byStatus: Record<string, number> = {};
for (const r of rows) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

const DATA = {
  pin: cat.bunVersion,
  generatedAt: new Date().toISOString(),
  total: rows.length,
  byStatus,
  statusColors: STATUS_COLORS,
  rows,
};

const path =
  '/Users/nolarose/.cursor/projects/Users-nolarose-Projects/canvases/bun-token-locus-table.canvas.tsx';

const src = `/**
 * BunToken locus table — dedicated STATUS column.
 * Colors: Bun.color(hsl, "hex") baked at generate time (canvas cannot call Bun).
 * @see https://bun.com/docs/runtime/color
 */
import {
  Callout,
  Divider,
  Grid,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

const DATA = ${JSON.stringify(DATA)} as const;

type StatusFilter =
  | "all"
  | "fragment"
  | "page"
  | "inherited"
  | "dump"
  | "reference"
  | "unresolved";

type Row = {
  token: string;
  type: string;
  status: string;
  page: string;
  fragment: string;
  suggestion: string;
  score: string | number | null;
  inheritFrom: string;
};

const FILTERS: StatusFilter[] = [
  "all",
  "dump",
  "inherited",
  "page",
  "reference",
  "unresolved",
  "fragment",
];

function short(s: string, n: number): string {
  if (!s) return "—";
  return s.length > n ? \`\${s.slice(0, n - 1)}…\` : s;
}

function statusHex(status: string): string {
  const entry = (DATA.statusColors as Record<string, { hex: string }>)[status];
  return entry?.hex ?? "#8c8c8c";
}

function statusHsl(status: string): string {
  const entry = (DATA.statusColors as Record<string, { hsl: string }>)[status];
  return entry?.hsl ?? "hsl(0 0% 55%)";
}

/** Dedicated STATUS cell — color from Bun.color(hsl→hex). */
function StatusCell({ status }: { status: string }) {
  const color = statusHex(status);
  return (
    <span
      title={statusHsl(status) + " → Bun.color → " + color}
      style={{
        display: "inline-block",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.02em",
        color,
        minWidth: 96,
      }}
    >
      {status}
    </span>
  );
}

function StatusSwatch({ status }: { status: string }) {
  const color = statusHex(status);
  return (
    <span
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: 2,
        background: color,
        marginRight: 6,
        verticalAlign: "middle",
      }}
    />
  );
}

export default function BunTokenLocusTable() {
  const theme = useHostTheme();
  const [statusFilter, setStatusFilter] = useCanvasState<StatusFilter>(
    "locus-status-col-filter-v3",
    "all"
  );

  const allRows = DATA.rows as unknown as Row[];
  const by = DATA.byStatus as Record<string, number>;

  const rows =
    statusFilter === "all"
      ? allRows
      : allRows.filter((r) => r.status === statusFilter);

  const fragment = by.fragment ?? 0;
  const page = by.page ?? 0;
  const dump = by.dump ?? 0;
  const inherited = by.inherited ?? 0;
  const reference = by.reference ?? 0;
  const unresolved = by.unresolved ?? 0;
  const needsWork = dump + inherited + reference + unresolved;

  return (
    <Stack gap={20} style={{ padding: 20 }}>
      <Stack gap={6}>
        <H1>BunToken locus</H1>
        <Text tone="secondary" size="small">
          pin {DATA.pin} · {DATA.generatedAt.slice(0, 19)}Z
        </Text>
        <Text tone="tertiary" size="small">
          Columns: TOKEN · TYPE · STATUS · PAGE · FRAGMENT · SUGGESTION · SCORE
        </Text>
        <Text tone="tertiary" size="small">
          STATUS color = Bun.color(hsl, &quot;hex&quot;) at generate time
        </Text>
      </Stack>

      <Grid columns={4} gap={12}>
        <Stat value={String(DATA.total)} label="Tier-A tokens" />
        <Stat
          value={String(fragment + page)}
          label="OK (fragment + page)"
          tone="success"
        />
        <Stat value={String(needsWork)} label="Needs work" tone="warning" />
        <Stat
          value={String(rows.length)}
          label={
            statusFilter === "all"
              ? "Rows shown"
              : \`Filtered: \${statusFilter}\`
          }
        />
      </Grid>

      <Stack gap={8}>
        <Text weight="medium" size="small">
          STATUS legend (Bun.color HSL → hex)
        </Text>
        <Row gap={16} style={{ flexWrap: "wrap" }}>
          {(
            [
              "fragment",
              "page",
              "inherited",
              "dump",
              "reference",
              "unresolved",
            ] as const
          ).map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center" }}>
              <StatusSwatch status={s} />
              <StatusCell status={s} />
              <Text as="span" tone="tertiary" size="small">
                {"  "}
                {statusHsl(s)}
              </Text>
            </span>
          ))}
        </Row>
      </Stack>

      <Callout tone="info" title="STATUS is its own column">
        fragment = verified # · page = right page, no heading · inherited = parent
        section · dump = bun-apis · reference = outside index
      </Callout>

      <Stack gap={8}>
        <Text tone="secondary" size="small" weight="medium">
          Filter by STATUS
        </Text>
        <Row gap={8} style={{ flexWrap: "wrap" }}>
          {FILTERS.map((s) => {
            const count = s === "all" ? DATA.total : (by[s] ?? 0);
            if (s !== "all" && count === 0) return null;
            const accent = s === "all" ? theme.accent.primary : statusHex(s);
            return (
              <Pill
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
                leadingContent={
                  s === "all" ? undefined : (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: accent,
                        display: "inline-block",
                      }}
                    />
                  )
                }
              >
                {s === "all" ? \`All (\${DATA.total})\` : \`\${s} (\${count})\`}
              </Pill>
            );
          })}
        </Row>
      </Stack>

      <Divider />

      <H2>
        {statusFilter === "all" ? "All tokens" : \`STATUS = \${statusFilter}\`}{" "}
        ({rows.length})
      </H2>

      <Table
        headers={[
          "TOKEN",
          "TYPE",
          "STATUS",
          "PAGE",
          "FRAGMENT",
          "SUGGESTION",
          "SCORE",
        ]}
        columnAlign={["left", "left", "left", "left", "left", "left", "right"]}
        rows={rows.map((r) => [
          <Text key={"t-" + r.token} as="span" weight="medium" size="small">
            {r.token}
          </Text>,
          <Text key={"ty-" + r.token} as="span" tone="secondary" size="small">
            {r.type}
          </Text>,
          <StatusCell key={"st-" + r.token} status={r.status} />,
          <Text key={"p-" + r.token} as="span" tone="secondary" size="small">
            {short(r.page, 40)}
          </Text>,
          <Text key={"f-" + r.token} as="span" size="small">
            {r.fragment ? "#" + short(r.fragment, 40) : "—"}
          </Text>,
          <Text key={"s-" + r.token} as="span" tone="tertiary" size="small">
            {r.suggestion
              ? short(r.suggestion, 44)
              : r.inheritFrom
                ? "← " + r.inheritFrom
                : "—"}
          </Text>,
          <Text key={"sc-" + r.token} as="span" tone="tertiary" size="small">
            {r.score != null ? String(r.score) : "—"}
          </Text>,
        ])}
        striped
        stickyHeader
      />

      <Text tone="tertiary" size="small">
        CLI: bun tools/bun-doc-refs.ts locus --depth=40 --all --tsv · regenerate:
        bun tools/_gen-locus-canvas.ts
      </Text>
    </Stack>
  );
}
`;

await Bun.write(path, src);
console.info('wrote', path);
console.info('STATUS_COLORS', STATUS_COLORS);
console.info('byStatus', byStatus);
