#!/bin/zsh
# Runs the site checks. Double-click in Finder to see the result.

cd "$(dirname "$0")" || exit 1

python3 tools/check_site.py
status=$?

echo ""
if [ "$status" -eq 0 ]; then
  echo "Проверка пройдена."
else
  echo "Есть ошибки — смотрите выше."
fi
echo "Нажмите Enter, чтобы закрыть окно."
read -r
exit "$status"
