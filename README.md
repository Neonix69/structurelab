# Data Structures Learning World — Complete Learning Upgrade

A local Flask web application for a college project. It uses Groq for AI tutoring and browser-native speech synthesis for spoken answers.

## Run on Windows
1. Extract this ZIP into a new folder. Keep the previous project as a backup.
2. Double-click `start_app.bat` and keep its terminal open.
3. Sign in using the local demo credentials below.
4. Sign in as Teacher and open **Manage AI connection** to add the Groq API key. The key is kept server-side and is not placed in student-facing HTML.
5. Return to Student login and test the tutor, visual playground, practice lab, voice output, and progress dashboard.

## Local demo credentials
- Student: `student` / `student123`
- Teacher: `teacher` / `teacher123`
- Administrator: `admin` / `admin123`

These are demonstration credentials. For a public deployment, configure unique passwords with environment variables (`STUDENT_PASSWORD`, `TEACHER_PASSWORD`, `ADMIN_PASSWORD`), set a persistent random `APP_SECRET`, enable HTTPS, add CSRF protection and stronger account management, and use a production WSGI server. The application is bound to `127.0.0.1` by default.

## Included features
- Role-separated student and teacher workspaces; API configuration is only accessible to teacher/admin roles.
- Groq Chat Completions integration with conversation history, topic/level/mode context, larger answer budget, and actionable error messages.
- Clearly differentiated user and assistant chat messages, Markdown formatting, code blocks, copy/read-aloud/stop controls, and automatic speech output.
- Browser speech input when supported by the browser; Chrome/Edge are recommended. Speech recognition availability is browser-dependent.
- Visual playground with structure-specific operations for arrays, stacks, queues, linked lists, trees, graphs, heaps, and hashing. Graph edges are stored as adjacency lists and BFS/DFS use the actual stored connections.
- Practice banks for the ten data-structure topics, hints, feedback, adaptive question difficulty selection, and a separate code-practice area with sample Python solutions. User code is not executed on the server.
- SQLite persistence for practice attempts, topic accuracy, and teacher analytics.
- Teacher material upload for TXT, MD, PDF, DOCX, and PPTX; uploads begin as drafts and must be approved before their extracted text is used as context for AI tutor responses.
- Focus mode, larger text toggle, reduced-motion toggle, and personalized next-topic suggestions from actual practice results.

## Data and AI behavior
- SQLite data is stored in `data/learning_world.sqlite3`; uploaded materials are stored in `data/faculty_materials/`. Back up this `data` directory if you need to preserve progress and faculty content.
- Groq API access, model availability, and free-tier quotas are controlled by Groq. HTTP 429 means a rate/quota limit; it is not solved by generating more keys.
- Faculty uploads use text extraction, not OCR. Scanned PDFs without selectable text will be rejected if no text can be extracted.
- Approved material snippets are selected with simple keyword matching. This is lightweight retrieval, not a vector database or semantic RAG pipeline.
- The visualizer is an educational demo. It is not a production algorithm IDE, and the code-practice panel reveals reference solutions but does not execute arbitrary submitted code.
- Demo accounts are local and hard-coded by username; password values are hashed in memory at app startup, but this is not a complete user-registration or account-management system.

## Troubleshooting
- If the first launch fails, keep the terminal open and read the package-install or Python error.
- If Groq returns 401, create/copy a valid API key and reconnect it as Teacher.
- If Groq returns 404, select another model available in your Groq Console.
- If Groq returns 429, inspect Groq usage/limits and wait for the applicable reset window.
- If voice input is unavailable, type into the chat. Read-aloud uses browser speech synthesis and may vary by installed voice/browser.


## Account registration and roles

- Select **New here? Create an account** on the sign-in page.
- Students can register with full name, unique username, email, and a password of at least 8 characters. Their account is created immediately. Sign-in and learning progress use their own username, so each learner's progress is separated.
- Teacher registrations are saved as pending and cannot use faculty tools until approved by an administrator.
- Administrator demo login: `admin` / `admin123`. To approve a teacher request, select the Teacher sign-in tab, enter the administrator credentials, then use **Teacher account requests** in the workspace.
- Existing demo accounts remain available: Student `student` / `student123`; Teacher `teacher` / `teacher123`; Admin `admin` / `admin123`. For deployment, set strong environment passwords and a stable `APP_SECRET`; this project is intended as a local college demonstration, not a public production deployment.
- Account records are stored in `data/learning_world.sqlite3`; do not delete the `data` folder if you want to keep registered accounts and learning progress.
