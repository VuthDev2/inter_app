Build the first onboarding Welcome screen for the QuickVoice React Native iPhone application.

This screen must be mobile-first, responsive, and reusable for future onboarding pages. I do not want to correct sizing later.

Before coding:

- Inspect the existing project structure.

- Read all relevant UI, component, typography, theme, and onboarding documentation inside the docs folder.

- Reuse existing colors, typography, spacing, buttons, icons, and components.

- Do not redesign the reference.

- Do not delete, rename, or modify unrelated files.

- Do not install new packages without approval.

SCREEN PURPOSE

This is the first screen shown when a new user opens the application for the first time.

It should visually match the provided reference while remaining responsive across different iPhone sizes.

RESPONSIVE DESIGN REQUIREMENTS

The design must support iPhone screen widths from approximately 320 pt to 430 pt.

Test the layout on:

- One small iPhone simulator

- One standard iPhone simulator

- One large iPhone Pro Max simulator

Use:

- SafeAreaView

- useWindowDimensions

- Responsive spacing

- Percentage-based width

- maxWidth where appropriate

- aspectRatio for the media frame

- flex layout instead of fixed screen positions

Do not:

- Hardcode the full screen height

- Use large absolute top or bottom positions

- Build only for one simulator size

- Allow content to overlap the Dynamic Island, home indicator, or safe-area edges

Use ScrollView only when required for smaller devices.

When using ScrollView:

- Set contentContainerStyle with flexGrow: 1

- Keep the button and page indicator visible

- Avoid unnecessary scrolling on normal and large iPhones

REUSABLE LAYOUT

Create a reusable onboarding layout component because future onboarding pages will use a similar structure.

Suggested component:

apps/mobile/src/components/onboarding/OnboardingPageLayout.tsx

It should support properties such as:

- logo

- media content

- title

- description

- button title

- button action

- current page index

- total page count

Example:

<OnboardingPageLayout

  logo={...}

  media={...}

  title="Welcome to Live Interpreter"

  description="Connect across languages with real-time voice interpretation for Khmer and English conversations."

  buttonTitle="Get started"

  currentPage={0}

  totalPages={3}

  onButtonPress={handleNext}

/>

WELCOME SCREEN CONTENT

1. Logo

- Place the QuickVoice logo centered near the top.

- Use the existing logo asset.

- Keep it below the iPhone safe area.

- Scale the logo responsively.

- Suggested visual size:

  - Small iPhone: approximately 72–80 pt

  - Standard iPhone: approximately 84–92 pt

  - Large iPhone: approximately 92–100 pt

- Do not stretch or distort the logo.

2. Media frame

- Place a large rounded media frame below the logo.

- This frame will contain an onboarding video later.

- Do not implement the real video yet.

- Use a placeholder View or existing image.

- Do not install a video package.

- Use:

aspectRatio: 3 / 4

- The media frame should:

  - Use the available content width

  - Keep rounded corners

  - Use overflow: hidden

  - Support resizeMode: cover for future media

  - Never extend outside the screen

  - Scale naturally on small and large iPhones

3. Title

Use exactly:

Welcome to

Live Interpreter

- Center the title.

- Allow two lines.

- Use the existing title typography from the docs.

- Preserve strong visual hierarchy.

- On smaller screens, reduce the font size slightly rather than cutting the text.

- Use responsive line height.

- Do not allow clipping.

4. Description

Use exactly:

Connect across languages with real-time voice interpretation for Khmer and English conversations.

- Center-align the description.

- Use the existing description typography.

- Set a readable maximum width.

- Allow natural wrapping.

- Do not force it into one line.

5. Primary button

Button title:

Get started

- Reuse the existing dark primary button component.

- Make it nearly full width inside the page padding.

- Keep a comfortable mobile height.

- Suggested height:

  - Approximately 56–64 pt

- Use a rounded pill shape.

- Support:

  - Default state

  - Pressed state

  - Disabled state

  - Loading state

- Add a subtle press animation.

- Add accessibilityRole="button".

- Add an accessibility label.

When pressed:

- Navigate to the next onboarding or authentication page.

- Use the existing navigation system.

- Do not build the next page in this task.

6. Page indicator

- Add a three-page onboarding indicator near the bottom.

- The first indicator is active.

- The active indicator should be wider than the inactive indicators.

- The second and third indicators should be small circles.

- Keep the indicator above the bottom safe area.

- Build it as a reusable component if one does not exist.

Suggested file:

apps/mobile/src/components/onboarding/OnboardingIndicator.tsx

LAYOUT PRIORITY

The screen order must be:

Safe area

↓

Logo

↓

Media frame

↓

Title

↓

Description

↓

Primary button

↓

Page indicator

↓

Bottom safe area

For smaller screens:

- Reduce vertical gaps gradually

- Reduce the media frame size slightly

- Reduce title size slightly if necessary

- Do not remove important content

- Do not overlap components

For larger screens:

- Do not stretch the design excessively

- Use a maximum content width

- Keep the screen visually balanced

SPACING

Use the spacing system from the docs.

When no suitable token exists, use responsive values based on the screen width.

Suggested behavior:

- Horizontal page padding: approximately 20–28 pt

- Logo-to-media spacing: approximately 12–20 pt

- Media-to-title spacing: approximately 20–28 pt

- Title-to-description spacing: approximately 8–12 pt

- Description-to-button spacing: approximately 24–32 pt

- Button-to-indicator spacing: approximately 20–28 pt

Do not use these as rigid values. Adapt them responsively.

COMPONENT REUSE

Before creating new files, check for existing:

- AppLogo

- AppButton

- AuthHeader

- OnboardingIndicator

- SafeAreaScreen

- ThemeProvider

- Typography tokens

- Spacing tokens

- Color tokens

Reuse them when available.

Create only missing components.

FIRST-LAUNCH BEHAVIOR

- If first-launch or onboarding persistence already exists, connect this screen to it.

- If the project already uses AsyncStorage, SecureStore, SQLite, or another storage solution, use the existing solution.

- Do not install a new package without approval.

- If persistence is not available, add a clear TODO without breaking the screen.

FILES

Inspect the current project conventions first.

Possible files:

apps/mobile/src/screens/onboarding/WelcomeScreen.tsx

apps/mobile/src/components/onboarding/OnboardingPageLayout.tsx

apps/mobile/src/components/onboarding/OnboardingIndicator.tsx

Follow the project’s existing file naming and style organization.

QUALITY REQUIREMENTS

- React Native

- TypeScript

- No any types unless necessary

- No unused imports

- No duplicated styling

- No inline hardcoded theme colors when tokens exist

- No absolute layout unless required for the logo overlay

- No text clipping

- No unsafe-area overlap

- No unnecessary package installation

- No implementation of the real video yet

ACCESSIBILITY

Add:

- Accessibility labels

- Correct accessibility roles

- Minimum comfortable touch targets

- Readable contrast

- Support for text wrapping

- Reduced-motion-friendly animations where practical

AFTER IMPLEMENTATION

Run:

- TypeScript check

- Lint check

- Available tests

Test visually on:

- Small iPhone

- Standard iPhone

- Large iPhone Pro Max

Report:

- Files created

- Files modified

- Components reused

- Navigation destination

- Any TODO items

- Any assumptions made

- How to run and test the screen

Do not claim the screen is complete if it has only been tested on one device size.