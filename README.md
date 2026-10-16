# DevTrack — Issue Tracking and Project Management

DevTrack is a web-based issue tracking application designed to help teams create, manage, monitor, and resolve software development issues through an interactive dashboard.

## Features

- **Dashboard Analytics:** View issue statistics, priorities, statuses, and activity.
- **Issue Management:** Create, view, edit, and delete issues.
- **Priority Management:** Organize issues by Critical, High, Medium, and Low priority.
- **Status Tracking:** Track issues through their development lifecycle.
- **Search and Filtering:** Find issues and filter them based on relevant criteria.
- **Interactive Charts:** Visualize issue distribution and daily activity.
- **Responsive Interface:** Access the application through a modern web interface.

## Technologies Used

**Frontend**
- React.js
- Vite
- JavaScript
- HTML5 and CSS3
- Recharts
- Lucide React

**Backend**
- Java
- Spring Boot
- REST API

**Tools**
- Git and GitHub
- Visual Studio Code
- npm

## Project Structure

```text
DevTrack/
├── public/
├── src/
├── backend/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

Install the following:
- Node.js and npm
- Java Development Kit (JDK)
- Maven, if it is not included through the project setup

### 1. Clone the Repository

```bash
git clone https://github.com/suyashkoli221-ops/DevTrack.git
cd DevTrack
```

### 2. Start the Frontend

```bash
npm install
npm run dev
```

Open the local URL displayed in your terminal by Vite.

### 3. Start the Backend

Open another terminal:

```bash
cd backend
```

Run the Spring Boot application using the project's Maven wrapper, if available:

```bash
./mvnw spring-boot:run
```

On Windows PowerShell, use `.\mvnw.cmd spring-boot:run` if the Maven wrapper is present. Otherwise, use Maven with `mvn spring-boot:run`.

The frontend is configured to communicate with the backend API at:

```text
http://localhost:8080/api/issues
```

Make sure the backend and any required database are configured before using the application.

## API Overview

The application uses a REST API for issue management.

- Retrieve issues
- Create issues
- Update issue details and status
- Delete issues
- Retrieve dashboard analytics

## Future Enhancements

- User authentication and role-based access
- Issue comments and activity history
- Notifications for issue updates
- Advanced reporting and analytics
- Deployment for online access

## Author

**Suyash Koli**

GitHub: [suyashkoli221-ops](https://github.com/suyashkoli221-ops)

## License

This project is available for learning and portfolio demonstration. Add a specific open-source license if you intend to formally permit reuse and redistribution.
