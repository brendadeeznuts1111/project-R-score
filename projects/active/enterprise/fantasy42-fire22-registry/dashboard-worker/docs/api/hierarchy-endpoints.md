# 🔗 Fire22 Hierarchy API Reference

**Complete API documentation for the Natural Hierarchy Aggregation System**

## Base URL

```text
https://dashboard-worker.fire22.workers.dev/api/hierarchy
```

## Authentication

Most hierarchy endpoints are read-only and don't require authentication. Future
write operations will use JWT tokens.

## Endpoints Overview

| Endpoint            | Method | Description                          |
| ------------------- | ------ | ------------------------------------ |
| `/aggregated`       | GET    | Complete aggregated hierarchy view   |
| `/query`            | POST   | Natural search across all systems    |
| `/cross-references` | GET    | Discovered cross-system connections  |
| `/view/{system}`    | GET    | System-specific hierarchy views      |
| `/unified`          | GET    | Legacy unified endpoint (deprecated) |

---

## 🏢 Main Aggregation Endpoints

### GET `/api/hierarchy/aggregated`

Returns the complete aggregated hierarchy that preserves all source systems
while providing unified access.

#### Request

```bash
curl -X GET https://dashboard-worker.fire22.workers.dev/api/hierarchy/aggregated
```

#### Response

```json
{
  "success": true,
  "data": {
    "roots": [
      {
        "id": "org_ceo_001",
        "name": "Michael Johnson",
        "title": "CEO",
        "department": "Executive",
        "sourceSystem": "organizational",
        "context": {
          "isLeadership": true,
          "hasDirectReports": true
        }
      }
    ],
    "fire22View": [
      {
        "id": "fire22_A001",
        "name": "Master Agent One",
        "title": "Master Agent",
        "department": "Sales",
        "sourceSystem": "fire22",
        "sourceData": {
          "agentId": "A001",
          "level": 1
        },
        "children": ["fire22_A002"],
        "context": {
          "isLeadership": true,
          "hasDirectReports": true
        },
        "references": {
          "fire22AgentId": "A001"
        }
      }
    ],
    "organizationalView": [
      {
        "id": "org_ceo_001",
        "name": "Michael Johnson",
        "title": "CEO",
        "department": "Executive",
        "sourceSystem": "organizational",
        "context": {
          "isLeadership": true,
          "hasDirectReports": true
        },
        "references": {
          "employeeId": "ceo_001"
        }
      }
    ],
    "departmentViews": {
      "Marketing": [
        {
          "id": "dept_marketing_mar001",
          "name": "Sarah Johnson",
          "title": "Marketing Director",
          "department": "Marketing",
          "sourceSystem": "department",
          "context": {
            "isLeadership": true,
            "hasDirectReports": true
          },
          "metrics": {
            "implementations": 62
          },
          "references": {
            "departmentRoleId": "mar001"
          }
        }
      ]
    },
    "leadership": [
      {
        "id": "org_ceo_001",
        "name": "Michael Johnson",
        "title": "CEO",
        "confidence": 1.0
      }
    ],
    "managers": [
      {
        "id": "dept_marketing_mar002",
        "name": "Michelle Rodriguez",
        "title": "Marketing Manager",
        "confidence": 1.0
      }
    ],
    "crossReferences": [
      {
        "nodeId": "org_cmo_001",
        "relatedNodes": ["dept_marketing_mar001"],
        "relationship": "likely_same_person",
        "confidence": 0.95
      }
    ],
    "lastUpdated": "2024-01-15T10:30:00Z",
    "sources": [
      {
        "system": "fire22",
        "lastSync": "2024-01-15T10:30:00Z",
        "nodeCount": 2
      },
      {
        "system": "organizational",
        "lastSync": "2024-01-15T10:30:00Z",
        "nodeCount": 2
      },
      {
        "system": "departments",
        "lastSync": "2024-01-15T10:30:00Z",
        "nodeCount": 3
      }
    ]
  },
  "note": "This preserves all existing systems while providing unified access"
}
```

#### Response Fields

| Field                | Type   | Description                                           |
| -------------------- | ------ | ----------------------------------------------------- |
| `roots`              | Array  | Multiple root nodes (reflects organizational reality) |
| `fire22View`         | Array  | Fire22 agents in original 8-level structure           |
| `organizationalView` | Array  | Corporate org chart structure                         |
| `departmentViews`    | Object | Department-specific hierarchies                       |
| `leadership`         | Array  | Natural leadership grouping (emergent)                |
| `managers`           | Array  | Natural manager grouping (emergent)                   |
| `crossReferences`    | Array  | Discovered connections between systems                |
| `sources`            | Array  | Metadata about source system sync status              |

---

### POST `/api/hierarchy/query`

