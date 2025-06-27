function toggleEdit(boardId, enable) {
  const title = document.getElementById('title-' + boardId);
  const form = document.getElementById('form-' + boardId);
  if (enable) {
    title.classList.add('hidden');
    form.classList.remove('hidden');
  } else {
    title.classList.remove('hidden');
    form.classList.add('hidden');
  }
}

function addCardInput(boardId) {
  const form = document.getElementById('form-' + boardId);
  const newInput = document.createElement('input');
  newInput.type = 'text';
  newInput.name = 'cards';
  newInput.placeholder = 'Новая карточка';
  form.insertBefore(newInput, form.querySelector('.button-group'));
}

function openModal(title, description) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-description').textContent = description;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}
