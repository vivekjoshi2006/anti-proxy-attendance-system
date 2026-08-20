const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const SECRET_KEY = "SMART_ATTENDANCE_2026";
const PORT = process.env.PORT || 3000;

// Path Resolver for static files
const publicDir = fs.existsSync(path.join(__dirname, 'public'))
    ? path.join(__dirname, 'public')
    : (fs.existsSync(path.join(__dirname, '../public'))
        ? path.join(__dirname, '../public')
        : path.join(process.cwd(), 'public'));

app.use(express.static(publicDir));

function getLocalLANIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

/* ================= PAGE ROUTES ================= */

app.get('/', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(publicDir, 'login.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));
app.get('/mark.html', (req, res) => res.sendFile(path.join(publicDir, 'mark.html')));
app.get('/checkin.html', (req, res) => res.sendFile(path.join(publicDir, 'checkin.html')));


// Student 
let students = [
    { id: 'STU0', rollNo: '01CSE', name: 'Stud1', branch: 'CSE', section: 'A', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stud1' },
    { id: 'STU1', rollNo: '02CSE', name: 'Stud2', branch: 'CSE', section: 'A', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Stud2' }
];

function getTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(isoString) {
    if (!isoString) return '';
    const [y, m, d] = isoString.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d} ${months[m - 1]} ${y}`;
}

function getISTTimestamp() {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

let sessions = [
    {
        sessionId: 'SES-DAA-01',
        college: 'National Institute of Technology',
        department: 'Department of Computer Science & Engineering',
        subject: 'CSE01: SDE',
        instructor: 'Dr. AB',
        room: 'LH-102 (Lecture Hall)',
        semester: 'Semester 1',
        dateISO: getTodayISO(),
        dateDisplay: formatDateDisplay(getTodayISO())
    }
];
let activeSessionId = 'SES-DAA-01';
let attendanceLedger = { 'SES-DAA-01': {} };
let deviceLedger = {};

function getActiveSession() {
    return sessions.find(s => s.sessionId === activeSessionId) || sessions[0];
}

function generateDynamicToken(sessionId) {
    const timeBlock = Math.floor(Date.now() / 30000);
    const hash = crypto.createHmac('sha256', SECRET_KEY).update(`${sessionId}_${timeBlock}`).digest('hex').substring(0, 10);
    return `${sessionId}.${timeBlock}.${hash}`;
}

/* ================= AUTHENTICATION ROUTE ================= */

app.post('/api/auth/login', (req, res) => {
    const { role, username, password } = req.body;
    const cleanUser = (username || '').trim();

    if (!cleanUser || !password) {
        return res.status(400).json({ success: false, message: "Please enter both credentials." });
    }

    if (role === 'teacher') {
        if ((cleanUser.toLowerCase() === 'faculty@edu' || cleanUser.toLowerCase() === 'admin') && password === '123') {
            return res.json({
                success: true,
                role: 'teacher',
                redirectUrl: '/index.html',
                user: { name: "Dr. AB", email: "faculty@edu", role: "Faculty" }
            });
        }
        return res.status(401).json({ success: false, message: "Invalid Faculty credentials! (Default: faculty@edu / 123)" });
    } 
    else if (role === 'student') {
        const rollQuery = cleanUser.toUpperCase();
        const student = students.find(s => s.rollNo === rollQuery);

        if (!student) {
            return res.status(404).json({ success: false, message: `Roll Number '${rollQuery}' not found in roster!` });
        }

        if (password === '123' || password.toUpperCase() === rollQuery) {
            return res.json({
                success: true,
                role: 'student',
                redirectUrl: '/mark.html',
                user: { ...student, role: "Student" }
            });
        }
        return res.status(401).json({ success: false, message: "Invalid Password! (Default PIN: 123)" });
    }

    res.status(400).json({ success: false, message: "Invalid role selected." });
});

/* ================= API ROUTES ================= */

// All Sessions
app.get('/api/sessions', (req, res) => {
    const active = getActiveSession();
    const dynamicToken = generateDynamicToken(active.sessionId);
    const lanIP = getLocalLANIP();
    res.json({
        sessions,
        activeSessionId,
        activeSession: active,
        dynamicToken,
        lanBaseUrl: `http://${lanIP}:${PORT}`,
        students
    });
});

// Switch Session
app.post('/api/sessions/switch', (req, res) => {
    const { sessionId } = req.body;
    const found = sessions.find(s => s.sessionId === sessionId);
    if (!found) return res.status(404).json({ success: false, message: "Session not found" });
    activeSessionId = sessionId;
    res.json({ success: true, activeSession: found });
});

