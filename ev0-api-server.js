/**
 * EV0 API Server
 * 대시보드에서 로그 데이터를 가져갈 수 있도록 API 제공
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Railway 환경 대응: 동적 포트
const PORT = process.env.PORT || 3001;

// CORS 설정 (대시보드에서 접근 허용)
app.use(cors());
app.use(express.json());

// 로그 파일 경로 - 환경에 따라 자동 전환
const LOG_PATH = process.env.LOG_PATH || path.join(__dirname, 'data', 'logs', 'execution-history.json');

/**
 * GET /api/logs
 * 실행 로그 조회
 */
app.get('/api/logs', (req, res) => {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      return res.json([]);
    }
    
    let content = fs.readFileSync(LOG_PATH, 'utf8');
    // BOM 제거
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    const logs = JSON.parse(content);
    res.json(logs);
    
  } catch (e) {
    console.error('로그 조회 실패:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/logs
 * 봇 실행 로그 추가
 */
app.post('/api/logs', (req, res) => {
  try {
    const logEntry = req.body;
    
    // 로그 파일 읽기
    let logs = [];
    if (fs.existsSync(LOG_PATH)) {
      let content = fs.readFileSync(LOG_PATH, 'utf8');
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      logs = JSON.parse(content);
    }
    
    // 새 로그 추가 (최신이 맨 앞)
    logs.unshift(logEntry);
    
    // 최대 1000개 유지
    if (logs.length > 1000) {
      logs = logs.slice(0, 1000);
    }
    
    // 로그 파일 쓰기
    const logDir = path.dirname(LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2), 'utf8');
    
    console.log(`📝 Log added: ${logEntry.botName} - ${logEntry.status}`);
    res.json({ success: true, message: 'Log added' });
    
  } catch (e) {
    console.error('로그 추가 실패:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/logs/:botId
 * 특정 봇의 로그만 조회
 */
app.get('/api/logs/:botId', (req, res) => {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      return res.json([]);
    }
    
    let content = fs.readFileSync(LOG_PATH, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    const logs = JSON.parse(content);
    const filtered = logs.filter(log => log.botId === req.params.botId);
    res.json(filtered);
    
  } catch (e) {
    console.error('로그 조회 실패:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/status
 * 각 봇의 최신 상태 조회
 */
app.get('/api/status', (req, res) => {
  try {
    if (!fs.existsSync(LOG_PATH)) {
      return res.json({});
    }
    
    let content = fs.readFileSync(LOG_PATH, 'utf8');
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.slice(1);
    }
    
    const logs = JSON.parse(content);
    
    // 각 봇의 최신 로그만 추출
    const status = {};
    for (const log of logs) {
      if (!status[log.botId]) {
        status[log.botId] = log;
      }
    }
    
    res.json(status);
    
  } catch (e) {
    console.error('상태 조회 실패:', e.message);
    res.status(500).json({ error: e.message });
  }
});

/**
 * GET /api/health
 * 서버 상태 확인
 */
app.get('/api/health', (req, res) => {
  const env = process.env.NODE_ENV || 'development';
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: env
  });
});

// 서버 시작 - Railway 환경 대응 (0.0.0.0으로 바인딩)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EV0 API Server running on port ${PORT}`);
  console.log(`📊 로그 API: /api/logs`);
  console.log(`📈 상태 API: /api/status`);
  console.log(`💚 Health Check: /api/health`);
  
  // 텔레그램 봇 시작
  console.log('📱 Starting Telegram bot...');
  try {
    require('./telegram-bot.js');
    console.log('✅ Telegram bot started successfully');
  } catch (error) {
    console.error('❌ Failed to start Telegram bot:', error.message);
  }
});
