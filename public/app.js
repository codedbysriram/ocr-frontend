/* ================= API AUTO SWITCH ================= */
const API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://backendocr-28.onrender.com";

/* ================= UPLOAD ================= */
window.uploadResult = function () {
  const fileInput = document.getElementById("file");
  const status = document.getElementById("uploadStatus");
  const btn = document.getElementById("uploadBtn");
  const progressBox = document.querySelector(".progress-box");
  const progressBar = document.getElementById("progressBar");

  if (!fileInput || !fileInput.files.length) {
    status.textContent = "❌ Please select a file";
    status.className = "status-text status-failed";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  btn.disabled = true;
  status.textContent = "⏳ Uploading...";
  status.className = "status-text status-loading";
  progressBox.style.display = "block";
  progressBar.style.width = "0%";

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      progressBar.style.width =
        Math.round((e.loaded / e.total) * 100) + "%";
    }
  };

  xhr.onload = () => {
    btn.disabled = false;

    if (xhr.status === 200) {
      status.textContent = "✅ Upload successful";
      status.className = "status-text status-success";
      loadAllResults();
    } else {
      status.textContent = "❌ Upload failed";
      status.className = "status-text status-failed";
    }
  };

  xhr.onerror = () => {
    btn.disabled = false;
    status.textContent = "❌ Network error";
    status.className = "status-text status-failed";
  };

  xhr.open("POST", `${API}/upload-test`, true);
  xhr.send(formData);
};

/* ================= LOAD RESULTS ================= */
window.loadAllResults = async function () {
  try {
    const res = await fetch(`${API}/api/results`);
    if (!res.ok) throw new Error("API error");

    const data = await res.json();
    renderTable(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("❌ Failed to load results:", err);
  }
};

/* ================= TABLE RENDER (SAFE) ================= */
function renderTable(rows) {
  const table = document.getElementById("resultTable");
  if (!table) {
    console.error("❌ Table with id 'resultTable' not found");
    return;
  }

  let thead = table.querySelector("thead");
  let tbody = table.querySelector("tbody");

  /* Auto-create thead/tbody if missing */
  if (!thead) {
    thead = document.createElement("thead");
    table.appendChild(thead);
  }
  if (!tbody) {
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
  }

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="100%">No data available</td></tr>`;
    return;
  }

  /* ===== UNIQUE SUBJECTS ===== */
  const subjects = [...new Set(rows.map(r => r.subject_title))];

  /* ===== GROUP BY STUDENT ===== */
  const students = {};

  rows.forEach(r => {
    if (!students[r.regno]) {
      students[r.regno] = {
        regno: r.regno,
        name: r.name,
        semester: r.semester,
        subjects: {},
        arrears: 0
      };
    }

    students[r.regno].subjects[r.subject_title] =
      `${r.total ?? "-"} (${r.result ?? "-"})`;

    // College rule: RA or AA = arrear
    if (r.result === "RA" || r.result === "AA") {
      students[r.regno].arrears++;
    }
  });

  /* ===== TABLE HEADER ===== */
  let header = `<tr>
    <th>Reg No</th>
    <th>Name</th>
    <th>Semester</th>
  `;
  subjects.forEach(s => (header += `<th>${s}</th>`));
  header += `<th>Arrears</th></tr>`;
  thead.innerHTML = header;

  /* ===== TABLE ROWS ===== */
  Object.values(students).forEach(s => {
    let row = `<tr>
      <td>${s.regno}</td>
      <td>${s.name}</td>
      <td>${s.semester ?? "-"}</td>
    `;

    subjects.forEach(sub => {
      row += `<td>${s.subjects[sub] || "-"}</td>`;
    });

    row += `
      <td style="color:${s.arrears ? "red" : "green"}; font-weight:bold">
        ${s.arrears}
      </td>
    </tr>`;

    tbody.innerHTML += row;
  });
}

/* ================= AUTO LOAD ================= */
document.addEventListener("DOMContentLoaded", loadAllResults);
