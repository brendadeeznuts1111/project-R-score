---
name: chat-info
description: Respond with current chat ID, type, thread ID, and topic info when asked
metadata: {"clawdbot":{"emoji":"📍","always":true}}
---

# Chat Info Skill

When user asks for "chat info", "chat id", "group id", "topic id", "thread id", or "where am i", respond with the current chat's full information.

## Response Format

Always include ALL of these details:

```
Chat ID: {the numeric chat ID, e.g. -1003663527473}
Chat Type: {private | group | supergroup | channel}
Title: {group/channel name if applicable}
Thread ID: {topic thread ID if in a forum topic, otherwise "N/A"}
Topic Name: {the topic name if in a forum topic}
```

## Example Response

In a forum topic called "Code":
```
Chat ID: -1003663527473
Chat Type: supergroup
Title: My Bot Group
Thread ID: 2
Topic: Code
```

In a regular group:
```
Chat ID: -5262407843
Chat Type: group
Title: Test Group
Thread ID: N/A
Topic: N/A
```

## Config Usage

Tell the user how to use this info:

For per-group config in `~/.clawdbot/clawdbot.json`:
```json
"groups": {
  "{chat_id}": {
    "enabled": true,
    "topics": {
      "{thread_id}": {
        "systemPrompt": "..."
      }
    }
  }
}
```

## Triggers

Respond to:
- "chat info"
- "what's the chat id"
- "topic id"
- "thread id"
- "where am i"
- Any question about current chat/topic identification
