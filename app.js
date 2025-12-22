const API = "http://localhost:5000";

/* ================= UPLOAD WITH PROGRESS ================= */
window.uploadResult = function () {
  const fileInput = document.getElementById("file");
  const status = document.getElementById("uploadStatus");
  const btn = document.getElementById("uploadBtn");
  const progressBox = document.querySelector(".progress-box");
  const progressBar = document.getElementById("progressBar");

  // Validate file
  if (!fileInput.files.length) {
    status.textContent = "❌ Please select a file";
    status.className = "status-text status-failed";
    return;
  }

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);

  // UI: loading state
  btn.disabled = true;
  status.textContent = "⏳ Uploading...";
  status.className = "status-text status-loading";
  progressBox.style.display = "block";
  progressBar.style.width = "0%";
  progressBar.style.background =
    "linear-gradient(90deg, #22c55e, #16a34a)";

  const xhr = new XMLHttpRequest();

  // Upload progress
  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = percent + "%";
    }
  };

  // Response handler
  xhr.onload = () => {
    btn.disabled = false;

    try {
      const res = JSON.parse(xhr.responseText || "{}");

      if (xhr.status === 200 && res.success) {
        progressBar.style.width = "100%";
        status.textContent = "✅ Upload successful & results stored";
        status.className = "status-text status-success";
      } else {
        progressBar.style.background = "#dc2626";
        status.textContent =
          "❌ Upload failed: " + (res.message || "Server error");
        status.className = "status-text status-failed";
      }
    } catch (err) {
      progressBar.style.background = "#dc2626";
      status.textContent = "❌ Invalid server response";
      status.className = "status-text status-failed";
    }
  };

  // Network error
  xhr.onerror = () => {
    btn.disabled = false;
    progressBar.style.background = "#dc2626";
    status.textContent = "❌ Network error";
    status.className = "status-text status-failed";
  };

  // ✅ CORRECT BACKEND ENDPOINT
  xhr.open("POST", `${API}/api/ocr/upload`, true);
  xhr.send(formData);
};

/* ================= TABLE RENDER (SUBJECT TITLE WISE) ================= */
function renderTable(rows) {
  const thead = document.querySelector("#resultTable thead");
  const tbody = document.querySelector("#resultTable tbody");

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="100%">No data found</td></tr>`;
    return;
  }

  // Collect unique SUBJECT TITLES
  const subjects = [...new Set(rows.map((r) => r.subject_title))];

  // Group by student
  const students = {};

  rows.forEach((r) => {
    if (!students[r.regno]) {
      students[r.regno] = {
        regno: r.regno,
        name: r.name,
        semester: r.semester,
        subjects: {},
        arrears: 0,
      };
    }

    students[r.regno].subjects[r.subject_title] =
      `${r.total} (${r.result})`;

    if (r.result === "FAIL") {
      students[r.regno].arrears++;
    }
  });

  // Build table header
  let headerRow = `
    <tr>
      <th>Reg No</th>
      <th>Name</th>
      <th>Semester</th>
  `;

  subjects.forEach((title) => {
    headerRow += `<th>${title}</th>`;
  });

  headerRow += `<th>Arrears</th></tr>`;
  thead.innerHTML = headerRow;

  // Build table body
  Object.values(students).forEach((s) => {
    let row = `
      <tr>
        <td>${s.regno}</td>
        <td>${s.name}</td>
        <td>${s.semester}</td>
    `;

    subjects.forEach((title) => {
      row += `<td>${s.subjects[title] || "-"}</td>`;
    });

    row += `
      <td style="color:${s.arrears ? "red" : "green"}">
        ${s.arrears}
      </td>
    </tr>`;

    tbody.innerHTML += row;
  });
}

/* ================= FILTER FUNCTIONS ================= */

window.loadYear = async function (year) {
  if (!year) return;
  const res = await fetch(`${API}/year/${year}`);
  const data = await res.json();
  renderTable(data);
};

window.loadSemester = async function (sem) {
  if (!sem) return;
  const res = await fetch(`${API}/semester/${sem}`);
  const data = await res.json();
  renderTable(data);
};

window.loadSubject = async function (code) {
  if (!code) return;
  const res = await fetch(`${API}/subject/${code}`);
  const data = await res.json();
  renderTable(data);
};

window.loadArrears = async function (count) {
  if (count === "") return;
  const res = await fetch(`${API}/arrears/${count}`);
  const data = await res.json();
  renderTable(data);
};
