require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= MYSQL ================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

/* ================= UPLOAD ================= */
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: 10 * 1024 * 1024 },
});

/* ================= OCR TEXT EXTRACT ================= */
async function extractText(filePath, mimeType) {
  if (mimeType === "application/pdf") {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  } else {
    const result = await Tesseract.recognize(filePath, "eng");
    return result.data.text;
  }
}

/* ================= PARSE TEXT TO RESULTS ================= */
/*
EXPECTED OCR TEXT FORMAT (example):
CT001 Sriram 4 DBMS 25 55 80 PASS
*/
function parseResults(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const results = [];

  lines.forEach(line => {
    const parts = line.split(/\s+/);

    if (parts.length < 8) return;

    const [
      regno,
      name,
      semester,
      subject_title,
      ia,
      ea,
      total,
      result,
    ] = parts;

    results.push({
      regno,
      name,
      department: "Computer Technology",
      year: Math.ceil(Number(semester) / 2),
      semester: Number(semester),
      subject_code: subject_title.substring(0, 6).toUpperCase(),
      subject_title,
      ia: Number(ia),
      ea: Number(ea),
      total: Number(total),
      result: result.toUpperCase(),
    });
  });

  return results;
}

/* ================= UPLOAD + OCR ================= */
app.post("/upload-test", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false });
  }

  try {
    const text = await extractText(req.file.path, req.file.mimetype);
    const rows = parseResults(text);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "OCR failed to extract results",
      });
    }

    const sql = `
      INSERT INTO student_results
      (regno, name, department, year, semester,
       subject_code, subject_title, ia, ea, total, result)
      VALUES ?
      ON DUPLICATE KEY UPDATE
        ia = VALUES(ia),
        ea = VALUES(ea),
        total = VALUES(total),
        result = VALUES(result)
    `;

    const values = rows.map(r => [
      r.regno,
      r.name,
      r.department,
      r.year,
      r.semester,
      r.subject_code,
      r.subject_title,
      r.ia,
      r.ea,
      r.total,
      r.result,
    ]);

    await db.query(sql, [values]);

    fs.unlinkSync(req.file.path);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ================= FETCH RESULTS ================= */
app.get("/results", async (_, res) => {
  const [rows] = await db.query(`
    SELECT regno, name, semester, subject_title, total, result
    FROM student_results
    ORDER BY regno, semester
  `);
  res.json(rows);
});

/* ================= START ================= */
app.listen(PORT, () => {
  console.log(`🚀 OCR Backend running on ${PORT}`);
});
/* ================= LOAD ALL RESULTS ================= */
window.loadAllResults = async function () {
  try {
    const res = await fetch(`${API}/results`);
    const data = await res.json();
    renderTable(data);
  } catch (err) {
    console.error("Result fetch error", err);
  }
};

/* ================= BACK BUTTON ================= */
function goToDashboard() {
  window.location.href =
    "https://ocr-frontend-murex.vercel.app/admin/dashboard";
}

/* ================= AUTO LOAD ================= */
document.addEventListener("DOMContentLoaded", loadAllResults);