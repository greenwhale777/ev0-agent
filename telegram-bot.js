/**
 * EV0 Agent - 텔레그램 봇 (양방향 통신)
 * 
 * Railway 환경에서 실행
 */

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 설정
const CONFIG = {
  token: process.env.TELEGRAM_BOT_TOKEN_EV0,
  chatId: process.env.TELEGRAM_CHAT_ID,
  baseDir: process.env.EV_BASE_DIR || process.cwd(),
  logDir: process.env.LOG_DIR || path.join(process.cwd(), 'data', 'logs')
};

// 봇 정의
const BOTS = {
  '올리브영': {
    name: '올리브영 스크래퍼',
    category: 'EV2',
    path: 'EV2-Boosting/oliveyoung-scraper',
    script: 'oliveyoung_orchestrator.js',
    schedule: '매일 08:00',
    lastRun: null,
    status: 'idle'
  },
  '회계': {
    name: '회계전표 자동화',
    category: 'EV3',
    path: 'EV3-Managing/accounting-bot',
    script: 'upload-vouchers.js',
    schedule: '매일 09:00',
    lastRun: null,
    status: 'idle'
  },
  '캐시': {
    name: '캐시 잔액 확인',
    category: 'EV3',
    path: 'EV3-Managing/cash-bot',
    script: 'run-cash-balance-bot.js',
    schedule: '매일 08:00',
    lastRun: null,
    status: 'idle'
  },
  '은행': {
    name: '은행 다운로드',
    category: 'EV3',
    path: 'EV3-Managing/accounting-bot',
    script: 'download-bank-labeling.js',
    schedule: '회계봇 연동',
    lastRun: null,
    status: 'idle'
  },
  '카드': {
    name: '카드 다운로드',
    category: 'EV3',
    path: 'EV3-Managing/accounting-bot',
    script: 'download-card-purchase.js',
    schedule: '회계봇 연동',
    lastRun: null,
    status: 'idle'
  }
};

// 실행 중인 프로세스 추적
const runningProcesses = {};

// 로그 디렉토리 생성
if (!fs.existsSync(CONFIG.logDir)) {
  fs.mkdirSync(CONFIG.logDir, { recursive: true });
}

// 텔레그램 봇 초기화
const bot = new TelegramBot(CONFIG.token, { polling: true });

console.log('='.repeat(50));
console.log('🤖 EV0 Agent 시작...');
console.log('='.repeat(50));
console.log('📱 Chat ID: ' + CONFIG.chatId);
console.log('🔑 Token: ' + (CONFIG.token ? CONFIG.token.slice(0, 10) + '...' : 'NOT SET'));
console.log('📁 Base Dir: ' + CONFIG.baseDir);
console.log('📁 Log Dir: ' + CONFIG.logDir);
console.log('='.repeat(50));

// ========== 유틸리티 함수 ==========

function getKSTDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  return kst;
}

function formatDateTime(date) {
  const d = date || getKSTDate();
  return d.toLocaleString('ko-KR', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function writeLog(botKey, message, type) {
  type = type || 'info';
  const timestamp = formatDateTime();
  const today = getKSTDate().toISOString().slice(0, 10);
  const logFile = path.join(CONFIG.logDir, botKey + '_' + today + '.log');
  const logEntry = '[' + timestamp + '] [' + type.toUpperCase() + '] ' + message + '\n';
  
  fs.appendFileSync(logFile, logEntry);
  console.log(logEntry.trim());
}

function getStatusEmoji(status) {
  switch (status) {
    case 'running': return '🔄';
    case 'error': return '❌';
    case 'success': return '✅';
    default: return '⏸️';
  }
}

// ========== 명령어 핸들러 ==========

// /start, /help - 도움말
bot.onText(/\/(start|help)/, function(msg) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  var helpText = '🤖 EV System Agent\n\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n';
  helpText += '📋 명령어 목록\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n\n';
  helpText += '/status : 모든 봇 상태 확인\n';
  helpText += '/run [봇이름] : 봇 수동 실행\n';
  helpText += '/stop [봇이름] : 실행 중인 봇 중지\n';
  helpText += '/log [봇이름] : 최근 로그 확인\n';
  helpText += '/list : 사용 가능한 봇 목록\n';
  helpText += '/help : 도움말\n\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n';
  helpText += '📦 사용 가능한 봇\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n\n';
  helpText += '• 올리브영 : TOP24 스크래퍼\n';
  helpText += '• 회계 : 회계전표 자동화\n';
  helpText += '• 캐시 : 캐시 잔액 확인\n';
  helpText += '• 은행 : 은행 거래내역 다운로드\n';
  helpText += '• 카드 : 카드 매입내역 다운로드\n\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n';
  helpText += '💡 예시\n';
  helpText += '━━━━━━━━━━━━━━━━━━━━\n\n';
  helpText += '/run 올리브영\n';
  helpText += '/log 회계';
  
  bot.sendMessage(msg.chat.id, helpText);
});

// /status - 전체 상태 확인
bot.onText(/\/status/, function(msg) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  var statusText = '📊 EV System 상태\n';
  statusText += '🕐 ' + formatDateTime() + '\n';
  statusText += '━━━━━━━━━━━━━━━━━━━━\n\n';
  
  // EV2 봇들
  statusText += '📦 EV2 Boosting\n\n';
  for (var key in BOTS) {
    var botInfo = BOTS[key];
    if (botInfo.category === 'EV2') {
      var emoji = getStatusEmoji(botInfo.status);
      var lastRun = botInfo.lastRun ? formatDateTime(botInfo.lastRun) : '없음';
      statusText += emoji + ' ' + botInfo.name + '\n';
      statusText += '   스케줄: ' + botInfo.schedule + '\n';
      statusText += '   마지막: ' + lastRun + '\n\n';
    }
  }
  
  // EV3 봇들
  statusText += '📦 EV3 Managing\n\n';
  for (var key in BOTS) {
    var botInfo = BOTS[key];
    if (botInfo.category === 'EV3') {
      var emoji = getStatusEmoji(botInfo.status);
      var lastRun = botInfo.lastRun ? formatDateTime(botInfo.lastRun) : '없음';
      statusText += emoji + ' ' + botInfo.name + '\n';
      statusText += '   스케줄: ' + botInfo.schedule + '\n';
      statusText += '   마지막: ' + lastRun + '\n\n';
    }
  }
  
  bot.sendMessage(msg.chat.id, statusText);
});

