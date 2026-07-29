# QuickVoice App UI Components Documentation

## 1. Logos & Icons

| Element | Description |

|---------|-------------|

| App Logo | Main app icon for home screen and app store |

| Speech Icon | Symbol representing live speech recognition |

| Translate Icon | Symbol representing translation functionality |

| Live Interpreter Icon | Icon for live voice translation |

| Other symbols | Minor symbols used in notifications or UI hints |

---

## 2. Typography

| Text Type | Font | Size | Usage |

|-----------|------|------|-------|

| Title | Poppins | 40 | Main page titles (e.g., Welcome, Home) |

| Description | Poppins | 12 | Secondary instructions or labels |

| Button Text | Poppins | 14 | Labels inside buttons |

| TextField Label | Poppins | 12 | Floating label inside input fields |

---

## 3. Buttons

| Button Type | Color | States | Description |

|------------|-------|--------|-------------|

| Primary | #4F99EB | Normal, Hover, Click | Main action buttons (e.g., “Get start”) |

| Secondary | #282C34 | Normal, Hover, Click | Secondary actions or navigation buttons |

| Option | #FFFFFF / #F0F0F0 / #282C34 | Selected, Default | Switch between modes (Meeting, Record, Summary) |

---

## 4. Text Fields

| Field | Behavior | Description |

|-------|---------|-------------|

| User Name | Label floats when user types | Input for user’s email or username |

| Password | Label floats when user types, masked input | Input for user password |

| Validation | Pop-up / sheet from bottom | Shows verification/loading status (e.g., “Click link in Gmail”) |

---

## 5. Sheets / Pop-ups

| Element | Description | Behavior |

|---------|-------------|---------|

| Verification Sheet | Displays progress or confirmation | Animates from bottom, overlaying current screen |

| Success Sheet | Shows success (check mark) | Animates with confetti effect |

| Loading Sheet | Shows spinner | Indicates background operation |

---

## 6. Component Notes

- **Buttons**: Should support animation for hover and click states.

- **TextFields**: Floating labels for better UX.

- **Pop-ups/Sheets**: iOS-style animation, sliding from the bottom.

- **Icons**: Keep consistent style across screens (vector preferred for scalability).

---

## 7. Pages Covered

| Page | Components |

|------|------------|

| Welcome Page | Logo, Title, Description, Primary Button |

| Auth Page | TextFields, Buttons, Pop-up Sheets |

| Forgot Password | TextFields, Buttons |

| Reset Password | TextFields, Buttons |

| Home Page | Option Buttons, Feature Icons |

---

## 8. Color Palette

| Color | Hex | Usage |

|-------|-----|-------|

| Blue | #4F99EB | Primary buttons, highlights |

| Dark Gray | #282C34 | Secondary buttons, text |

| Light Gray | #F0F0F0 | Backgrounds, inactive states |

---

## 9. Font Usage Summary

- **Poppins**: All headings, buttons, labels

- **Weight**: Bold for titles, Medium for buttons, Regular for descriptions

---

## Notes

- All interactive components should have consistent feedback (animations, state change).

- Sheets / pop-ups should be reusable components for verification, success, and loading states.

- Floating labels and animations for TextFields enhance UX and accessibility.
# QuickVoice Authentication UI Kit

## 1. Scope

This document defines the shared visual and interaction rules for:

- Login
- Create Account
- Forgot Password
- Create New Password
- Email Verification
- Verification Success

The Welcome/onboarding screens may share typography and the main button component, but authentication screens use a more compact layout and a smaller primary button.

---

## 2. Typography

| Text Type | Font | Weight | Size | Line Height | Letter Spacing | Usage |
|---|---|---:|---:|---:|---:|---|
| Page Title | Poppins | ExtraBold | 40 | 130% / 52 | 1% / 0.4 | Login, Create Account, Forgot Password, Create New Password |
| Description | Poppins | SemiBold | 12 | 150% / 18 | 0 | Supporting text below the title |
| Button Text | Poppins | SemiBold | 14 | 20 | 0 | Primary and social buttons |
| Input Text | Poppins | Regular | 16 | 24 | 0 | User-entered text |
| Floating Label | Poppins | Regular | 12 | 16 | 0 | Field label when focused or filled |
| Helper / Error Text | Poppins | Regular | 12 | 16 | 0 | Validation and helper messages |
| Bottom Account Text | Poppins | SemiBold | 14 | 20 | 0 | Sign in / Sign up prompt |

### Title rules

- Keep title alignment and width consistent across all authentication screens.
- Multi-line titles use the same `40 / 52` typography as single-line titles.
- Do not reduce the title style independently on individual pages unless needed for a small-screen accessibility case.
- Use the same title container width so screens feel related.

---

## 3. Colors

| Color | Hex | Usage |
|---|---|---|
| Primary Blue | `#4F99EB` | Links, focused fields, highlights, primary variant |
| Dark | `#282C34` | Authentication primary button and dark text |
| Light Gray | `#F0F0F0` | Inactive controls and subtle backgrounds |
| Border Gray | `#D9DCE1` | Text-field borders and social-button borders |
| Secondary Text | `#8A8A8E` | Descriptions and placeholders |
| White | `#FFFFFF` | Screen and sheet surfaces |

---

## 4. Primary Buttons

Authentication pages must reuse the same button component as the Welcome page, but use a smaller authentication size variant.

### Welcome button

- Width: available width with page padding
- Suggested maximum width: `360–384 pt`
- Height: `56–64 pt`
- Shape: rounded pill

### Authentication button

