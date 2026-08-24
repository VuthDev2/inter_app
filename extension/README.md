# QuickVoice Chrome Extension

This extension connects Chrome to the local QuickVoice project.

## How to build and load the extension

1. Open your terminal and navigate to the `extension` directory:
   ```bash
   cd extension
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Open Google Chrome and go to the extensions page by typing `chrome://extensions/` in the URL bar.
5. Enable **Developer mode** by toggling the switch in the top right corner.
6. Click the **Load unpacked** button.
7. Select the `dist` folder that was generated inside the `extension` directory.

The extension should now be loaded and ready to use!
