/**
 * VaultPage — Secrets Vault UI (shadcn/ui)
 *
 * - List of stored secrets (names only, values masked)
 * - Add secret dialog: name + value form
 * - Delete secret
 * - Secret categories: API keys, tokens, passwords
 * - Access audit table
 */
import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type SecretCategory = "api_key" | "token" | "password" | "webhook" | "other";

interface Secret {
  id: string;
  name: string;
  category: SecretCategory;
  createdAt: string;
  updatedAt: string;
  accessCount: number;
}

interface AccessAuditEntry {
  id: string;
  timestamp: number;
  actor: string;
  action: "view" | "create" | "update" | "delete";
  secretName: string;
  ip?: string;
}

const CATEGORY_LABELS: Record<SecretCategory, string> = {
  api_key: "API Key",
  token: "Token",
  password: "Password",
  webhook: "Webhook",
  other: "Other",
};

const INITIAL_SECRETS: Secret[] = [
  {
    id: "s1",
    name: "KIMI_API_KEY",
    category: "api_key",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-10",
    accessCount: 245,
  },
  {
    id: "s2",
    name: "PROXY_AUTH_TOKEN",
    category: "token",
    createdAt: "2026-01-02",
    updatedAt: "2026-01-11",
    accessCount: 1892,
  },
  {
    id: "s3",
    name: "DATABASE_PASSWORD",
    category: "password",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    accessCount: 12,
  },
  {
    id: "s4",
    name: "TELEGRAM_BOT_TOKEN",
    category: "token",
    createdAt: "2026-01-03",
    updatedAt: "2026-01-09",
    accessCount: 567,
  },
  {
    id: "s5",
    name: "JWT_SECRET",
    category: "other",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    accessCount: 3,
  },
  {
    id: "s6",
    name: "WEBHOOK_SECRET",
    category: "webhook",
    createdAt: "2026-01-05",
    updatedAt: "2026-01-08",
    accessCount: 89,
  },
  {
    id: "s7",
    name: "REDIS_PASSWORD",
    category: "password",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    accessCount: 8,
  },
  {
    id: "s8",
    name: "THIRD_PARTY_API_KEY",
    category: "api_key",
    createdAt: "2026-01-06",
    updatedAt: "2026-01-12",
    accessCount: 156,
  },
];

const INITIAL_AUDIT: AccessAuditEntry[] = [
  {
    id: "a1",
    timestamp: Date.now() - 300000,
    actor: "admin",
    action: "view",
    secretName: "KIMI_API_KEY",
    ip: "192.168.1.10",
  },
  {
    id: "a2",
    timestamp: Date.now() - 600000,
    actor: "system",
    action: "view",
    secretName: "PROXY_AUTH_TOKEN",
    ip: "127.0.0.1",
  },
  {
    id: "a3",
    timestamp: Date.now() - 1800000,
    actor: "admin",
    action: "update",
    secretName: "WEBHOOK_SECRET",
    ip: "192.168.1.10",
  },
  {
    id: "a4",
    timestamp: Date.now() - 3600000,
    actor: "api_user",
    action: "view",
    secretName: "THIRD_PARTY_API_KEY",
    ip: "192.168.1.25",
  },
  {
    id: "a5",
    timestamp: Date.now() - 7200000,
    actor: "admin",
    action: "create",
    secretName: "NEW_INTEGRATION_KEY",
    ip: "192.168.1.10",
  },
  {
    id: "a6",
    timestamp: Date.now() - 86400000,
    actor: "system",
    action: "view",
    secretName: "DATABASE_PASSWORD",
    ip: "127.0.0.1",
  },
  {
    id: "a7",
    timestamp: Date.now() - 172800000,
    actor: "admin",
    action: "delete",
    secretName: "OLD_API_KEY",
    ip: "192.168.1.10",
  },
];

const VaultPage: React.FC = () => {
  const [secrets, setSecrets] = useState<Secret[]>(INITIAL_SECRETS);
  const [audit] = useState<AccessAuditEntry[]>(INITIAL_AUDIT);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState<SecretCategory>("other");
  const [filterCategory, setFilterCategory] = useState<SecretCategory | "all">("all");
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newName.trim() || !newValue.trim()) return;
    const today = new Date().toISOString().split("T")[0]!;
    setSecrets(prev => [
      {
        id: `s_${Date.now()}`,
        name: newName.trim(),
        category: newCategory,
        createdAt: today,
        updatedAt: today,
        accessCount: 0,
      },
      ...prev,
    ]);
    setNewName("");
    setNewValue("");
    setNewCategory("other");
    setAddOpen(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this secret? This action cannot be undone.")) {
      setSecrets(prev => prev.filter(s => s.id !== id));
    }
  };

  const filteredSecrets = useMemo(
    () =>
      filterCategory === "all"
        ? secrets
        : secrets.filter(s => s.category === filterCategory),
    [secrets, filterCategory]
  );

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="page-container mx-auto max-w-5xl space-y-4 p-1">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Secrets Vault</h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys, tokens, and passwords. Values stay masked — never
          committed. Prefer monorepo Proton Pass +{" "}
          <code className="text-xs">portal secret map</code> for real inject.
        </p>
      </div>

      <Tabs defaultValue="secrets" className="w-full">
        <TabsList>
          <TabsTrigger value="secrets">Secrets ({secrets.length})</TabsTrigger>
          <TabsTrigger value="audit">Access Audit ({audit.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="secrets" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select
              value={filterCategory}
              onValueChange={v =>
                setFilterCategory((v ?? "all") as SecretCategory | "all")
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button>+ Add Secret</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Secret</DialogTitle>
                  <DialogDescription>
                    Demo UI only — production secrets belong in Proton Pass (
                    <code className="text-xs">pass://</code>).
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="secret-name">Name</Label>
                    <Input
                      id="secret-name"
                      placeholder="e.g. STRIPE_API_KEY"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="secret-value">Value</Label>
                    <Input
                      id="secret-value"
                      type="password"
                      placeholder="Secret value"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Category</Label>
                    <Select
                      value={newCategory}
                      onValueChange={v =>
                        setNewCategory((v ?? "other") as SecretCategory)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAdd}
                    disabled={!newName.trim() || !newValue.trim()}
                  >
                    Save Secret
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-3">
            {filteredSecrets.map(secret => (
              <Card key={secret.id} className="border-border/60">
                <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {CATEGORY_LABELS[secret.category]}
                      </Badge>
                      <CardTitle className="font-mono text-base">
                        {secret.name}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      Created {secret.createdAt} · Updated {secret.updatedAt} ·
                      Accessed {secret.accessCount}×
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRevealedSecret(
                          revealedSecret === secret.id ? null : secret.id
                        )
                      }
                    >
                      {revealedSecret === secret.id ? "Hide" : "Reveal"}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(secret.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <code className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                    {revealedSecret === secret.id
                      ? "•••••••• (demo mask — no live value)"
                      : "••••••••••••••••••••"}
                  </code>
                </CardContent>
              </Card>
            ))}
            {filteredSecrets.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No secrets in this category
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Access audit</CardTitle>
              <CardDescription>
                Who touched which secret name (demo data — no values).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatTime(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{entry.actor}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{entry.secretName}</code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {entry.ip ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VaultPage;