Natural search across all hierarchy systems with flexible filtering.

#### Request

```bash
curl -X POST https://dashboard-worker.fire22.workers.dev/api/hierarchy/query \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sarah",
    "department": "Marketing",
    "sourceSystem": "organizational",
    "isLeadership": true,
    "isManager": false
  }'
```

#### Request Parameters

| Parameter      | Type    | Required | Description                                                        |
| -------------- | ------- | -------- | ------------------------------------------------------------------ |
| `name`         | string  | No       | Search by person name (partial match)                              |
| `department`   | string  | No       | Filter by department                                               |
| `sourceSystem` | string  | No       | Filter by source system (`fire22`, `organizational`, `department`) |
| `isLeadership` | boolean | No       | Filter by leadership role                                          |
| `isManager`    | boolean | No       | Filter by manager role                                             |

#### Response

```json
{
  "success": true,
  "results": [
    {
      "id": "org_cmo_001",
      "name": "Sarah Johnson",
      "title": "Chief Marketing Officer",
      "department": "Marketing",
      "sourceSystem": "organizational",
      "context": {
        "isLeadership": true,
        "isManager": true,
        "hasDirectReports": true
      },
      "references": {
        "employeeId": "cmo_001"
      }
    },
    {
      "id": "dept_marketing_mar001",
      "name": "Sarah Johnson",
      "title": "Marketing Director",
      "department": "Marketing",
      "sourceSystem": "department",
      "context": {
        "isLeadership": true,
        "hasDirectReports": true
      },
      "metrics": {
        "implementations": 62
      },
      "references": {
        "departmentRoleId": "mar001"
      }
    }
  ],
  "total": 2,
  "query": {
    "name": "Sarah",
    "department": "Marketing",
    "isLeadership": true
  },
  "note": "Natural query across all hierarchy systems"
}
```

#### Example Queries

**Find all leadership:**

```json
{
  "isLeadership": true
}
```

**Find Marketing managers:**

```json
{
  "department": "Marketing",
  "isManager": true
}
```

**Find Fire22 agents only:**

```json
{
  "sourceSystem": "fire22"
}
```

**Search by partial name:**

```json
{
  "name": "John"
}
```

---

### GET `/api/hierarchy/cross-references`

Discover natural connections between different hierarchy systems.

#### Request

```bash
curl -X GET https://dashboard-worker.fire22.workers.dev/api/hierarchy/cross-references
```

#### Response

```json
{
  "success": true,
  "crossReferences": [
    {
      "person": "Sarah Johnson",
      "connections": [
        {
          "id": "org_cmo_001",
          "system": "organizational",
          "title": "Chief Marketing Officer",
          "confidence": 1.0
        },
        {
          "id": "dept_marketing_mar001",
          "system": "department",
          "title": "Marketing Director",
          "confidence": 0.95
        }
      ],
      "likely_same_person": true,
      "confidence": 0.95
    },
    {
      "person": "Jennifer Wilson",
      "connections": [
        {
          "id": "dept_operations_ops001",
          "system": "department",
          "title": "VP of Operations",
          "confidence": 1.0
        }
      ],
      "likely_same_person": false,
      "confidence": 1.0
    }
  ],
  "note": "Natural connections discovered across systems, not forced"
}
```

#### Confidence Levels

| Range      | Meaning           | Action                     |
| ---------- | ----------------- | -------------------------- |
| 0.95 - 1.0 | High confidence   | Auto-suggest connection    |
| 0.8 - 0.94 | Medium confidence | Flag for review            |
| 0.7 - 0.79 | Low confidence    | Manual verification needed |
| < 0.7      | No connection     | Not suggested              |

---

## 🎯 System-Specific Views

### GET `/api/hierarchy/view/{system}`

Get hierarchy data from a specific source system in its original structure.

#### Supported Systems

- `fire22` - Fire22 agent hierarchy
- `organizational` - Corporate org chart
- `departments` - Department-specific structures

### GET `/api/hierarchy/view/fire22`

Fire22 agent hierarchy in original 8-level structure.

#### Request

```bash
curl -X GET https://dashboard-worker.fire22.workers.dev/api/hierarchy/view/fire22
```

#### Response

```json
{
  "success": true,
  "view": {
    "system": "Fire22 Agent Hierarchy",
    "preserves": "8-level agent structure",
    "nodes": [
      {
        "id": "fire22_A001",
        "name": "Master Agent One",
        "level": 1,
        "title": "Master Agent",
        "department": "Sales",
        "children": ["fire22_A002"],
        "sourceData": {
          "agentId": "A001",
          "level": 1,
          "permissions": ["all"],
          "specializations": ["premium_accounts"]
        }
      },
      {
        "id": "fire22_A002",
        "name": "Senior Agent Two",
        "level": 3,
        "title": "Senior Agent",
        "department": "Sales",
        "parentId": "fire22_A001",
        "sourceData": {
          "agentId": "A002",
          "level": 3,
          "permissions": ["customer_management"],
          "territory": "North America"
        }
      }
    ]
  },
  "note": "Fire22 Agent Hierarchy preserved in its natural structure"
}
```

