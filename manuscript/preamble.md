# LaTeX preamble

```latex
\usepackage[margin=18mm]{geometry}
\usepackage{fontspec}
\usepackage{unicode-math}
\setmainfont{lmroman10-regular.otf}[BoldFont=lmroman10-bold.otf,ItalicFont=lmroman10-italic.otf,BoldItalicFont=lmroman10-bolditalic.otf]
\setsansfont{lmsans10-regular.otf}[BoldFont=lmsans10-bold.otf,ItalicFont=lmsans10-oblique.otf,BoldItalicFont=lmsans10-boldoblique.otf]
\setmonofont{lmmono10-regular.otf}[ItalicFont=lmmono10-italic.otf]
\setmathfont{latinmodern-math.otf}
\usepackage{microtype}
\usepackage{booktabs}
\usepackage{listings}
\lstset{basicstyle=\ttfamily\small,breaklines=true,columns=fullflexible}
\newtheorem{theorem}{Theorem}[section]
\newtheorem{remark}[theorem]{Remark}
\newtheorem{example}[theorem]{Example}
\setlength{\emergencystretch}{3em}
\definecolor{BattleshipLink}{HTML}{A61B1B}
\hypersetup{colorlinks=true,linkcolor=BattleshipLink,citecolor=BattleshipLink,urlcolor=BattleshipLink,filecolor=BattleshipLink,anchorcolor=BattleshipLink}
\input{../../manuscript/frontmatter.tex}
```
