import { useState } from 'react';

interface Secret {
  id: string;
  name: string;
  value: string;
  category: 'api-key' | 'password' | 'token' | 'certificate';
  createdAt: Date;
  lastAccessed: Date;
  isEncrypted: boolean;
  description?: string;
}

interface SecretCategory {
  name: string;
  icon: string;
  color: string;
  count: number;
}

export default function SecretsDashboard() {
  const [secrets, setSecrets] = useState<Secret[]>([
    {
      id: '1',
      name: 'Database API Key',
      value: 'sk-1234567890abcdef',
      category: 'api-key',
      createdAt: new Date('2024-01-15'),
      lastAccessed: new Date('2024-01-20'),
      isEncrypted: true,
      description: 'Primary database connection key'
    },
    {
      id: '2',
      name: 'Admin Password',
      value: '••••••••••••',
      category: 'password',
      createdAt: new Date('2024-01-10'),
      lastAccessed: new Date('2024-01-19'),
      isEncrypted: true,
      description: 'System administrator access'
    },
    {
      id: '3',
      name: 'JWT Token',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      category: 'token',
      createdAt: new Date('2024-01-18'),
      lastAccessed: new Date('2024-01-20'),
      isEncrypted: false,
      description: 'Authentication token for API access'
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecretValues, setShowSecretValues] = useState<{ [key: string]: boolean }>({});
  const [newSecretForm, setNewSecretForm] = useState({
    name: '',
    value: '',
    category: 'api-key' as Secret['category'],
    description: ''
  });
  const [showAddForm, setShowAddForm] = useState(false);

  const categories: SecretCategory[] = [
    { name: 'all', icon: '🔐', color: 'bg-gray-500', count: secrets.length },
    { name: 'api-key', icon: '🔑', color: 'bg-blue-500', count: secrets.filter(s => s.category === 'api-key').length },
    { name: 'password', icon: '🔒', color: 'bg-red-500', count: secrets.filter(s => s.category === 'password').length },
    { name: 'token', icon: '🎟️', color: 'bg-green-500', count: secrets.filter(s => s.category === 'token').length },
    { name: 'certificate', icon: '📜', color: 'bg-purple-500', count: secrets.filter(s => s.category === 'certificate').length }
  ];

  const filteredSecrets = secrets.filter(secret => {
    const matchesCategory = selectedCategory === 'all' || secret.category === selectedCategory;
    const matchesSearch = secret.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (secret.description?.toLowerCase().includes(searchQuery.toLowerCase()) || '');
    return matchesCategory && matchesSearch;
  });

  const toggleSecretVisibility = (secretId: string) => {
    setShowSecretValues(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const addNewSecret = () => {
    if (newSecretForm.name && newSecretForm.value) {
      const newSecret: Secret = {
        id: Date.now().toString(),
        name: newSecretForm.name,
        value: newSecretForm.category === 'password' ? '••••••••••••' : newSecretForm.value,
        category: newSecretForm.category,
        createdAt: new Date(),
        lastAccessed: new Date(),
        isEncrypted: true,
        description: newSecretForm.description
      };
      setSecrets([...secrets, newSecret]);
      setNewSecretForm({ name: '', value: '', category: 'api-key', description: '' });
      setShowAddForm(false);
    }
  };

  const deleteSecret = (secretId: string) => {
    setSecrets(secrets.filter(secret => secret.id !== secretId));
  };

  const getCategoryIcon = (category: Secret['category']) => {
    const cat = categories.find(c => c.name === category);
    return cat?.icon || '🔐';
  };

  const getCategoryColor = (category: Secret['category']) => {
    const cat = categories.find(c => c.name === category);
    return cat?.color || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        {/* Header */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🔐 Secrets Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Secure management of API keys, passwords, and tokens
          </p>
        </header>

        {/* Category Filter */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(category => (
              <button
                key={category.name}
                onClick={() => setSelectedCategory(category.name)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
                  selectedCategory === category.name
                    ? `${category.color} text-white shadow-lg`
                    : 'bg-white/20 text-gray-300 hover:bg-white/30'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.name.charAt(0).toUpperCase() + category.name.slice(1).replace('-', ' ')}
                <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Search and Actions */}
        <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search secrets..."
                className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105 font-medium"
            >
              {showAddForm ? 'Cancel' : '+ Add Secret'}
            </button>
          </div>
        </section>

        {/* Add Secret Form */}
        {showAddForm && (
          <section className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <h3 className="text-xl font-semibold text-white mb-4">Add New Secret</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={newSecretForm.name}
                onChange={(e) => setNewSecretForm({...newSecretForm, name: e.target.value})}
                placeholder="Secret name"
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={newSecretForm.category}
                onChange={(e) => setNewSecretForm({...newSecretForm, category: e.target.value as Secret['category']})}
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="api-key">API Key</option>
                <option value="password">Password</option>
                <option value="token">Token</option>
                <option value="certificate">Certificate</option>
              </select>
              <input
                type="text"
                value={newSecretForm.value}
                onChange={(e) => setNewSecretForm({...newSecretForm, value: e.target.value})}
                placeholder="Secret value"
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 md:col-span-2"
              />
              <input
                type="text"
                value={newSecretForm.description}
                onChange={(e) => setNewSecretForm({...newSecretForm, description: e.target.value})}
                placeholder="Description (optional)"
                className="px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 md:col-span-2"
              />
            </div>
            <button
              onClick={addNewSecret}
              className="mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 transform hover:scale-105 font-medium"
            >
              Add Secret
            </button>
          </section>
        )}

        {/* Secrets Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSecrets.map(secret => (
            <div
              key={secret.id}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCategoryIcon(secret.category)}</span>
                  <div>
                    <h3 className="text-white font-semibold">{secret.name}</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs text-white ${getCategoryColor(secret.category)}`}>
                      {secret.category.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteSecret(secret.id)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  🗑️
                </button>
              </div>

              {secret.description && (
                <p className="text-gray-300 text-sm mb-4">{secret.description}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Value:</span>
                  <button
                    onClick={() => toggleSecretVisibility(secret.id)}
                    className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                  >
                    {showSecretValues[secret.id] ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="bg-black/30 rounded-lg p-3 font-mono text-sm">
                  {showSecretValues[secret.id] ? secret.value : '••••••••••••••••'}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between text-xs text-gray-400">
                <span>Created: {secret.createdAt.toLocaleDateString()}</span>
                <span>Accessed: {secret.lastAccessed.toLocaleDateString()}</span>
              </div>

              {secret.isEncrypted && (
                <div className="mt-2 flex items-center text-green-400 text-xs">
                  <span className="mr-1">🔒</span>
                  Encrypted
                </div>
              )}
            </div>
          ))}
        </section>

        {filteredSecrets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No secrets found</p>
          </div>
        )}
      </div>
    </div>
  );
}
