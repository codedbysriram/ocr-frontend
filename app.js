const API = "https://backendocr-13.onrender.com";

window.uploadResult = function () {
  const fileInput = document.getElementById("file");
  const status = document.getElementById("uploadStatus");
  const btn = document.getElementById("uploadBtn");
  const progressBox = document.querySelector(".progress-box");
  const progressBar = document.getElementById("progressBar");

  if (!fileInput || !status || !btn || !progressBox || !progressBar) {
    return;
  }

  if (!fileInput.files.length) {
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
  progressBar.style.background = "linear-gradient(90deg, #22c55e, #16a34a)";

  const xhr = new XMLHttpRequest();

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const percent = Math.round((e.loaded / e.total) * 100);
      progressBar.style.width = percent + "%";
    }
  };

  xhr.onload = () => {
    btn.disabled = false;

    let res;
    try {
      res = JSON.parse(xhr.responseText);
    } catch {
      status.textContent = "❌ Invalid server response";
      status.className = "status-text status-failed";
      progressBar.style.background = "#dc2626";
      return;
    }

    if (xhr.status === 200 && res.success === true) {
      progressBar.style.width = "100%";
      status.textContent = "✅ Upload successful";
      status.className = "status-text status-success";
      loadAllResults();
    } else {
      progressBar.style.background = "#dc2626";
      status.textContent =
        "❌ Upload failed: " + (res.message || "Server error");
      status.className = "status-text status-failed";
    }
  };

  xhr.onerror = () => {
    btn.disabled = false;
    progressBar.style.background = "#dc2626";
    status.textContent = "❌ Network error";
    status.className = "status-text status-failed";
  };

  xhr.open("POST", `${API}/upload-test`, true);
  xhr.send(formData);
};

function renderTable(rows) {
  const thead = document.querySelector("#resultTable thead");
  const tbody = document.querySelector("#resultTable tbody");

  if (!thead || !tbody) return;

  thead.innerHTML = "";
  tbody.innerHTML = "";

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="100%">No data found</td></tr>`;
    return;
  }

  const subjects = [...new Set(rows.map(r => r.subject_title))];
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
      `${r.total} (${r.result})`;

    if (r.result === "FAIL") students[r.regno].arrears++;
  });

  let headerRow =
    `<tr><th>Reg No</th><th>Name</th><th>Semester</th>`;
  subjects.forEach(s => headerRow += `<th>${s}</th>`);
  headerRow += `<th>Arrears</th></tr>`;
  thead.innerHTML = headerRow;

  Object.values(students).forEach(s => {
    let row =
      `<tr>
        <td>${s.regno}</td>
        <td>${s.name}</td>
        <td>${s.semester}</td>`;

    subjects.forEach(sub =>
      row += `<td>${s.subjects[sub] || "-"}</td>`
    );

    row +=
      `<td style="color:${s.arrears ? "red" : "green"}">
        ${s.arrears}
      </td></tr>`;

    tbody.innerHTML += row;
  });
}

window.loadAllResults = async function () {
  try {
    const res = await fetch(`${API}/results`);
    const data = await res.json();
    renderTable(data);
  } catch {}
};

function goToDashboard() {
  window.location.href =
    "https://ocr-frontend-murex.vercel.app/admin/dashboard";
}

document.addEventListener("DOMContentLoaded", loadAllResults);
