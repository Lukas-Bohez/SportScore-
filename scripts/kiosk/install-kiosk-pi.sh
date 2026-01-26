#!/usr/bin/env bash
set -euo pipefail

# install-kiosk-pi.sh
# Install SportScore kiosk on Raspberry Pi (system-level instance service + autologin via LightDM)
# Usage: sudo ./install-kiosk-pi.sh [username]

USER_NAME="${1:-pi}"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing SportScore kiosk for user: $USER_NAME"

# 1) Copy wrapper to user's local bin
mkdir -p "/home/$USER_NAME/.local/bin"
cp "$REPO_DIR/start-kiosk.sh" "/home/$USER_NAME/.local/bin/start-kiosk.sh"
chown $USER_NAME:$USER_NAME "/home/$USER_NAME/.local/bin/start-kiosk.sh"
chmod +x "/home/$USER_NAME/.local/bin/start-kiosk.sh"

# Prevent GNOME Keyring autostart for the kiosk user (avoids password prompt on autologin)
# We create overrides in the user's ~/.config/autostart to hide the keyring autostarters.
USER_AUTOSTART_DIR="/home/$USER_NAME/.config/autostart"
mkdir -p "$USER_AUTOSTART_DIR"
for f in gnome-keyring-pkcs11.desktop gnome-keyring-secrets.desktop gnome-keyring-ssh.desktop; do
  cat >"$USER_AUTOSTART_DIR/$f" <<EOF
[Desktop Entry]
Hidden=true
X-GNOME-Autostart-enabled=false
EOF
  chown $USER_NAME:$USER_NAME "$USER_AUTOSTART_DIR/$f"
done

# 2) Install templated system service
cp "$REPO_DIR/sportscore-kiosk@.service" /etc/systemd/system/sportscore-kiosk@.service
systemctl daemon-reload
systemctl enable --now "sportscore-kiosk@$USER_NAME.service"

# 3) Configure display manager autologin (LightDM, GDM, SDDM, LXDM)
echo "Detecting display manager to configure autologin..."
DM_CONFIGURED=0

# LightDM
if [ -d /etc/lightdm ]; then
  echo "Configuring LightDM autologin for user $USER_NAME"
  mkdir -p /etc/lightdm/lightdm.conf.d
  cat >/etc/lightdm/lightdm.conf.d/50-autologin.conf <<EOF
[Seat:*]
autologin-user=$USER_NAME
autologin-user-timeout=0
EOF
  DM_CONFIGURED=1
  echo "LightDM autologin configured"
fi

# GDM (gdm3)
if [ -d /etc/gdm3 ] || command -v gdm3 >/dev/null 2>&1; then
  echo "Configuring GDM autologin for user $USER_NAME"
  mkdir -p /etc/gdm3
  # Append or replace AutomaticLogin settings in /etc/gdm3/custom.conf
  if [ -f /etc/gdm3/custom.conf ] && grep -q "AutomaticLogin" /etc/gdm3/custom.conf 2>/dev/null; then
    sed -i "s/^AutomaticLoginEnable=.*/AutomaticLoginEnable=True/" /etc/gdm3/custom.conf || true
    sed -i "s/^AutomaticLogin=.*/AutomaticLogin=$USER_NAME/" /etc/gdm3/custom.conf || true
  else
    cat >>/etc/gdm3/custom.conf <<EOF
[daemon]
AutomaticLoginEnable=True
AutomaticLogin=$USER_NAME
EOF
  fi
  DM_CONFIGURED=1
  echo "GDM autologin configured"
fi

# SDDM
if [ -d /etc/sddm.conf.d ] || command -v sddm >/dev/null 2>&1; then
  echo "Configuring SDDM autologin for user $USER_NAME"
  mkdir -p /etc/sddm.conf.d
  cat >/etc/sddm.conf.d/50-autologin.conf <<EOF
[Autologin]
User=$USER_NAME
EOF
  DM_CONFIGURED=1
  echo "SDDM autologin configured"
fi

# LXDM
if [ -d /etc/lxdm ] || command -v lxdm >/dev/null 2>&1; then
  echo "Configuring LXDM autologin for user $USER_NAME"
  mkdir -p /etc/lxdm
  if [ -f /etc/lxdm/lxdm.conf ]; then
    sed -i "s/^autologin=.*/autologin=$USER_NAME/" /etc/lxdm/lxdm.conf || echo "autologin=$USER_NAME" >> /etc/lxdm/lxdm.conf
  else
    cat >/etc/lxdm/lxdm.conf <<EOF
[base]
autologin=$USER_NAME
EOF
  fi
  DM_CONFIGURED=1
  echo "LXDM autologin configured"
fi

if [ $DM_CONFIGURED -eq 0 ]; then
  echo "No supported display manager config found. Please enable autologin for user $USER_NAME via your DM's config."
fi

# 4) Info
echo "Installation complete. Check service status:" 
echo "  sudo systemctl status sportscore-kiosk@$USER_NAME.service"
echo "View logs: sudo journalctl -u sportscore-kiosk@$USER_NAME -b --no-pager"
