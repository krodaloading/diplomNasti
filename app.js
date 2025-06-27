const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const http = require('http');
const socketio = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const multer = require('multer');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { checkPermission } = require('./roleMiddleware');

const adapter = new FileSync('db.json');
const db = low(adapter);
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const upload = multer({ dest: path.join(__dirname, 'public', 'img', 'uploads') });

app.use(expressLayouts);
app.set('layout', 'partials/layout');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({ secret: 'super-secret-key', resave: false, saveUninitialized: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.path = req.path;
  next();
});

db.defaults({ users: [], projects: [], boards: [], tasksCalendar: [], messages: {} }).write();
global.db = db;
global.users = db.get('users').value();
global.projects = db.get('projects').value();
global.messages = db.get('messages').value();
global.boards = db.get('boards').value();
global.tasksCalendar = db.get('tasksCalendar').value();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect('/login');
  next();
}

function getCurrentUser(req) {
  return users.find((u) => u.id === req.session.userId);
}

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.render('auth/login', { title: 'Вход', error: null, showNavbar: false });
});

app.post('/login', async (req, res) => {
  const { login, password } = req.body;
  const user = users.find((u) => u.login === login);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.render('auth/login', { title: 'Вход', error: 'Неверные данные', showNavbar: false });
  }
  req.session.userId = user.id;
  res.redirect('/home');
});

app.get('/register', (req, res) => {
  res.render('auth/register', { title: 'Регистрация', error: null, showNavbar: false });
});

app.post('/register', async (req, res) => {
  const { login, password, role, positionTitle, secretWord } = req.body;
  if (!password || password.length < 8) {
    return res.render('auth/register', {
      title: 'Регистрация',
      error: 'Пароль должен быть не менее 8 символов',
      showNavbar: false,
    });
  }
  if (users.some((u) => u.login === login)) {
    return res.render('auth/register', { title: 'Регистрация', error: 'Такой логин уже существует', showNavbar: false });
  }
  const id = Date.now().toString();
  const passwordHash = await bcrypt.hash(password, 10);
  const assignedRole = ['1', '2', '3'].includes(role) ? role : '3';
  users.push({
    id,
    login,
    passwordHash,
    role: assignedRole,
    positionTitle,
    secretWord,
    likedProjects: [],
    resume: {},
    about: '',
  });
  db.set('users', users).write();
  res.redirect('/login');
});

app.get('/recover', (req, res) => {
  res.render('auth/recover', { title: 'Восстановление пароля', error: null, showNavbar: false });
});

app.post('/recover', async (req, res) => {
  const { login, secretWord, newPassword } = req.body;
  const user = users.find((u) => u.login === login);
  if (!user || user.secretWord !== secretWord) {
    return res.render('auth/recover', { title: 'Восстановление пароля', error: 'Неверные данные', showNavbar: false });
  }
  user.passwordHash = await bcrypt.hash(newPassword, 10);
  db.set('users', users).write();
  res.redirect('/login');
});

app.get('/home', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const otherProjects = projects.filter((p) => p.creatorId !== user.id);
  res.render('main/home', { title: 'Главная', user, projects: otherProjects, showNavbar: true });
});

app.post('/like/:id', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const projectId = req.params.id;
  const index = user.likedProjects.indexOf(projectId);
  if (index === -1) user.likedProjects.push(projectId);
  else user.likedProjects.splice(index, 1);
  db.set('users', users).write();
  res.redirect('/home');
});

app.get('/my-projects', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const mine = projects.filter((p) => p.creatorId === user.id);
  const liked = projects.filter((p) => user.likedProjects.includes(p.id));
  res.render('main/my-projects', { title: 'Мои проекты', user, mine, liked, showNavbar: true });
});

app.post('/add-project', requireAuth, checkPermission('canManageProjects'), (req, res) => {
  const { title, description, missingRoles } = req.body;
  const user = getCurrentUser(req);
  const id = Date.now().toString();
  projects.push({ id, title, description, missingRoles, creatorId: user.id });
  db.set('projects', projects).write();
  res.redirect('/my-projects');
});

app.get('/contacts', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const likedProjects = projects.filter((p) => user.likedProjects.includes(p.id));
  const contactIds = [...new Set(likedProjects.map((p) => p.creatorId))];
  for (const chatId in messages) {
    messages[chatId].forEach((msg) => {
      if (msg.to === user.id && !contactIds.includes(msg.from)) contactIds.push(msg.from);
    });
  }
  const contacts = users.filter((u) => contactIds.includes(u.id));
  res.render('main/contacts', { title: 'Контакты', user, contacts, showNavbar: true });
});

