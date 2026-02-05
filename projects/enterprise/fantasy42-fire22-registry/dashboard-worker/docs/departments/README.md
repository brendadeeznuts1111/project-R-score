# 🏢 Fire22 Department Documentation Hub

**Comprehensive documentation for all Fire22 departments with natural hierarchy
integration**

## Overview

This directory contains detailed documentation for all Fire22 departments,
mirroring the live department pages in `src/departments/` while providing
extensive wikis, operational guides, and integration with the Natural Hierarchy
Aggregation System.

## 📚 Department Structure

Each department has:

- **Live Page**: Interactive department overview (`src/departments/`)
- **Documentation Wiki**: Comprehensive operational guide (`docs/departments/`)
- **Wiki Entry**: Knowledge base article (`wiki/departments/`)
- **Hierarchy Integration**: Natural cross-system connections via
  `/api/hierarchy/`

## 🏢 Available Departments

| Department                   | Live Page                                                                | Docs Wiki                          | Knowledge Base                                          | Status      |
| ---------------------------- | ------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------- | ----------- |
| 📈 **Marketing**             | [Live Page](../../src/departments/marketing-department.html)             | [Docs](./marketing.md)             | [Wiki](../../wiki/departments/marketing.md)             | ✅ Complete |
| ⚙️ **Operations**            | [Live Page](../../src/departments/operations-department.html)            | [Docs](./operations.md)            | [Wiki](../../wiki/departments/operations.md)            | ✅ Complete |
| 💰 **Finance**               | [Live Page](../../src/departments/finance-department.html)               | [Docs](./finance.md)               | [Wiki](../../wiki/departments/finance.md)               | ✅ Complete |
| 🎧 **Customer Support**      | [Live Page](../../src/departments/customer-support-department.html)      | [Docs](./customer-support.md)      | [Wiki](../../wiki/departments/customer-support.md)      | ✅ Complete |
| ⚖️ **Compliance**            | [Live Page](../../src/departments/compliance-department.html)            | [Docs](./compliance.md)            | [Wiki](../../wiki/departments/compliance.md)            | ✅ Complete |
| 💻 **Technology**            | [Live Page](../../src/departments/technology-department.html)            | [Docs](./technology.md)            | [Wiki](../../wiki/departments/technology.md)            | ✅ Complete |
| 🛡️ **Security**              | [Live Page](../../src/departments/security-department.html)              | [Docs](./security.md)              | [Wiki](../../wiki/departments/security.md)              | ✅ Complete |
| 👔 **Management**            | [Live Page](../../src/departments/management-department.html)            | [Docs](./management.md)            | [Wiki](../../wiki/departments/management.md)            | ✅ Complete |
| 🎯 **Sportsbook Operations** | [Live Page](../../src/departments/sportsbook-operations-department.html) | [Docs](./sportsbook-operations.md) | [Wiki](../../wiki/departments/sportsbook-operations.md) | ✅ Complete |
| 👥 **Team Contributors**     | [Live Page](../../src/departments/team-contributors-department.html)     | [Docs](./team-contributors.md)     | [Wiki](../../wiki/departments/team-contributors.md)     | ✅ Complete |

## 🔗 Natural Hierarchy Integration

All departments are integrated with the **Natural Hierarchy Aggregation System**
which:

- **Preserves existing structures** - Fire22 8-level agents, org chart,
  department hierarchies
- **Discovers natural connections** - Automatic cross-system relationship
  identification
- **Provides unified access** - Single API for all organizational data
- **Maintains flexibility** - System-specific views when needed

### Quick Hierarchy Access

```bash
# Get all Marketing people across all systems
curl -X POST /api/hierarchy/query \
  -d '{"department": "Marketing"}' \
  -H "Content-Type: application/json"

# Get Operations department structure
curl -X POST /api/hierarchy/query \
  -d '{"department": "Operations"}' \
  -H "Content-Type: application/json"

# View Fire22 agents in original 8-level structure
curl /api/hierarchy/view/fire22

# Discover cross-system connections
curl /api/hierarchy/cross-references
```

## 📋 Documentation Standards

Each department documentation includes:

### 1. **Department Overview**

- Mission statement and core objectives
- Team structure and key personnel
- Performance metrics and KPIs
- Recent achievements and contributions

### 2. **Operational Procedures**