- Suggested width: `78–86%` of the available screen width
- Suggested maximum width: `320–340 pt`
- Height: `52–56 pt`
- Shape: rounded pill
- Center horizontally

### Mobile states

Use these state names:

- Default
- Pressed
- Disabled
- Loading

Do not use desktop-only terminology such as Hover for the mobile implementation.

### Interaction

- Press feedback: subtle opacity or scale response
- Do not use a strong bounce
- Keep the label centered
- Keep the touch target comfortable and accessible

---

## 5. Floating-Label Text Fields

All authentication text fields use one reusable floating-label component.

### Empty state

- Show the field name as a placeholder inside the input.
- Examples: `Email`, `User name`, `Password`.

### Focused or filled state

- Move the field name above the entered value.
- The label remains visible while the user types, so the user always knows which field is active.
- Animate the label smoothly between the placeholder and floating positions.
- Keep the field height stable during the animation.

### Required states

- Empty
- Focused
- Filled
- Error
- Disabled

### Field behavior

- Email and username fields may use a clean leading symbol.
- Password fields use a trailing show/hide-password symbol.
- Focused border may use Primary Blue.
- Error state shows a clear message below the field without moving unrelated content abruptly.
- Use the appropriate mobile keyboard type and autofill settings.

### Suggested component API

```tsx
<FloatingTextField
  label="Email"
  value={email}
  leadingIcon="mail"
  keyboardType="email-address"
  onChangeText={setEmail}
/>
```

```tsx
<FloatingTextField
  label="Password"
  value={password}
  secureTextEntry
  trailingAction="toggle-password"
  onChangeText={setPassword}
/>
```

---

## 6. Authentication Screen Layout

Use one reusable authentication layout for Login, Create Account, Forgot Password, and Create New Password.

### Shared structure

```text
Safe area
↓
Page title
↓
Optional description
↓
Form fields
↓
Page-specific helper or link
↓
Compact authentication button
↓
Optional social-login section
↓
Bottom account link
```

### Spacing rules

- Create Account uses a smaller top gap because it has more fields.
- Login may use a larger top gap because it has fewer fields.
- Forgot Password and Create New Password use the same title width, typography, field width, and button alignment as Create Account.
- Use responsive spacing rather than absolute vertical positioning.
- Support keyboard-safe behavior and small iPhone screens.

---

## 7. Verification Sheet

Verification is presented in an Apple-style bottom sheet, not a full-screen page.

### Presentation

- Present one sheet at a time.
- Use a medium-height sheet that occupies approximately `45–55%` of the iPhone screen.
- Keep the underlying authentication screen visible behind a dimmed overlay.
- Use large rounded top corners.
- Show a centered drag indicator at the top.
- Respect the bottom safe area.
- Do not stack another sheet on top of the verification sheet.

### Sheet content

```text
Drag indicator
↓
Verification title
↓
Instruction text
↓
Large status animation
↓
Optional action or retry control
```

### Waiting state

- Title: `Verification`
- Description: `Click the link in Gmail`
- Show a large, calm loading animation.
- Keep the sheet open while checking verification status.

### Success state

- Reuse the same sheet instead of opening a second sheet.
- Replace the loading animation with the success check animation.
- Keep title and description aligned consistently.
- Continue automatically or show one clear action after confirmation.

### Error / expired state

- Explain what happened clearly.
- Provide one primary recovery action such as `Retry` or `Resend email`.

### Dismissal

- Allow swipe-down or tap-outside dismissal only when it is safe to interrupt the process.
- If verification is actively completing, prevent accidental dismissal or ask for confirmation.

---

## 8. Screens

### Login

- Title: `Welcome back`
- Email field
- Password field
- Forgot Password link
- Compact dark Continue button
- Optional Google and Facebook actions
- Bottom prompt: `Don’t have an account? Sign up`

### Create Account

- Title: `Create Account`
- User name field
- Email field
- Password field
- Confirm Password field
- Terms and privacy checkbox
- Compact dark Continue button
- Optional Google and Facebook actions
- Bottom prompt: `Already have an account? Sign in`

### Forgot Password

- Title: `Forgot your password?`
- Email field
- Back-to-sign-in helper
- Compact dark Continue button
- On successful submission, present the Verification Sheet

### Create New Password

- Title: `Create a new password`
- New Password field
- Confirm New Password field
- Compact dark Continue button
- Do not show a Forgot Password link on this screen

---

## 9. Reusable Components

```text
components/auth/
├── AuthScreenLayout
├── AuthTitle
├── FloatingTextField
├── PasswordTextField
├── AuthPrimaryButton
├── SocialLoginButton
├── AuthBottomLink
└── VerificationSheet
```

Rules:

- Do not duplicate styles per screen.
- Use one floating-label implementation for every field.
- Use one compact authentication button variant for every auth page.
- Use one verification sheet and update its internal state from waiting to success or error.
- Keep page-specific content inside each screen, but keep presentation in reusable components.

---

## 10. Accessibility and Quality

- Support Dynamic Type where practical.
- Keep text and icons readable with sufficient contrast.
- Add accessibility labels to icon-only controls.
- Ensure password visibility controls announce their state.
- Keep touch targets comfortable.
- Respect Reduce Motion by simplifying label and sheet animations.
- Test on small, standard, and large iPhone sizes.
- Avoid text clipping when titles wrap to two lines.

---

## Apple-style implementation note

Apple’s sheet guidance supports modal or nonmodal sheets in iOS and recommends presenting only one sheet at a time. QuickVoice uses a medium-height verification sheet so the task stays focused while the authentication screen remains visible behind it.