app.get('/messenger/:id', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const contactId = req.params.id;
  const contact = users.find((u) => u.id === contactId);
  if (!contact) return res.status(404).send('Пользователь не найден');
  const chatId = [user.id, contactId].sort().join('-');
  const messagesWithNames = (messages[chatId] || []).map((m) => ({
    ...m,
    sender: users.find((u) => u.id === m.from)?.login || '???',
  }));
  res.render('messenger', { title: 'Мессенджер', user, contactId, messages: messagesWithNames, showNavbar: true });
});

io.on('connection', (socket) => {
  socket.on('join', ({ chatId }) => socket.join(chatId));
  socket.on('message', ({ chatId, from, to, text }) => {
    const msg = { from, to, text, time: new Date().toISOString(), sender: users.find((u) => u.id === from)?.login || '???' };
    if (!messages[chatId]) messages[chatId] = [];
    messages[chatId].push(msg);
    db.set('messages', messages).write();
    io.to(chatId).emit('message', msg);
  });
});

app.get('/profile', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  res.render('main/profile', { title: 'Профиль', user, showNavbar: true });
});

app.get('/profile/edit', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  res.render('main/profile-edit', { title: 'Редактировать профиль', user, showNavbar: true });
});

app.post('/profile/edit', upload.single('avatar'), requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  const { about, phone, languages, spoken, experience, work } = req.body;
  user.about = about;
  user.phone = phone;
  user.languages = languages;
  user.spoken = spoken;
  user.experience = experience;
  user.work = work;
  if (req.file) user.avatar = '/img/uploads/' + req.file.filename;
  db.set('users', users).write();
  res.redirect('/profile');
});

app.get('/resume', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  res.render('resume', { title: 'Резюме', user, resume: user.resume, showNavbar: true });
});

app.post('/resume', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  user.resume = req.body;
  db.set('users', users).write();
  res.redirect('/profile');
});

app.get('/code-editor', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  res.render('code-editor', { title: 'Редактор кода', user, showNavbar: true });
});

app.get('/calendar', requireAuth, (req, res) => {
  const user = getCurrentUser(req);

  // Формируем projectData для шаблона calendar.ejs
  const projectData = boards.map((board) => ({
    id: board.id,
    title: board.title,
    cards: board.cards.map((card, index) => ({
      id: `${board.id}-card-${index}`,
      title: card.text,
    })),
  }));

  const calendarTasks = [...tasksCalendar];

  res.render('calendar', {
    title: 'Календарь',
    user,
    showNavbar: true,
    tasks: [...boards],
    calendarTasks,
    projectData, // Обязательно передаем projectData для шаблона
  });
});

app.get('/board-cards', requireAuth, (req, res) => {
  const user = getCurrentUser(req);
  res.render('board-cards', { title: 'Доска задач', user, boards, showNavbar: true });
});

app.post('/create-board', requireAuth, (req, res) => {
  const { title } = req.body;
  const id = Date.now().toString();
  boards.push({ id, title, cards: [] });
  db.set('boards', boards).write();
  res.redirect('/board-cards');
});

app.post('/add-card/:id', requireAuth, (req, res) => {
  const boardId = req.params.id;
  const text = req.body.card;
  const board = boards.find((b) => b.id === boardId);
  if (!board) return res.status(404).send('Колонка не найдена');
  if (text?.trim()) {
    board.cards.push({ text });
    db.set('boards', boards).write();
  }
  res.redirect('/board-cards');
});

app.post('/edit-board/:id', requireAuth, (req, res) => {
  const boardId = req.params.id;
  const title = req.body.title.trim();
  let cards = req.body.cards;

  if (!Array.isArray(cards)) {
    cards = cards ? [cards.trim()] : [];
  } else {
    cards = cards.map((c) => c.trim()).filter(Boolean);
  }

  const boardIndex = boards.findIndex((b) => b.id === boardId);
  if (boardIndex === -1) return res.status(404).send('Колонка не найдена');

  if (!title) {
    boards.splice(boardIndex, 1); // Удалить колонку, если заголовок пустой
  } else {
    boards[boardIndex].title = title;
    boards[boardIndex].cards = cards.map((text) => ({ text }));
  }

  db.set('boards', boards).write();
  res.redirect('/board-cards');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен: http://localhost:${PORT}`);
});
