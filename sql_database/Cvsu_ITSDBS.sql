CREATE DATABASE Cvsu_ITS;

CREATE TABLE ITstudent (
    studentID INT IDENTITY(2023001,1) PRIMARY KEY,
    studentFirstName VARCHAR(255) NOT NULL,
    studentLastName VARCHAR(255) NOT NULL,
    studentEmail VARCHAR(255) NOT NULL,
    studentPassword VARCHAR(255) NOT NULL
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Daryll','Culas', 
    'coolastthereal99@gmail.com',
    'Iamdaryll9'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tanjiro','Kamado', 
    'tanjirokamado01@gmail.com',
    'demonslayer01'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Nezuko','Kamado', 
    'nezukokamado01@gmail.com',
    'demonslayer02'
);

INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'giyuu','tomioka', 
    'giyutomioka03@gmail.com',
    'demonslayer03'
);


INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tengen','Uzui', 
    'tengenuzui11@gmail.com',
    'demonslayer04'
);


INSERT INTO ITstudent(
     studentFirstName,studentLastName, 
     studentEmail,studentPassword
)VALUES(
    'Tiburcio','Kanor', 
    'tiburciokanor69@gmail.com',
    'demonslayer05'
);

SELECT * FROM ITstudent;

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