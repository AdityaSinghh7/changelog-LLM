# LLM-Powered Changelog Generator

A developer-focused tool that uses LLMs to automatically generate clean, structured changelogs from GitHub commit history. Built with OpenAI, GitHub OAuth, and Next.js App Router 
— it helps devs summarize recent changes and share them through a simple public-facing changelog viewer.

---

## 🚀 Getting Started
1. Clone the Repo
    ```
    git clone https://github.com/AdityaSinghh7/changelog-LLM
    cd changelog-generator
    ```

2. Install Dependencies  
    ```
    npm install
    ```

3. Create a `.env` file with the following values:

   ```
   DATABASE_URL=your_postgres_url (optional)  
   OPENAI_API_KEY=your_openai_api_key  
   GITHUB_CLIENT_ID=your_github_oauth_client_id  
   GITHUB_CLIENT_SECRET=your_github_oauth_client_secret  
   NEXTAUTH_SECRET=your_nextauth_secret  
   NEXTAUTH_URL=http://localhost:3000
   ```

4. Run the Development Server  
    ```
    npm run dev
    ```

5. Visit [http://localhost:3000](http://localhost:3000)

---

## 🎥 Demo

Click below to watch the demo:

[![Demo](https://img.youtube.com/vi/UHCe1gsONVw/0.jpg)](https://youtu.be/UHCe1gsONVw)

---

## Features

### 🧑‍💻 Developer-Facing Dashboard
- Sign in with GitHub
- Select public repositories (or use all)
- View all commits and auto-generated summaries
- Filter by:
    - Repository
    - Search keywords
    - Date ranges

### 🌐 Public Changelog Viewer
- Clean, paginated changelog display
- Summaries organized by repo and date range
- Bullet point summaries and commit links
- Filters and date selection included

### 🔐 Auth & Access
- GitHub OAuth with `login: ""` to allow switching accounts
- JWT sessions with GitHub access token stored
- Middleware-protected routes (`/dashboard`, `/api`)

---

## 🧠 How It Works

1. **Authentication:** GitHub OAuth using NextAuth, stores access token and GitHub username (`login`) in the JWT session.

2. **Fetching Commits:** After login, developers select repositories. The app fetches commit history across all branches using GitHub's API.

3. **Semantic Grouping:**  
   Commits are sent to `/api/embedding` where OpenAI's `text-embedding-3-large` model converts them into vectors.  
   Using cosine similarity and repository boundaries to cluster similar commits into semantic groups.

4. **Changelog Summarization:**  
   Groups are sent to `/api/summarize` where each is processed by GPT-4o.  
   The LLM returns structured JSON containing:
    - A short title
    - Date range
    - Bullet-point summary
    - Commit links

5. **Streaming Summaries:**  
   The `/api/summarize` response is streamed line-by-line for faster rendering.  
   The UI renders each group as it arrives.

6. **Frontend Filters:**  
   Date range, repo, and keyword filters are applied client-side.  
   Caching avoids repeated LLM calls for similar filter queries.

---

## 🧩 Technical Stack

- **Framework:** Next.js 13+ App Router
- **Auth:** NextAuth.js + GitHub OAuth
- **AI:** OpenAI API (`text-embedding-3-large`, `gpt-4o`)
- **UI:** TailwindCSS + React
- **State:** React Hooks + localStorage cache
- **API:** GitHub REST API 

---

## 💡 Design Choices

- **Streamed responses** for smoother UX when generating summaries
- **Cosine similarity + repo name** for lightweight semantic grouping
- **Date filter as YYYY-MM-DD** with improved UX via visible date inputs
- **Multi-account GitHub login** using `login: ""` to prompt GitHub OAuth flow again
- **Modular API routes** for embedding and summarization logic separation

---

## 📍 Future Improvements

- Add user auth persistence (DB-backed)
- Make changelog publicly shareable with user-specific URLs
- Add private repo support with user token scopes
- Enable feedback on generated summaries
- ⚡ **Future Optimizations**:
  - Implement async batching with OpenAI API to reduce summarization time
  - Use background workers (e.g. queue with Redis/Resend/BullMQ) to offload heavy summarization
  - Pre-generate changelogs on a cron job and cache them for quicker load
  - Optimize frontend rendering with streaming + skeleton loaders for better perceived performance

---

## 🛠 Author
- Aditya Singh