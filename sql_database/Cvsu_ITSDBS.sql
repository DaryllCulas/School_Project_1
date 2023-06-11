CREATE DATABASE Cvsu_ITS;

/* IT student Table */
CREATE TABLE ITstudent (
    studentID INT IDENTITY(2023001,1) PRIMARY KEY,
    studentFirstName VARCHAR(255) NOT NULL,
    studentLastName VARCHAR(255) NOT NULL,
    YearLevelAndSection VARCHAR(255) NOT NULL,
    studentEmail VARCHAR(255) NOT NULL,     
    studentPassword VARCHAR(255) NOT NULL
);

SELECT * FROM ITstudent;

INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'Daryll','Culas', 
    'BSIT 3-3','coolastthereal99@gmail.com',
    'Iamdaryll9'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'Tanjiro','Kamado', 
    'BSIT 2-1','tanjirokamado01@gmail.com',
    'demonslayer01'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'Nezuko','Kamado', 
    'BSIT 2-4','nezukokamado01@gmail.com',
    'demonslayer02'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'giyuu','tomioka', 
    'BSIT 1-5','giyutomioka03@gmail.com',
    'demonslayer03'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'Tengen','Uzui', 
    'BSIT 4-1','tengenuzui11@gmail.com',
    'demonslayer04'
);


INSERT INTO ITstudent(
     studentFirstName,studentLastName,
     YearLevelAndSection,studentEmail,
     studentPassword
)VALUES(
    'Tiburcio','Kanor', 
    'BSIT 3-2','tiburciokanor69@gmail.com',
    'demonslayer05'
);


/* Admin Faculty Table */

CREATE TABLE AdminFaculty(
    facultyID INT IDENTITY(2023001,5) PRIMARY KEY,
    facultyFirstName VARCHAR(255) NOT NULL,
    facultyLastName VARCHAR(255) NOT NULL,
    facultyEmail VARCHAR(255) NOT NULL,
    facultyPassword VARCHAR(255) NOT NULL
)

INSERT INTO AdminFaculty(
    facultyFirstName,facultyLastName,
    facultyEmail,facultyPassword
)VALUES(
    'Ralph', 'Christian',
    'ralphchristian12@gmail.com', 'adminpassword12345'
);

INSERT INTO AdminFaculty(
    facultyFirstName, facultyLastName,
    facultyEmail, facultyPassword
)VALUES(
    'Juan', 'Delacruz',
    'juandelacruz123@gmail.com','adminpassword67890'

);

SELECT * FROM AdminFaculty;