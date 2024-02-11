# <img src="https://i.imgur.com/QShZWua.png" alt="logo" width=20> Neptun mark my professor ratings

[![Add to tampermonkey](https://img.shields.io/badge/add%20to-tampermonkey-green)](https://github.com/UnicodeError0041/neptun-mark-my-professor-ratings/raw/main/neptun_mark_my_profesor_ratings.user.js)

Shows lecturer ratings in Neptun from [www.markmyprofessor.com](https://www.markmyprofessor.com)

![demo](demo.png)

The names become links to the relevant rating pages.

## Getting started

### Install

1. Download the [TamperMonkey](https://tampermonkey.net) extension for your browser

2. Download this script by clicking the _Add to tampermonkey_ badge at the top

### Setup

Unfortunately, multiple people can have the same name, which can lead to confusion and the wrong rating getting displayed. Therefore, the script needs to know the relevant universities and the relevant departments.

1. After you downloaded the script, click [here]("https://www.markmyprofessor.com/en/schools").

![school selection page](school_page.png)

2. Find your school(s) and click it.

3. Select the relevant departments. The script will only look for lecturers in the selected departments (and lecturers with no departments).

![department selection page](department_page.png)

4. Order the selected departments. If two lecturers from two different departments happen to have the same name, the script will know which one to prefer.

If any time you want to change the department settings, click the _Select departments_ menu under this script.

![menu](department_select_menu.png)

Sometimes the script finds the wrong person. If you want to make sure, click the name of the lecturer to see their rating page.
