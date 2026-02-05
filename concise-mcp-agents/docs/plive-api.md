# Plive Private API

Base URL: `https://plive.sportswidgets.pro`

Version: `2.1.0-prod`

> **Production Status**: 🟢 Active API documentation with automated deployment and CI validation

## auth

Keep session alive → reuse `x-gs-session`.

## security

```yaml
components:
  securitySchemes:
    pliveSession:
      type: apiKey
      in: header
      name: x-gs-session
      description: Session token obtained from authentication endpoint
```

## endpoints

### GET /manager-tools/usersList/

```yaml
paths:
  /manager-tools/usersList/:
    get:
      operationId: getUsers
      security:
        - pliveSession: []
      parameters:
        - name: agentNames
          in: query
          schema: { type: string }
        - name: includeSubAgents
          in: query
          schema: { type: boolean, default: true }
      responses:
        200:
          description: List of players
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PlayerList' }
        401:
          description: Session expired or invalid
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
```

### POST /manager-tools/ajax.php (Multiple Actions)

**Supported Actions:**
- `getSummaryReport` → Returns `SummaryReport`
- `getLastBets` → Returns `LastBets`
- `getUsersReport` → Returns `UsersReport`

```yaml
paths:
  /manager-tools/ajax.php:
    post:
      operationId: ajaxAction
      summary: Execute various AJAX actions for reports and data retrieval
      security:
        - pliveSession: []
      parameters:
        - name: action
          in: query
          required: true
          schema:
            type: string
            enum: [getSummaryReport, getLastBets, getUsersReport]
          description: The action to perform
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              properties:
                start:
                  type: integer
                  minimum: 0
                  default: 0
                  description: Row offset for pagination
                limit:
                  type: integer
                  minimum: 1
                  maximum: 5000
                  default: 100
                  description: Max rows to return
              required: [start, limit]
      responses:
        200:
          description: Action-specific response data
          content:
            application/json:
              schema:
                oneOf:
                  - $ref: '#/components/schemas/SummaryReport'
                  - $ref: '#/components/schemas/LastBets'
                  - $ref: '#/components/schemas/UsersReport'
        401:
          description: Session expired / invalid
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
```

### POST /manager-tools/ajax.php?action=getEventsReport

```yaml
paths:
  /manager-tools/ajax.php:
    post:
      operationId: getEventsReport
      summary: Retrieve live betting events with filtering options
      parameters:
        - name: action
          in: query
          required: true
          schema:
            type: string
            enum: [getEventsReport]
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema:
              type: object
              properties:
                start:
                  type: integer
                  minimum: 0
                  default: 0
                  description: Row offset for pagination
                limit:
                  type: integer
                  minimum: 1
                  maximum: 5000
                  default: 100
                  description: Max events to return
                sport:
                  type: string
                  description: Filter by sport type (optional)
                league:
                  type: string
                  description: Filter by league (optional)
                status:
                  type: string
                  enum: [upcoming, live, finished]
                  default: live
                  description: Event status filter
              required: [start, limit]
      responses:
        200:
          description: Paginated events report
          content:
            application/json:
              schema: { $ref: '#/components/schemas/EventsReport' }
        401:
          description: Session expired / invalid
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Error' }
      security:
        - pliveSession: []
```

## components

### schemas

```yaml
components:
  schemas:
    PlayerList:
      type: object
      properties:
        players:
          type: array
          items:
            $ref: '#/components/schemas/Player'
        totalCount:
          type: integer

    Player:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        balance:
          type: number
        status:
          type: string
          enum: [active, suspended, banned]

    SummaryReport:
      type: object
      properties:
        totalBets:
          type: integer
        totalProfit:
          type: number
        agentCount:
          type: integer
        period:
          type: string
          enum: [daily, weekly, monthly]

    LastBets:
      type: object
      properties:
        bets:
          type: array
          items:
            $ref: '#/components/schemas/Bet'
        totalCount:
          type: integer

    Bet:
      type: object
      properties:
        id:
          type: string
        playerId:
          type: string
        amount:
          type: number
        odds:
          type: number
        result:
          type: string
          enum: [win, loss, pending]
        timestamp:
          type: string
          format: date-time

    UsersReport:
      type: object
      properties:
        users:
          type: array
          items:
            $ref: '#/components/schemas/UserReport'
        totalCount:
          type: integer
        period:
          type: object
          properties:
            start:
              type: string
              format: date
            end:
              type: string
              format: date

    UserReport:
      type: object
      properties:
        userId:
          type: string
        username:
          type: string
        totalBets:
          type: integer
        totalWagered:
          type: number
        totalWon:
          type: number
        profit:
          type: number
        lastActivity:
          type: string
          format: date-time

    EventsReport:
      type: object
      properties:
        events:
          type: array
          items:
            $ref: '#/components/schemas/Event'
        totalCount:
          type: integer
        filters:
          type: object
          properties:
            sport:
              type: string
            league:
              type: string
            status:
              type: string

    Event:
      type: object
      properties:
        eventId:
          type: string
        sport:
          type: string
        league:
          type: string
        homeTeam:
          type: string
        awayTeam:
          type: string
        startTime:
          type: string
          format: date-time
        status:
          type: string
          enum: [upcoming, live, finished]
        score:
          type: object
          properties:
            home:
              type: integer
            away:
              type: integer
        odds:
          type: object
          properties:
            homeWin:
              type: number
            draw:
              type: number
            awayWin:
              type: number
        marketCount:
          type: integer
          description: Number of available betting markets

    Error:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        code:
          type: integer
      required: [error, message]
```
