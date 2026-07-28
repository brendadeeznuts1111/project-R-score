# Limit Detection Tests

按照 Bun 测试规范组织的测试文件。详见 https://bun.com/docs/test/writing-tests

## 目录结构

```
tests/
  limits-e2e.test.ts           # E2E 流水线测试（11 个阶段）
  table-format.test.ts         # 表格格式化器合约测试（173 项）
  limit-quarantine.txt         # 测试隔离清单（当前无隔离项）
  account-limits-repo.test.ts  # 仓库层测试
  limit-patterns.test.ts       # 模式检测测试
  limit-prediction-report.test.ts  # 预测报告测试
  limit-raise-agent-api.test.ts    # Agent API 测试
  limit-raise-report.test.ts       # 提升报告测试
  limit-raises-ui.test.ts          # UI 组件测试
  limit-slice.test.ts              # Monitoring slice 测试
```

## 运行测试

```bash
# 运行所有限制检测测试
bun test tests/limits-e2e.test.ts tests/table-format.test.ts

# 只运行 E2E 流水线测试
bun test tests/limits-e2e.test.ts

# 只运行表格格式化器测试
bun test tests/table-format.test.ts

# 运行所有测试（包含其他模块）
bun test
```

## 编写测试规范

- 使用 `describe` + `test` + `expect`（从 `bun:test` 导入）
- 优先使用 `test.each` 配合格式说明符 `%s %i %p %# %o`
- 使用 `test.if()` / `describe.if()` 处理条件测试
- 使用 `expect.hasAssertions()` 确保断言执行
- 测试名称使用 `should + 描述行为` 格式
- 回归测试放在 `tests/regression/` 目录（带有 GitHub issue 编号）
