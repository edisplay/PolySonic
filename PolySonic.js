/*global chrome, CryptoJS, console, window, document, XMLHttpRequest, setInterval, screen */
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

  this.getImageForPlayer = function (url) {
    var art = document.querySelector('#coverArt'),
      note = document.querySelector('#playNotify');

    art.style.backgroundImage = "url('" + url + "')";
    note.icon = url;
  };

  this.defaultPlayImage = function () {
    var art = document.querySelector('#coverArt'),
      note = document.querySelector('#playNotify');

    art.style.backgroundImage =  "url('images/default-cover-art.png')";
    note.icon = 'images/default-cover-art.png';
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
    return this.$.headerPanel.scroller;
  };

  this.scrollerPos = 0;

  this.setScrollerPos = function () {
    var scrollbar = this.appScroller();
    this.scrollerPos = scrollbar.scrollTop;
  };

  this.fixScroller = function (event, detail, sender) {
    var scrollbar = this.appScroller();
    if (event.target.id === 'main' && this.scrollerPos !== 0 && this.page === 0) {
      scrollbar.scrollTop = this.scrollerPos;
    }
    if (this.page === 3) {
      scrollbar.scrollTop = 0;
    }
  };

  this.openSearch = function () {
    this.closeDrawer();
    this.$.searchDialog.toggle();
  };

  this.doSearch = function () {
    if (this.searchQuery) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", this.url + '/rest/search3.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&f=json&query=' + encodeURIComponent(this.searchQuery), true);
      xhr.responseType = "json";
      xhr.onload = function () {
        if (xhr.status === 200) {
          var response = xhr.response['subsonic-response'];
          this.searchResults = [];
          this.searchResults.artist = response.searchResult3.artist;
          this.searchResults.album = [];
          this.searchResults.song = response.searchResult3.song;
          Array.prototype.forEach.call(response.searchResult3.album, function (e) {
            var data = {artist: e.artist, coverArt: e.coverArt, id: e.id, name: e.name, url:this.url, user: this.user, pass: this.pass, version: this.version, bitRate: this.bitRate, listMode: 'cover'};
            this.searchResults.album.push(data);
          }.bind(this));
        }
      }.bind(this);
      xhr.send();
    } else {
      console.log('No Query to Saearch');
    }
  };

  this.doAction = function () {
    var scroller = this.appScroller();

    if (this.page === 0 && scroller.scrollTop !== 0) {
      scroller.scrollTop = 0;
    }
    if (this.page === 1) {
      this.showPlaylist();
    }
    if (this.page === 3) {
      this.$.details.playAlbum();
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
      var fab = document.querySelector('animated-fab');

      if (this.page === 0 && fab.state !== 'off' && scroller.scrollTop < this.position) {
        fab.state = 'off';
      } else if (this.page === 0 && fab.state !== 'bottom' && scroller.scrollTop > this.position) {
        fab.state = 'bottom';
      }
      this.position = scroller.scrollTop;

    }.bind(this);

    /* no longer needed untill resizing is reactivated */
    //window.onresize = this.sizePlayer;

    audio.onended = this.nextTrack.bind(this);

    audio.onerror = function (e) {
      console.log(e);
    };
  };

  this.loadData = function () {
    if (chrome.storage) {
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
          var screenSize = screen.width + 'x' + screen.height,
            defaultQuery;
          if (screenSize === '1920x1080') {
            defaultQuery = 40;
          } else {
            defaultQuery = 20;
          }
          chrome.storage.sync.set({
            'querySize': defaultQuery
          });
          this.querySize = defaultQuery;
        } else {
          this.querySize = result.querySize;
        }
        if (result.volume !== undefined) {
          this.volume = result.volume;
        }
        if (this.url && this.user && this.pass && this.version) {
          var xhr = new XMLHttpRequest();
          xhr.open("GET", this.url + '/rest/ping.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&f=json', true);
          xhr.responseType = "json";
          xhr.onload = function () {
            if (xhr.status === 200) {
              var response = xhr.response['subsonic-response'];
              if (response.status === 'ok') {
                this.$.wall.doAjax();
              } else {
                this.doToast('Error Connecting to Server');
              }
            }
          }.bind(this);
          xhr.onerror = function (e) {
            this.$.firstRun.toggle();
            this.doToast(e);
          }.bind(this);
          xhr.send();
        } else {
          console.log('connection details not set');
        }
      }.bind(this));
    } else {
      console.log('no chrome storage');
    }
  };

  this.systemNotify = function (artist, title, image) {
    var note = document.querySelector("#playNotify");
    if (artist === undefined) {
      note.title = title;
    } else {
      note.title = artist + ' - ' + title;
    }
    note.icon = image;
    note.show();
  };

  this.doToast = function (text) {
    var toast = document.querySelector("#toast");
    toast.text = text;
    toast.show();
  };

  this.dismissToast = function () {
    var toast = document.querySelector("#toast");
    //toast.dismiss();
  };

  this.playAudio = function (artist, title, src) {
    var audio = document.querySelector("#audio");
    if (artist === undefined) {
      this.currentPlaying = title;
    } else {
      this.currentPlaying = artist + ' - ' + title;
    }
    audio.src = src;
    audio.play();
  };

  /*jslint unparam: true*/
  this.playThis = function (event, detail, sender) {
    if (sender.attributes.artist.value === undefined) {
      // is a podcast
      var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&format=raw&estimateContentLength=true&id=' + sender.attributes.streamId.value;
    } else {
      // normal trascoded file type
      var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + sender.attributes.ident.value;  
    }
    this.systemNotify(sender.attributes.artist.value, sender.attributes.title.value, sender.attributes.cover.value);
    this.playAudio(sender.attributes.artist.value, sender.attributes.title.value, url);
    if (sender.attributes.cover.value !== undefined) {
      this.getImageForPlayer(sender.attributes.cover.value);
    } else {
      this.defaultPlayImage();
    }
  };
  /*jslint unparam: false*/

  this.nextTrack = function () {
    var next = this.playing + 1;
    if (this.playlist[next]) {
      if (this.playlist[next].artist === undefined) {
        var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&format=raw&estimateContentLength=true&id=' + this.playlist[next].id;
      } else {
        var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + this.playlist[next].id;
      }
      this.playing = next;
      this.systemNotify(this.playlist[next].artist, this.playlist[next].title, this.playlist[next].cover);
      this.playAudio(this.playlist[next].artist, this.playlist[next].title, url);
      if (this.playlist[next].cover !== undefined) {
        this.getImageForPlayer(this.playlist[next].cover);
      } else {
        this.defaultPlayImage();
      }
    } else {
      this.clearPlayer();
    }
  };

  this.lastTrack = function () {
    var next = this.playing - 1;
    if (this.playlist[next]) {
      if (this.playlist[next].artist === undefined) {
        var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&format=raw&estimateContentLength=true&id=' + this.playlist[next].id;
      } else {
        var url = this.url + '/rest/stream.view?u=' + this.user + '&p=' + this.pass + '&v=' + this.version + '&c=PolySonic&maxBitRate=' + this.bitRate + '&id=' + this.playlist[next].id;
      }
      this.playing = next;
      this.systemNotify(this.playlist[next].artist, this.playlist[next].title, this.playlist[next].cover);
      this.playAudio(this.playlist[next].artist, this.playlist[next].title, url);
      if (this.playlist[next].cover !== undefined) {
        this.getImageForPlayer(this.playlist[next].cover);
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
    console.log('playlist cleared')
    this.page = 0;
    this.src = '';
    this.playlist = [];
  };

  this.back2List = function () {
    this.page = 0;
    document.querySelector("#wall").listModeChanged();
  };

  this.nowPlaying = function () {
    this.setScrollerPos();
    this.page = 1;
  };

  this.playPause = function () {
    var audio = this.$.audio;
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
    var audio = this.$.audio,
      clicked = (event.x / window.innerWidth),
      sum = audio.duration - (audio.duration - (audio.duration * clicked)),
      bar = this.$.progress;
    bar.value = clicked * 100;
    audio.currentTime = sum;
  };

  this.selectAction = function (event, detail, sender) {
    var wall = this.$.wall;
    wall.sort = sender.attributes.i.value;
    this.closeDrawer();
  };

  this.getPodcast = function () {
    var var wall = this.$.wall;
    this.closeDrawer();
    wall.getPodcast();
  };

  this.getStarred = function () {
    var wall = this.$.wall;
    this.closeDrawer();
    wall.getStarred();
  };

  this.getArtist = function () {
    var wall = this.$.wall;
    this.closeDrawer();
    wall.getArtist();
  };

  this.toggleVolume = function () {
    var dialog = document.querySelector("#volumeDialog");
    dialog.toggle();
  };

  this.showPlaylist = function () {
    var dialog = document.querySelector('#playlistDialog');
    dialog.toggle();
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
    if (this.volume < 100) {
      this.volume = this.volume + 10;
    }
    return this.volume;
  };

  this.volDown = function () {
    if (this.volume > 0) {
      this.volume = this.volume - 10;
    }
    return this.volume;
  };

  this.clearPlaylist = function () {
    this.playlist = null;
    this.playlist = [];
  };

  this.loadListeners();
  this.loadData();
  this.sizePlayer();

  setInterval(function () {
    var audio = this.$.audio,
      button = document.querySelector('#avIcon'),
      bar = this.$.progress,
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
