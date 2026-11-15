#!/bin/zsh
# Запускает локальный сервер для сайта «Дари · Аудирование».
# Дважды щёлкните этот файл в Finder. Остановка — Ctrl+C.

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "Не найден python3. Установите Python 3 с https://www.python.org/downloads/"
  echo "Нажмите Enter, чтобы закрыть окно."
  read -r
  exit 1
fi

PORT=8080
while lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  if curl -fsS "http://localhost:$PORT/" 2>/dev/null | grep -q "Дари · Аудирование"; then
    echo "Сайт уже запущен: http://localhost:$PORT"
    open "http://localhost:$PORT"
    echo "Сервер работает в другом окне. Это окно можно закрыть."
    exit 0
  fi
  PORT=$((PORT + 1))
  if [ "$PORT" -gt 8090 ]; then
    echo "Не удалось найти свободный порт с 8080 по 8090."
    echo "Нажмите Enter, чтобы закрыть окно."
    read -r
    exit 1
  fi
done

echo "Запускаю «Дари · Аудирование» на http://localhost:$PORT"
python3 -m http.server "$PORT" >/dev/null 2>&1 &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

sleep 1
open "http://localhost:$PORT"

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || true)
if [ -z "$LAN_IP" ]; then
  LAN_IP=$(ipconfig getifaddr en1 2>/dev/null || true)
fi

echo ""
echo "Локальный адрес: http://localhost:$PORT"
if [ -n "$LAN_IP" ]; then
  echo "В той же Wi-Fi-сети: http://$LAN_IP:$PORT"
fi
echo ""
echo "Сервер работает. Чтобы остановить его, нажмите Ctrl+C."
echo ""

wait "$SERVER_PID"