#### Fire22 Level Structure

| Level | Title               | Typical Role          |
| ----- | ------------------- | --------------------- |
| 1     | Master Agent        | Top-level agent       |
| 2     | Senior Master Agent | Senior leadership     |
| 3     | Agent               | Standard agent        |
| 4     | Senior Agent        | Experienced agent     |
| 5     | Sub-Agent           | Junior agent          |
| 6     | Senior Sub-Agent    | Experienced sub-agent |
| 7     | Basic Agent         | Entry level           |
| 8     | Clerk               | Administrative        |

### GET `/api/hierarchy/view/organizational`

Corporate organizational chart structure.

#### Request

```bash
curl -X GET https://dashboard-worker.fire22.workers.dev/api/hierarchy/view/organizational
```

#### Response

```json
{
  "success": true,
  "view": {
    "system": "Organizational Chart",
    "preserves": "Company org structure",
    "nodes": [
      {
        "id": "org_ceo_001",
        "name": "Michael Johnson",
        "title": "CEO",
        "department": "Executive",
        "parentId": null,
        "children": ["org_cmo_001", "org_cto_001"]
      },
      {
        "id": "org_cmo_001",
        "name": "Sarah Johnson",
        "title": "Chief Marketing Officer",
        "department": "Marketing",
        "parentId": "org_ceo_001",
        "children": []
      }
    ]
  },
  "note": "Organizational Chart preserved in its natural structure"
}
```

### GET `/api/hierarchy/view/departments`

Department-specific hierarchy structures.

#### Request

```bash
curl -X GET https://dashboard-worker.fire22.workers.dev/api/hierarchy/view/departments
```

#### Response

```json
{
  "success": true,
  "view": {
    "system": "Department Hierarchies",
    "preserves": "Department-specific structures",
    "departments": {
      "Marketing": [
        {
          "id": "dept_marketing_mar001",
          "name": "Sarah Johnson",
          "title": "Marketing Director",
          "department": "Marketing",
          "metrics": {
            "implementations": 62,
            "kpis": {
              "leadGen": 127,
              "roi": 4.2
            }
          }
        },
        {
          "id": "dept_marketing_mar002",
          "name": "Michelle Rodriguez",
          "title": "Marketing Manager",
          "department": "Marketing",
          "parentId": "dept_marketing_mar001",
          "metrics": {
            "implementations": 45,
            "efficiency": "92%"
          }
        }
      ],
      "Operations": [
        {
          "id": "dept_operations_ops001",
          "name": "Jennifer Wilson",
          "title": "VP of Operations",
          "department": "Operations",
          "metrics": {
            "implementations": 71,
            "teamSize": 24
          }
        }
      ],
      "Technology": [
        {
          "id": "dept_technology_tech001",
          "name": "Chris Brown",
          "title": "Chief Technology Officer",
          "department": "Technology",
          "metrics": {
            "implementations": 89,
            "teamSize": 16
          }
        }
      ]
    }
  },
  "note": "Department Hierarchies preserved in their natural structures"
}
```

---

