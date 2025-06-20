const socket = io('https://ctf-websocket-g3l9.onrender.com'); 
const API_BASE_URL = 'https://ctf-backend-rose.vercel.app/api';

const teamName = localStorage.getItem('teamName');
const SUBMIT_END_TIME = 0; // Time in milliseconds when submissions should end (00:00)
const ADMIN_PASSWORD = "admin123**##";
let leaderboardRefreshInterval;

// Add this function to check admin access
function checkAdminAccess() {
  if (window.location.pathname.includes('admin.html')) {
    const password = prompt("Enter admin password:");
    if (password !== ADMIN_PASSWORD) {
      window.location.href = 'index.html';
    }
  }
}

// Add this function
function startLeaderboardRefresh() {
  if (window.location.pathname.includes('admin.html')) {
    // Refresh every 5 seconds
    leaderboardRefreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/teams`);
        const teams = await response.json();
        if (window.leaderboardChart) {
          window.leaderboardChart.series[0].setData(teams.map(team => ({
            name: team.name,
            y: team.score || 0
          })), true);
        }
      } catch (err) {
        console.error('Error refreshing leaderboard:', err);
      }
    }, 5000);
  }
}

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
    const currentTeam = localStorage.getItem('teamName');
    
    if (leaderboardBody) {
      leaderboardBody.innerHTML = teams.map((team, index) => `
        <tr ${team.name === currentTeam ? 'class="current-team"' : ''}>
          <td>${index + 1}</td>
          <td>${team.name}</td>
          <td>${team.score}</td>
        </tr>
      `).join('');
      
      initLeaderboardChart(teams);
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
      
      // Disable submissions when time reaches 00:00
      if (timer.timeLeft <= SUBMIT_END_TIME) {
        const submitPage = document.querySelector('body.submit-page');
        if (submitPage) {
          submitPage.innerHTML = `
            <header>
              <h1>Python Control Flow CTF</h1>
              <h2>Time's Up!</h2>
              <p>Team: <span class="team-name">${teamName || 'Guest'}</span></p>
            </header>
            <main>
              <section>
                <h2>Submission Closed</h2>
                <p>The CTF has ended. Flag submissions are no longer being accepted.</p>
                <a href="dashboard.html">View Leaderboard</a>
              </section>
            </main>
            <footer>
              <p>CMN115/CBS105 Introduction to Programming 2025 | Prepared by Mr. Eremas Tade</p>
            </footer>
          `;
        }
      }
    }
  } catch (err) {
    console.error('Error fetching timer:', err);
  }
}

// Add this function to check authentication
function checkAuth() {
  const teamName = localStorage.getItem('teamName');
  const currentPage = document.body.classList.contains('submit-page') || 
                     document.body.classList.contains('dashboard-page');
  
  if (currentPage && !teamName) {
    window.location.href = 'register.html';
  }
}

async function handleRegistration(event) {
  event.preventDefault();
  const teamNameInput = document.querySelector('#team-name');
  const passwordInput = document.querySelector('#team-password');
  const successMessage = document.querySelector('#success-message');
  const registeredTeamName = document.querySelector('#registered-team-name');
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
      if (registeredTeamName) {
        registeredTeamName.textContent = teamName; // Update the specific span
      }
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

function initLeaderboardChart(teams) {
  window.leaderboardChart = Highcharts.chart('leaderboardChart', {
    chart: { 
      type: 'bar',
      backgroundColor: '#FFFFFF',
      style: {
          fontFamily: 'Arial, sans-serif'
      }
    },
    title: { 
      text: 'Team Leaderboard',
      align: 'center',
      verticalAlign: 'top'
    },
    xAxis: {
      categories: teams.map(team => team.name), // Show team names instead of numbers
      title: { text: 'Teams' },
      allowDecimals: false
    },
    legend: { enabled: false },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: [
            'viewFullscreen',
            'printChart',
            'separator',
            'downloadPNG',
            'downloadJPEG',
            'downloadPDF',
            'downloadSVG'
          ]
        }
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#cccccc',
      style: {
        color: '#333333'
      },
      formatter: function() {
        const team = teams.find(t => t.name === this.key);
        return `<div style="color: #333">
          <b>${this.key}</b><br/>
          Points: ${this.y}<br/>
          Flags: ${team.flagCount || 0}
        </div>`;
      }
    },
    plotOptions: {
      bar: {
        dataLabels: { 
          enabled: true,
          formatter: function() {
            return `${this.key}: ${this.y} pts`;
          }
        },
        colorByPoint: true,
        colors: teams.map((team, i) => {
          const currentTeam = localStorage.getItem('teamName');
          return team.name === currentTeam ? '#FFD700' : // Gold for current team
            Highcharts.getOptions().colors[i % Highcharts.getOptions().colors.length];
        })
      }
    },
    series: [{
      name: 'Points',
      data: teams.map(team => ({
        name: team.name,
        y: team.score || 0
      }))
    }],
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          legend: {
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
          }
        }
      }]
    }
  });
}

function initProgressChart(data, teamName) {
  const totalFlags = 36; // 15 Easy + 21 Medium

  window.progressChart = Highcharts.chart('progressChart', {
    chart: { 
      type: 'pie',
      backgroundColor: '#FFFFFF',
      style: {
        fontFamily: 'Arial, sans-serif'
      }
    },
    title: {
      text: '',
      floating: true,
      align: 'center',
      verticalAlign: 'middle',
      style: {
        fontSize: '16px'
      }
    },
    subtitle: {
      text: `Your Progress: ${teamName}`,
      align: 'center',
      verticalAlign: 'bottom',
      y: 30,
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#002366' // Navy blue
      }
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: [
            'viewFullscreen',
            'printChart',
            'separator',
            'downloadPNG',
            'downloadJPEG',
            'downloadPDF',
            'downloadSVG'
          ]
        }
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#cccccc',
      style: {
        color: '#333333'
      },
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.y}'
        }
      }
    },
    series: [{
      name: 'Flags',
      colorByPoint: true,
      data: [{
        name: 'Solved',
        y: data.solved,
        color: '#28a745' // Green
      }, {
        name: 'Remaining',
        y: totalFlags - data.solved,
        color: '#dc3545' // Red
      }]
    }],
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          legend: {
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
          }
        }
      }]
    }
  });
}

function initDifficultyChart(data, teamName) {
  window.difficultyChart = Highcharts.chart('difficultyChart', {
    chart: { 
      type: 'column',
      backgroundColor: '#FFFFFF',
      style: {
        fontFamily: 'Arial, sans-serif'
      }
    },
    title: {
      text: '',
      floating: true,
      align: 'center',
      verticalAlign: 'middle',
      style: {
        fontSize: '16px'
      }
    },
    subtitle: {
      text: `Your Difficulty Breakdown: ${teamName}`,
      align: 'center',
      verticalAlign: 'bottom',
      y: 30,
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#002366' // Navy blue
      }
    },
    xAxis: {
      categories: ['Easy', 'Medium'],
      labels: {
        style: {
          color: '#333'
        }
      }
    },
    yAxis: {
      min: 0,
      title: { text: 'Flags Captured' },
      allowDecimals: false,
      stackLabels: {
        enabled: true,
        style: {
          fontWeight: 'bold',
          color: 'gray'
        }
      }
    },
    legend: {
      align: 'right',
      verticalAlign: 'top',
      layout: 'vertical'
    },
    exporting: {
      enabled: true,
      buttons: {
        contextButton: {
          menuItems: [
            'viewFullscreen',
            'printChart',
            'separator',
            'downloadPNG',
            'downloadJPEG',
            'downloadPDF',
            'downloadSVG'
          ]
        }
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#cccccc',
      style: {
        color: '#333333'
      },
      headerFormat: '<b>Difficulty: {point.key}</b><br/>',
      pointFormat: '{series.name}: {point.y}<br/>Total: {point.stackTotal}'
    },
    plotOptions: {
      column: {
        stacking: 'normal',
        dataLabels: {
          enabled: true
        }
      }
    },
    series: [{
      name: 'Solved',
      data: [
        data.easy.solved,
        data.medium.solved
      ],
      color: '#28a745' // Green
    }, {
      name: 'Remaining',
      data: [
        15 - data.easy.solved,   // 15 total Easy flags
        21 - data.medium.solved, // 21 total Medium flags
      ],
      color: '#dc3545' // Red
    }],
    responsive: {
      rules: [{
        condition: {
          maxWidth: 768
        },
        chartOptions: {
          legend: {
            align: 'center',
            verticalAlign: 'bottom',
            layout: 'horizontal'
          }
        }
      }]
    }
  });
}

async function updateProgressAndDifficultyCharts() {
  try {
    const response = await fetch(`${API_BASE_URL}/stats`);
    const stats = await response.json();
    const teamResponse = await fetch(`${API_BASE_URL}/teams`);
    const teams = await teamResponse.json();
    const currentTeam = teams.find(t => t.name === teamName) || { flagCount: 0, flags: [] };
    
    const progressData = {
      solved: currentTeam.flagCount,
      unsolved: 60 - currentTeam.flagCount // Total flags is now 60
    };
    
    const difficultyData = {
      easy: { solved: 0, total: 15 },    // 15 Easy flags
      medium: { solved: 0, total: 21 }  // 21 Medium flags
      //hard: { solved: 0, total: 15 }     // 15 Hard flags
    };
    
    if (currentTeam.flags) {
      currentTeam.flags.forEach(flag => {
        if (flag.difficulty === 'easy') difficultyData.easy.solved++;
        else if (flag.difficulty === 'medium') difficultyData.medium.solved++;
        else if (flag.difficulty === 'hard') difficultyData.hard.solved++;
      });
    }
    
    initProgressChart(progressData, teamName || 'Guest');
    initDifficultyChart(difficultyData, teamName || 'Guest');
  } catch (err) {
    console.error('Error updating charts:', err);
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
    initLeaderboardChart(teams);
  }
});

socket.on('timer', (data) => {
  console.log('Timer update:', data);
  const timerDisplay = document.querySelector('#timer');
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(data.timeLeft);
  }
});

// Clean up interval when leaving page
window.addEventListener('beforeunload', () => {
  if (leaderboardRefreshInterval) {
    clearInterval(leaderboardRefreshInterval);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  startLeaderboardRefresh();
  checkAdminAccess();
  updateTeamName();
  updateLeaderboard();
  updateTimer();
  updateProgressAndDifficultyCharts();

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
    refreshBtn.addEventListener('click', updateProgressAndDifficultyCharts);
  }
});
