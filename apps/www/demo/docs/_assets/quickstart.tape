# Synthetic media fixture, independent of any CLI or application.
# From the repository root, run `vhs apps/www/demo/docs/_assets/quickstart.tape`
# or mount the root at /vhs in the vhs-demo renderer and pass this tape path.
Output apps/www/demo/docs/_assets/quickstart.gif

Set FontSize 16
Set Width 640
Set Height 360
Set Padding 16
Set Framerate 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 55ms

Hide
Type "printf 'Documentation media fixture verified\n'"
Enter
Sleep 2.5s
Show
Sleep 1.8s
Sleep 1.5s
