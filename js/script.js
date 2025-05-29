const socket = io('https://ctf-websocket-g3l9.onrender.com'); // Replace with your Render URL

const API_BASE_URL = 'https://ctf-backend-rose.vercel.app/api';

const teamName = localStorage.getItem('teamName');

function updateTeamName() {
  const teamElements = document.querySelectorAll('.team-name');
  teamElements.forEach(el => {
    el.textContent = teamName || 'Guest';
  });
}

function formatTime(ms) {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

async function updateLeaderboard() {
  try {
    const response = await fetch(`${API_BASE_URL}/teams`);
    const teams = await response.json();
    const leaderboardBody = document.querySelector('#leaderboard-body');
    if (leaderboardBody) {
      leaderboardBody.innerHTML = teams.map((team, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${team.name}</td>
          <td>${team.score}</td>
        </tr>
      `).join('');
      renderTeamScoresChart(teams);
    }
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
  }
}

async function updateTimer() {
  try {
    const response = await fetch(`${API_BASE_URL}/timer`);
    const timer = await response.json();
    const timerDisplay = document.querySelector('#timer');
    if (timerDisplay) {
      timerDisplay.textContent = formatTime(timer.timeLeft);
    }
  } catch (err) {
    console.error('Error fetching timer:', err);
  }
}

async function handleRegistration(event) {
  event.preventDefault();
  const teamNameInput = document.querySelector('#team-name');
  const passwordInput = document.querySelector('#team-password');
  const successMessage = document.querySelector('#success-message');
  const teamName = teamNameInput.value;
  const password = passwordInput.value;

  try {
    const response = await fetch(`${API_BASE_URL}/teams/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: teamName, password })
    });
    if (response.ok) {
      localStorage.setItem('teamName', teamName);
      successMessage.style.display = 'block';
      teamNameInput.value = '';
      passwordInput.value = '';
      updateTeamName();
    } else {
      alert('Registration failed. Team name may already exist.');
    }
  } catch (err) {
    console.error('Error registering team:', err);
    alert('Error registering team. Please try again.');
  }
}

async function handleFlagSubmission(event) {
  event.preventDefault();
  const flagInput = document.querySelector('#flag-input');
  const successMessage = document.querySelector('#flag-success');
  const errorMessage = document.querySelector('#flag-error');
  const flag = flagInput.value;

  try {
    const response = await fetch(`${API_BASE_URL}/flags/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName, flag })
    });
    if (response.ok) {
      successMessage.style.display = 'block';
      errorMessage.style.display = 'none';
      flagInput.value = '';
    } else {
      successMessage.style.display = 'none';
      errorMessage.style.display = 'block';
    }
  } catch (err) {
    console.error('Error submitting flag:', err);
    errorMessage.style.display = 'block';
  }
}

async function handleTimerControl(action) {
  try {
    const response = await fetch(`${API_BASE_URL}/timer/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      console.error(`Error performing timer action: ${action}`);
    }
  } catch (err) {
    console.error(`Error performing timer action: ${action}`, err);
  }
}

function renderTeamScoresChart(teams) {
  const ctx = document.querySelector('#scores-chart')?.getContext('2d');
  if (ctx) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: teams.map(team => team.name),
        datasets: [{
          label: 'Team Scores',
          data: teams.map(team => team.score),
          backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'],
          borderColor: ['#2A80B9', '#CC4B37', '#D4A017', '#3A9A9A', '#7A52CC'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

function renderDifficultyChart(stats) {
  const ctx = document.querySelector('#difficulty-chart')?.getContext('2d');
  if (ctx) {
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Easy', 'Medium', 'Hard'],
        datasets: [{
          data: [stats.easy, stats.medium, stats.hard],
          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384'],
          borderColor: ['#2A80B9', '#D4A017', '#CC4B37'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true
      }
    });
  }
}

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('leaderboard', (teams) => {
  console.log('Leaderboard update:', teams);
  const leaderboardBody = document.querySelector('#leaderboard-body');
  if (leaderboardBody) {
    leaderboardBody.innerHTML = teams.map((team, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${team.name}</td>
        <td>${team.score}</td>
      </tr>
    `).join('');
    renderTeamScoresChart(teams);
  }
});

socket.on('timer', (data) => {
  console.log('Timer update:', data);
  const timerDisplay = document.querySelector('#timer');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(data.timeLeft);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  updateTeamName();
  updateLeaderboard();
  updateTimer();

  const registerForm = document.querySelector('#register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', handleRegistration);
  }

  const flagForm = document.querySelector('#flag-form');
  if (flagForm) {
    flagForm.addEventListener('submit', handleFlagSubmission);
  }

  const startBtn = document.querySelector('#start-timer');
  const pauseBtn = document.querySelector('#pause-timer');
  const resetBtn = document.querySelector('#reset-timer');
  if (startBtn) startBtn.addEventListener('click', () => handleTimerControl('start'));
  if (pauseBtn) pauseBtn.addEventListener('click', () => handleTimerControl('pause'));
  if (resetBtn) resetBtn.addEventListener('click', () => handleTimerControl('reset'));

  const refreshBtn = document.querySelector('#refresh-stats');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/stats`);
        const stats = await response.json();
        renderDifficultyChart(stats);
        document.querySelector('#last-updated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    });
  }
});