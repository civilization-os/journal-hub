!macro customInit
  nsProcess::_FindProcess "Journal Hub.exe"
  Pop $R0
  ${If} $R0 == 0
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "Journal Hub 正在后台运行中。点击“确定”自动关闭程序并继续安装，或点击“取消”中断安装。" IDOK closeApp IDCANCEL cancelInstall
    closeApp:
      ExecWait 'taskkill /F /IM "Journal Hub.exe" /T'
      Sleep 1000
      Goto done
    cancelInstall:
      Quit
    done:
  ${EndIf}
!macroend
