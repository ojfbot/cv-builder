# data-element Attribute Guide

**Best Practice for Stable Element Selectors in CV Builder**

## Why data-element Instead of CSS Classes?

### ❌ Problems with CSS Classes

```tsx
// BAD: CSS classes are fragile
<button className="cds--btn cds--btn--primary btn-submit">
  Submit
</button>
```

**Issues:**
- CSS classes change with styling updates
- Framework classes (Carbon Design) can change between versions
- Utility classes (Tailwind, etc.) are dynamic
- No semantic meaning for testing
- Hard to maintain across refactors

### ✅ Benefits of data-element

```tsx
// GOOD: data-element is stable and semantic
<button
  className="cds--btn cds--btn--primary btn-submit"
  data-element="bio-submit-button"
>
  Submit
</button>
```

**Benefits:**
- **Stable**: Never changes unless element purpose changes
- **Semantic**: Clear what the element does
- **Decoupled**: Styling and testing concerns separated
- **Searchable**: Easy to find in codebase
- **Documented**: Element map provides single source of truth

---

## Naming Convention

### Format: `{category}-{element}-{type}`

**Examples:**
- `bio-tab` - Bio navigation tab
- `bio-name-input` - Name input in bio form
- `bio-submit-button` - Submit button in bio form
- `jobs-list` - Jobs list container
- `job-card` - Individual job card
- `chat-expand-button` - Chat window expand button

### Rules:
1. Use **kebab-case** (lowercase with hyphens)
2. Start with **category** (bio, jobs, chat, etc.)
3. Be **specific** but concise
4. Include **element type** when helpful (button, input, modal)
5. Avoid **generic names** (button1, div2)

---

## Implementation Guide

### 1. Navigation Tabs

```tsx
// src/components/Dashboard/Navigation.tsx

<Tabs>
  <Tab data-element="bio-tab" aria-selected={activeTab === 'bio'}>
    Bio
  </Tab>
  <Tab data-element="jobs-tab" aria-selected={activeTab === 'jobs'}>
    Jobs
  </Tab>
  <Tab data-element="outputs-tab" aria-selected={activeTab === 'outputs'}>
    Outputs
  </Tab>
  <Tab data-element="chat-tab" aria-selected={activeTab === 'chat'}>
    Chat
  </Tab>
</Tabs>

<TabPanel data-element="bio-panel">
  {/* Bio content */}
</TabPanel>
```

### 2. Forms

```tsx
// src/components/Bio/BioForm.tsx

<form data-element="bio-form" onSubmit={handleSubmit}>
  <TextInput
    data-element="bio-name-input"
    name="fullName"
    labelText="Full Name"
    value={formData.fullName}
    onChange={handleChange}
  />

  <TextInput
    data-element="bio-email-input"
    name="email"
    type="email"
    labelText="Email"
    value={formData.email}
    onChange={handleChange}
  />

  <TextInput
    data-element="bio-phone-input"
    name="phone"
    type="tel"
    labelText="Phone"
    value={formData.phone}
    onChange={handleChange}
  />

  <Button
    data-element="bio-submit-button"
    type="submit"
  >
    Save Bio
  </Button>
</form>
```

### 3. Lists and Cards

```tsx
// src/components/Jobs/JobsList.tsx

<div data-element="jobs-list">
  {jobs.map(job => (
    <Card
      key={job.id}
      data-element="job-card"
      onClick={() => selectJob(job.id)}
    >
      <h3 data-element="job-title">{job.title}</h3>
      <p data-element="job-company">{job.company}</p>
      <p data-element="job-description">{job.description}</p>
    </Card>
  ))}
</div>

<Button data-element="add-job-button" onClick={handleAddJob}>
  Add Job
</Button>
```

### 4. Chat Components

```tsx
// src/components/Chat/ChatWindow.tsx

<div
  data-element="chat-window"
  data-state={expanded ? 'expanded' : 'collapsed'}
  className={expanded ? 'chat-fullscreen' : 'chat-condensed'}
>
  <div data-element="chat-messages">
    {messages.map(msg => (
      <div
        key={msg.id}
        data-element={msg.role === 'user' ? 'message-user' : 'message-assistant'}
      >
        {msg.content}
      </div>
    ))}
  </div>

  <textarea
    data-element="chat-input"
    value={input}
    onChange={(e) => setInput(e.target.value)}
    placeholder="Type your message..."
  />

  <Button data-element="chat-send-button" onClick={handleSend}>
    Send
  </Button>

  <Button data-element="chat-expand-button" onClick={handleExpand}>
    Expand
  </Button>

  <Button data-element="chat-close-button" onClick={handleClose}>
    Close
  </Button>
</div>
```

### 5. Modals

```tsx
// src/components/Modals/UploadResumeModal.tsx

<Modal
  data-element="upload-resume-modal"
  open={isOpen}
  onRequestClose={handleClose}
>
  <ModalHeader>Upload Resume</ModalHeader>
  <ModalBody>
    <FileUploader
      data-element="file-upload-input"
      accept=".pdf,.doc,.docx"
      onChange={handleFileChange}
    />
  </ModalBody>
  <ModalFooter>
    <Button
      data-element="upload-cancel-button"
      kind="secondary"
      onClick={handleClose}
    >
      Cancel
    </Button>
    <Button
      data-element="upload-confirm-button"
      kind="primary"
      onClick={handleUpload}
    >
      Upload
    </Button>
  </ModalFooter>
</Modal>
```

