# Demo script (about 2.5 minutes)

Before recording: start the app, run the seed script, and log out. Record the browser window at 1280×800 or larger (any screen recorder works; Loom or OBS are both fine).

| Time | What to show | What to say |
| --- | --- | --- |
| 0:00 | Open the login page. Try a wrong password, then click **Create an account** and submit an empty form. | "Sweety tracks blood glucose. Authentication uses JWT and bcrypt, and errors are clear." |
| 0:20 | Register a new user (for example `you@example.com`). | "A new account starts with friendly empty states." Point at the empty reports. |
| 0:35 | Add a morning reading of `39`, then `120.5`, then leave it empty. | "Validation runs in the browser and again in the API: whole number from 40 to 600, value required." |
| 0:55 | Add a valid morning reading (`100`). Add `after breakfast` = `160`. Try `morning` again. | "Only one reading per slot per day, enforced by a database unique constraint as well." |
| 1:15 | Add after lunch and after dinner, then try a fifth reading. Pick a date in the future (type it, since the picker blocks it). | "A day holds at most 4 readings, and the future date is rejected." Show the daily report numbers updating. |
| 1:35 | Click **Edit** on a reading, change the value, save. Then edit one onto a slot that is already used. | "Editing does not count the reading against itself, but still blocks real duplicates." |
| 1:55 | Delete a reading (show the confirmation). | "Delete asks first and updates every report." |
| 2:05 | Log out, log in as `demo@sweety.app` / `Demo@1234`. Change the **Report date**. | Show daily, month-to-date and previous-month reports, the chart for the month, and move through history pages. "Every query is scoped to the user in the token, so users never see each other's data." |
| 2:30 | Briefly open the repo: `backend/tests`, `docker-compose.yml`. Resize the window to show the mobile layout. | "87 backend tests and 26 frontend tests, a Docker Compose setup, and a responsive layout." |

Tip: have the README's validation table open in another tab in case you want to point at the rules.
