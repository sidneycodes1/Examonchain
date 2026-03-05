## Contributing to ExamChain

Thanks for your interest in contributing! This project is still early and there are many ways to help.

---

### How to get started

1. **Fork** the repository on GitHub.
2. **Clone** your fork:

   ```bash
   git clone https://github.com/<your-username>/examchain.git
   cd examchain
   npm install
   npm run dev
   ```

3. Make sure you can:
   - Register / log in
   - Upload a PDF
   - Generate a quiz and complete it
   - View quiz history

4. Create a **feature branch**:

   ```bash
   git checkout -b feature/my-idea
   ```

5. Make your changes, run the app, and ensure nothing is broken.
6. Commit with a clear message and open a **Pull Request** against `main`.

---

### Code style & conventions

- Use **TypeScript** for all new frontend/backend code.
- Keep API logic inside `src/app/api/*` routes and shared helpers in `src/lib/*`.
- Prefer small, focused React components in `src/components/*`.
- Avoid adding heavy dependencies unless necessary; discuss large additions in an issue first.

---

### Good first contribution ideas

- Improve error messages and loading states in the UI.
- Add better empty states for history / quiz views.
- Add more tests for the JSON DB helpers in `src/lib/db.ts`.
- Enhance the design of cards and buttons using Tailwind.

---

### Larger feature ideas

See the **Roadmap / Ideas for Contributors** section in `README.md`. Examples:

- Phantom wallet login and on-chain score saving.
- Replacing the JSON DB with a real database.
- Analytics dashboards for students.

If you want to work on a larger feature, please open an **issue** first so we can align on the approach.

---

### Reporting bugs

When opening a bug report, please include:

- Steps to reproduce
- What you expected to happen
- What actually happened (screenshots or error text)
- Your OS, browser, and Node.js version

---

### License

By contributing to ExamChain, you agree that your contributions will be licensed under the MIT License.

