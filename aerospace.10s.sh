#!/bin/bash
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>
# <swiftbar.hideLastUpdated>true</swiftbar.hideLastUpdated>
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
export PATH="/opt/homebrew/bin:$PATH"
export ICONS=mono   # mono = grayscale icons, color = original app colors
here="$(cd "$(dirname "$0")" && pwd)"
renderer="$here/.render-bar.js"
png="${TMPDIR:-/tmp}/aerospace-bar.png"

# The menu bar text color follows the wallpaper, not light/dark mode; white + shadow reads on both
mode=dark

focused=$(aerospace list-workspaces --focused)
workspaces=$(aerospace list-workspaces --monitor all --empty no)

args=()
for ws in $workspaces; do
  if [ "$ws" = "$focused" ]; then args+=("@*$ws"); else args+=("@$ws"); fi
  while read -r id; do [ -n "$id" ] && args+=("$id"); done \
    < <(aerospace list-windows --workspace "$ws" --format '%{app-bundle-id}' | awk '!seen[$0]++')
done

osascript -l JavaScript "$renderer" "$png" "$mode" "${args[@]}" >/dev/null
echo " | image=$(base64 -i "$png")"
echo "---"
for ws in $workspaces; do
  apps=$(aerospace list-windows --workspace "$ws" --format '%{app-name}' | awk '!seen[$0]++' | paste -sd ',' - | sed 's/,/, /g')
  echo "$ws: $apps | bash=$(command -v aerospace) param1=workspace param2=$ws terminal=false"
done
