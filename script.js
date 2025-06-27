function enableBoardEdit(boardId) {
  const column = document.querySelector([data-board-id="${boardId}"]);
  column.querySelector(".view-mode").style.display = "none";
  column.querySelector(".edit-mode").style.display = "block";
}

function cancelEdit(boardId) {
  const column = document.querySelector([data-board-id="${boardId}"]);
  column.querySelector(".edit-mode").style.display = "none";
  column.querySelector(".view-mode").style.display = "block";
}