- Standard operating procedures (SOPs)
- Workflow documentation
- Process automation guides
- Quality assurance protocols

### 3. **Tools & Systems**

- Department-specific tools and platforms
- Integration guides and APIs
- Automation workflows
- Performance monitoring

### 4. **Hierarchy Integration**

- Natural hierarchy connections
- Cross-departmental relationships
- Leadership and management structure
- Team collaboration patterns

### 5. **Knowledge Base**

- Troubleshooting guides
- Best practices and standards
- Training materials
- Historical documentation

## 🚀 Getting Started

### For Department Members

1. **Access your department page**: Navigate to live department overview
2. **Review documentation**: Read comprehensive operational guides
3. **Explore hierarchy connections**: See how your role connects across systems
4. **Use API access**: Query organizational data naturally

### For Administrators

1. **Review all departments**: Use this index to navigate documentation
2. **Monitor cross-connections**: Check hierarchy API for organizational
   insights
3. **Update documentation**: Maintain wikis and operational guides
4. **Analyze structures**: Use aggregated hierarchy data for planning

### For Developers

1. **API Integration**: Use hierarchy endpoints in applications
2. **System Extensions**: Add new departments to the hierarchy system
3. **Documentation Updates**: Maintain technical documentation
4. **Performance Monitoring**: Track system usage and optimization

## 📊 Department Metrics Dashboard

### Real-time Department Statistics

```javascript
// Example: Load department overview with hierarchy data
async function loadDepartmentOverview(departmentName) {
  const response = await fetch('/api/hierarchy/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      department: departmentName,
      includeMetrics: true,
    }),
  });

  const data = await response.json();

  return {
    totalMembers: data.results.length,
    leadership: data.results.filter(p => p.context?.isLeadership),
    managers: data.results.filter(p => p.context?.isManager),
    contributors: data.results.filter(p => p.context?.isContributor),
    crossSystemConnections: data.crossReferences?.length || 0,
  };
}
```

### Key Performance Indicators

| Metric                | Description                                                | API Endpoint                          |
| --------------------- | ---------------------------------------------------------- | ------------------------------------- |
| **Team Size**         | Total department members across all systems                | `POST /api/hierarchy/query`           |
| **Leadership Count**  | Natural leadership identification                          | `POST /api/hierarchy/query`           |
| **Cross-connections** | People appearing in multiple systems                       | `GET /api/hierarchy/cross-references` |
| **System Coverage**   | Department presence across Fire22, org chart, dept systems | `GET /api/hierarchy/aggregated`       |

## 🔧 Maintenance & Updates

### Regular Maintenance Tasks

- [ ] Update department wikis monthly
- [ ] Review hierarchy connections quarterly
- [ ] Validate cross-system accuracy
- [ ] Update performance metrics
- [ ] Refresh team member information

### Documentation Lifecycle

1. **Creation**: New departments added with full documentation suite
2. **Updates**: Regular reviews and content refresh
3. **Integration**: Hierarchy system connections validated
4. **Archival**: Historical versions maintained for reference

## 🤝 Contributing

### Adding New Departments

1. Create live department page in `src/departments/`
2. Add comprehensive documentation in `docs/departments/`
3. Create knowledge base entry in `wiki/departments/`
4. Integrate with hierarchy system via API
5. Update this README with new department entry

### Updating Existing Documentation

1. Review current documentation for accuracy
2. Update operational procedures and guides
3. Validate hierarchy system connections
4. Test live page functionality
5. Submit updates following standard procedures

## 📚 Additional Resources

- **[Natural Hierarchy System](../hierarchy-system.md)** - Complete system
  documentation
- **[API Reference](../api/hierarchy-endpoints.md)** - All hierarchy API
  endpoints
- **[Department Template](../../wiki/departments/templates/department-definition-template.md)** -
  Standard template for new departments
- **[Integration Examples](../../example-department-hierarchy-integration.js)** -
  Code examples for hierarchy integration

## 🔗 Quick Links

- **Live Dashboard**: [Fire22 Dashboard](../../src/dashboard.html)
- **Department Index**: [All Departments](../../src/departments/index.html)
- **Hierarchy API**: [API Documentation](../api/hierarchy-endpoints.md)
- **System Architecture**: [Architecture Overview](../architecture/overview.md)

---

**Built with ❤️ using Natural Hierarchy Aggregation System - preserving existing
structures while providing unified access**
