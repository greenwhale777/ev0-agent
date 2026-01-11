# EV0 Agent

EV0 Agent는 ASCENDERZ EV System의 중앙 관리 시스템입니다.

## 주요 기능

- 🤖 **텔레그램 봇**: 명령어를 통한 봇 제어 및 모니터링
- 📊 **API 서버**: 대시보드에 데이터 제공
- 📈 **실행 로그**: 모든 봇의 실행 이력 추적

## 구성 요소

### 1. API Server (`ev0-api-server.js`)
- 포트: 3001 (환경변수로 변경 가능)
- 엔드포인트:
  - `GET /api/logs` - 모든 실행 로그
  - `GET /api/logs/:botId` - 특정 봇 로그
  - `GET /api/status` - 봇 상태
  - `GET /api/health` - 헬스체크

### 2. Telegram Bot (`telegram-bot.js`)
- 명령어:
  - `/status` - 봇 상태 확인
  - `/list` - 사용 가능한 봇 목록
  - `/log [봇이름]` - 로그 확인
  - `/help` - 도움말

## 환경변수

```env
# 텔레그램
TELEGRAM_BOT_TOKEN_EV0=your_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# 서버
PORT=3001
NODE_ENV=production

# 경로
LOG_PATH=/app/data/logs/execution-history.json
LOG_DIR=/app/data/logs
```

## Railway 배포

1. GitHub 저장소 연결
2. 환경변수 설정
3. 자동 배포

## 로컬 실행

```bash
npm install
node ev0-api-server.js
```

별도 터미널에서:
```bash
node telegram-bot.js
```

## 개발자

- **Company**: Ascenderz Inc.
- **Product**: THE AUDIT
- **System**: EV System
