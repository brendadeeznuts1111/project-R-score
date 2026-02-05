---
title: "Advanced Frontmatter Processing"
description: "Testing multi-format frontmatter extraction with FactoryWager Engine"
date: 2026-02-01
author: "FactoryWager Team"
tags: ["frontmatter", "markdown", "factory-wager", "bun"]
categories: ["documentation", "testing"]
draft: false
featured: true
seo:
  title: "Advanced Frontmatter Processing with FactoryWager"
  description: "Multi-format frontmatter extraction and normalization"
---

# Advanced Frontmatter Processing

This is a test document demonstrating the FactoryWager Frontmatter Engine's capabilities.

## Features Tested

- **YAML frontmatter extraction**
- **Key normalization**
- **Type coercion**
- **SEO metadata mapping**

## Content

The frontmatter above should be extracted and normalized with the following transformations:

1. `date` → ISO format in `date_iso`
2. `tags` string → array format
3. `categories` string → array format
4. `title` → `meta.title` for SEO

## Performance

This document should process in under 0.12ms with the FactoryWager engine.

---

*Generated for testing FactoryWager Frontmatter Engine v1.0*