// Set Date
app.post('/api/session/set-date', (req, res) => {
    const { dateISO } = req.body;
    if (!dateISO) return res.status(400).json({ success: false, message: "Date is required!" });
    const active = getActiveSession();
    active.dateISO = dateISO;
    active.dateDisplay = formatDateDisplay(dateISO);
    res.json({ success: true, session: active });
});

// Get Trends
app.get('/api/roster', (req, res) => {
    const active = getActiveSession();
    const dynamicToken = generateDynamicToken(active.sessionId);
    const currentISO = active.dateISO;
    const lanIP = getLocalLANIP();

    if (!attendanceLedger[active.sessionId]) attendanceLedger[active.sessionId] = {};
    if (!attendanceLedger[active.sessionId][currentISO]) attendanceLedger[active.sessionId][currentISO] = {};

    const currentAttendance = attendanceLedger[active.sessionId][currentISO];
    const sessionHistory = attendanceLedger[active.sessionId];
    const recordedDates = Object.keys(sessionHistory);
    const totalDays = Math.max(recordedDates.length, 1);

    const roster = students.map(s => {
        const record = currentAttendance[s.id] || { status: 'ABSENT', method: '—', timestamp: '—' };
        let attendedDays = 0;
        recordedDates.forEach(d => {
            if (sessionHistory[d] && sessionHistory[d][s.id] && sessionHistory[d][s.id].status === 'PRESENT') {
                attendedDays++;
            }
        });
        const cumulativePercent = Math.round((attendedDays / totalDays) * 100);
        return {
            ...s,
            status: record.status,
            method: record.method,
            timestamp: record.timestamp,
            cumulativePercent,
            isShortage: cumulativePercent < 75
        };
    });

    const labels = [];
    const isoKeys = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const [y, m, d] = active.dateISO.split('-').map(Number);
    const base = new Date(y, m - 1, d);

    for (let i = 0; i < 7; i++) {
        const cur = new Date(base);
        cur.setDate(base.getDate() + i);
        const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
        isoKeys.push(iso);
        labels.push(`${cur.getDate()} ${months[cur.getMonth()]}`);
    }

    const graphData = isoKeys.map(isoKey => {
        const dayRecords = sessionHistory[isoKey];
        if (!dayRecords) return 0;
        let count = 0;
        students.forEach(s => {
            if (dayRecords[s.id] && dayRecords[s.id].status === 'PRESENT') count++;
        });
        return students.length > 0 ? Math.round((count / students.length) * 100) : 0;
    });

    res.json({
        sessions,
        activeSessionId,
        session: active,
        students: roster,
        dynamicToken,
        lanBaseUrl: `http://${lanIP}:${PORT}`,
        trends: { labels, data: graphData }
    });
});

// QR Attendance
app.post('/api/attendance/qr-mark', (req, res) => {
    let { studentId, rollNo, studentName, deviceId, sessionId } = req.body;
    const targetSessionId = sessionId || activeSessionId;
    const session = sessions.find(s => s.sessionId === targetSessionId) || getActiveSession();

    let student = null;
    if (studentId) student = students.find(s => s.id === studentId);
    else if (rollNo) student = students.find(s => s.rollNo === rollNo.toUpperCase().trim());

    if (!student) {
        return res.status(404).json({ success: false, message: `Student '${rollNo}' not found in college register!` });
    }

    if (deviceId) {
        if (!deviceLedger[session.sessionId]) deviceLedger[session.sessionId] = {};
        const registeredStudent = deviceLedger[session.sessionId][deviceId];
        if (registeredStudent && registeredStudent !== student.id) {
            return res.status(403).json({
                success: false,
                message: "Proxy Blocked! This device has already marked attendance for another roll number."
            });
        }
        deviceLedger[session.sessionId][deviceId] = student.id;
    }

    const currentISO = session.dateISO;
    if (!attendanceLedger[session.sessionId]) attendanceLedger[session.sessionId] = {};
    if (!attendanceLedger[session.sessionId][currentISO]) attendanceLedger[session.sessionId][currentISO] = {};

    attendanceLedger[session.sessionId][currentISO][student.id] = {
        status: 'PRESENT',
        method: 'QR_SCAN',
        timestamp: getISTTimestamp()
    };

    res.json({
        success: true,
        message: `Attendance Verified for ${student.name} (${student.rollNo})`,
        student,
        time: getISTTimestamp(),
        subject: session.subject,
        date: session.dateDisplay
    });
});

