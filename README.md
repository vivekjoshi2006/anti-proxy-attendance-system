# 🎓 Smart Attendance System – Anti-Proxy QR Attendance

Smart Attendance System is a full-stack, real-time academic attendance platform built with **Node.js**, **Express.js**, **Vanilla JavaScript**, and **Tailwind CSS**. The system is designed to reduce proxy attendance using **time-based HMAC-SHA256 QR tokens** and **device-based attendance locking**.

It provides dedicated workflows for **Faculty** and **Students**, including live attendance tracking, dynamic QR check-in, attendance analytics, shortage alerts, student management, and printable academic reports.

---

## ✨ Key Features

### 🛡️ Anti-Proxy Dynamic QR

- Generates cryptographically signed QR tokens using **HMAC-SHA256**
- Automatically rotates QR tokens every **30 seconds**
- Expired QR tokens are rejected by the server
- Prevents reuse of previously generated QR codes

### 📱 Device-Based Attendance Lock

- Associates attendance submissions with a device identifier
- Prevents the same device from marking attendance for multiple students within a session
- Server-side validation of QR tokens and device usage

### 👨‍🏫 Faculty Dashboard

- Real-time attendance roster
- Live student check-in tracking
- Manual attendance overrides
- Bulk attendance actions
- Lecture and course management
- Student roster management
- Attendance shortage alerts
- 7-day attendance trend analytics
- Dynamic QR broadcaster

### 🧑‍🎓 Student Portal

- QR-based attendance check-in
- Personal attendance percentage
- Attendance status and standing
- Historical attendance records
- Multi-class attendance lookup
- Mobile-optimized interface

### 📊 Attendance Analytics

- Present / Absent / Late statistics
- Attendance percentage calculation
- 7-day attendance trends
- Shortage identification below the **75% threshold**
- Session-wise attendance tracking

### 📄 Reports & Audit

- Generate academic attendance reports
- Single-date attendance registers
- Multi-session audit summaries
- Print-optimized report layouts
- PDF-ready attendance records

### 🌐 Local Network Access

- Automatic local network interface detection
- Generates a LAN-accessible URL
- Allows students to access the check-in portal from devices connected to the same Wi-Fi network

---

# 🔐 How the Anti-Proxy System Works

The system combines **time-based cryptographic QR validation** with **device-level attendance restrictions**.

```text
                    Faculty Starts Lecture
                             │
                             ▼
                 Generate Time-Based Token
                             │
                             ▼
          HMAC-SHA256(Session ID + Time Block)
                             │
                             ▼
                 Dynamic QR Code Display
                             │
                 QR rotates every 30 sec
                             │
                             ▼
                    Student Scans QR
                             │
                             ▼
                Server Validates Request
                             │
              ┌──────────────┴──────────────┐
              │                             │
        Token Valid                    Token Invalid
              │                             │
              ▼                             ▼
       Check Device ID                 Reject Request
              │
        ┌─────┴─────┐
        │           │
    Device Free   Device Used
        │           │
        ▼           ▼
   Record          Reject
 Attendance       Proxy Attempt
```

### Token Generation

The system uses a time block based on the current timestamp:

```text
Time Block = floor(Date.now() / 30000)

Token = HMAC-SHA256(
    SessionId + "_" + TimeBlock,
    SecretKey
)
```

This makes each QR token valid only for its designated time window.

---

# 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js | Backend Runtime |
| Express.js | REST API & Server |
| JavaScript ES6+ | Frontend Logic |
| HTML5 | Application Structure |
| Tailwind CSS | UI Styling |
| HMAC-SHA256 | QR Token Security |
| Node Crypto | Cryptographic Operations |
| Chart.js | Attendance Analytics |
| QRCode.js | QR Generation |
| Lucide Icons | UI Icons |
| Flatpickr | Date Selection |
| jsPDF / Print CSS | Report Generation |

---

# 📂 Project Structure

```text
smart-attendance-system/
│
├── api/
│   └── index.js
│       # Express server, REST APIs,
│       # attendance logic and security validation
│
├── public/
│   ├── css/
│   │   └── style.css
│   │       # Glassmorphism UI, animations & responsive styles
│   │
│   ├── index.html
│   │   # Faculty dashboard & QR broadcaster
│   │
│   ├── login.html
│   │   # Faculty / Student authentication
│   │
│   ├── mark.html
│   │   # Student attendance dashboard
│   │
│   ├── checkin.html
│   │   # QR check-in landing page
│   │
│   └── report.html
│       # Attendance reports & PDF/print view
│
├── package.json
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Make sure you have:

- **Node.js v16+**
- **npm**
- A modern web browser
- Wi-Fi network for testing mobile check-in

---

## 1. Clone the Repository

```bash
git clone https://github.com/vivekjoshi2006/anti-proxy-attendance-system.git
```

---

## 2. Navigate to the Project

```bash
cd smart-attendance-system
```

---

## 3. Install Dependencies

```bash
npm install
```

If dependencies are not already defined in `package.json`, install Express and CORS:

```bash
npm install express cors
```

---

## 4. Start the Server

```bash
npm start
```

The server will start on:

```text
http://localhost:3000
```

---

## 5. Open the Application

Open the following URL in your browser:

```text
http://localhost:3000
```

For mobile testing, the server displays the local network address when available:

```text
Smart Attendance Server running

