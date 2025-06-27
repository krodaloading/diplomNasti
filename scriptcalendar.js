(function() {
  // --- Навигатор даты ---
  const dateDisplay = document.getElementById("dateDisplay");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const todayBtn = document.getElementById("todayBtn");
  const calendarBtn = document.getElementById("calendarBtn");
  const datePicker = document.getElementById("datePicker");

  let currentDate = new Date();

  function formatDate(date) {
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  function isoDateString(date) {
    return date.toISOString().slice(0,10);
  }

  function updateDisplay() {
    dateDisplay.textContent = formatDate(currentDate);
    loadTasksForDate(isoDateString(currentDate));
  }

  prevBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() - 1);
    updateDisplay();
  });

  nextBtn.addEventListener("click", () => {
    currentDate.setDate(currentDate.getDate() + 1);
    updateDisplay();
  });

  todayBtn.addEventListener("click", () => {
    currentDate = new Date();
    updateDisplay();
  });

  calendarBtn.addEventListener("click", () => {
    if (datePicker.classList.contains("show")) {
      datePicker.classList.remove("show");
    } else {
      datePicker.valueAsDate = currentDate;
      datePicker.classList.add("show");
      datePicker.focus();
    }
  });

  datePicker.addEventListener("change", () => {
    if (datePicker.value) {
      currentDate = new Date(datePicker.value);
      updateDisplay();
      datePicker.classList.remove("show");
    }
  });

  document.addEventListener("click", (e) => {
    if (!datePicker.contains(e.target) && !calendarBtn.contains(e.target)) {
      datePicker.classList.remove("show");
    }
  });

  // --- Состояние ---
  let selectedProjectId = projects[0].id;
  const selections = {};

  // --- Элементы ---
  const projectListContainer = document.getElementById("projectListContainer");
  const calendarBody = document.getElementById("calendarBody");
  const headerRow = document.getElementById("headerRow");

  // --- Рендер часов в заголовке ---
  function renderHeaderHours() {
    while (headerRow.children.length > 1) {
      headerRow.removeChild(headerRow.lastChild);
    }
    for (let h = 0; h < 24; h++) {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    }
  }

  // --- Рендер списка проектов и их карт ---
  function renderProjectList() {
    projectListContainer.innerHTML = "";
    for (const proj of projects) {
      const div = document.createElement("div");
      div.className = "project-item" + (proj.id === selectedProjectId ? " selected" : "");
      div.textContent = proj.title;
      div.tabIndex = 0;
      div.setAttribute("role", "option");
      div.addEventListener("click", () => {
        if (selectedProjectId !== proj.id) {
          selectedProjectId = proj.id;
          renderProjectList();
          loadTasksForDate(isoDateString(currentDate));
        }
      });
      div.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          div.click();
        }
      });
      projectListContainer.appendChild(div);

      if (proj.id === selectedProjectId) {
        for (const card of proj.cards) {
          const cardDiv = document.createElement("div");
          cardDiv.className = "card-item";
          cardDiv.textContent = card.title;
          projectListContainer.appendChild(cardDiv);
        }
      }
    }
  }

  // --- Рендер таблицы для выбранного проекта и даты ---
  function renderCalendarTable(project, dateKey) {
    calendarBody.innerHTML = "";
    for (const card of project.cards) {
      const tr = document.createElement("tr");
      const tdTitle = document.createElement("td");
      tdTitle.textContent = card.title;
      tr.appendChild(tdTitle);

      for (let h = 0; h < 24; h++) {
        const td = document.createElement("td");
        const btn = document.createElement("button");
        btn.className = "cell-btn";
        btn.type = "button";
        btn.title = `${card.title} — час ${h}`;
        btn.dataset.cardId = card.id;
        btn.dataset.hour = h;

        if (
          selections[dateKey] &&
          selections[dateKey][card.id] &&
          selections[dateKey][card.id].has(h)
        ) {
          btn.classList.add("selected");
        }

        td.appendChild(btn);
        tr.appendChild(td);
      }
      calendarBody.appendChild(tr);
    }
  }

  // --- Загрузка задач и выделений для даты ---
  function loadTasksForDate(dateKey) {
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;
    renderCalendarTable(project, dateKey);
    attachCellSelectionHandlers(dateKey);
  }

  // --- Выделение ячеек при drag ---
  let isDragging = false;
  let dragStart = null;
  let dragEnd = null;
  let dragButtons = [];

  function attachCellSelectionHandlers(dateKey) {
    const buttons = calendarBody.querySelectorAll("button.cell-btn");
    buttons.forEach(btn => {
      btn.onmousedown = (e) => {
        e.preventDefault();
        isDragging = true;
        dragStart = btn;
        dragEnd = btn;
        dragButtons = [btn];
        updateDragSelection(dateKey);
      };
      btn.onmouseenter = (e) => {
        if (isDragging) {
          dragEnd = btn;
          updateDragSelection(dateKey);
        }
      };
      btn.onmouseup = (e) => {
        if (isDragging) {
          dragEnd = btn;
          updateDragSelection(dateKey);
          finalizeSelection(dateKey);
          isDragging = false;
          dragStart = null;
          dragEnd = null;
          dragButtons = [];
        }
      };
    });
    document.onmouseup = (e) => {
      if (isDragging) {
        finalizeSelection(dateKey);
        isDragging = false;
        dragStart = null;
        dragEnd = null;
        dragButtons = [];
      }
    };
  }

  function updateDragSelection(dateKey) {
    calendarBody.querySelectorAll("button.cell-btn").forEach(btn => {
      btn.classList.remove("multi-selected");
    });

    function getButtonPos(btn) {
      const tr = btn.closest("tr");
      const trs = Array.from(calendarBody.querySelectorAll("tr"));
      const rowIndex = trs.indexOf(tr);
      const colIndex = parseInt(btn.dataset.hour, 10);
      return {row: rowIndex, col: colIndex};
    }

    const startPos = getButtonPos(dragStart);
    const endPos = getButtonPos(dragEnd);

    const rowMin = Math.min(startPos.row, endPos.row);
    const rowMax = Math.max(startPos.row, endPos.row);
    const colMin = Math.min(startPos.col, endPos.col);
    const colMax = Math.max(startPos.col, endPos.col);

    dragButtons = [];

    for (let r = rowMin; r <= rowMax; r++) {
      const tr = calendarBody.querySelectorAll("tr")[r];
      for (let c = colMin; c <= colMax; c++) {
        const btn = tr.querySelector(`button.cell-btn[data-hour="${c}"]`);
        if (btn) {
          btn.classList.add("multi-selected");
          dragButtons.push(btn);
        }
      }
    }
  }

  function finalizeSelection(dateKey) {
    if (!dateKey) return;
    if (!selections[dateKey]) selections[dateKey] = {};
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    dragButtons.forEach(btn => {
      const cardId = parseInt(btn.dataset.cardId, 10);
      const hour = parseInt(btn.dataset.hour, 10);
      if (!selections[dateKey][cardId]) {
        selections[dateKey][cardId] = new Set();
      }
      if (btn.classList.contains("selected")) {
        btn.classList.remove("selected");
        selections[dateKey][cardId].delete(hour);
        if (selections[dateKey][cardId].size === 0) {
          delete selections[dateKey][cardId];
        }
      } else {
        btn.classList.add("selected");
        selections[dateKey][cardId].add(hour);
      }
      btn.classList.remove("multi-selected");
    });
    dragButtons = [];
  }

  // --- Инициализация ---
  renderHeaderHours();
  renderProjectList();
  updateDisplay();

})();
