/*global chrome, CryptoJS, console, window, document, XMLHttpRequest, setTimeout, setInterval */
document.querySelector('#tmpl').addEventListener('template-bound', function () {
  'use strict';
  this.indexedDB = window.indexedDB || window.webkitIndexedDB || window.mozIndexedDB || window.OIndexedDB || window.msIndexedDB;

  this.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.OIDBTransaction || window.msIDBTransaction;

  this.dbVersion = 1.0;

  this.request = this.indexedDB.open("albumInfo", this.dbVersion);

  this.request.onerror = function () {
    console.log("Error creating/accessing IndexedDB database");
  };

  this.request.onsuccess = function () {
    console.log("Success creating/accessing IndexedDB database");
    this.db = this.request.result;

    // Interim solution for Google Chrome to create an objectStore. Will be deprecated
    if (this.db.setVersion) {
      if (this.db.version !== this.dbVersion) {
        var setVersion = this.db.setVersion(this.dbVersion);
        setVersion.onsuccess = function () {
          this.createObjectStore(this.db);
        };
      }
    }
  }.bind(this);

  this.request.onupgradeneeded = function (event) {
    this.createObjectStore(event.target.result);
  }.bind(this);

  this.createObjectStore = function (dataBase) {
    console.log("Creating objectStore");
    dataBase.createObjectStore("albumInfo");
  };

  this.getImageFile = function (url, image, art, note, id) {
    var xhr = new XMLHttpRequest(),
      blob;
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onload = function () {
      if (xhr.status === 200) {
        blob = xhr.response;
        this.putImageInDb(blob, image, art, note, id);
      }
    }.bind(this);
    xhr.send();
  };

  this.putImageInDb = function (blob, image, art, note, id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite");
    transaction.objectStore("albumInfo").put(blob, id);
    transaction.objectStore("albumInfo").get(id).onsuccess = function (event) {
      var imgFile = event.target.result,
        imgURL = window.URL.createObjectURL(imgFile);

      image.style.backgroundImage = "url('" + imgURL + "')";
      art.src = imgURL;
      note.icon = imgURL;
      console.log('New Item Added to indexedDB ' + id);
    };
  };

  this.putJSONInDb = function (data, id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite");
    transaction.objectStore("albumInfo").put(data, id);
    transaction.objectStore("albumInfo").get(id).onsuccess = function () {
      console.log('New Item Added to indexedDB ' + id);
    };
  };

  this.getImageFromDb = function (image, art, note, id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite"),
      request = transaction.objectStore("albumInfo").get(id);

    request.onsuccess = function (event) {
      var imgFile = event.target.result,
        imgURL = window.URL.createObjectURL(imgFile);

      image.style.backgroundImage = "url('" + imgURL + "')";
      art.src = imgURL;
      note.icon = imgURL;
    };
  };

  this.getImageForPlayer = function (id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite"),
      art = document.querySelector('#coverArt');

    transaction.objectStore("albumInfo").get(id).onsuccess = function (event) {
      var imgFile = event.target.result,
        imgURL = window.URL.createObjectURL(imgFile);

      art.style.backgroundImage = "url('" + imgURL + "')";
    };
  };

  this.getImageForNextTrack = function (id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite"),
      art = document.querySelector('#coverArt'),
      note = document.querySelector('#playNotify');

    transaction.objectStore("albumInfo").get(id).onsuccess = function (event) {
      var imgFile = event.target.result,
        imgURL = window.URL.createObjectURL(imgFile);

      art.style.backgroundImage = "url('" + imgURL + "')";
      note.icon = imgURL;
    };
  };

  this.checkEntry = function (url, image, art, note, id) {
    var transaction = this.db.transaction(["albumInfo"], "readwrite"),
      request = transaction.objectStore("albumInfo").count(id),
      visible = document.querySelector("#loader").classList.contains("hide"),
      loader = document.querySelector('#loader'),
      box = document.querySelector(".box");

    request.onsuccess = function () {
      if (!visible) {
        loader.classList.add('hide');
        box.classList.add('hide');
      }
      if (request.result === 0) {
        this.getImageFile(url, image, art, note, id);
      } else {
        this.getImageFromDb(image, art, note, id);
      }
    }.bind(this);
  };

  this.defaultPlayImage = function () {
    var art = document.querySelector('#coverArt'),
      note = document.querySelector('#playNotify');

    art.style.backgroundImage =  "url('images/default-cover-art.png')";
    note.icon = 'images/default-cover-art.png';
    note.show();
  };

  this.playlist = [];

  this.page = this.page || 0;

  this.pageLimit = false;

  this.sortTypes = [
    {sort: 'newest', name: 'Newest'},
    {sort: 'frequent', name: 'Frequent'},
    {sort: 'alphabeticalByName', name: 'By Title'},
    {sort: 'alphabeticalByArtist', name: 'By Artist'},
    {sort: 'recent', name: 'Recently Played'}
  ];

  this.closeDrawer = function () {
    var panel = document.querySelector('#panel');
    panel.closeDrawer();
  };

  this.appScroller = function () {
    return document.querySelector('#headerPanel').scroller;
  };

  this.topOfPage = function () {
    var scroller = this.appScroller();

    if (scroller.scrollTop !== 0) {
      scroller.scrollTop = 0;
    }
  };

  this.sizePlayer = function () {
    var height = (window.innerHeight - 256) + 'px',
      width = window.innerWidth + 'px',
      art = document.querySelector('#coverArt');

    art.style.width = width;
    art.style.height = height;
    art.style.backgroundSize = width;
  };

  this.loadListeners = function () {
    var scroller = this.appScroller(),
      audio = document.querySelector('#audio'),
      maximized = chrome.app.window.current().isMaximized(),
      buttons = document.querySelectorAll('.max'),
      wall = document.querySelector("#wall");

    if (maximized) {
      Array.prototype.forEach.call(buttons, function (e) {
        e.icon = 'flip-to-back';
      });
    } else {
      Array.prototype.forEach.call(buttons, function (e) {
        e.icon = 'check-box-outline-blank';
      });
    }

    this.position = scroller.scrollTop;

    scroller.onscroll = function () {
      var precent = (scroller.scrollTop / (scroller.scrollHeight - scroller.offsetHeight)) * 100,
        fab = document.querySelector('animated-fab');

      if (precent >= 5 && fab.state !== 'bottom') {
        fab.state = 'bottom';
      } else if (precent <= 4 && fab.state !== 'off') {
        fab.state = 'off';
      }
      if (this.page === 0 && fab.state !== 'off' && scroller.scrollTop < this.position) {
        fab.state = 'off';
      }
      this.position = scroller.scrollTop;


      if (this.page === 0 && precent > 95 && !this.pageLimit) {
        wall.loadMore();
      }

    }.bind(this);

    window.onresize = this.sizePlayer;

    audio.onended = this.nextTrack;

  };

  this.loadData = function () {
    if (chrome.app) {
      chrome.storage.sync.get(function (result) {
        if (result.url === undefined) {
          document.querySelector('#firstRun').toggle();
        } else {
          this.url = result.url;
        }
        this.user = result.user;
        this.pass = result.pass;
        this.version = result.version;
        if (result.listMode === undefined) {
          chrome.storage.sync.set({
            'listMode': 'cover'
          });
          this.listMode = 'cover';
          this.view = 'view-stream';
        } else {
          this.listMode = result.listMode;
          if (result.listMode === 'cover') {
            this.view = 'view-stream';
          } else {
            this.view = 'view-module';
          }
        }
        if (result.bitRate === undefined) {
          chrome.storage.sync.set({
            'bitRate': '320'
          });
          this.bitRate = '320';
        } else {
          this.bitRate = result.bitRate;
        }
        if (result.sort === undefined) {
          this.selected = '';
        }
        if (result.querySize === undefined) {
          chrome.storage.sync.set({
            'querySize': 20
          });
          this.querySize = 20;
        } else {
          this.querySize = result.querySize;
        }
        setTimeout(function () {
          if (this.url && this.user && this.pass && this.version) {
            var wall = document.querySelector('#wall');
            wall.doAjax();
          }
        }.bind(this), 100);
      }.bind(this));
    } else {
      console.log('huh');
    }
  };

  this.playAudio = function (artist, title, src) {
    var note = document.querySelector('#playNotify'),
      audio = document.querySelector("#audio");
    this.currentPlaying = artist + ' - ' + title;
    audio.src = src;
    audio.play();
    note.title = 'Now Playing... ' + artist + ' - ' + title;
  };

  /*jslint unparam: true*/
  this.playThis = function (event, detail, sender) {
    var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=1.10.2&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + sender.attributes.ident.value;
    this.playAudio(sender.attributes.artist.value, sender.attributes.title.value, url);
    if (sender.attributes.cover.value !== undefined) {
      this.getImageForNextTrack(sender.attributes.cover.value);
    } else {
      this.defaultPlayImage();
    }
  };
  /*jslint unparam: false*/

  this.nextTrack = function () {
    var next = this.playing + 1,
      url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=1.10.2&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + this.playlist[next].id;
    if (this.playlist[next]) {
      this.playing = next;
      this.playAudio(this.playlist[next].artist, this.playlist[next].title, url);
      if (this.playlist[next].cover !== undefined) {
        this.getImageForNextTrack(this.playlist[next].cover);
      } else {
        this.defaultPlayImage();
      }
    } else {
      this.clearPlayer();
    }
  };

  this.lastTrack = function () {
    var next = this.playing - 1,
      url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=1.10.2&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + this.playlist[next].id;
    if (this.playlist[next]) {
      this.playing = next;
      this.playAudio(this.playlist[next].artist, this.playlist[next].title, url);
      if (this.playlist[next].cover !== undefined) {
        this.getImageForNextTrack(this.playlist[next].cover);
      } else {
        this.defaultPlayImage();
      }
    } else {
      this.clearPlayer();
    }
  };

  this.toggleWall = function () {
    var wall = document.querySelector("#wall");
    if (wall.listMode === 'cover') {
      wall.listMode = 'list';
      this.view = 'view-module';
      chrome.storage.sync.set({
        'listMode': 'list'
      });
    } else {
      wall.listMode = 'cover';
      this.view = 'view-stream';
      chrome.storage.sync.set({
        'listMode': 'cover'
      });
    }
  };

  this.clearPlayer = function () {
    this.page = 0;
    this.src = '';
    this.playlist = [];
  };

  this.back2List = function () {
    var tmpl = document.querySelector('#tmpl');
    tmpl.page = 0;
  };

  this.nowPlaying = function () {
    var tmpl = document.querySelector('#tmpl');
    tmpl.page = 1;
  };

  this.playPause = function () {
    var audio = document.querySelector('#audio');
    if (!audio.paused) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  this.minimize = function () {
    chrome.app.window.current().minimize();
  };

  this.maximize = function () {
    var maximized = chrome.app.window.current().isMaximized(),
      buttons = document.querySelectorAll('.max');
    if (maximized) {
      Array.prototype.forEach.call(buttons, function (e) {
        e.icon = 'check-box-outline-blank';
      });
      chrome.app.window.current().restore();
    } else {
      Array.prototype.forEach.call(buttons, function (e) {
        e.icon = 'flip-to-back';
      });
      chrome.app.window.current().maximize();
    }
  };

  this.close = function () {
    window.close();
  };

  this.progressClick = function (event) {
    var audio = document.querySelector("#audio"),
      clicked = (event.x / window.innerWidth),
      sum = audio.duration - (audio.duration - (audio.duration * clicked));
    audio.currentTime = sum;
  };

  this.selectAction = function () {
    var tmpl = document.querySelector('#tmpl');
    document.querySelector("#wall").clearData();
    setTimeout(function () {
      document.querySelector("#wall").sort = tmpl.selected;
    }, 100);
    this.closeDrawer();
  };

  this.getPodcast = function () {
    this.closeDrawer();
    document.querySelector("#wall").clearData();
    document.querySelector("#wall").getPodcast();
  };

  this.getStarred = function () {
    this.closeDrawer();
    document.querySelector("#wall").clearData();
    document.querySelector("#wall").getStarred();
  };

  this.getArtist = function () {
    this.closeDrawer();
    document.querySelector("#wall").clearData();
    document.querySelector("#wall").getArtist();
  };

  this.toggleVolume = function () {
    var dialog = document.querySelector("#volumeDialog");
    dialog.toggle();
  };

  this.showPlaylist = function () {
    document.querySelector('#playlistDialog').toggle();
  };

  this.openPanel = function () {
    var panel = document.querySelector('#panel');
    panel.openDrawer();
  };

  this.gotoSettings = function () {
    this.page = 2;
    this.closeDrawer();
  };

  this.volUp = function () {
    var audio = document.querySelector('#audio');
    audio.volume = audio.volume + 0.1;
  };

  this.volDown = function () {
    var audio = document.querySelector('#audio');
    audio.volume = audio.volume - 0.1;
  };

  this.clearPlaylist = function () {
    this.playlist = [];
  };

  this.loadListeners();
  this.loadData();
  this.sizePlayer();
  setInterval(function () {
    var audio = document.querySelector('#audio'),
      button = document.querySelector('#avIcon'),
      bar = document.querySelector('#progress'),
      progress = Math.round((audio.currentTime / audio.duration * 100) * 100) / 100,
      currentMins = Math.floor(audio.currentTime / 60),
      currentSecs = Math.round(audio.currentTime - currentMins * 60),
      totalMins = Math.floor(audio.duration / 60),
      totalSecs = Math.round(audio.duration - totalMins * 60);
    if (!audio.paused) {
      button.icon = "av:pause";
      this.isNowPlaying = true;
      if (!audio.duration) {
        this.playTime = currentMins + ':' + ('0' + currentSecs).slice(-2) + ' / ?:??';
        bar.value = 0;
      } else {
        this.playTime = currentMins + ':' + ('0' + currentSecs).slice(-2) + ' / ' + totalMins + ':' + ('0' + totalSecs).slice(-2);
        bar.value = progress;
      }
    } else {
      this.isNowPlaying = false;
      button.icon = "av:play-arrow";
    }
  }.bind(this), 200);

  chrome.commands.onCommand.addListener(function (command) {
    var audio = document.querySelector('#audio');
    if (command === "playPauseMediaKey") {
      this.playPause();
    } else if (!audio.paused && command === "nextTrackMediaKey") {
      this.nextTrack();
    } else if (!audio.paused && command === "lastTrackMediaKey") {
      this.lastTrack();
    } else if (!audio.paused && command === "nextTrack") {
      this.nextTrack();
    } else if (!audio.paused && command === "lastTrack") {
      this.lastTrack();
    } else if (command === "playPause") {
      this.playPause();
    } else if (command === "volUp") {
      this.volUp();
    } else if (command === "volDown") {
      this.volDown();
    }
  }.bind(this));

});
