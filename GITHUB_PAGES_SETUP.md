# GitHub Pages Setup

1. Create a new public GitHub repository.
2. Extract the ZIP on your computer.
3. Upload everything inside the extracted folder to the repository root.
4. Confirm `index.html`, `assets/`, `docs/`, `service-worker.js` and `.nojekyll` are at the root.
5. Go to **Settings → Pages**.
6. Choose **Deploy from a branch**.
7. Select **main** and **/(root)**.
8. Save and wait for the Pages deployment to show a green check.
9. Open the site in an incognito window and hard-refresh once.

The `assets` folder must contain `app.js` and `styles.css`. Do not place the complete package inside an extra enclosing folder.
