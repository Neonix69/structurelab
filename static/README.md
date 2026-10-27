# Data Structures Learning World — Role-Based Professional Update

This update adds a professional sign-in screen and role-based access while preserving the current AI Tutor, automatic spoken answers, visual playground, and Practice Lab.

## Demo accounts
- **Student:** `student` / `student123`
- **Teacher:** `teacher` / `teacher123`
- **Administrator:** `admin` / `admin123`

Select Student or Teacher on the sign-in page. Teacher and Administrator accounts can see the Faculty workspace and configure Groq. Student accounts do not see the AI settings button or API-key field.

## Connect Groq
1. Sign in as `teacher` / `teacher123`.
2. Open **Teacher workspace** in the sidebar.
3. Choose **Manage AI connection**.
4. Paste the Groq API key, choose a model available to your account, and click **Test connection**.
5. After a successful test, the key is kept on the Python server and cleared from the browser field. Students can use the AI Tutor without seeing the key.

For a local demo, the key is stored in server memory for the life of the running app. Restarting the app clears it. To configure it before startup instead, set the `GROQ_API_KEY` environment variable and optionally `GROQ_MODEL`.

## Run
1. Extract the ZIP into a new folder.
2. Double-click `start_app.bat`.
3. Sign in with one of the demo accounts above.

## Important security note
The built-in credentials are demo credentials for a local student project, not production authentication. Change them using `STUDENT_PASSWORD`, `TEACHER_PASSWORD`, and `ADMIN_PASSWORD` environment variables before using the app beyond a trusted local demonstration. For a public deployment, use a proper database-backed identity system, password hashing, HTTPS, CSRF protection, and managed secrets.

## Features preserved
- Groq Chat Completions integration
- AI answers spoken automatically by browser speech synthesis, with replay/stop controls
- Voice input where browser speech recognition is supported
- Interactive visual playground and structure-specific operations
- Multi-question Practice Lab and progress display
