' Clickable silent launcher: runs launch-chart-debug.bat with no console window.
' Double-click this (or its Desktop shortcut) before asking Claude about the
' live chart. Starts a debug Chrome on port 9222 + opens the Turtle chart.
Set oShell = CreateObject("WScript.Shell")
Set oFso = CreateObject("Scripting.FileSystemObject")
sBat = oFso.BuildPath(oFso.GetParentFolderName(WScript.ScriptFullName), "launch-chart-debug.bat")
oShell.Run """" & sBat & """", 0, False
