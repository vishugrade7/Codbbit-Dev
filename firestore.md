# Firebase Firestore Data Structure

This document outlines the data structure used in Firebase Firestore for this application.

## Top-Level Collections

-   `/users`
-   `/problems`
-   `/courses`
-   `/problem-sheets`
-   `/badges`
-   `/settings`
-   `/pricing`

---

## 1. `users`

This collection stores individual user data. Each document is keyed by the user's authentication UID.

**Document ID:** `{userId}` (e.g., `aBCdeFgHiJkLmNoPqRsTuVwXyZ1`)

**Fields:**

```json
{
  "uid": "string",
  "username": "string",
  "name": "string",
  "email": "string",
  "avatarUrl": "string",
  "country": "string",
  "company": "string",
  "points": "number",
  "isAdmin": "boolean",
  "razorpaySubscriptionStatus": "string", // 'active', 'cancelled'
  "subscriptionEndDate": "timestamp",
  "activeSessionId": "string",
  "solvedProblems": {
    "{problemId}": {
      "solvedAt": "timestamp",
      "points": "number",
      "difficulty": "string", // "Easy", "Medium", "Hard"
      "categoryName": "string"
    }
  },
  "starredProblems": ["{problemId1}", "{problemId2}"],
  "achievements": {
    "{badgeName}": {
      "name": "string",
      "description": "string",
      "date": "timestamp"
    }
  },
  "submissionHeatmap": {
    "YYYY-MM-DD": "number" // count of submissions on that day
  },
  "currentStreak": "number",
  "maxStreak": "number",
  "lastSolvedDate": "string" // "YYYY-MM-DD"
}
```

---

## 2. `problems`

This collection holds all the coding challenges. It contains a single document named `Apex`.

**Document ID:** `Apex`

**Fields:**

-   **`Category`**: `map`
    -   Each key in this map is a category name (e.g., `"Arrays & Hashing"`).
    -   The value is another map containing the questions for that category.
    -   **`{categoryName}`**: `map`
        -   **`Questions`**: `array` of problem objects.
            -   **Problem Object:**
                ```json
                {
                  "id": "string",
                  "title": "string",
                  "description": "string" (HTML content),
                  "difficulty": "string", // "Easy", "Medium", "Hard"
                  "metadataType": "string", // "Class" or "Trigger"
                  "sampleCode": "string",
                  "testcases": "string",
                  "examples": [
                    { "input": "string", "output": "string", "explanation": "string" }
                  ],
                  "hints": ["string"],
                  "isPremium": "boolean"
                }
                ```
        -   **`imageUrl`**: `string` (URL for the category's cover image)

---

## 3. `courses`

This collection stores all educational courses.

**Document ID:** `{courseId}` (auto-generated)

**Fields:**

```json
{
  "title": "string",
  "description": "string",
  "category": "string",
  "thumbnailUrl": "string",
  "isPublished": "boolean",
  "isPremium": "boolean",
  "createdAt": "timestamp",
  "modules": [
    {
      "id": "string",
      "title": "string",
      "lessons": [
        {
          "id": "string",
          "title": "string",
          "isFree": "boolean",
          "contentBlocks": [
            {
              "id": "string",
              "type": "string", // 'text', 'image', 'video', 'code', etc.
              "content": "string"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 4. `problem-sheets`

This collection stores user-created lists of problems.

**Document ID:** `{sheetId}` (auto-generated)

**Fields:**

```json
{
  "name": "string",
  "createdBy": "string", // User UID
  "creatorName": "string",
  "creatorAvatarUrl": "string",
  "createdAt": "timestamp",
  "isPublic": "boolean",
  "problemIds": ["{problemId1}", "{problemId2}"],
  "subscribers": ["{userId1}", "{userId2}"]
}
```

---

## 5. `badges`

This collection stores the definitions for all achievable badges.

**Document ID:** `{badgeId}` (auto-generated)

**Fields:**

```json
{
  "name": "string",
  "description": "string",
  "type": "string", // "STREAK", "POINTS", "TOTAL_SOLVED", etc.
  "value": "number", // The target value to earn the badge
  "category": "string" // (Optional) for category-specific badges
}
```

---

## 6. `settings`

This collection stores global application settings.

**Document ID:** `navigation`

**Fields:**

-   **`links`**: `array` of navigation link objects.
    ```json
    [
      {
        "id": "string",
        "label": "string",
        "href": "string",
        "isEnabled": "boolean",
        "isProtected": "boolean"
      }
    ]
    ```

---

## 7. `pricing`

This collection stores the subscription plans. Each document represents a billing cycle.

**Document ID:** `monthly` | `biannually` | `annually`

**Fields:**

```json
{
  "active": "boolean",
  "prices": {
    "inr": "number",
    "usd": "number"
  },
  "features": [
    { "value": "string" },
    { "value": "string" }
  ]
}
```