// /list - 봇 목록
bot.onText(/\/list/, function(msg) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  var listText = '📦 사용 가능한 봇 목록\n\n';
  
  for (var key in BOTS) {
    var botInfo = BOTS[key];
    listText += '• ' + key + ' : ' + botInfo.name + '\n';
  }
  
  listText += '\n💡 사용법: /run 봇이름';
  
  bot.sendMessage(msg.chat.id, listText);
});

// /run [봇이름] - 봇 실행
bot.onText(/\/run(?:\s+(.+))?/, function(msg, match) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  var botKey = match[1] ? match[1].trim() : null;
  
  if (!botKey) {
    bot.sendMessage(msg.chat.id, '❓ 실행할 봇 이름을 입력하세요.\n예: /run 올리브영');
    return;
  }
  
  var botInfo = BOTS[botKey];
  
  if (!botInfo) {
    bot.sendMessage(msg.chat.id, '❌ 알 수 없는 봇: ' + botKey + '\n\n사용 가능: ' + Object.keys(BOTS).join(', '));
    return;
  }
  
  if (botInfo.status === 'running') {
    bot.sendMessage(msg.chat.id, '⚠️ ' + botInfo.name + ' 이미 실행 중입니다.');
    return;
  }
  
  // Railway 환경에서는 봇 실행 기능 비활성화
  bot.sendMessage(msg.chat.id, '⚠️ Railway 환경에서는 봇 실행이 제한됩니다.\n로컬 환경에서 실행해주세요.');
});

// /stop [봇이름] - 봇 중지
bot.onText(/\/stop(?:\s+(.+))?/, function(msg, match) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  bot.sendMessage(msg.chat.id, '⚠️ Railway 환경에서는 봇 중지가 제한됩니다.');
});

// /log [봇이름] - 로그 확인
bot.onText(/\/log(?:\s+(.+))?/, function(msg, match) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  
  var botKey = match[1] ? match[1].trim() : null;
  
  if (!botKey) {
    bot.sendMessage(msg.chat.id, '❓ 로그를 확인할 봇 이름을 입력하세요.\n예: /log 올리브영');
    return;
  }
  
  var botInfo = BOTS[botKey];
  
  if (!botInfo) {
    bot.sendMessage(msg.chat.id, '❌ 알 수 없는 봇: ' + botKey);
    return;
  }
  
  // 오늘 로그 파일 찾기
  var today = getKSTDate().toISOString().slice(0, 10);
  var logFile = path.join(CONFIG.logDir, botKey + '_' + today + '.log');
  
  if (!fs.existsSync(logFile)) {
    bot.sendMessage(msg.chat.id, '📋 ' + botInfo.name + ' 오늘 로그 없음');
    return;
  }
  
  try {
    var logContent = fs.readFileSync(logFile, 'utf-8');
    var lines = logContent.trim().split('\n');
    var recentLines = lines.slice(-15).join('\n'); // 최근 15줄
    
    bot.sendMessage(msg.chat.id, '📋 ' + botInfo.name + ' 최근 로그\n\n' + recentLines);
  } catch (error) {
    bot.sendMessage(msg.chat.id, '❌ 로그 읽기 실패: ' + error.message);
  }
});

// 알 수 없는 명령어
bot.on('message', function(msg) {
  if (msg.chat.id.toString() !== CONFIG.chatId) return;
  if (msg.text && msg.text.startsWith('/') && !msg.text.match(/^\/(start|help|status|list|run|stop|log)/)) {
    bot.sendMessage(msg.chat.id, '❓ 알 수 없는 명령어입니다.\n/help 로 사용법을 확인하세요.');
  }
});

// 에러 핸들링
bot.on('polling_error', function(error) {
  console.log('⚠️ Polling error:', error.code);
});

// 시작 메시지
if (CONFIG.token && CONFIG.chatId) {
  bot.sendMessage(CONFIG.chatId, 
    '🤖 EV0 Agent 시작됨 (Railway)\n\n' +
    '🕐 ' + formatDateTime() + '\n' +
    '📱 /help 로 사용법 확인'
  ).then(function() {
    console.log('✅ 시작 메시지 전송 완료');
  }).catch(function(err) {
    console.log('❌ 시작 메시지 전송 실패:', err.message);
  });
}

console.log('✅ EV0 Agent 준비 완료');
console.log('📱 텔레그램에서 /help를 입력하세요');
