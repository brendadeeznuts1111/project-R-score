// src/components/ProfileHierarchyDemo.tsx
import React, { useState, useEffect } from 'react';

interface ProfileNode {
  seed: number;
  profile: any;
  depth: number;
  children: ProfileNode[];
}

export function ProfileHierarchyDemo() {
  const [registry, setRegistry] = useState<any>(null);
  const [profiles, setProfiles] = useState<ProfileNode[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<number>(1);
  const [switchResult, setSwitchResult] = useState<any>(null);
  const [hierarchy, setHierarchy] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize demo with sample hierarchical profiles
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    setLoading(true);
    try {
      // Mock registry for demo
      const mockRegistry = {
        createHierarchicalProfile: (name: string, description: string, seed?: number, parent?: string) => ({
          id: `profile_${seed || 1}`,
          name: `${seed || 1}. ${name}`,
          description,
          seedNumber: seed || 1,
          hierarchyLevel: parent ? 1 : 0,
          parentProfileId: parent,
          childProfileIds: []
        }),
        switchToProfileBySeed: (seed: number) => ({
          success: true,
          fromProfile: 'previous',
          toProfile: `profile_${seed}`,
          inheritedShortcuts: [`shortcut_${seed}_1`, `shortcut_${seed}_2`],
          overriddenShortcuts: [`override_${seed}_1`]
        }),
        getNumberedProfiles: () => [
          { seed: 1, profile: { name: '1. Base Profile', description: 'Foundation profile', hierarchyLevel: 0 }, depth: 0 },
          { seed: 2, profile: { name: '2. Developer Profile', description: 'Development shortcuts', hierarchyLevel: 1, parentProfileId: 'profile_1' }, depth: 1 },
          { seed: 3, profile: { name: '3. Frontend Profile', description: 'Frontend development', hierarchyLevel: 2, parentProfileId: 'profile_2' }, depth: 2 },
          { seed: 4, profile: { name: '4. Backend Profile', description: 'Backend development', hierarchyLevel: 2, parentProfileId: 'profile_2' }, depth: 2 },
          { seed: 5, profile: { name: '5. Designer Profile', description: 'Design tools', hierarchyLevel: 1, parentProfileId: 'profile_1' }, depth: 1 }
        ],
        getProfileHierarchy: () => ({
          rootProfiles: ['profile_1'],
          profileTree: {
            'profile_1': { children: ['profile_2', 'profile_5'], depth: 0 },
            'profile_2': { children: ['profile_3', 'profile_4'], depth: 1 },
            'profile_5': { children: [], depth: 1 },
            'profile_3': { children: [], depth: 2 },
            'profile_4': { children: [], depth: 2 }
          }
        })
      };

      setRegistry(mockRegistry);
      
      // Create sample hierarchy
      const sampleProfiles = mockRegistry.getNumberedProfiles();
      setProfiles(buildHierarchyTree(sampleProfiles));
      setHierarchy(mockRegistry.getProfileHierarchy());
    } catch (error) {
      console.error('Failed to initialize demo:', error);
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchyTree = (flatProfiles: any[]): ProfileNode[] => {
    const nodeMap = new Map<string, ProfileNode>();
    const roots: ProfileNode[] = [];

    // Create nodes
    flatProfiles.forEach(item => {
      const node: ProfileNode = {
        seed: item.seed,
        profile: item.profile,
        depth: item.depth,
        children: []
      };
      nodeMap.set(item.profile.id, node);
    });

    // Build tree
    flatProfiles.forEach(item => {
      const node = nodeMap.get(item.profile.id);
      if (item.profile.parentProfileId) {
        const parent = nodeMap.get(item.profile.parentProfileId);
        if (parent && node) {
          parent.children.push(node);
        }
      } else if (node) {
        roots.push(node);
      }
    });

    return roots;
  };

  const handleSwitchProfile = async (seed: number) => {
    if (!registry) return;
    
    setLoading(true);
    try {
      const result = registry.switchToProfileBySeed(seed);
      setSwitchResult(result);
      setSelectedSeed(seed);
    } catch (error) {
      console.error('Failed to switch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderProfileNode = (node: ProfileNode) => {
    const isSelected = selectedSeed === node.seed;
    const indent = node.depth * 24;

    return (
      <div key={node.profile.id} className="profile-node">
        <div 
          className={`profile-item ${isSelected ? 'selected' : ''}`}
          style={{ marginLeft: `${indent}px` }}
          onClick={() => handleSwitchProfile(node.seed)}
        >
          <div className="profile-header">
            <span className="seed-number">#{node.seed}</span>
            <span className="profile-name">{node.profile.name}</span>
            <span className="profile-level">L{node.depth}</span>
          </div>
          <div className="profile-description">{node.profile.description}</div>
        </div>
        {node.children.map(child => renderProfileNode(child))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="profile-hierarchy-demo loading">
        <div className="loading-spinner">Loading hierarchical profiles...</div>
      </div>
    );
  }

  return (
    <div className="profile-hierarchy-demo">
      <div className="demo-header">
        <h2>🔢 Numbered Hierarchical Profile Management</h2>
        <p>Manage and switch between hierarchical shortcut profiles with seed numbers</p>
      </div>

      <div className="demo-content">
        <div className="hierarchy-panel">
          <div className="panel-header">
            <h3>Profile Hierarchy</h3>
            <div className="legend">
              <span className="legend-item">
                <span className="seed-badge">#</span> Seed Number
              </span>
              <span className="legend-item">
                <span className="level-badge">L0</span> Hierarchy Level
              </span>
            </div>
          </div>
          
          <div className="profile-tree">
            {profiles.map(node => renderProfileNode(node))}
          </div>
        </div>

        <div className="control-panel">
          <div className="panel-header">
            <h3>Quick Switch</h3>
          </div>
          
          <div className="seed-selector">
            <label>Switch to Profile by Seed:</label>
            <div className="seed-buttons">
              {[1, 2, 3, 4, 5].map(seed => (
                <button
                  key={seed}
                  className={`seed-btn ${selectedSeed === seed ? 'active' : ''}`}
                  onClick={() => handleSwitchProfile(seed)}
                >
                  #{seed}
                </button>
              ))}
            </div>
          </div>

          {switchResult && (
            <div className="switch-result">
              <h4>Switch Result</h4>
              <div className="result-item success">
                ✓ Successfully switched from {switchResult.fromProfile} to {switchResult.toProfile}
              </div>
              {switchResult.inheritedShortcuts && switchResult.inheritedShortcuts.length > 0 && (
                <div className="result-item inherited">
                  ↳ Inherited {switchResult.inheritedShortcuts.length} shortcuts
                </div>
              )}
              {switchResult.overriddenShortcuts && switchResult.overriddenShortcuts.length > 0 && (
                <div className="result-item overridden">
                  ⚡ Override {switchResult.overriddenShortcuts.length} shortcuts
                </div>
              )}
            </div>
          )}

          <div className="hierarchy-stats">
            <h4>Hierarchy Statistics</h4>
            <div className="stat-grid">
              <div className="stat-item">
                <span className="stat-label">Total Profiles:</span>
                <span className="stat-value">{profiles.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Max Depth:</span>
                <span className="stat-value">2</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Root Profiles:</span>
                <span className="stat-value">{hierarchy?.rootProfiles.length || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active Seed:</span>
                <span className="stat-value">#{selectedSeed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-footer">
        <div className="feature-list">
          <div className="feature">
            <span className="feature-icon">🔢</span>
            <span>Numbered seed system for easy profile identification</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🌳</span>
            <span>Hierarchical inheritance with parent-child relationships</span>
          </div>
          <div className="feature">
            <span className="feature-icon">⚡</span>
            <span>Quick switching by seed number</span>
          </div>
          <div className="feature">
            <span className="feature-icon">🎯</span>
            <span>Automatic shortcut inheritance and override resolution</span>
          </div>
        </div>
      </div>
    </div>
  );
}
