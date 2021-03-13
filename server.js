require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('dns');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Basic Configuration
const port = process.env.PORT || 3000;

/* mongodb configuration */ 
mongoose.connect(process.env.DB_URI, {useNewUrlParser: true, useUnifiedTopology: true});

// schema for url
const shortUrlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

// schema into model
const ShortUrl = mongoose.model('ShortUrl', shortUrlSchema );

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use('/public', express.static(`${process.cwd()}/public`));

// find one by orginal url
const findOneByOrginalUrl = (url, done) => {
  ShortUrl.findOne({original_url: url}, (err, doc) =>{
    if (err) return done(err);
    done(null, doc);
  });
}
// find one by short url
const findOneByShortUrl = (shortUrl, done) => {
  ShortUrl.findOne({short_url: shortUrl}, (err, doc) => {
    if(err) return done(err);
    done(null, doc);
  });
}
// create and save url
const createAndSaveUrl = (url, done) => {
  ShortUrl.countDocuments((err, docsLenght) => {
    console.log('Count : ' + docsLenght);
    if(err) return done(err);
    // first entity
    if (docsLenght == 0){
      new ShortUrl({original_url: url, short_url: 0})
        .save((err, doc) => {
          if(err) return done(err);
          done(null, {original_url: doc.original_url, short_url: doc.short_url});
        });
    }
    else {
      new ShortUrl({ original_url: url, short_url: docsLenght})
      .save((err, doc) => {
        if(err) return done(err);
        done(null, {original_url: doc.original_url, short_url: doc.short_url});
      });
    }
  } );
}
// test valid url
const testValidUrl = (url, done) => {
  console.log(url);
  if ( /^https?:\/\/(w{3}.)?[\w-]+.(\/\w+)*/.test(url) ){
    let domain = (new URL(url));
    dns.lookup(domain.hostname, (err, address, family) => {
      if(err) return done(err);
    done(null, address);
    });
  }
  else
    done(null, null);
}
// api new short url
app.post('/api/shorturl/new', (req, res) => {
  console.log([req.body]);
  testValidUrl(req.body.url, (err, address) => {

    console.log(address, address === null);

    if(err) return res.json(err);

    if (address === null)
      return res.json({error: 'invalid url'});
    
    findOneByOrginalUrl(req.body.url, (err, data) => {
      if (err) return res.json(err);
      // if url exists alredy
      if (data){
        console.log('Data Found: ' + data)
        
        res.json({original_url: data.original_url, short_url: data.short_url});
      }
      else {
        createAndSaveUrl(req.body.url, (err, doc) => {
          if (err) return res.json(err);

          console.log('Crated New: ' + doc);

          res.json(doc);
        });
      }
    })
  });
  
  // res.json({ orginal_url: req.body.url, short_url: 1 });
});
// api get short url
app.get('/api/shorturl/:shortUrl', (req, res) => {
  findOneByShortUrl(req.params.shortUrl, (err, doc) => {
    if (err) return res.json(err);
    if (doc == null)
      res.json({error: 'invalid short URL'});
    else
      res.redirect(doc.original_url);
  });
});

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
