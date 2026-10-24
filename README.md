# ✨ Focus — Tasks & Reminders

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=25&pause=1000&color=6C5CE7&center=true&vCenter=true&width=600&lines=Stay+Focused.;Plan+Your+Day.;Get+Things+Done." alt="Typing SVG" />
</p>

<p align="center">
  A clean, modern, and responsive task manager that helps you organize your day, track your progress, and stay on top of important reminders.
</p>

<p align="center">
  <a href="https://todoapplication-eight.vercel.app/">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-Try_Focus-6c5ce7?style=for-the-badge" alt="Live Demo" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=flat-square&logo=pwa&logoColor=white" alt="PWA" />
  <img src="https://img.shields.io/badge/Deployed_on-Vercel-black?style=flat-square&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 🌐 Live Demo

**Try the application here:**  
🔗 https://todoapplication-eight.vercel.app/

Open Focus in your browser, add your tasks, set priorities, and explore its reminder and customization features.

## 📌 About the Project

Focus is a lightweight, browser-based to-do application built with HTML, CSS, and vanilla JavaScript. It combines a modern interface with practical productivity features to make everyday task management simple.

Tasks and settings are stored locally in your browser, so you can start using the application without creating an account or connecting to a database.

The application also includes Progressive Web App (PWA) support, browser notifications, and optional phone reminders through ntfy.

## ✨ Features

- ✅ **Task Management** — Create, edit, complete, and delete tasks.
- ↩️ **Undo Delete** — Restore a recently deleted task.
- 🎯 **Priority Levels** — Organize tasks by low, medium, and high priority.
- 📅 **Due Dates** — Assign deadlines and identify overdue tasks.
- 🔔 **Task Reminders** — Set custom reminder dates and times.
- 📲 **Phone Notifications** — Schedule reminders through ntfy.
- 🖥️ **Browser Notifications** — Receive supported browser alerts.
- 📊 **Progress Tracking** — View completed tasks and overall progress.
- 🗂️ **Task Filters** — Switch between all, today, upcoming, and completed tasks.
- 🌈 **Custom Themes** — Choose automatic, light, or dark mode.
- 🎨 **Accent Colors** — Personalize the interface with different color schemes.
- 📤 **Import & Export** — Back up tasks using JSON files.
- 📱 **Responsive Design** — Designed for mobile and desktop screens.
- 📦 **PWA Support** — Install the app on supported devices.
- ⚡ **Smooth Animations** — Enjoy animated transitions, progress updates, and completion effects.
- ♿ **Reduced Motion Support** — Respect devices configured to minimize animations.

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| HTML5 | Page structure and interface |
| CSS3 | Responsive styling, themes, and animations |
| JavaScript | Task logic, reminders, and interactivity |
| LocalStorage | Saving tasks and settings in the browser |
| Service Workers | Caching app resources and supporting offline fallback |
| Web App Manifest | PWA installation metadata |
| ntfy | Optional scheduled phone notifications |
| Vercel | Hosting and deployment |

## 📂 Project Structure

```text
ToDo-Application/
│
├── index.html
├── style.css
├── app.js
├── manifest.json
├── service-worker.js
│
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Kartik-Uttam/ToDo-Application.git
```

### 2. Open the project

```bash
cd ToDo-Application
```

### 3. Run the application

Open the project in VS Code and launch `index.html` using a local development server, such as the **Live Server** extension.

Alternatively, deploy the repository to Vercel and use the live URL.

> **Note:** Use `localhost` or HTTPS for service worker registration and PWA features. Opening the HTML file directly with `file://` does not support all browser features.

## 🔔 Setting Up Phone Reminders

Focus uses [ntfy](https://ntfy.sh/) for optional phone notifications.

1. Open Focus and go to **Settings**.
2. Enable phone notifications to generate a topic.
3. Install the ntfy app on your phone.
4. Subscribe to the topic displayed in Focus.
5. Use **Send test** to verify notification delivery.
6. Add a task and configure its reminder.

**Important:** Keep your topic private. Anyone who knows a public ntfy topic may be able to subscribe to messages sent through it. Avoid including sensitive information in task names or notes. Scheduled reminders are limited to approximately three days ahead by the application.

## 💾 Data Storage

- Tasks and settings are stored in your browser's LocalStorage.
- No login or application database is required.
- Browser-local data does not automatically synchronize between devices.
- Use the export feature to create a backup before clearing browser data or changing devices.

## 📱 Progressive Web App

Focus includes a web app manifest and service worker to support installation on compatible browsers.

Depending on your browser and device, you can install it from the browser menu and launch it in a standalone window. Previously cached application resources can also be used as an offline fallback.

## 🔮 Future Improvements

- Cloud synchronization across devices.
- Recurring tasks and reminders.
- Search and advanced filtering.
- Weekly and monthly productivity insights.
- Additional customization options.

## 👨‍💻 Author

**Kartik Uttam**

B.Tech Information Science and Engineering student interested in web development and building practical projects.

- GitHub: [@Kartik-Uttam](https://github.com/Kartik-Uttam)
- Live Project: [Focus — Tasks & Reminders](https://todoapplication-eight.vercel.app/)

## ⭐ Support

If you find this project useful, consider giving the repository a ⭐ on GitHub!

---

<p align="center">
  <b>Focus on what matters. Get things done. ✨</b>
</p>
