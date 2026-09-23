#!/bin/bash
#
# qvnet — which network am I on, campus or dorm?
#
#   ./qvnet.sh              show current IP and which saved network it matches
#   ./qvnet.sh save campus  remember this network's IP range as "campus"
#   ./qvnet.sh save dorm    remember this network's IP range as "dorm"
#   ./qvnet.sh list         show every saved network, active or not
#
# macOS hides the actual Wi-Fi name from scripts (a privacy protection), so
# this identifies a network by its IP's first three numbers instead -- e.g.
# 192.168.8.x. That is stable for as long as a router keeps the same range,
# which is true for both campus and dorm routers in practice.

STORE="$HOME/.qvnet-networks"
touch "$STORE"

current_ip() { ipconfig getifaddr en0 2>/dev/null; }
prefix_of() { echo "$1" | awk -F. '{print $1"."$2"."$3}'; }

ip="$(current_ip)"
if [ -z "$ip" ]; then
  echo "Not connected to Wi-Fi."
  exit 1
fi
prefix="$(prefix_of "$ip")"

case "${1:-}" in
  save)
    name="${2:?usage: qvnet save <name>, e.g. qvnet save campus}"
    grep -v "^$name " "$STORE" > "$STORE.tmp" 2>/dev/null; mv "$STORE.tmp" "$STORE"
    echo "$name $prefix" >> "$STORE"
    echo "Saved: $name = $prefix.x  (this Mac's IP right now: $ip)"
    ;;
  list)
    echo "Current IP: $ip  ($prefix.x)"
    echo
    if [ ! -s "$STORE" ]; then
      echo "No networks saved yet. Run: qvnet save campus   (while on campus Wi-Fi)"
      exit 0
    fi
    while read -r name saved_prefix; do
      [ -z "$name" ] && continue
      if [ "$saved_prefix" = "$prefix" ]; then
        printf "  \033[32m●active    \033[0m %-10s %s.x\n" "$name" "$saved_prefix"
      else
        printf "  ○non-active %-10s %s.x\n" "$name" "$saved_prefix"
      fi
    done < "$STORE"
    ;;
  ""|status)
    if [ ! -s "$STORE" ]; then
      echo "Current IP: $ip  ($prefix.x) — not yet named."
      echo "Run: qvnet save campus   (or dorm) while on that network to name it."
      exit 0
    fi
    match="$(awk -v p="$prefix" '$2==p {print $1}' "$STORE")"
    if [ -n "$match" ]; then
      echo "You are on: $match  ($ip)"
    else
      echo "Unrecognized network: $ip  ($prefix.x) — not campus or dorm."
      echo "Run: qvnet save <name> to remember this one."
    fi
    ;;
  *)
    echo "usage: qvnet [status|list|save <name>]"
    exit 1
    ;;
esac
