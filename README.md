# Project: UofTeam Board

## Team members

| Email                           | utorid   |
| ------------------------------- | -------- |
| j.daniel@mail.utoronto.ca       | danie158 |
| petrus.pranoto@mail.utoronto.ca | pranotop |
| rameen.popal@mail.utoronto.ca   | popalram |

## Brief description of the web application

In a sentence, it is an online canvas that can be used for collaborative drawing across users.

A user starts from a blank canvas, and any update on the canvas by connected users will be reflected in real time for other users viewing the canvas. In addition, an AI integration for object recognition and drawing completion will be implemented to overwrite the selected portion of the canvas. This could be done by interpreting the users line segments as an SVG, and using this through a generative AI to make the drawing more complete. Canvases will be able to be saved and opened whenever users need.

## Modern frontend framework of choice

We will be using React, React Router, and Vite for our modern frontend framework of choice (this constitutes a framework as per the [React Docs](https://react.dev/learn/creating-a-react-app#react-router-v7)).

## Additional requirement of choice

We will incorporate a real-time component into our application. Specifically, the changes made to the canvas by one user, will immediately be visible to all the other users viewing that canvas as well. This will be achieved using real-time communication, implemented via websockets and state sharing with an authoritative server model. This live experience for all users fulfills the real-time application requirement.

## Projected milestones

### Alpha

- User sign up and login
- Main dashboard where users may join or create a canvas

### Beta

- Canvas editing, saving, and real-time sharing of changes
- Ability to select portion of drawing and get AI-completed drawing to replace it

### Final

- Payment processing at login
- Multiple colors and editing tools for the canvas
- Allow sharing and restricted access to canvas
