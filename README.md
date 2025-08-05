Violin note recognition app
Code created by Gemini
Requirements given:

Aim: learn to distinguish violin notes by ear
User profile: violin student, violin first position
Environment: webpage on GitHub
Pre-requisites: 
  .wav files to be loaded for each of the notes in each of the strings.
  Files are uploaded in the scientific notation following the example formats 'violin-c4.wav' for C4 and 'violin-cs4.wav' for C#
UI & logic:
  An opening screen is presented to the user with the app title, instructions, and a button to start practice. The best three scores will be shown (see instruction below for calculation of score)
  A new screen is shown with the app title and a fingerboard is presented to the user, with a circle above each of the notes in each of the strings
  A button is shown to play a random note
  A button is shown to play the reference note G (open G string)
  The aim is for the user to select the correct note in the fingerboard corresponding to the random note 
  The user can replay the random note and the reference note multiple times before selecting their answer
  The answer is selected by pressing the circle in the correct position in the fingerboard
  If the answer is correct, the circle will illuminate green and a message will be displayed
  If the answer is incorrect, the circle selected will illuminate red, a message will be displayed, and the correct circle/note will illuminate green
  Once the answer is given and the result displayed, the user is able to replay the note, the incorrect answer, and the reference note, to solidify learning
  A score of correct answers will be displayed at the top of the screen, ie 'total correct/total played', which is updated as the practice continues
  Two buttons will be displayed: continue (and repeat the above process) or stop
  Once a user stops practice, the answer score will be saved with a timestamp in a database
  At the next run of the app, the opening screen is updated to shown the best three scores from the database and their dates
  Local storage for scores, as application is designed to be single use



