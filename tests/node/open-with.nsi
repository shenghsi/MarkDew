Unicode true
Name "MarkDew Open With compile check"
OutFile "${OUTPUT}"
InstallDir "$LOCALAPPDATA\MarkDew check"
RequestExecutionLevel user
!include "LogicLib.nsh"
!define MAINBINARYNAME "markdew-desktop"
!include "${HOOK}"
Section
  SetShellVarContext current
  !insertmacro NSIS_HOOK_POSTINSTALL
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  !insertmacro NSIS_HOOK_POSTUNINSTALL
SectionEnd