PC URL:
http://localhost:3000

Mobile Wi-Fi URL:
http://192.168.x.x:3000
```

Connect the mobile device and computer to the same Wi-Fi network before accessing the LAN URL.

---

# 🔑 Demo Credentials

| Role | Username / ID | Password |
|------|---------------|----------|
| Faculty | `faculty@edu` | `123` |
| Faculty | `admin` | `123` |
| Student | `01CSE` | `123` |
| Student | `02CSE` | `123` |

> These credentials are intended for demonstration and academic testing only.

---

# 📡 API Reference

## 🔐 Authentication

### `POST /api/auth/login`

Authenticates faculty or student users.

---

## 📚 Session Management

### `GET /api/sessions`

Retrieves available lecture sessions and active session information.

### `POST /api/sessions/switch`

Switches the active lecture session.

### `POST /api/session/create`

Creates a new lecture session.

### `POST /api/session/edit`

Updates lecture metadata.

### `POST /api/session/set-date`

Changes the active attendance date.

---

## 📝 Attendance Operations

### `GET /api/roster`

Retrieves the active session roster, attendance statistics, and trends.

### `POST /api/attendance/qr-mark`

Records attendance through QR verification and device validation.

### `POST /api/attendance/manual`

Manually updates a student's attendance status.

Supported statuses:

```text
PRESENT
ABSENT
LATE
```

### `POST /api/attendance/bulk`

Updates attendance status for multiple students.

---

## 👨‍🎓 Student Management

### `POST /api/students/add`

Registers a new student.

### `POST /api/students/edit`

Updates student information.

### `DELETE /api/students/:id`

Removes a student from the roster.

---

## 📊 Reports & Analytics

### `GET /api/student/classes-by-date`

Retrieves student attendance records for a selected date.

### `GET /api/export/summary`

Returns aggregated attendance data for report generation.

---

# 🔄 System Workflow

1. Faculty logs into the dashboard.
2. Faculty creates or selects an active lecture.
3. The system generates a time-based cryptographic QR token.
4. The QR code automatically refreshes every 30 seconds.
5. Students scan the QR code from their mobile devices.
6. The server validates the QR token.
7. The server verifies the student's device identifier.
8. Valid submissions are recorded as attendance.
9. Duplicate device usage is rejected.
10. Faculty can monitor attendance in real time.
11. Attendance statistics and shortage alerts are updated.
12. Faculty can generate a printable attendance report.

---

# 🛡️ Security Model

The application uses multiple validation layers:

### 🔐 Cryptographic QR Validation

QR tokens are generated using HMAC-SHA256 and a server-side secret.

### ⏱️ Time-Based Expiration

Tokens are associated with a 30-second time block, limiting their useful lifetime.

### 📱 Device Locking

Device identifiers are tracked during attendance sessions to prevent repeated attendance submissions from the same device.

### 🖥️ Server-Side Validation

Attendance requests are validated by the backend rather than trusting client-side QR data alone.

> **Note:** Device fingerprinting and LAN-based attendance controls are deterrents, not foolproof guarantees against every form of impersonation or device spoofing.

---

# 📱 Responsive Design

The application is optimized for:

- 💻 Faculty desktop dashboards
- 💼 Laptop environments
- 📱 Student mobile devices
- 📟 Tablet screens

The student check-in workflow is specifically designed for quick mobile access.

---

# 🎨 UI & UX

The platform uses a modern **Glassmorphism** visual design featuring:

- Frosted glass panels
- Responsive layouts
- Soft gradients
- Animated interactions
- Mobile-friendly controls
- Real-time status indicators
- Dashboard cards and analytics

---

# 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Starts the production server |
| `npm install` | Installs project dependencies |

---

# 🚀 Future Enhancements

- PostgreSQL / MongoDB database integration
- JWT-based authentication
- Role-based authorization middleware
- WebSocket-based real-time synchronization
- QR session encryption improvements
- Faculty attendance export to Excel
- Email notifications
- Student timetable integration
- Admin institution management
- Cloud deployment
- Advanced attendance analytics
- Multi-institution support

---

# 🤝 Contributing

Contributions are welcome.

### 1. Fork the Repository

### 2. Create a Feature Branch

```bash
git checkout -b feature/new-feature
```

### 3. Commit Your Changes

```bash
git commit -m "Add new feature"
```

### 4. Push the Branch

```bash
git push origin feature/new-feature
```

### 5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

It is intended for educational, academic, and portfolio purposes.