// Manual Status
app.post('/api/attendance/manual', (req, res) => {
    const { studentId, status } = req.body;
    const active = getActiveSession();
    const currentISO = active.dateISO;

    if (!attendanceLedger[active.sessionId]) attendanceLedger[active.sessionId] = {};
    if (!attendanceLedger[active.sessionId][currentISO]) attendanceLedger[active.sessionId][currentISO] = {};

    attendanceLedger[active.sessionId][currentISO][studentId] = {
        status: status.toUpperCase(),
        method: 'Manual',
        timestamp: getISTTimestamp()
    };
    res.json({ success: true, studentId, status, date: active.dateDisplay });
});

// Bulk Action
app.post('/api/attendance/bulk', (req, res) => {
    const { status } = req.body;
    const active = getActiveSession();
    const currentISO = active.dateISO;
    const time = getISTTimestamp();

    if (!attendanceLedger[active.sessionId]) attendanceLedger[active.sessionId] = {};
    if (!attendanceLedger[active.sessionId][currentISO]) attendanceLedger[active.sessionId][currentISO] = {};

    students.forEach(s => {
        attendanceLedger[active.sessionId][currentISO][s.id] = {
            status: status.toUpperCase(),
            method: 'Manually',
            timestamp: status === 'ABSENT' ? '—' : time
        };
    });
    res.json({ success: true, message: `All marked ${status}` });
});

