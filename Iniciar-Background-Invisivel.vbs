Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
AppDir = FSO.GetParentFolderName(WScript.ScriptFullName)
ExePath = AppDir & "\DoZeroAoCanada.exe"

If FSO.FileExists(ExePath) Then
    WshShell.Run """" & ExePath & """ --background-only", 0, False
Else
    WshShell.CurrentDirectory = AppDir
    WshShell.Run "node """ & AppDir & "\server-local.cjs""", 0, False
End If