## 🔧 Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional context"
  }
}
```

### Common Error Codes

| Code                | HTTP Status | Description                    |
| ------------------- | ----------- | ------------------------------ |
| `INVALID_QUERY`     | 400         | Invalid query parameters       |
| `SYSTEM_NOT_FOUND`  | 404         | Invalid system in view request |
| `NO_RESULTS`        | 404         | Query returned no results      |
| `AGGREGATION_ERROR` | 500         | Error during data aggregation  |
| `SYNC_FAILURE`      | 503         | Source system sync failed      |

### Example Error Responses

**Invalid system view:**

```bash
curl -X GET /api/hierarchy/view/invalid-system
```

```json
{
  "success": false,
  "error": "View not found",
  "availableViews": ["fire22", "organizational", "departments"]
}
```

**Invalid query parameters:**

```bash
curl -X POST /api/hierarchy/query -d '{"invalidField": true}'
```

```json
{
  "success": false,
  "error": "Invalid query parameters",
  "code": "INVALID_QUERY",
  "details": {
    "validFields": [
      "name",
      "department",
      "sourceSystem",
      "isLeadership",
      "isManager"
    ]
  }
}
```

---

## 🚀 Rate Limiting

| Endpoint            | Rate Limit   | Window |
| ------------------- | ------------ | ------ |
| `/aggregated`       | 100 requests | 1 hour |
| `/query`            | 200 requests | 1 hour |
| `/cross-references` | 50 requests  | 1 hour |
| `/view/*`           | 150 requests | 1 hour |

Rate limit headers included in responses:

- `X-RateLimit-Limit`: Total requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp of rate limit reset

---

## 📊 Response Caching

### Cache Headers

All endpoints include appropriate cache headers:

```text
Cache-Control: public, max-age=300
ETag: "hierarchy-v1-abc123"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT
```

### Cache Strategy

- **Aggregated data**: 5-minute cache
- **System views**: 10-minute cache
- **Cross-references**: 15-minute cache
- **Query results**: 2-minute cache

---

## 🔍 Advanced Usage Examples

### JavaScript/TypeScript

#### Basic Hierarchy Query

```typescript
interface HierarchyQueryRequest {
  name?: string;
  department?: string;
  sourceSystem?: 'fire22' | 'organizational' | 'department';
  isLeadership?: boolean;
  isManager?: boolean;
}

async function searchHierarchy(query: HierarchyQueryRequest) {
  const response = await fetch('/api/hierarchy/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });

  if (!response.ok) {
    throw new Error(`Hierarchy query failed: ${response.statusText}`);
  }

  return response.json();
}

// Usage examples
const leadership = await searchHierarchy({ isLeadership: true });
const marketingTeam = await searchHierarchy({ department: 'Marketing' });
const fire22Agents = await searchHierarchy({ sourceSystem: 'fire22' });
```

#### Cross-Reference Analysis

```typescript
async function analyzeCrossReferences() {
  const response = await fetch('/api/hierarchy/cross-references');
  const data = await response.json();

  const highConfidenceMatches = data.crossReferences.filter(
    ref => ref.confidence > 0.9 && ref.likely_same_person
  );

  console.log('Potential duplicate entries:', highConfidenceMatches);

  return highConfidenceMatches;
}
```

#### Department Integration

```typescript
async function loadDepartmentHierarchy(department: string) {
  // Get all people in department across all systems
  const allPeople = await searchHierarchy({ department });

  // Get department-specific view
  const deptView = await fetch('/api/hierarchy/view/departments').then(r =>
    r.json()
  );

  const deptSpecific = deptView.view.departments[department] || [];

  return {
    allSystems: allPeople.results,
    departmentSpecific: deptSpecific,
    crossSystemCount: allPeople.results.length,
    departmentCount: deptSpecific.length,
  };
}
```

### Python

```python
import requests
from typing import Dict, List, Optional

class HierarchyAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/') + '/api/hierarchy'

    def search(self,
               name: Optional[str] = None,
               department: Optional[str] = None,
               source_system: Optional[str] = None,
               is_leadership: Optional[bool] = None,
               is_manager: Optional[bool] = None) -> Dict:

        query = {}
        if name: query['name'] = name
        if department: query['department'] = department
        if source_system: query['sourceSystem'] = source_system
        if is_leadership is not None: query['isLeadership'] = is_leadership
        if is_manager is not None: query['isManager'] = is_manager

        response = requests.post(f'{self.base_url}/query', json=query)
        response.raise_for_status()
        return response.json()

    def get_aggregated(self) -> Dict:
        response = requests.get(f'{self.base_url}/aggregated')
        response.raise_for_status()
        return response.json()

    def get_cross_references(self) -> Dict:
        response = requests.get(f'{self.base_url}/cross-references')
        response.raise_for_status()
        return response.json()

    def get_system_view(self, system: str) -> Dict:
        response = requests.get(f'{self.base_url}/view/{system}')
        response.raise_for_status()
        return response.json()

# Usage
api = HierarchyAPI('https://dashboard-worker.fire22.workers.dev')

# Find all leadership
leadership = api.search(is_leadership=True)

# Get Fire22 agents
fire22_agents = api.get_system_view('fire22')

# Find potential duplicates
cross_refs = api.get_cross_references()
```

---

## 🔄 Webhooks & Real-time Updates

### Coming Soon

Real-time hierarchy updates via WebSockets and webhooks.

**Planned endpoints:**

- `GET /api/hierarchy/stream` - WebSocket connection for live updates
- `POST /api/hierarchy/webhooks` - Register webhook for hierarchy changes

**Update event types:**

- `node_added` - New person added to any system
- `node_updated` - Person information changed
- `connection_discovered` - New cross-reference found
- `system_synced` - Source system completed sync

---

This API provides comprehensive access to the Fire22 organizational hierarchy
while preserving the natural structure of all existing systems. The flexible
query interface allows for powerful cross-system analysis while maintaining the
integrity of each source system.
