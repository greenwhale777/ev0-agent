/**
 * EV0 API Server
 * 대시보드에서 로그 데이터를 가져갈 수 있도록 API 제공
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// Railway 환경에서 포트 설정
const PORT = process.env.PORT || 3001;

// CORS 설정 (대시보드에서 접근 허용)
app.use(cors());
app.use(express.json());

// 로그 파일 경로 (Railway 환경 대응)
const LOG_PATH = process.env.LOG_PATH || path.join(__dirname, 'data', 'logs', 'execution-history.json');

// 로그 디렉토리 생성 (없으면)
const logDir = path.dirname(LOG_PATH);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

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
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 EV0 API Server running on port ${PORT}`);
  console.log(`📊 로그 API: /api/logs`);
  console.log(`📈 상태 API: /api/status`);
  console.log(`💚 Health Check: /api/health`);
  console.log(`📁 Log Path: ${LOG_PATH}`);
});
