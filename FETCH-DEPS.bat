@echo off
title All Ready Coffee - fetching packages
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fetch-deps.ps1"
