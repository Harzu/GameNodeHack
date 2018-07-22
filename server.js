const express    = require('express');
const bodyParser = require('body-parser');
const api        = require('./api');

const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

const PORT   = process.env.PORT || 9876;
const HOST   = process.env.HOST || '0.0.0.0';
const router = express.Router();

router.use(function(req, res, next) {
  console.log('Something is happening.');
  next();
});

router.get('/', (req, res) => {
  res.json('Hey Hello to api')
})

router.route('/initAcc')
  .get(api.initAcc)

router.route('/startGame')
  .post(api.startGame)

router.route('/closeGame')
  .post(api.closeGame)

app.use('/api', router);

app.listen(PORT, HOST, () => {
  console.log(`Api start on http://${HOST}:${PORT}`);
});