// Add Student
app.post('/api/students/add', (req, res) => {
    let { name, rollNo, branch, section } = req.body;
    if (!name || !rollNo) return res.status(400).json({ success: false, message: "Name & Roll Number required!" });

    name = name.trim();
    rollNo = rollNo.toUpperCase().trim();
    branch = (branch || 'CSE').trim().toUpperCase();
    section = (section || 'A').toUpperCase().trim();

    if (!/^[A-Z0-9]{3,15}$/.test(rollNo)) return res.status(400).json({ success: false, message: "Roll Number must be alphanumeric (No '+')!" });
    if (!/^[a-zA-Z\s.]{2,40}$/.test(name)) return res.status(400).json({ success: false, message: "Full Name letters only (No '+')!" });

    if (students.some(s => s.rollNo === rollNo)) return res.status(400).json({ success: false, message: "Roll number already exists!" });

    const newStudent = {
        id: 'STU' + (students.length + 101),
        name,
        rollNo,
        branch,
        section,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${rollNo}`
    };
    students.push(newStudent);
    res.json({ success: true, student: newStudent });
});

// Edit Student
app.post('/api/students/edit', (req, res) => {
    let { studentId, name, rollNo, branch, section } = req.body;
    const student = students.find(s => s.id === studentId);
    if (!student) return res.status(404).json({ success: false, message: "Student not found!" });

    name = name.trim();
    rollNo = rollNo.toUpperCase().trim();
    branch = (branch || 'CSE').trim().toUpperCase();
    section = (section || 'A').toUpperCase().trim();

    if (!/^[A-Z0-9]{3,15}$/.test(rollNo)) return res.status(400).json({ success: false, message: "Invalid Roll Number!" });
    if (!/^[a-zA-Z\s.]{2,40}$/.test(name)) return res.status(400).json({ success: false, message: "Invalid Name!" });

    if (students.some(s => s.rollNo === rollNo && s.id !== studentId)) {
        return res.status(400).json({ success: false, message: "Roll number already taken!" });
    }

    student.name = name;
    student.rollNo = rollNo;
    student.branch = branch;
    student.section = section;
    student.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${rollNo}`;
    res.json({ success: true, student });
});

// Delete Student
app.delete('/api/students/:id', (req, res) => {
    const idx = students.findIndex(s => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Student not found!" });
    students.splice(idx, 1);
    res.json({ success: true, message: "Student removed!" });
});

// Launch Session
app.post('/api/session/create', (req, res) => {
    let { subject, instructor, room, semester } = req.body;
    subject = (subject || '').trim();
    instructor = (instructor || '').trim();
    room = (room || 'LH-101').trim();
    semester = (semester || 'Semester 6').trim();

    if (!/^[a-zA-Z0-9\s:\-\(\)&]{3,60}$/.test(subject)) return res.status(400).json({ success: false, message: "Invalid Subject!" });
    if (!/^[a-zA-Z\s.]{2,40}$/.test(instructor)) return res.status(400).json({ success: false, message: "Invalid Faculty Name!" });

    const today = getTodayISO();
    const newSession = {
        sessionId: 'SES-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        college: 'National Institute of Technology',
        department: 'Department of Computer Science & Engineering',
        subject,
        instructor,
        room,
        semester,
        dateISO: today,
        dateDisplay: formatDateDisplay(today)
    };

    sessions.push(newSession);
    activeSessionId = newSession.sessionId;
    attendanceLedger[newSession.sessionId] = {};
    deviceLedger[newSession.sessionId] = {};
    res.json({ success: true, session: newSession });
});

// Edit Session
app.post('/api/session/edit', (req, res) => {
    let { sessionId, subject, instructor, room, semester } = req.body;
    const session = sessions.find(s => s.sessionId === sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found!" });

    session.subject = (subject || '').trim();
    session.instructor = (instructor || '').trim();
    session.room = (room || 'LH-101').trim();
    session.semester = (semester || 'Semester 6').trim();
    res.json({ success: true, session });
});

// Student Class History by Date
app.get('/api/student/classes-by-date', (req, res) => {
    try {
        const queryRoll = (req.query.rollNo || '').toUpperCase().trim();
        const targetDate = req.query.dateISO || getTodayISO();

        if (!queryRoll) {
            return res.status(400).json({ success: false, message: "Please provide a Roll Number." });
        }

        const student = students.find(s => s.rollNo === queryRoll);
        if (!student) {
            return res.status(404).json({ success: false, message: `Roll Number '${queryRoll}' not found in college register!` });
        }

        const results = sessions.map(sess => {
            const dayRecord = attendanceLedger[sess.sessionId] && attendanceLedger[sess.sessionId][targetDate]
                ? attendanceLedger[sess.sessionId][targetDate][student.id]
                : null;

            return {
                sessionId: sess.sessionId,
                subject: sess.subject,
                instructor: sess.instructor,
                room: sess.room,
                date: formatDateDisplay(targetDate),
                status: dayRecord ? dayRecord.status : 'ABSENT',
                time: dayRecord ? dayRecord.timestamp : '—'
            };
        });

        res.json({
            success: true,
            student,
            dateDisplay: formatDateDisplay(targetDate),
            dateISO: targetDate,
            classes: results
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Internal server error while fetching classes." });
    }
});

// Export Summary
app.get('/api/export/summary', (req, res) => {
    const targetDateISO = req.query.dateISO || getActiveSession().dateISO;
    let totalPresentOnDate = 0;
    let totalAttendanceEntries = 0;

    const classesSummary = sessions.map(sess => {
        const sessHistory = attendanceLedger[sess.sessionId] || {};
        const recordedDates = Object.keys(sessHistory);
        const totalDates = Math.max(recordedDates.length, 1);

        const studentStats = students.map(s => {
            let presentCount = 0;
            recordedDates.forEach(d => {
                if (sessHistory[d] && sessHistory[d][s.id] && sessHistory[d][s.id].status === 'PRESENT') presentCount++;
            });
            const dateRecord = sessHistory[targetDateISO] && sessHistory[targetDateISO][s.id] ? sessHistory[targetDateISO][s.id] : null;
            if (dateRecord && dateRecord.status === 'PRESENT') totalPresentOnDate++;
            totalAttendanceEntries++;

            return {
                rollNo: s.rollNo,
                name: s.name,
                branch: s.branch,
                section: s.section,
                statusOnDate: dateRecord ? dateRecord.status : 'ABSENT',
                timeOnDate: dateRecord ? dateRecord.timestamp : '—',
                attended: presentCount,
                total: totalDates,
                percentage: Math.round((presentCount / totalDates) * 100)
            };
        });

        return {
            sessionId: sess.sessionId,
            subject: sess.subject,
            instructor: sess.instructor,
            room: sess.room,
            semester: sess.semester,
            dateDisplay: formatDateDisplay(targetDateISO),
            roster: studentStats
        };
    });

    const active = getActiveSession();
    const overallPct = totalAttendanceEntries > 0 ? Math.round((totalPresentOnDate / totalAttendanceEntries) * 100) : 0;

    res.json({
        college: active.college,
        department: active.department,
        activeFaculty: active.instructor,
        activeSubject: active.subject,
        activeRoom: active.room,
        selectedDateDisplay: formatDateDisplay(targetDateISO),
        selectedDateISO: targetDateISO,
        stats: {
            totalStudents: students.length,
            totalClasses: sessions.length,
            presentOnDate: totalPresentOnDate,
            overallAttendancePct: overallPct
        },
        classes: classesSummary
    });
});

app.listen(PORT, '0.0.0.0', () => {
    const lanIP = getLocalLANIP();
    console.log(`\n======================================================`);
    console.log(`Smart Attendance Server running:`);
    console.log(`- PC Login URL:        http://localhost:${PORT}`);
    console.log(`- Mobile Wi-Fi URL:    http://${lanIP}:${PORT}`);
    console.log(`======================================================\n`);
});

module.exports = app;