### 6. Loading States

```tsx
// src/components/Common/LoadingOverlay.tsx

{isLoading && (
  <div data-element="loading-overlay">
    <Loading data-element="loading-spinner" />
  </div>
)}
```

### 7. Notifications

```tsx
// src/components/Common/Notifications.tsx

<ToastNotification
  data-element="notification-success"
  kind="success"
  title="Success"
  subtitle={message}
/>

<ToastNotification
  data-element="notification-error"
  kind="error"
  title="Error"
  subtitle={error}
/>
```

---

## Element Map Reference

The complete element map is in `tests/element-maps/cv-builder.json`. Each component should have corresponding entries:

```json
{
  "navigation": {
    "tabs": {
      "bio": {
        "selector": "[data-element='bio-tab']",
        "dataElement": "bio-tab",
        "description": "Bio information tab",
        "type": "tab"
      }
    }
  }
}
```

---

## Migration Strategy

### Phase 1: Add data-element to New Components ✅

All new components should use `data-element` from the start.

### Phase 2: Gradual Migration of Existing Components

Prioritize by test coverage need:

1. **High Priority** (Week 1):
   - Navigation tabs (`bio-tab`, `jobs-tab`, `outputs-tab`, `chat-tab`)
   - Tab panels (`bio-panel`, `jobs-panel`, etc.)
   - Main app container (`app-container`)

2. **Medium Priority** (Week 2):
   - Forms (bio, jobs, outputs forms)
   - Primary buttons (submit, generate, upload)
   - Chat components

3. **Low Priority** (Week 3):
   - Display elements
   - Secondary buttons
   - Notifications

### Phase 3: Remove CSS Class Fallbacks

Once all components have `data-element`, update element map to remove `alternatives`.

---

## Testing with data-element

### Before (Fragile):

```typescript
// Can break when CSS classes change
await client.click('.cds--btn.btn-submit');
await assert.elementVisible('.bio-form .name-input');
```

### After (Stable):

```typescript
// Stable - only breaks if component purpose changes
await client.click('[data-element="bio-submit-button"]');
await assert.elementVisible('[data-element="bio-name-input"]');
```

### With Element Map API:

```typescript
// Even better - semantic search
const submitButton = await searchElement('bio submit');
await client.click(submitButton.selector); // [data-element="bio-submit-button"]
```

---

## Validation

### Automated Validation

Run element map validation to check if all `data-element` attributes exist:

```bash
# Start browser automation server
npm run dev:api

# In another terminal, run validation
curl -X POST http://localhost:3002/api/elements/validate \
  -H "Content-Type: application/json" \
  -d '{"app": "cv-builder"}'
```

**Output:**
```json
{
  "validation": {
    "totalElements": 60,
    "passedElements": 58,
    "errorElements": 2,
    "issues": [
      {
        "severity": "error",
        "element": "chat-expand-button",
        "message": "Element not found with any selector"
      }
    ]
  }
}
```

This tells you which components still need `data-element` attributes added.

---

## Best Practices

### ✅ DO

- Use semantic, descriptive names
- Follow the naming convention
- Add `data-element` to all interactive elements
- Document new elements in the element map
- Validate regularly during development

### ❌ DON'T

- Don't use CSS classes for test selectors
- Don't use overly generic names (`button1`, `div2`)
- Don't change `data-element` values unless the component's purpose changes
- Don't skip adding attributes to modals or dynamic content

---

## PR Checklist

When adding new components:

- [ ] All interactive elements have `data-element` attributes
- [ ] Names follow the naming convention (`{category}-{element}-{type}`)
- [ ] Element map (`tests/element-maps/cv-builder.json`) is updated
- [ ] Validation passes (no errors for new elements)
- [ ] Tests use `data-element` selectors, not CSS classes

---

## Examples by Component Type

### Buttons
- `bio-submit-button` - Submit button in bio form
- `add-job-button` - Add new job button
- `generate-resume-button` - Generate resume button
- `chat-send-button` - Send chat message button

### Inputs
- `bio-name-input` - Name input field
- `bio-email-input` - Email input field
- `chat-input` - Chat message input

### Containers
- `app-container` - Main app container
- `jobs-list` - Jobs list container
- `chat-window` - Chat window container
- `chat-messages` - Chat messages container

### Navigation
- `bio-tab` - Bio navigation tab
- `bio-panel` - Bio tab panel

### Modals
- `upload-resume-modal` - Upload modal container
- `confirmation-modal` - Confirmation dialog

### Cards/Items
- `job-card` - Individual job card
- `output-card` - Individual resume/output card
- `message-user` - User message bubble
- `message-assistant` - Assistant message bubble

---

## Support

**Questions?** Check:
- Element map: `tests/element-maps/cv-builder.json`
- LLM integration guide: `docs/LLM_INTEGRATION.md`
- Test authoring guide: `docs/TEST_AUTHORING_GUIDE.md`

**Need to add a new element?**
1. Add `data-element` to component
2. Update `tests/element-maps/cv-builder.json`
3. Run validation to verify
4. Use in tests via element map API

---

**Remember**: `data-element` attributes are for **testing and automation**, not styling. They should be stable and semantic, changing only when the component's purpose changes.
