/*global Polymer, console, document, Blob, window, Image, CoreAnimation */
(function () {
  'use strict';
  Polymer('album-art', {

    imgURL: '',

    defaultImgURL: '../../../images/default-cover-art.png',

    albumSize: 0,

    showingDetails: false,

    isLoading: false,

    mouseIn: function (event, detail, sender) {
      sender.setZ(2);
    },

    mouseOut: function (event, detail, sender) {
      sender.setZ(1);
    },

    ready: function () {
      this.artist = this.artist || "Artist Name";
      this.album = this.album || "Album Title";
      this.app = document.getElementById("tmpl");
      this.app.colorThiefAlbum = this.app.colorThiefAlbum  || '#db4437';
      this.app.colorThiefAlbumOff = this.app.colorThiefAlbumOff  || 'white';
    },

    setImage: function (imgURL) {
      this.$.card.style.backgroundImage = "url('" + imgURL + "')";
      this.$.smallCover.style.backgroundImage = "url('" + imgURL + "')";
      this.isLoading = false;
      this.imgURL = imgURL;
    },

    showDialog: function () {
      this.async(function () {
        this.app.dataLoading = true;
        this.app.tracker.sendAppView('Album Details');
        if (this.playlist[0].palette) {
          this.app.colorThiefAlbum = this.playlist[0].palette[0];
          this.app.colorThiefAlbumOff = this.playlist[0].palette[1];
        }
        var dialog = this.app.$.albumDialog;
        dialog.details = {
          album: this.album,
          artist: this.artist,
          cover: this.imgURL,
          palette: this.palette,
          id: this.item,
          isFavorite: this.isFavorite,
          size: this.albumSize,
          tracks: this.playlist,
          artistId: this.artistId
        };
        dialog.opened = true;
        this.app.$.fab.ident = this.id;
        this.app.dataLoading = false;
      });
    },

    chooseOption: function () {
      if (this.bookmarkIndex !== undefined) {
        this.app.dataLoading = false;
        this.bookmarkTime = this.$.globals.secondsToMins(
          this.playlist[this.bookmarkIndex].bookmarkPosition / 1000
        );
        this.$.albumPlaybackConfirm.open();
        if (this.app.$.albumDialog.opened) {
          this.app.$.albumDialog.opened = false;
        }
      } else {
        this.playAlbum();
      }
    },

    playFromBookmark: function () {
      this.shortPlaylist = this.playlist.splice(this.bookmarkIndex);
      this.app.dataLoading = false;
      this.app.$.albumDialog.opened = false;
      this.app.playlist = this.shortPlaylist;
      this.$.globals.playListIndex(0);
    },

    playAlbum: function () {
      var pLength = this.playlist.length;
      for (var i = 0; i < pLength; i++) {
        if (this.playlist[i].bookmarkPosition) {
          delete this.playlist[i].bookmarkPosition;
        }
      }
      this.app.dataLoading = false;
      this.app.$.albumDialog.opened = false;
      this.app.playlist = this.playlist;
      this.$.globals.playListIndex(0);
    },


    doPlayback: function () {
      this.app.dataLoading = true;
      this.doQuery().then(this.chooseOption.bind(this));
    },

    showDetails: function () {
      this.app.dataLoading = true;
      this.doQuery().then(this.showDialog.bind(this));
    },


    processJSON: function (e) {
      return new Promise(function (resolve, reject) {
        var res = e.target.response['subsonic-response'];
        this.playlist.length = 0;
        var tracks = [];
        if (this.app.queryMethod === 'ID3') {
          this.artistId = res.album.artistId;
          tracks = res.album.song;
        } else {
          this.artistId = res.directory.parent;
          tracks = res.directory.child;
        }
        var length = tracks.length;
        for (var i = 0; i < length; i++) {
          this.albumSize = this.albumSize + tracks[i].size;
          this.playlist.push({
            id: tracks[i].id,
            artist: tracks[i].artist,
            title: tracks[i].title,
            duration: this.$.globals.secondsToMins(tracks[i].duration),
            cover: this.imgURL,
            bookmarkPosition: tracks[i].bookmarkPosition,
            palette: this.palette,
            disk: tracks[i].diskNumber,
            track: tracks[i].track
          });
          if (tracks[i].bookmarkPosition && this.bookmarkIndex === undefined) {
            this.bookmarkIndex = i;
          }
        }
        /* sort tracks by diskNumber thanks Joe Shelby */
        this.playlist.sort(function sorting(a, b) {
          var da = a.discNumber || 0, db = b.discNumber || 0,
            ta = a.track || 0, tb = b.track || 0;
          if (da === db) {
            return ta - tb;
          } else {
            return da - db;
          }
        });
        this.async(resolve);
      }.bind(this));
    },

    doQuery: function () {
      return new Promise(function (resolve, reject) {
        var artId;
        var url;
        if (this.app.queryMethod === 'ID3') {
          artId = "al-" + this.item;
          url = this.$.globals.buildUrl('getAlbum', {
            id: this.item
          });
        } else {
          artId = this.item;
          url = this.$.globals.buildUrl('getMusicDirectory', {
            id: this.item
          });
        }
        this.$.globals.getDbItem(artId + '-palette').then(function (e) {
          this.palette = e.target.result;
          this.$.globals.doXhr(url, 'json').then(this.processJSON.bind(this)).then(resolve);
        }.bind(this));
      }.bind(this));
    },

    _updateItem: function () {
      this.bookmarkIndex = undefined;
      if (this.item && !this.app.scrolling) {
        this.playlist = [];
        this.albumSize = 0;
        this.isLoading = true;
        var artId;
        if (this.app.queryMethod === 'ID3') {
          artId = "al-" + this.item;
        } else {
          artId = this.item;
        }
        this.$.globals.fetchImage(artId).then(this.setImage.bind(this));
      } else {
        this.async(this._updateItem, null, 200);
      }
    },

    itemChanged: function () {
      this.async(this._updateItem);
    }
  });
})();
