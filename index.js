const express = require('express');
const bodyParser = require('body-parser');
const lti = require('ims-lti');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const consumers = {
  'moodle_consumer_key': 'moodle_shared_secret'
};

const scoreStore = {};

app.post('/lti/launch', (req, res) => {
  const provider = new lti.Provider(req.body.oauth_consumer_key, consumers[req.body.oauth_consumer_key]);

  provider.valid_request(req, (err, isValid) => {
    if (err || !isValid) {
      return res.status(401).send('LTI launch invalid');
    }

    const userId = req.body.user_id;
    const resourceLinkId = req.body.resource_link_id;

    provider.body = req.body;
    provider.userId = userId;
    provider.outcome_service = provider.body.lis_outcome_service_url;
    provider.result_sourcedid = provider.body.lis_result_sourcedid;

    scoreStore[userId] = { provider };

    res.redirect(`https://tuapp-react.netlify.app/?userId=${userId}`);
  });
});

app.post('/lti/grade', (req, res) => {
  const { userId, score } = req.body;
  const entry = scoreStore[userId];

  if (!entry || !entry.provider || !entry.provider.outcome_service || !entry.provider.result_sourcedid) {
    return res.status(400).send('No LTI launch info available for this user.');
  }

  entry.provider.send_replace_result(score, (err, result) => {
    if (err) {
      console.error('Error sending grade:', err);
      return res.status(500).send('Failed to report grade to LMS');
    }
    res.send('Grade successfully sent to LMS');
  });
});

app.listen(3000, () => {
  console.log('Servidor LTI escuchando en http://localhost:3000');
});