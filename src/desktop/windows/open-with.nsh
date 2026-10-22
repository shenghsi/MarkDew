; Offer MarkDew in Open With. Never set an extension's default application.
; SHCTX follows the installer's current-user/all-users scope.
!define MARKDEW_PROGID "dev.markdew.editor.Markdown"
!define MARKDEW_COMMAND '$\"$INSTDIR\${MAINBINARYNAME}.exe$\" $\"%1$\"'

!macro NSIS_HOOK_POSTINSTALL
  WriteRegStr SHCTX "Software\Classes\${MARKDEW_PROGID}" "" "MarkDew document"
  WriteRegStr SHCTX "Software\Classes\${MARKDEW_PROGID}\DefaultIcon" "" '$\"$INSTDIR\${MAINBINARYNAME}.exe$\",0'
  WriteRegStr SHCTX "Software\Classes\${MARKDEW_PROGID}\shell\open\command" "" '${MARKDEW_COMMAND}'
  WriteRegStr SHCTX "Software\Classes\.md\OpenWithProgids" "${MARKDEW_PROGID}" ""
  WriteRegStr SHCTX "Software\Classes\.markdown\OpenWithProgids" "${MARKDEW_PROGID}" ""
  WriteRegStr SHCTX "Software\Classes\.txt\OpenWithProgids" "${MARKDEW_PROGID}" ""
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; A newer installation can own this ProgID. Keep its registration intact.
  ReadRegStr $R7 SHCTX "Software\Classes\${MARKDEW_PROGID}\shell\open\command" ""
  ${If} $R7 == '${MARKDEW_COMMAND}'
    DeleteRegValue SHCTX "Software\Classes\.md\OpenWithProgids" "${MARKDEW_PROGID}"
    DeleteRegValue SHCTX "Software\Classes\.markdown\OpenWithProgids" "${MARKDEW_PROGID}"
    DeleteRegValue SHCTX "Software\Classes\.txt\OpenWithProgids" "${MARKDEW_PROGID}"
    DeleteRegValue SHCTX "Software\Classes\${MARKDEW_PROGID}\shell\open\command" ""
    DeleteRegValue SHCTX "Software\Classes\${MARKDEW_PROGID}\DefaultIcon" ""
    DeleteRegValue SHCTX "Software\Classes\${MARKDEW_PROGID}" ""
    DeleteRegKey /ifempty SHCTX "Software\Classes\${MARKDEW_PROGID}\shell\open\command"
    DeleteRegKey /ifempty SHCTX "Software\Classes\${MARKDEW_PROGID}\shell\open"
    DeleteRegKey /ifempty SHCTX "Software\Classes\${MARKDEW_PROGID}\shell"
    DeleteRegKey /ifempty SHCTX "Software\Classes\${MARKDEW_PROGID}\DefaultIcon"
    DeleteRegKey /ifempty SHCTX "Software\Classes\${MARKDEW_PROGID}"
  ${EndIf}
!macroend
