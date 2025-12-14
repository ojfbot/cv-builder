# Draw.io Test Diagram Syntax Guide

This guide explains how to write Draw.io diagrams that can be parsed and executed as browser automation tests.

## Overview

The browser automation system parses Draw.io diagrams to generate executable UI tests. Each node in your diagram represents a step in the test flow, and the node labels use natural language patterns to define interactions.

## Node Label Syntax

### Type/Input Actions

Type text into form fields.

**Pattern**: `type '[value]' into [target]` or `enter '[value]' into [target]`

**Examples**:
```
user types 'John Doe' into name field
user enters 'john@example.com' into email field
type 'SecurePass123' into password
enter '123 Main St' into address
```

**Requirements**:
- Value must be enclosed in single `'` or double `"` quotes
- Target selector should describe the field (e.g., "name field", "email", "search box")

**Common Errors**:
- ❌ `user types name into name field` (missing quoted value)
- ❌ `type John Doe into name field` (value not quoted)
- ✅ `user types 'John Doe' into name field` (correct)

### Click Actions

Click buttons, links, or other clickable elements.

**Pattern**: `click [target]` or `[user] clicks [target]`

**Examples**:
```
click submit button
user clicks login link
click on save
press submit
```

**Requirements**:
- Target should describe the element (e.g., "submit button", "login link", "menu icon")

### Hover Actions

Hover over elements to reveal tooltips, dropdowns, etc.

**Pattern**: `hover [target]` or `mouse over [target]`

**Examples**:
```
hover over profile menu
mouse over tooltip icon
hover dropdown
```

### Navigation Actions

Navigate to different pages or routes.

**Pattern**: `navigate to [url]` or `go to [url]`

**Examples**:
```
navigate to /login
go to /dashboard
redirect to /profile
```

## Node Types

### Action Nodes (Yellow)

Represent user interactions or system actions.

**Visual Style**:
- Fill Color: `#fff2cc` (light yellow)
- Stroke Color: `#d6b656` (gold)
- Shape: Rounded rectangle

**Label Examples**:
- `user types 'test@example.com' into email field`
- `click submit button`
- `navigate to /dashboard`

### State Nodes (Blue)

Represent expected UI states or conditions.

**Visual Style**:
- Fill Color: `#dae8fc` (light blue)
- Stroke Color: `#6c8ebf` (blue)
- Shape: Rounded rectangle

**Label Examples**:
- `form displays validation error`
- `user is logged in`
- `modal is visible`

### Screenshot Points (Green)

Mark points where screenshots should be captured.

**Visual Style**:
- Fill Color: `#d5e8d4` (light green)
- Stroke Color: `#82b366` (green)
- Shape: Rectangle or diamond

**Label Examples**:
- `screenshot: login page`
- `capture desktop view`
- `viewport: mobile`

## CSS Selectors

The system intelligently maps natural language targets to CSS selectors. Here are common patterns:

| Natural Language | Likely Selector |
|------------------|----------------|
| `name field` | `input[name="name"]`, `#name`, `.name-field` |
| `email field` | `input[type="email"]`, `input[name="email"]` |
| `submit button` | `button[type="submit"]`, `.submit-btn` |
| `login link` | `a.login`, `a[href="/login"]` |
| `search box` | `input[type="search"]`, `.search-input` |

For precise targeting, you can use CSS selectors directly:
```
click #submit-button
type 'test' into .search-input
hover [data-testid="menu"]
```

## Complete Example

Here's a complete login flow diagram:

```
[Start] → [Navigate to /login] → [Type email] → [Type password] → [Click submit] → [Success state]

Node Labels:
1. "navigate to /login"
2. "user types 'test@example.com' into email field"
3. "user types 'Password123' into password field"
4. "click submit button"
5. "user is logged in"
```

## Screenshot Configuration

Screenshots are automatically captured before and after each interaction. You can also add explicit screenshot nodes:

```
screenshot: login form (desktop)
capture: error state (mobile)
viewport: tablet orientation landscape
```

**Viewport Options**:
- `desktop` - 1280x720
- `mobile` - 375x667
- `tablet` - 768x1024

## Best Practices

### 1. Be Specific with Values
✅ `type 'john.doe@example.com' into email`
❌ `type email into email field`

### 2. Use Descriptive Targets
✅ `click primary submit button`
❌ `click button`

### 3. Follow Natural Flow
Organize nodes left-to-right or top-to-bottom to match the user journey.

### 4. Add State Validations
Include state nodes to verify expected outcomes:
```
[Type credentials] → [Click submit] → [Dashboard is visible]
```

### 5. Test Error Paths
Include both happy and error paths:
```
[Invalid email] → [Click submit] → [Error message displays]
```

## Validation Errors

Common error messages and how to fix them:

| Error | Cause | Solution |
|-------|-------|----------|
| `Type node X missing value` | Value not in quotes | Add quotes: `type 'value' into field` |
| `Type node X missing target` | No target specified | Add target: `type 'value' into email` |
| `Click node X missing target` | No clickable element | Add target: `click submit button` |
| `Unknown interaction type` | Label doesn't match patterns | Use supported keywords: type, click, hover, navigate |

## Advanced Features

### Conditional Flows

Use decision diamonds to represent conditional logic:
```
[Login attempt] → <Is authenticated?>
                     ↓ Yes         ↓ No
              [Dashboard]    [Error message]
```

### Parallel Actions

Multiple actions can branch from a single node to test parallel workflows.

### Data-Driven Tests

Use variables in values for data-driven testing (future feature):
```
type '${userData.email}' into email field
```

## Troubleshooting

### Test Fails with "missing value"
- Check that type actions have quoted values
- Verify quotes are matching (both single or both double)

### Test Fails with "selector not found"
- Verify the element exists in your UI
- Check the CSS selector mapping
- Add explicit selectors if needed

### Screenshots Not Captured
- Ensure viewport is stable before screenshot
- Check for loading/animation states
- Verify page has fully loaded

## Resources

- [Draw.io Editor](https://app.diagrams.net/)
- [Example Diagrams](../../temp/baseline-demo/)
- [Test Manifest Schema](./src/drawio/schema.ts)

## Getting Help

If you encounter issues:
1. Check the visual regression dashboard for detailed error messages
2. Review the generated manifest.json for parsing details
3. Expand the interaction details in the dashboard to see node metadata
4. Consult this guide for syntax requirements

---

For more examples, see the test diagrams in `packages/browser-automation/temp/`
