# todos:
1. The application name (shown in the pages header) should be configurable from the admin panel.  Right now it says "Pool Tables Manager (Demo)" regardless of what is configured in "Application Name" in the admin settings panel.
2. The app should have a publicly accesible page that shows all the tables and if they are currently occupied or not. NO password should be required to access this page and it should update live as tables are used or freed.
3. Each table should keep track of the total time they were used.  In the admin panel, for each table type, the admin should be able to set a max used time in hours. When the table used time exceeds this max time, then on the dashboard, the table should have a warning indicating it needs to go into maintenance.
4. An admin should be able to configure SMTP settings in the admin panel.  Reports should have a "send" button that then queries for an email address to send the report to (in either html or pdf format).  In addition, table maintenance alerts should be configurable to be sent to a specific email address.
5. When in dark mode, sections and boxes can clearly be seen, but in drop down list, the text is not readable (light grey text on white background).  When in light mode, the input bowes and different sections of the UI are barely visible. We need to fix this.

# future: