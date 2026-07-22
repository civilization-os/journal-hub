!macro customInit
  SetDetailsView show
  nsProcess::_FindProcess "Journal Hub.exe"
  Pop $R0
  ${If} $R0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Journal Hub is currently running. Click OK to close it and continue installation, or Cancel to abort." IDOK closeApp IDCANCEL cancelInstall
    closeApp:
      ExecWait 'taskkill /F /IM "Journal Hub.exe" /T'
      Sleep 1000
      Goto done
    cancelInstall:
      Quit
    done:
  ${EndIf}
!macroend
