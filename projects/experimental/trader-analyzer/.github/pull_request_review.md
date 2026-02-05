# PR Review Checklist

## Review Focus Areas

### Code Quality
- [ ] Code follows Bun-native patterns (no Node.js APIs where Bun alternatives exist)
- [ ] TypeScript types are correct and strict mode passes
- [ ] No hardcoded values (use constants/environment variables)
- [ ] Error handling is appropriate (NX-xxx error codes where applicable)
- [ ] Code is readable and well-documented

### Functionality
- [ ] Changes work as described
- [ ] Edge cases are handled
- [ ] No breaking changes (or breaking changes are documented)
- [ ] Backward compatibility maintained (if applicable)

### Testing
- [ ] Tests pass (`bun test`)
- [ ] Type checking passes (`bun run typecheck`)
- [ ] Manual testing completed (if applicable)
- [ ] Edge cases tested

### Performance
- [ ] No performance regressions
- [ ] Cache operations use appropriate TTL/strategy
- [ ] Database queries are optimized (if applicable)

### Security
- [ ] No security vulnerabilities introduced
- [ ] Input validation present
- [ ] Sensitive data handled appropriately
- [ ] RBAC checks in place (if applicable)

### Documentation
- [ ] API endpoints documented in OpenAPI spec (`src/api/docs.ts`)
- [ ] New endpoints added to root `/` discovery endpoint
- [ ] README/docs updated (if applicable)
- [ ] Code comments explain complex logic

### Integration
- [ ] Dashboard links use dynamic `API_BASE` (if applicable)
- [ ] MCP tools signed with Bun PM hash (if applicable)
- [ ] Registry entries updated (if applicable)

## Review Comments

### Positive Feedback
- What worked well?
- What patterns should be replicated?

### Suggestions
- What could be improved?
- Are there better approaches?

### Questions
- Any unclear code or logic?
- Need clarification on design decisions?

## Approval Criteria

**Approve** if:
- ✅ All checklist items pass
- ✅ Code quality meets standards
- ✅ No blocking issues

**Request Changes** if:
- ❌ Critical issues found
- ❌ Tests failing
- ❌ Security concerns
- ❌ Breaking changes not documented

**Comment** if:
- 💬 Need clarification
- 💬 Minor suggestions
- 💬 Questions about approach

## Department Review Assignments

### API / Routes
- **Reviewer**: API Team Lead
- **Focus**: Endpoint design, OpenAPI spec, error handling

### Arbitrage / Trading
- **Reviewer**: Trading Team Lead
- **Focus**: Algorithm correctness, performance, edge cases

### ORCA / Sports Betting
- **Reviewer**: ORCA Team Lead
- **Focus**: Normalization accuracy, taxonomy updates

### Dashboard / UI
- **Reviewer**: Frontend Team Lead
- **Focus**: UX, accessibility, CORS/file:// protocol handling

### Registry / MCP Tools
- **Reviewer**: Platform Team Lead
- **Focus**: Tool signatures, registry consistency, MCP compliance

### Security
- **Reviewer**: Security Team Lead
- **Focus**: Vulnerabilities, RBAC, input validation

### Performance / Caching
- **Reviewer**: Performance Team Lead
- **Focus**: Cache strategy, query optimization, latency

## Review Timeline

- **Small PRs** (< 200 lines): 1-2 business days
- **Medium PRs** (200-1000 lines): 2-3 business days
- **Large PRs** (> 1000 lines): 3-5 business days
- **Critical/Hotfix**: Same day review

## Review Etiquette

- Be constructive and respectful
- Explain reasoning for suggestions
- Acknowledge good work
- Ask questions rather than making assumptions
- Respond to reviewer feedback promptly
