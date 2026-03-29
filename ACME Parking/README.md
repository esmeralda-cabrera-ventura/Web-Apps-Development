\# ACME Parking Phase 4

ACME Parking Phase 4 is a browser-based parking lot management web application built with PHP, MySQL, HTML, and CSS and designed to run locally using Apache and MySQL through XAMPP.

This project was developed as a course assignment and demonstrates a fictitious parking garage management system with role-based access, parking operations, valet services, user administration, and training pages with linked instructional videos.

\## Project Type

This project is a web application.

\## Features

\- Secure login with role-based access

\- View parking garage occupancy

\- Record incoming vehicles

\- Record leaving vehicles

\- Manage users and operators

\- Valet check in

\- Valet check out

\- Car wash schedule

\- Training pages for major use cases

\- Linked instructional videos for staff training


\## Technologies Used

\- PHP

\- MySQL / MariaDB

\- HTML

\- CSS

\- Apache

\- XAMPP


\## Development Environment

This project was developed and tested locally in the following environment:

\- Windows

\- XAMPP

\- Apache

\- PHP

\- MariaDB / MySQL

\- phpMyAdmin

\- Microsoft Edge


\## Repository Structure

```text






**Local Setup Instructions**

1\. Install XAMPP. You can download a local copy by visiting https://www.apachefriends.org/download.html

Install XAMPP on your local machine.


2\. Place the project folder in htdocs

Copy the ACME-Parking-Phase-4 folder into your XAMPP htdocs directory.

Example:

C:\\xampp\\htdocs\\ACME-Parking-Phase-4


3\. Start Apache and MySQL

Open the XAMPP Control Panel and start:

Apache

MySQL


4\. Create the database

Open phpMyAdmin and create a database named:

parking\_lot\_db


5\. Import the SQL file

Import the included database file:

parking\_lot\_db\_phase\_4.sql


6\. Run the application

Open your browser and go to:

http://localhost/ACME-Parking-Phase-4/


**Database Configuration**

This project is configured for a local XAMPP environment.

Typical local database settings are:

Host: 127.0.0.1

Database: parking\_lot\_db

Username: root

Password: empty by default in many XAMPP installations

If your local MySQL setup uses different credentials, update the database connection settings in the project accordingly.

**Training Videos**

Training videos are expected in:

assets/videos/

Due to GitHub file size limitations, some larger video files are not included in this repository.

The following large training videos are excluded from the GitHub repository:

manage\_users.mp4

valet\_checkin.mp4

valet\_checkout.mp4


To enable full local playback for those training pages, place the missing .mp4 files into:

ACME-Parking-Phase-4/assets/videos/

Other smaller training videos may be included in the repository if they are within GitHub's allowed size limits.

**Notes:**

This repository contains a local educational copy of the project.

Anyone downloading this repository works on their own separate copy.

Changes made by a viewer do not affect the original project.

This project is intended for local execution, not public production deployment.


Author
Esmeralda Cabrera Ventura


ACME-Parking-Phase-4/

├── assets/

│   ├── css/

│   ├── images/

│   └── videos/

├── auth/

├── includes/

├── training/

├── users/

├── car\_wash\_schedule.php

├── checkin.php

├── checkout.php

├── dashboard.php

├── index.php

├── occupancy.php

├── valet\_checkin.php

├── valet\_checkout.php

├── parking\_lot\_db\_phase\_4.sql

└── README.md
