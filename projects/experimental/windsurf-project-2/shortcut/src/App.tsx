import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef, type FormEvent } from "react";
import { APITester } from "./APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";

// Mock ShortcutRegistry data
const mockShortcuts = [
  {
    id: 'save_file',
    action: 'file.save',
    description: 'Save the current file',
    category: 'general',
    default: { primary: 'Ctrl + S', macOS: 'Cmd + S' },
    enabled: true,
    scope: 'global',
    triggers: 45
  },
  {
    id: 'open_settings',
    action: 'app.openSettings',
    description: 'Open application settings',
    category: 'ui',
    default: { primary: 'Ctrl + ,' },
    enabled: true,
    scope: 'global',
    triggers: 12
  },
  {
    id: 'toggle_terminal',
    action: 'terminal.toggle',
    description: 'Toggle terminal panel',
    category: 'developer',
    default: { primary: 'Ctrl + `' },
    enabled: true,
    scope: 'panel',
    triggers: 28
  },
  {
    id: 'copy',
    action: 'edit.copy',
    description: 'Copy selection to clipboard',
    category: 'general',
    default: { primary: 'Ctrl + C' },
    enabled: true,
    scope: 'global',
    triggers: 156
  },
  {
    id: 'paste',
    action: 'edit.paste',
    description: 'Paste from clipboard',
    category: 'general',
    default: { primary: 'Ctrl + V' },
    enabled: true,
    scope: 'global',
    triggers: 142
  }
];

const mockProfiles = [
  { id: 'default', name: 'Default', description: 'Standard configuration', active: false },
  { id: 'professional', name: 'Professional', description: 'Optimized for professionals', active: true },
  { id: 'developer', name: 'Developer', description: 'Developer-focused shortcuts', active: false }
];

const mockMetrics = {
  totalShortcuts: 5,
  enabledShortcuts: 5,
  totalTriggers: 383,
  conflicts: 0,
  errors: 0,
  uptime: '2h 15m',
  cacheHitRate: '94%'
};

export function App() {
  const [shortcuts, setShortcuts] = useState(mockShortcuts);
  const [profiles, setProfiles] = useState(mockProfiles);
  const [metrics, setMetrics] = useState(mockMetrics);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('shortcuts');

  // Filter shortcuts based on search and category
  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesSearch = shortcut.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         shortcut.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(shortcuts.map(s => s.category)))];

  const handleToggleShortcut = (id: string) => {
    setShortcuts(prev => prev.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    ));
  };

  const handleTriggerShortcut = (id: string) => {
    setShortcuts(prev => prev.map(s => 
      s.id === id ? { ...s, triggers: s.triggers + 1 } : s
    ));
    console.log(`Triggered shortcut: ${id}`);
  };

  const handleProfileSwitch = (profileId: string) => {
    setProfiles(prev => prev.map(p => ({ ...p, active: p.id === profileId })));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-900/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img
                  src={logo}
                  alt="Shortcut Registry"
                  className="h-8 w-8 transition-all duration-300 hover:drop-shadow-[0_0_1em_#646cffaa]"
                />
                <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  Enhanced ShortcutRegistry
                </h1>
              </div>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                v1.0.0-enhanced
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-green-600 border-green-600">
                ● Healthy
              </Badge>
              <Badge variant="outline">
                {metrics.uptime}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Metrics Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalShortcuts}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Shortcuts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{metrics.enabledShortcuts}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Enabled</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-600">{metrics.totalTriggers}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Total Triggers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{metrics.conflicts}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Conflicts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-cyan-600">{metrics.cacheHitRate}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Cache Hit Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="shortcuts">Shortcuts</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="api">API Tester</TabsTrigger>
          </TabsList>

          {/* Shortcuts Tab */}
          <TabsContent value="shortcuts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shortcut Management</CardTitle>
                <CardDescription>
                  Manage your keyboard shortcuts with advanced filtering and search
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search Shortcuts</Label>
                    <Input
                      id="search"
                      placeholder="Search by ID or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Label htmlFor="category">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Shortcuts List */}
                <div className="space-y-3">
                  {filteredShortcuts.map(shortcut => (
                    <Card key={shortcut.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{shortcut.id}</h3>
                            <Badge variant="secondary">{shortcut.category}</Badge>
                            <Badge variant="outline">{shortcut.scope}</Badge>
                            {shortcut.enabled && (
                              <Badge className="text-green-600 bg-green-50 border-green-200">
                                ● Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            {shortcut.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Keys: {shortcut.default.primary}</span>
                            <span>Triggers: {shortcut.triggers}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={shortcut.enabled ? "default" : "outline"}
                            onClick={() => handleToggleShortcut(shortcut.id)}
                          >
                            {shortcut.enabled ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleTriggerShortcut(shortcut.id)}
                            disabled={!shortcut.enabled}
                          >
                            Trigger
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profiles Tab */}
          <TabsContent value="profiles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Management</CardTitle>
                <CardDescription>
                  Switch between different shortcut profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {profiles.map(profile => (
                  <Card key={profile.id} className={`p-4 ${profile.active ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-2">
                          {profile.name}
                          {profile.active && (
                            <Badge className="text-blue-600 bg-blue-50 border-blue-200">
                              ● Active
                            </Badge>
                          )}
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {profile.description}
                        </p>
                      </div>
                      <Button
                        variant={profile.active ? "outline" : "default"}
                        onClick={() => handleProfileSwitch(profile.id)}
                        disabled={profile.active}
                      >
                        {profile.active ? 'Current' : 'Activate'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Statistics</CardTitle>
                  <CardDescription>
                    Most and least used shortcuts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">Most Used</h4>
                      <div className="space-y-2">
                        {shortcuts
                          .sort((a, b) => b.triggers - a.triggers)
                          .slice(0, 3)
                          .map(shortcut => (
                            <div key={shortcut.id} className="flex justify-between items-center">
                              <span className="text-sm">{shortcut.id}</span>
                              <Badge variant="secondary">{shortcut.triggers}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">Least Used</h4>
                      <div className="space-y-2">
                        {shortcuts
                          .sort((a, b) => a.triggers - b.triggers)
                          .slice(0, 3)
                          .map(shortcut => (
                            <div key={shortcut.id} className="flex justify-between items-center">
                              <span className="text-sm">{shortcut.id}</span>
                              <Badge variant="secondary">{shortcut.triggers}</Badge>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    System performance and health
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>System Health</span>
                      <Badge className="text-green-600 bg-green-50 border-green-200">
                        ● Excellent
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Memory Usage</span>
                      <Badge variant="outline">45 MB</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Average Response Time</span>
                      <Badge variant="outline">2.3ms</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Error Rate</span>
                      <Badge className="text-green-600 bg-green-50 border-green-200">
                        0.00%
                      </Badge>
                    </div>
                    <Separator />
                    <Alert>
                      <AlertDescription>
                        All systems operating normally. No conflicts detected.
                      </AlertDescription>
                    </Alert>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Tester Tab */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Tester</CardTitle>
                <CardDescription>
                  Test the ShortcutRegistry API endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <APITester />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 backdrop-blur-sm dark:bg-slate-900/50 mt-12">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <img src={reactLogo} alt="React" className="h-4 w-4" />
              <span>Powered by React + Bun + TypeScript</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Enhanced ShortcutRegistry v1.0.0</span>
              <Badge variant="outline">Enterprise Ready</Badge>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
