const socket = io('https://ctf-websocket-g3l9.onrender.com'); 
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
  const successTeamName = successMessage.querySelector('.team-name');
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
      if (successTeamName) {
        successTeamName.textContent = teamName;
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
    yAxis: {
      min: 0,
      title: { text: 'Points' },
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
      y: 20,
      style: {
        fontSize: '14px',
        fontWeight: 'bold'
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
        color: '#28a745'
      }, {
        name: 'Unsolved',
        y: data.unsolved,
        color: '#dc3545'
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
      y: 20,
      style: {
        fontSize: '14px',
        fontWeight: 'bold'
      }
    },
    xAxis: {
      categories: ['Easy', 'Medium', 'Hard'],
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
        data.medium.solved,
        data.hard.solved
      ],
      color: '#28a745'
    }, {
      name: 'Remaining',
      data: [
        data.easy.total - data.easy.solved,
        data.medium.total - data.medium.solved,
        data.hard.total - data.hard.solved
      ],
      color: '#dc3545'
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
      unsolved: 30 - currentTeam.flagCount // Total flags from index.html
    };
    
    const difficultyData = {
      easy: { solved: 0, total: stats.easy },
      medium: { solved: 0, total: stats.medium },
      hard: { solved: 0, total: stats.hard }
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

document.addEventListener('DOMContentLoaded', () => {
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
