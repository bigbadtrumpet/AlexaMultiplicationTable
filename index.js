'use strict';

var GAME_NAME = 'Multiplication practice'; // Be sure to change this for your skill.
var GAME_LENGTH = 5;  // The number of questions per trivia game.
var GAME_STATES = {
    TRIVIA: '_TRIVIAMODE', // Asking trivia questions.
    START: '_STARTMODE', // Entry point, start the game.
    HELP: '_HELPMODE' // The user is asking for help.
};

var Alexa = require('alexa-sdk');

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, triviaStateHandlers, helpStateHandlers);
    alexa.execute();
};

var newSessionHandlers = {
    /**
     * Entry point. Start a new game on new session. Handle any setup logic here.
     */
    'NewSession': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', true);
    }
};

var startStateHandlers = Alexa.CreateStateHandler(GAME_STATES.START, {
    'StartGame': function (newGame) {
        var speechOutput = newGame ? 'Welcome to '  + GAME_NAME + '. ' : '';
        speechOutput += 'I will ask you ' + GAME_LENGTH.toString() + ' questions, try to get as many right as you ' +
            'can. Just say the number of the answer. Let\'s begin. ';
        var questionCount = 0;
        var spokenQuestion = generateRandomQuestion();
        var repromptText = 'Question 1. ' + spokenQuestion.text + ' ';

        speechOutput += repromptText;

        Object.assign(this.attributes, {
            'speechOutput': speechOutput,
            'repromptText': repromptText,
            'questionCount': questionCount,
            'score': 0,
            'correctAnswer': spokenQuestion.answer
        });

        // Set the current state to trivia mode. The skill will now use handlers defined in triviaStateHandlers
        this.handler.state = GAME_STATES.TRIVIA;

        this.emit(':askWithCard', speechOutput, repromptText, GAME_NAME, repromptText);
    }
});

var triviaStateHandlers = Alexa.CreateStateHandler(GAME_STATES.TRIVIA, {
    'AnswerIntent': function () {
        handleUserGuess.call(this, false);
    },
    'AnswerOnlyIntent': function () {
      handleUserGuess.call(this, false);
    },
    'DontKnowIntent': function () {
        handleUserGuess.call(this, true);
    },
    'AMAZON.StartOverIntent': function () {
        this.handler.state = GAME_STATES.START;
        this.emitWithState('StartGame', false);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', this.attributes['speechOutput'], this.attributes['repromptText']);
    },
    'AMAZON.HelpIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emitWithState('helpTheUser');
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = GAME_STATES.HELP;
        this.emit(':ask', 'Would you like to keep playing?');
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Ok, let\'s play again soon.');
    },
    'Unhandled': function () {
        var speechOutput = 'Try saying a number between 0 and 100';
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        console.log('Session ended in trivia state: ' + this.event.request.reason);
    }
});

var helpStateHandlers = Alexa.CreateStateHandler(GAME_STATES.HELP, {
    'helpTheUser': function () {
        var speechOutput = "I will ask you " + GAME_LENGTH + " multiplication questions. Respond with the number of the answer. "
            + "For example, for two times two, say the answer is four. To start a new game at any time, say, start game. "
            + "To repeat the last question, say, repeat. Would you like to keep playing?";
        var repromptText = "To give an answer to a question, respond with the number of the answer . "
            + "Would you like to keep playing?";

        this.emit(':ask', speechOutput, repromptText);
    },
    'AMAZON.RepeatIntent': function () {
        this.emitWithState('helpTheUser');
    },
    'AMAZON.HelpIntent': function() {
        this.emitWithState('helpTheUser');
    },
    'AMAZON.YesIntent': function() {
        this.handler.state = GAME_STATES.TRIVIA;
        this.emitWithState('AMAZON.RepeatIntent');
    },
    'AMAZON.NoIntent': function() {
        var speechOutput = 'Ok, we\'ll play another time. Goodbye!';
        this.emit(':tell', speechOutput);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':ask', 'Would you like to keep playing?')
    },
    'AMAZON.CancelIntent': function () {
        this.handler.state = GAME_STATES.TRIVIA;
        this.emitWithState('AMAZON.RepeatIntent');
    },
    'Unhandled': function () {
        var speechOutput = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', speechOutput, speechOutput);
    },
    'SessionEndedRequest': function () {
        console.log('Session ended in help state: ' + this.event.request.reason);
    }
});

function generateRandomQuestion(){
  var a = randomInt(0, 10);
  var b = randomInt(0, 10);
  return {
    text: "What is " + a + " times " + b,
    answer: a * b
    }
}

function randomInt (low, high) {
    return Math.floor(Math.random() * (high - low) + low);
}

function handleUserGuess(userGaveUp) {
    var intent = this.event.request.intent;
    var answerSlotValid = isAnswerSlotValid(intent);
    var speechOutput = '';
    var speechOutputAnalysis = '';
    var correctAnswer = parseInt(this.attributes.correctAnswer);
    var currentScore = parseInt(this.attributes.score);
    var questionCount = parseInt(this.attributes.questionCount);

    console.log("is answer slot valid " + answerSlotValid);
    console.log(JSON.stringify(this.event))
    if (answerSlotValid && parseInt(intent.slots.Answer.value) == correctAnswer) {
        currentScore++;
        speechOutputAnalysis = "correct. ";
    } else {
        if (!userGaveUp) {
            speechOutputAnalysis = "wrong. "
        }

        speechOutputAnalysis += "The correct answer is " + correctAnswer + ". ";
    }

    // Check if we can exit the game session after GAME_LENGTH questions (zero-indexed)
    if (questionCount >= GAME_LENGTH - 1) {
        speechOutput = userGaveUp ? "" : "That answer is ";
        speechOutput += speechOutputAnalysis + "You got " + currentScore.toString() + " out of "
            + GAME_LENGTH.toString() + " questions correct. Thank you for playing!";

        this.emit(':tell', speechOutput)
    } else {
        questionCount += 1;

        var spokenQuestion = generateRandomQuestion();
        var questionIndexForSpeech = questionCount + 1;
        var repromptText = 'Question ' + questionIndexForSpeech.toString() + '. ' + spokenQuestion.text + ' ';

        speechOutput += userGaveUp ? "" : "That answer is ";
        speechOutput += speechOutputAnalysis + "Your score is " + currentScore.toString() + ". " + repromptText;

        Object.assign(this.attributes, {
          'speechOutput': speechOutput,
          'repromptText': repromptText,
          'questionCount': questionCount,
          "score": currentScore,
          'correctAnswer': spokenQuestion.answer
        });

        this.emit(':askWithCard', speechOutput, repromptText, GAME_NAME, repromptText);
    }
}

function isAnswerSlotValid(intent) {
    var answerSlotFilled = intent && intent.slots && intent.slots.Answer && intent.slots.Answer.value;
    var answerSlotIsInt = answerSlotFilled && !isNaN(parseInt(intent.slots.Answer.value));
    return answerSlotIsInt && parseInt(intent.slots.Answer.value) <= 100 && parseInt(intent.slots.Answer.value) >= 0;
}
