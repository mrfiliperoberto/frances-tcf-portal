Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)
AppDir = FSO.GetParentFolderName(ScriptDir)

DesktopDir = WshShell.SpecialFolders("Desktop")
StartupDir = WshShell.SpecialFolders("Startup")

' 1. Atalho na Area de Trabalho
Set Shortcut1 = WshShell.CreateShortcut(DesktopDir & "\Do Zero ao Canada.lnk")
Shortcut1.TargetPath = AppDir & "\DoZeroAoCanada.exe"
Shortcut1.WorkingDirectory = AppDir
Shortcut1.IconLocation = AppDir & "\public\icons\app.ico"
Shortcut1.Description = "Portal de Frances A1-B2 e Simulador TCF Canada"
Shortcut1.Save

' 2. Atalho invisivel na Inicializacao do Windows (Startup)
Set Shortcut2 = WshShell.CreateShortcut(StartupDir & "\DoZeroAoCanada-Background.lnk")
Shortcut2.TargetPath = AppDir & "\DoZeroAoCanada.exe"
Shortcut2.Arguments = "--background-only"
Shortcut2.WorkingDirectory = AppDir
Shortcut2.IconLocation = AppDir & "\public\icons\app.ico"
Shortcut2.Description = "Servidor Local Invisivel - Do Zero ao Canada"
Shortcut2.Save

WScript.Echo "   -> Atalho criado em: " & DesktopDir & "\Do Zero ao Canada.lnk"
WScript.Echo "   -> Startup configurado em: " & StartupDir & "\DoZeroAoCanada-Background.lnk"

